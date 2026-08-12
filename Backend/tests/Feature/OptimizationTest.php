<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\ForecastResult;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OptimizationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private function makeUser(): User
    {
        return User::create([
            'Full_name'  => 'Test Owner',
            'username'   => 'opt-owner',
            'password'   => bcrypt('password'),
            'email'      => 'opt@test.com',
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
        $category = Category::create(['Category_name' => 'Opt Cat ' . random_int(1000, 9999)]);
        $supplier = Supplier::create([
            'supplier_name'  => 'Opt Supplier',
            'contact_number' => '09171234567',
        ]);

        $product = Product::create(array_merge([
            'category_id'     => $category->Category_id,
            'supplier_id'     => $supplier->supplier_id,
            'barcode'         => '480' . str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT),
            'product_name'    => 'Opt Product ' . random_int(100, 999),
            'cost_price'      => 10.00,
            'selling_price'   => 15.00,
            'reorder_level'   => 5,
            'expiration_date' => now()->addDays(45),
            'status'          => 'Active',
        ], $overrides));

        Inventory::create([
            'product_id'    => $product->product_id,
            'current_stock' => 3,
            'stock_status'  => 'Normal',
            'last_updated'  => now(),
        ]);

        return $product;
    }

    private function addForecast(Product $product, float $demand = 48.0): void
    {
        ForecastResult::create([
            'product_id'      => $product->product_id,
            'forecast_period' => now()->toDateString(),
            'predicted_demand'=> $demand,
            'lower_bound'     => $demand * 0.8,
            'upper_bound'     => $demand * 1.2,
            'confidence'      => 0.9,
            'overstock_risk'  => 'Medium',
            'generated_date'  => now(),
        ]);
    }

    private function mlPayload(int $productId, string $name, int $orderQty = 20): array
    {
        $value = $orderQty * 45.0;

        return [
            'plan' => [[
                'product_id'      => $productId,
                'product_name'    => $name,
                'current_stock'   => 3,
                'forecast_demand' => 48,
                'order_qty'       => $orderQty,
                'unit_cost'       => 45.0,
                'order_value'     => $value,
            ]],
            'total_order_value' => $value,
            'budget'            => 5000,
            'fitness'           => 12.5,
            'gen0_fitness'      => 900.0,
            'generations_run'   => 200,
            'confidence'        => 0.85,
        ];
    }

    public function test_replenishment_requires_budget(): void
    {
        $this->auth();

        $this->postJson('/api/optimization/replenishment', [])
            ->assertStatus(422);
    }

    public function test_replenishment_writes_pending_reorder_recommendations(): void
    {
        $this->auth();
        $product = $this->makeProduct();
        $this->addForecast($product);

        Http::fake(['*' => Http::response($this->mlPayload($product->product_id, $product->product_name), 200)]);

        $response = $this->postJson('/api/optimization/replenishment', ['budget' => 5000]);

        $response->assertOk()
            ->assertJsonPath('total_order_value', 900)
            ->assertJsonPath('budget', 5000)
            ->assertJsonPath('generations_run', 200)
            ->assertJsonPath('confidence', 0.85)
            ->assertJsonPath('recommendations_written', 1)
            ->assertJsonPath('plan.0.product_id', $product->product_id)
            ->assertJsonPath('plan.0.order_qty', 20);

        $this->assertDatabaseHas('Inventory_Recommendation', [
            'product_id'          => $product->product_id,
            'current_stock'       => 3,
            'recommended_stock'   => 23,
            'recommendation_type' => 'Reorder',
            'confidence_score'    => 0.85,
            'status'              => 'pending',
        ]);
    }

    public function test_plan_surfaces_in_recommendations_after_approval(): void
    {
        $this->auth();
        $product = $this->makeProduct();
        $this->addForecast($product);

        Http::fake(['*' => Http::response($this->mlPayload($product->product_id, $product->product_name), 200)]);

        $this->postJson('/api/optimization/replenishment', ['budget' => 5000])->assertOk();

        $recommendationId = $this->getJson('/api/recommendations?status=pending')
            ->json('data.0.recommendation_id');

        $this->postJson("/api/recommendations/{$recommendationId}/approve")->assertOk();

        $this->getJson('/api/recommendations?status=approved')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.product_id', $product->product_id)
            ->assertJsonPath('data.0.recommendation_type', 'Reorder');
    }

    public function test_replenishment_sends_demand_budget_and_expiry_features(): void
    {
        $this->auth();
        $product = $this->makeProduct();
        $this->addForecast($product, 48.0);

        Http::fake(['*' => function ($request) use ($product) {
            $body = $request->data();

            $this->assertStringEndsWith('/optimize/replenishment', $request->url());
            $this->assertSame(5000.0, $body['budget']);
            $this->assertSame(42, $body['seed']);
            $this->assertCount(1, $body['products']);

            $features = $body['products'][0];
            $this->assertSame($product->product_id, $features['product_id']);
            $this->assertSame(3, (int) $features['current_stock']);
            $this->assertSame(48.0, (float) $features['forecast_demand']);
            $this->assertSame(10.0, (float) $features['unit_cost']);
            $this->assertSame(15.0, (float) $features['selling_price']);
            $this->assertSame(0.3, $features['expiring_fraction']);

            return Http::response($this->mlPayload($product->product_id, $product->product_name), 200);
        }]);

        $this->postJson('/api/optimization/replenishment', ['budget' => 5000])->assertOk();
    }

    public function test_replenishment_returns_503_when_ml_service_offline(): void
    {
        $this->auth();
        $product = $this->makeProduct();
        $this->addForecast($product);

        Http::fake(['*' => function () {
            throw new ConnectionException('Connection refused');
        }]);

        $this->postJson('/api/optimization/replenishment', ['budget' => 5000])
            ->assertStatus(503)
            ->assertJsonPath('message', fn (string $m) => str_contains($m, 'unavailable'));
    }

    public function test_persist_false_skips_recommendations(): void
    {
        $this->auth();
        $product = $this->makeProduct();
        $this->addForecast($product);

        Http::fake(['*' => Http::response($this->mlPayload($product->product_id, $product->product_name), 200)]);

        $this->postJson('/api/optimization/replenishment', ['budget' => 5000, 'persist' => false])
            ->assertOk()
            ->assertJsonPath('recommendations_written', 0);

        $this->assertDatabaseCount('Inventory_Recommendation', 0);
    }
}
