<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\SalesItem;
use App\Models\SalesTransaction;
use App\Models\Supplier;
use App\Models\User;
use App\Models\WastageRecord;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LossRiskTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private function makeUser(): User
    {
        return User::create([
            'Full_name'  => 'Test Owner',
            'username'   => 'loss-owner',
            'password'   => Hash::make('password'),
            'email'      => 'loss@test.com',
            'role'       => 'Business Owner',
            'status'     => 'Active',
            'Created_at' => now(),
        ]);
    }

    private function auth(): void
    {
        $this->user ??= $this->makeUser();
        Sanctum::actingAs($this->user);
    }

    private function makeProduct(array $overrides = []): Product
    {
        $category = Category::create(['Category_name' => 'Loss Cat ' . random_int(1000, 9999)]);
        $supplier = Supplier::create([
            'supplier_name'  => 'Loss Supplier',
            'contact_number' => '09171234567',
        ]);

        $product = Product::create(array_merge([
            'category_id'     => $category->Category_id,
            'supplier_id'     => $supplier->supplier_id,
            'barcode'         => '480' . str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT),
            'product_name'    => 'Loss Product ' . random_int(100, 999),
            'cost_price'      => 10.00,
            'selling_price'   => 15.00,
            'reorder_level'   => 5,
            'expiration_date' => now()->addDays(45),
            'status'          => 'Active',
        ], $overrides));

        Inventory::create([
            'product_id'    => $product->product_id,
            'current_stock' => 50,
            'stock_status'  => 'Normal',
            'last_updated'  => now(),
        ]);

        return $product;
    }

    private function recordWastage(Product $product, int $count = 3): void
    {
        for ($i = 0; $i < $count; $i++) {
            WastageRecord::create([
                'product_id'    => $product->product_id,
                'user_id'       => $this->user->User_id,
                'wastage_type'  => 'Expired',
                'quantity'      => 1,
                'estimated_loss'=> 10.00,
                'date_recorded' => now()->subDays($i),
            ]);
        }
    }

    private function recordSale(Product $product, int $quantity = 3): void
    {
        $transaction = SalesTransaction::create([
            'user_id'           => $this->user->User_id,
            'total_amount'      => $quantity * 5.00,
            'transaction_date'  => now()->subDays(1),
            'payment_method'    => 'Cash',
            'amount_tendered'   => 100,
            'change_due'        => 0,
            'status'            => 'Completed',
        ]);

        SalesItem::create([
            'transaction_id' => $transaction->transaction_id,
            'product_id'     => $product->product_id,
            'quantity'       => $quantity,
            'unit_price'     => 5.00,
            'subtotal'       => $quantity * 5.00,
        ]);
    }

    private function mlPayload(int $productId, float $probability, string $tier, float $expectedLoss): array
    {
        return ['engine' => 'xgboost', 'results' => [[
            'product_id'        => $productId,
            'loss_probability'  => $probability,
            'expected_loss'     => $expectedLoss,
            'risk_tier'         => $tier,
            'feature_importance'=> ['days_to_expiry' => 0.4, 'wastage_count_90d' => 0.3],
        ]]];
    }

    public function test_predict_scores_active_products_and_caches(): void
    {
        $this->auth();
        $product = $this->makeProduct();
        $this->recordSale($product);
        $this->recordWastage($product);

        Http::fake(['*' => Http::response(
            $this->mlPayload($product->product_id, 0.82, 'High', 410.0),
            200
        )]);

        $response = $this->postJson('/api/loss-risk/predict');

        $response->assertOk()
            ->assertJsonPath('engine', 'xgboost')
            ->assertJsonPath('summary.total_products', 1)
            ->assertJsonPath('summary.high_risk', 1)
            ->assertJsonPath('summary.low_risk', 0)
            ->assertJsonCount(1, 'results')
            ->assertJsonPath('results.0.product_name', $product->product_name)
            ->assertJsonPath('results.0.risk_tier', 'High');

        $this->assertTrue(Cache::has('loss.risk.scores'));
    }

    public function test_predict_sends_feature_vector(): void
    {
        $this->auth();
        $product = $this->makeProduct();
        $this->recordSale($product, 7);
        $this->recordWastage($product);

        Http::fake(['*' => function ($request) use ($product) {
            $body = $request->data();

            $this->assertStringEndsWith('/predict/loss', $request->url());
            $this->assertCount(1, $body['products']);

            $features = $body['products'][0];
            $this->assertSame($product->product_id, $features['product_id']);
            $this->assertGreaterThanOrEqual(44, (int) $features['days_to_expiry']);
            $this->assertLessThanOrEqual(45, (int) $features['days_to_expiry']);
            $this->assertSame(50, (int) $features['current_stock']);
            $this->assertSame('Normal', $features['stock_status']);
            $this->assertSame(3, $features['wastage_count_90d']);
            $this->assertGreaterThan(0, $features['sales_velocity_7d']);
            $this->assertGreaterThan(0, $features['turnover_rate']);
            $this->assertSame(10.0, (float) $features['unit_cost']);

            return Http::response($this->mlPayload($product->product_id, 0.5, 'Medium', 250.0), 200);
        }]);

        $this->postJson('/api/loss-risk/predict')->assertOk();
    }

    public function test_predict_returns_503_when_ml_service_offline(): void
    {
        $this->auth();
        $this->makeProduct();

        Http::fake(['*' => function () {
            throw new ConnectionException('Connection refused');
        }]);

        $this->postJson('/api/loss-risk/predict')
            ->assertStatus(503)
            ->assertJsonPath('message', fn (string $m) => str_contains($m, 'unavailable'));
    }

    public function test_items_reads_cache_and_filters_by_tier(): void
    {
        $this->auth();
        $product = $this->makeProduct();

        Cache::put('loss.risk.scores', [
            'generated_at' => now(),
            'engine'       => 'xgboost',
            'results'      => [
                ['product_id' => $product->product_id, 'product_name' => $product->product_name,
                    'sku' => $product->barcode, 'category' => 'Loss Cat', 'current_stock' => 50,
                    'unit_cost' => 10.0, 'days_to_expiry' => 45, 'loss_probability' => 0.8,
                    'expected_loss' => 400.0, 'risk_tier' => 'High', 'feature_importance' => []],
                ['product_id' => 999, 'product_name' => 'Fresh', 'sku' => 'X',
                    'category' => 'Snacks', 'current_stock' => 10, 'unit_cost' => 5.0,
                    'days_to_expiry' => 300, 'loss_probability' => 0.1,
                    'expected_loss' => 5.0, 'risk_tier' => 'Low', 'feature_importance' => []],
            ],
        ], 3600);

        Http::fake(['*' => function () {
            throw new ConnectionException('offline'); // items must not call the ML service
        }]);

        $response = $this->getJson('/api/loss-risk/items?tier=High');

        $response->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonCount(1, 'items')
            ->assertJsonPath('items.0.risk_tier', 'High')
            ->assertJsonPath('items.0.product_name', $product->product_name);

        $all = $this->getJson('/api/loss-risk/items')->json();
        $this->assertSame(2, $all['total']);
        $this->assertSame(400, $all['items'][0]['expected_loss']);
    }

    public function test_summary_counts_from_cache(): void
    {
        $this->auth();

        Cache::put('loss.risk.scores', [
            'generated_at' => now(),
            'engine'       => 'xgboost',
            'results'      => [
                ['product_id' => 1, 'risk_tier' => 'High', 'expected_loss' => 400.0],
                ['product_id' => 2, 'risk_tier' => 'Medium', 'expected_loss' => 60.0],
                ['product_id' => 3, 'risk_tier' => 'Low', 'expected_loss' => 5.0],
            ],
        ], 3600);

        $response = $this->getJson('/api/loss-risk/summary');

        $response->assertOk()
            ->assertJsonPath('summary.total_products', 3)
            ->assertJsonPath('summary.high_risk', 1)
            ->assertJsonPath('summary.medium_risk', 1)
            ->assertJsonPath('summary.low_risk', 1)
            ->assertJsonPath('summary.total_expected_loss', 465);
    }

    public function test_items_returns_empty_before_any_prediction(): void
    {
        $this->auth();

        $response = $this->getJson('/api/loss-risk/items');

        $response->assertOk()
            ->assertJsonPath('total', 0)
            ->assertJsonCount(0, 'items');
    }
}
