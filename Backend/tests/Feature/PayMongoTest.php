<?php

namespace Tests\Feature;

use App\Jobs\ProcessPayMongoWebhook;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\SalesItem;
use App\Models\SalesTransaction;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PayMongoTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'Full_name'  => 'Test Cashier',
            'username'   => 'cashier-paymongo',
            'password'   => Hash::make('password'),
            'email'      => 'cashier-paymongo@test.com',
            'role'       => 'Business Owner',
            'status'     => 'Active',
            'Created_at' => now(),
        ]);

        Sanctum::actingAs($this->user);

        config([
            'services.paymongo.secret_key'     => 'sk_test_123',
            'services.paymongo.public_key'     => 'pk_test_123',
            'services.paymongo.webhook_secret' => 'whsec_test_123',
            'services.paymongo.success_url'    => 'http://localhost:5173/pos/success',
            'services.paymongo.cancel_url'     => 'http://localhost:5173/cashier/pos',
            'services.paymongo.base_url'       => 'https://api.paymongo.com/v1',
        ]);
    }

    private function makeProduct(): Product
    {
        $category = Category::create(['Category_name' => 'PayMongo Category ' . random_int(1000, 9999)]);
        $supplier = Supplier::create([
            'supplier_name'  => 'PayMongo Supplier',
            'contact_number' => '09171234567',
        ]);

        $product = Product::create([
            'category_id'     => $category->Category_id,
            'supplier_id'     => $supplier->supplier_id,
            'barcode'         => '490' . str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT),
            'product_name'    => 'PayMongo Product ' . random_int(100, 999),
            'cost_price'      => 10.00,
            'selling_price'   => 15.00,
            'reorder_level'   => 5,
            'expiration_date' => now()->addMonths(6),
            'status'          => 'Active',
        ]);

        Inventory::create([
            'product_id'    => $product->product_id,
            'current_stock' => 50,
            'stock_status'  => 'Normal',
            'last_updated'  => now(),
        ]);

        return $product;
    }

    private function paymongoSalePayload(Product $product, array $overrides = []): array
    {
        return array_merge([
            'payment_method'    => 'PayMongo',
            'payment_reference' => 'GCash',
            'items'             => [
                ['product_id' => $product->product_id, 'quantity' => 3, 'unit_price' => 15.00],
            ],
        ], $overrides);
    }

    private function fakeCheckoutSession(): void
    {
        Http::fake([
            'https://api.paymongo.com/v1/checkout_sessions' => Http::response([
                'data' => [
                    'id'         => 'cs_123',
                    'type'       => 'checkout_session',
                    'attributes' => [
                        'checkout_url'   => 'https://checkout.paymongo.com/cs_123',
                        'payment_intent' => ['id' => 'pi_123', 'status' => 'awaiting_payment_method'],
                    ],
                ],
            ], 200),
        ]);
    }

    private function fakeIntent(string $status, string $method = 'gcash', string $paymentStatus = 'paid'): void
    {
        Http::fake([
            'https://api.paymongo.com/v1/payment_intents/*' => Http::response([
                'data' => [
                    'id'         => 'pi_123',
                    'type'       => 'payment_intent',
                    'attributes' => [
                        'status'                 => $status,
                        'amount'                 => 4500,
                        'currency'               => 'PHP',
                        'payment_method_allowed' => ['gcash', 'paymaya', 'card'],
                        'payments'               => [
                            [
                                'id'         => 'pay_123',
                                'type'       => 'payment',
                                'attributes' => [
                                    'status' => $paymentStatus,
                                    'source' => ['type' => $method],
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);
    }

    public function test_paymongo_sale_creates_pending_transaction_without_deducting_stock(): void
    {
        $this->fakeCheckoutSession();
        $product = $this->makeProduct();

        $response = $this->postJson('/api/sales', $this->paymongoSalePayload($product));

        $response->assertStatus(201)
            ->assertJsonPath('checkout_url', 'https://checkout.paymongo.com/cs_123')
            ->assertJsonPath('payment_intent_id', 'pi_123')
            ->assertJsonPath('status', 'pending');

        $transaction = SalesTransaction::where('payment_method', 'PayMongo')->firstOrFail();
        $this->assertSame('Pending', $transaction->status);
        $this->assertSame('pending', $transaction->payment_status);
        $this->assertSame('pi_123', $transaction->paymongo_intent_id);
        $this->assertSame('https://checkout.paymongo.com/cs_123', $transaction->paymongo_checkout_url);

        // No stock deduction, no stock movement at checkout time
        $this->assertDatabaseHas('Inventory', [
            'product_id'    => $product->product_id,
            'current_stock' => 50,
        ]);
        $this->assertDatabaseCount('Stock_Movement', 0);

        // The checkout session must be sent inside a JSON:API envelope with line_items
        Http::assertSent(function ($request) use ($product, $transaction) {
            $attributes = $request['data']['attributes'] ?? null;
            return $request->url() === 'https://api.paymongo.com/v1/checkout_sessions'
                && $attributes !== null
                && $attributes['line_items'][0]['name'] === $product->product_name
                && $attributes['line_items'][0]['amount'] === 4500
                && $attributes['line_items'][0]['quantity'] === 3
                && $attributes['line_items'][0]['currency'] === 'PHP'
                && in_array('paymaya', $attributes['payment_method_types'], true)
                && $attributes['metadata']['transaction_id'] === (string) $transaction->transaction_id
                && $attributes['metadata']['payment_reference'] === 'GCash';
        });
    }

    public function test_paid_payment_is_finalized_exactly_once(): void
    {
        $this->fakeCheckoutSession();
        $product = $this->makeProduct();
        $this->postJson('/api/sales', $this->paymongoSalePayload($product))->assertStatus(201);

        $transaction = SalesTransaction::where('payment_method', 'PayMongo')->firstOrFail();

        $this->fakeIntent('succeeded', 'gcash');

        $this->getJson("/api/paymongo/status/{$transaction->transaction_id}")
            ->assertOk()
            ->assertJsonPath('payment_status', 'paid')
            ->assertJsonPath('status', 'Completed')
            ->assertJsonPath('payment_reference', 'GCash');

        $transaction->refresh();
        $this->assertSame('Completed', $transaction->status);
        $this->assertSame('paid', $transaction->payment_status);

        $this->assertDatabaseHas('Inventory', [
            'product_id'    => $product->product_id,
            'current_stock' => 47,
        ]);
        $this->assertSame(1, SalesItem::where('transaction_id', $transaction->transaction_id)->count());
        $this->assertSame(1, StockMovement::where('product_id', $product->product_id)
            ->where('movement_type', 'Stock Out')
            ->where('quantity', 3)
            ->count());
    }

    public function test_finalize_is_idempotent_no_double_deduction(): void
    {
        $this->fakeCheckoutSession();
        $product = $this->makeProduct();
        $this->postJson('/api/sales', $this->paymongoSalePayload($product))->assertStatus(201);

        $transaction = SalesTransaction::where('payment_method', 'PayMongo')->firstOrFail();

        $this->fakeIntent('succeeded', 'paymaya');

        $this->getJson("/api/paymongo/status/{$transaction->transaction_id}")->assertOk();
        $this->getJson("/api/paymongo/status/{$transaction->transaction_id}")->assertOk();

        $this->assertDatabaseHas('Inventory', [
            'product_id'    => $product->product_id,
            'current_stock' => 47,
        ]);
        $this->assertSame(1, StockMovement::where('product_id', $product->product_id)
            ->where('movement_type', 'Stock Out')
            ->count());
    }

    public function test_paymaya_payment_reference_is_derived(): void
    {
        $this->fakeCheckoutSession();
        $product = $this->makeProduct();
        $this->postJson('/api/sales', $this->paymongoSalePayload($product))->assertStatus(201);

        $transaction = SalesTransaction::where('payment_method', 'PayMongo')->firstOrFail();

        $this->fakeIntent('succeeded', 'paymaya');

        $this->getJson("/api/paymongo/status/{$transaction->transaction_id}")
            ->assertOk()
            ->assertJsonPath('payment_status', 'paid')
            ->assertJsonPath('payment_reference', 'Maya');

        $transaction->refresh();
        $this->assertSame('Maya', $transaction->payment_reference);
    }

    public function test_webhook_rejects_bad_signature_and_accepts_valid_one(): void
    {
        $this->fakeCheckoutSession();
        $product = $this->makeProduct();
        $this->postJson('/api/sales', $this->paymongoSalePayload($product))->assertStatus(201);

        $transaction = SalesTransaction::where('payment_method', 'PayMongo')->firstOrFail();

        $payload = json_encode([
            'data' => [
                'id'         => 'evt_123',
                'type'       => 'event',
                'attributes' => [
                    'type' => 'payment.paid',
                    'data' => [
                        'id'         => 'pay_123',
                        'type'       => 'payment',
                        'attributes' => [
                            'status'         => 'paid',
                            'payment_intent' => ['id' => 'pi_123'],
                            'metadata'       => [
                                'transaction_id'    => (string) $transaction->transaction_id,
                                'payment_reference' => 'GCash',
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        // Wrong signature → 401
        $this->call('POST', '/api/paymongo/webhook', content: $payload, server: [
            'HTTP_X-Paymongo-Signature' => 'invalid-signature',
        ])->assertStatus(401);

        // Correct signature → 200 and a queued job
        Queue::fake();
        $signature = hash_hmac('sha256', $payload, 'whsec_test_123');
        $this->call('POST', '/api/paymongo/webhook', content: $payload, server: [
            'HTTP_X-Paymongo-Signature' => $signature,
        ])->assertOk()->assertJsonPath('received', true);

        Queue::assertPushed(ProcessPayMongoWebhook::class);
    }

    public function test_checkout_session_webhook_event_dispatches_job(): void
    {
        $this->fakeCheckoutSession();
        $product = $this->makeProduct();
        $this->postJson('/api/sales', $this->paymongoSalePayload($product))->assertStatus(201);

        $transaction = SalesTransaction::where('payment_method', 'PayMongo')->firstOrFail();

        $payload = json_encode([
            'data' => [
                'id'         => 'evt_456',
                'type'       => 'event',
                'attributes' => [
                    'type' => 'checkout_session.payment.paid',
                    'data' => [
                        'id'         => 'cs_123',
                        'type'       => 'checkout_session',
                        'attributes' => [
                            'payment_intent' => ['id' => 'pi_123'],
                            'metadata'       => [
                                'transaction_id'    => (string) $transaction->transaction_id,
                                'payment_reference' => 'GCash',
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        Queue::fake();
        $signature = hash_hmac('sha256', $payload, 'whsec_test_123');
        $this->call('POST', '/api/paymongo/webhook', content: $payload, server: [
            'HTTP_X-Paymongo-Signature' => $signature,
        ])->assertOk()->assertJsonPath('received', true);

        Queue::assertPushed(ProcessPayMongoWebhook::class);
    }

    public function test_unknown_webhook_event_is_ignored(): void
    {
        $payload = json_encode([
            'data' => [
                'id'         => 'evt_789',
                'type'       => 'event',
                'attributes' => [
                    'type' => 'checkout_session.created',
                    'data' => [
                        'id'         => 'cs_123',
                        'type'       => 'checkout_session',
                        'attributes' => [
                            'payment_intent' => ['id' => 'pi_123'],
                            'metadata'       => ['transaction_id' => '1'],
                        ],
                    ],
                ],
            ],
        ]);

        Queue::fake();
        $signature = hash_hmac('sha256', $payload, 'whsec_test_123');
        $this->call('POST', '/api/paymongo/webhook', content: $payload, server: [
            'HTTP_X-Paymongo-Signature' => $signature,
        ])->assertOk()->assertJsonPath('received', true);

        Queue::assertNothingPushed();
    }

    public function test_timestamped_signature_and_flattened_envelope_are_accepted(): void
    {
        $this->fakeCheckoutSession();
        $product = $this->makeProduct();
        $this->postJson('/api/sales', $this->paymongoSalePayload($product))->assertStatus(201);

        $transaction = SalesTransaction::where('payment_method', 'PayMongo')->firstOrFail();

        $payload = json_encode([
            'data' => [
                'type'     => 'checkout_session.payment.paid',
                'resource' => 'checkout_session',
                'livemode' => false,
                'data'     => [
                    'id'         => 'cs_123',
                    'type'       => 'checkout_session',
                    'attributes' => [
                        'payment_intent' => ['id' => 'pi_123'],
                        'metadata'       => [
                            'transaction_id'    => (string) $transaction->transaction_id,
                            'payment_reference' => 'GCash',
                        ],
                    ],
                ],
            ],
        ]);

        Queue::fake();
        $timestamp = (string) time();
        $te = hash_hmac('sha256', $timestamp . '.' . $payload, 'whsec_test_123');
        $header = "t={$timestamp},te={$te},li=";

        $this->call('POST', '/api/paymongo/webhook', content: $payload, server: [
            'HTTP_Paymongo-Signature' => $header,
        ])->assertOk()->assertJsonPath('received', true);

        Queue::assertPushed(ProcessPayMongoWebhook::class);
    }

    public function test_cash_sale_path_is_unchanged(): void
    {
        $product = $this->makeProduct();

        $response = $this->postJson('/api/sales', [
            'payment_method'  => 'Cash',
            'amount_tendered' => 100,
            'change_due'      => 10,
            'items'           => [
                ['product_id' => $product->product_id, 'quantity' => 2, 'unit_price' => 15.00],
            ],
        ]);

        $response->assertStatus(201);

        $transaction = SalesTransaction::where('payment_method', 'Cash')->firstOrFail();
        $this->assertSame('Completed', $transaction->status);
        $this->assertNull($transaction->payment_status);

        $this->assertDatabaseHas('Inventory', [
            'product_id'    => $product->product_id,
            'current_stock' => 48,
        ]);
        $this->assertSame(1, StockMovement::where('product_id', $product->product_id)
            ->where('movement_type', 'Stock Out')
            ->where('quantity', 2)
            ->count());
    }
}
