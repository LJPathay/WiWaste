<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\ForecastResult;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\SalesItem;
use App\Models\SalesTransaction;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ForecastTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private function makeUser(): User
    {
        return User::create([
            'Full_name'  => 'Test Owner',
            'username'   => 'forecast-owner',
            'password'   => Hash::make('password'),
            'email'      => 'owner@test.com',
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
        $category = Category::create(['Category_name' => 'Forecast Cat ' . random_int(1000, 9999)]);
        $supplier = Supplier::create([
            'supplier_name'  => 'Forecast Supplier',
            'contact_number' => '09171234567',
        ]);

        $product = Product::create(array_merge([
            'category_id'     => $category->Category_id,
            'supplier_id'     => $supplier->supplier_id,
            'barcode'         => '480' . str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT),
            'product_name'    => 'Forecast Product ' . random_int(100, 999),
            'cost_price'      => 10.00,
            'selling_price'   => 15.00,
            'reorder_level'   => 5,
            'expiration_date' => now()->addMonths(6),
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

    private function recordSale(Product $product, int $quantity = 3): void
    {
        $transaction = SalesTransaction::create([
            'user_id'           => $this->user->User_id,
            'total_amount'      => $quantity * 5.00,
            'transaction_date'  => now()->subDays(2),
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

    private function fakeMlService(array $payload): void
    {
        Http::fake(['*' => Http::response($payload, 200)]);
    }

    private function forecastPayload(int $productId): array
    {
        return [
            'product_id'    => $productId,
            'model'         => 'SARIMAX(1,1,1)x(1,0,0,7)',
            'mape'          => 5.0,
            'overstock_risk'=> 'Low',
            'series'        => [
                ['period' => '2026-08-13', 'predicted_demand' => 5, 'lower' => 3, 'upper' => 7, 'confidence' => 80],
                ['period' => '2026-08-14', 'predicted_demand' => 6, 'lower' => 4, 'upper' => 8, 'confidence' => 78],
            ],
        ];
    }

    public function test_generate_persists_forecast_rows(): void
    {
        $this->auth();
        $product = $this->makeProduct();
        $this->recordSale($product);
        $this->fakeMlService($this->forecastPayload($product->product_id));

        $response = $this->postJson('/api/forecast/generate');

        $response->assertOk()
            ->assertJsonPath('generated', 1);

        $this->assertDatabaseHas('Forecast_Result', [
            'product_id'      => $product->product_id,
            'forecast_period' => '2026-08-13',
            'predicted_demand' => 5,
            'overstock_risk'  => 'Low',
        ]);
        $this->assertDatabaseCount('Forecast_Result', 2);
    }

    public function test_generate_handles_product_with_no_sales(): void
    {
        $this->auth();
        $product = $this->makeProduct();
        $this->fakeMlService($this->forecastPayload($product->product_id));

        $this->postJson('/api/forecast/generate')->assertOk();

        $this->assertDatabaseCount('Forecast_Result', 2);
    }

    public function test_generate_returns_503_when_ml_service_offline(): void
    {
        $this->auth();
        $this->makeProduct();

        Http::fake(['*' => function () {
            throw new ConnectionException('Connection refused');
        }]);

        $this->postJson('/api/forecast/generate')
            ->assertStatus(503)
            ->assertJsonPath('message', fn (string $m) => str_contains($m, 'unavailable'));

        $this->assertDatabaseCount('Forecast_Result', 0);
    }

    public function test_artisan_command_generates_forecasts(): void
    {
        $this->auth();
        $product = $this->makeProduct();
        $this->fakeMlService($this->forecastPayload($product->product_id));

        $this->artisan('forecast:generate')->assertSuccessful();

        $this->assertDatabaseCount('Forecast_Result', 2);
    }

    public function test_overview_returns_well_formed_payload(): void
    {
        $this->auth();
        $product = $this->makeProduct();

        ForecastResult::create([
            'product_id'      => $product->product_id,
            'forecast_period' => '2026-08-13',
            'predicted_demand' => 5,
            'lower_bound'     => 3,
            'upper_bound'     => 7,
            'confidence'      => 80,
            'overstock_risk'  => 'High',
            'generated_date'  => now(),
        ]);
        ForecastResult::create([
            'product_id'      => $product->product_id,
            'forecast_period' => '2026-08-14',
            'predicted_demand' => 6,
            'lower_bound'     => 4,
            'upper_bound'     => 8,
            'confidence'      => 78,
            'overstock_risk'  => 'High',
            'generated_date'  => now(),
        ]);

        $response = $this->getJson('/api/forecast/overview');

        $response->assertOk()
            ->assertJsonPath('model', 'ARIMA/SARIMAX')
            ->assertJsonPath('total_products', 1)
            ->assertJsonCount(2, 'series')
            ->assertJsonCount(1, 'top_risks');

        $payload = $response->json();
        $this->assertGreaterThanOrEqual(0, $payload['avg_confidence']);
        $this->assertLessThanOrEqual(100, $payload['avg_confidence']);
        $this->assertNotEmpty($payload['generated_at']);
        $this->assertSame('2026-08-13', $payload['series'][0]['period']);
        $this->assertSame(5, (int) $payload['series'][0]['predicted_demand']);
    }

    public function test_show_returns_product_forecast(): void
    {
        $this->auth();
        $product = $this->makeProduct();

        ForecastResult::create([
            'product_id'      => $product->product_id,
            'forecast_period' => '2026-08-13',
            'predicted_demand' => 5,
            'lower_bound'     => 3,
            'upper_bound'     => 7,
            'confidence'      => 80,
            'overstock_risk'  => 'Medium',
            'generated_date'  => now(),
        ]);

        $response = $this->getJson("/api/forecast/{$product->product_id}");

        $response->assertOk()
            ->assertJsonPath('product_id', $product->product_id)
            ->assertJsonPath('product_name', $product->product_name)
            ->assertJsonPath('sku', $product->barcode)
            ->assertJsonPath('overstock_risk', 'Medium')
            ->assertJsonCount(1, 'series')
            ->assertJsonPath('series.0.lower', 3);
    }
}
