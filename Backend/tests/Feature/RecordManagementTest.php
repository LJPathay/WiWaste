<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RecordManagementTest extends TestCase
{
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        // These tests never connect to the configured application database.
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:', 'database.connections.sqlite.url' => null]);
        DB::purge('sqlite');
        foreach ([
            '0001_01_01_000000_create_users_table.php',
            '2024_01_01_000001_create_category_table.php',
            '2024_01_01_000002_create_supplier_table.php',
            '2024_01_01_000003_create_product_table.php',
            '2024_01_01_000004_create_inventory_table.php',
            '2026_07_22_065415_create_personal_access_tokens_table.php',
            '2026_07_22_140000_create_audit_log_table.php',
        ] as $file) {
            (require database_path('migrations/'.$file))->up();
        }
        foreach (['User', 'Supplier', 'Product', 'Inventory', 'Audit_Log'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                $blueprint->integer('business_id')->nullable();
                if ($table !== 'Supplier' && $table !== 'Product') {
                    $blueprint->integer('branch_id')->nullable();
                }
            });
        }
        (require database_path('migrations/2026_10_14_000001_add_record_management_fields.php'))->up();
        $this->admin = $this->makeUser(['role' => 'Admin']);
        Sanctum::actingAs($this->admin);
    }

    private function makeUser(array $overrides = []): User
    {
        $suffix = bin2hex(random_bytes(4));

        return User::create(array_merge([
            'Full_name' => 'Test User '.$suffix,
            'First_name' => 'Test',
            'Surname' => 'User '.$suffix,
            'contact_number' => '09171234567',
            'username' => 'user-'.$suffix,
            'password' => 'Secure123!',
            'email' => $suffix.'@example.com',
            'role' => 'Inventory',
            'status' => 'Active',
            'Created_at' => now(),
        ], $overrides));
    }

    private function newUserPayload(array $overrides = []): array
    {
        return array_merge([
            'First_name' => 'Maria', 'Middle_name' => 'Reyes', 'Surname' => 'Santos',
            'contact_number' => '09171234567', 'username' => 'maria',
            'password' => 'Secure1!', 'email' => 'maria@example.com', 'role' => 'Admin', 'status' => 'Active', 'address' => 'City',
        ], $overrides);
    }

    private function makeProduct(array $overrides = []): Product
    {
        $category = Category::create(['Category_name' => 'Category '.bin2hex(random_bytes(4))]);
        $supplier = Supplier::create(['supplier_name' => 'Supplier', 'contact_number' => '09171234567', 'email' => 'supplier@example.com', 'address' => 'City']);
        $product = Product::create(array_merge([
            'product_name' => 'Sample Product', 'category_id' => $category->Category_id,
            'supplier_id' => $supplier->supplier_id, 'cost_price' => 10, 'selling_price' => 20,
            'reorder_level' => 5, 'status' => 'Active',
        ], $overrides));
        Inventory::create(['product_id' => $product->product_id, 'current_stock' => 12, 'stock_status' => 'Normal', 'last_updated' => now()]);

        return $product;
    }

    public function test_user_creation_requires_structured_identity_email_and_eight_character_password(): void
    {
        $this->postJson('/api/users', $this->newUserPayload(['email' => null, 'First_name' => '', 'Surname' => '', 'contact_number' => '0917abc', 'password' => 'Short1!']))
            ->assertUnprocessable()->assertJsonValidationErrors(['email', 'First_name', 'Surname', 'contact_number', 'password']);
        $response = $this->postJson('/api/users', $this->newUserPayload())
            ->assertCreated()->assertJsonPath('user.name', 'Maria Reyes Santos')
            ->assertJsonPath('user.First_name', 'Maria')->assertJsonPath('user.role', 'Admin')->assertJsonPath('user.address', 'City');
        $user = User::findOrFail($response->json('id'));
        $this->assertTrue(Hash::check('Secure1!', $user->password));
        $this->assertArrayNotHasKey('password', $response->json('user'));
        $this->assertStringNotContainsString('Secure1!', AuditLog::latest('log_id')->first()->new_values);
    }

    public function test_existing_password_cannot_be_changed_through_user_edit(): void
    {
        $user = $this->makeUser();
        $hash = $user->password;
        $this->putJson('/api/users/'.$user->User_id, ['password' => 'AnotherPassword1!'])
            ->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->assertSame($hash, $user->fresh()->password);
        $this->putJson('/api/users/'.$user->User_id, ['password' => null])
            ->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_account_password_rejects_control_characters_and_more_than_seventy_two_bytes(): void
    {
        foreach (['Aa1!'.str_repeat('b', 69), 'Aa1!'.str_repeat('密', 23), "Aa1!\0abcd", "Aa1!\u{0085}abcd", 'Abcd123 '] as $password) {
            $this->postJson('/api/users', $this->newUserPayload(['password' => $password]))
                ->assertUnprocessable()->assertJsonValidationErrors('password');
        }
        foreach (['Aa1!'.str_repeat('b', 68), 'Aa1!'.str_repeat('密', 22).'ab'] as $index => $password) {
            $this->assertSame(72, strlen($password));
            $this->postJson('/api/users', $this->newUserPayload(['username' => 'boundary-'.$index, 'email' => 'boundary-'.$index.'@example.test', 'password' => $password]))->assertCreated();
        }
    }

    public function test_legacy_business_owner_is_cashier_and_has_no_management_privileges(): void
    {
        $response = $this->postJson('/api/users', $this->newUserPayload(['role' => 'Business Owner']))
            ->assertCreated()->assertJsonPath('user.role', 'Cashier');
        $user = User::findOrFail($response->json('id'));
        $this->assertFalse($user->canManageUsers());
        $this->assertFalse((new User(['role' => 'Business Owner']))->canManageUsers());
        Sanctum::actingAs($user);
        $this->getJson('/api/users')->assertForbidden();
    }

    public function test_record_migration_preserves_legacy_names_email_and_status_without_fabricating_contacts(): void
    {
        $migration = require database_path('migrations/2026_10_14_000001_add_record_management_fields.php');
        $migration->down();
        $id = DB::table('User')->insertGetId([
            'Full_name' => 'Maria Reyes Santos', 'username' => 'legacy', 'password' => Hash::make('Secure1!'),
            'email' => null, 'role' => 'Business Owner', 'status' => 'Quarantined', 'Created_at' => now(),
        ], 'User_id');
        $migration->up();
        $user = User::findOrFail($id);
        $this->assertSame('Maria Reyes Santos', $user->Full_name);
        $this->assertSame('Maria', $user->First_name);
        $this->assertSame('Reyes', $user->Middle_name);
        $this->assertSame('Santos', $user->Surname);
        $this->assertSame('Quarantined', $user->status);
        $this->assertSame('Cashier', $user->role);
        $this->assertNull($user->email);
        $this->assertNull($user->contact_number);
        $this->assertDatabaseCount('User', 2);
    }

    public function test_administrator_cannot_edit_or_list_users_in_another_business(): void
    {
        $this->admin->update(['business_id' => 10]);
        $other = $this->makeUser(['business_id' => 20]);
        $this->getJson('/api/users')->assertOk()->assertJsonCount(1);
        $this->putJson('/api/users/'.$other->User_id, ['email' => 'changed@example.com'])->assertNotFound();
        $this->assertNotSame('changed@example.com', $other->fresh()->email);
    }

    public function test_all_user_statuses_are_retained_confirmed_audited_filterable_and_reactivatable(): void
    {
        $user = $this->makeUser();
        $user->createToken('existing-session');
        $this->putJson('/api/users/'.$user->User_id, ['status' => 'Inactive'])
            ->assertUnprocessable()->assertJsonValidationErrors('status_change_confirmed');
        foreach (['Inactive', 'Quarantined', 'Archived'] as $status) {
            $this->putJson('/api/users/'.$user->User_id, ['status' => $status, 'status_change_confirmed' => true])
                ->assertOk()->assertJsonPath('user.status', $status)
                ->assertJsonPath('user.status_changed_by', $this->admin->User_id)
                ->assertJsonPath('user.status_changed_by_user.name', $this->admin->Full_name);
            $this->getJson('/api/users?status='.$status)->assertOk()->assertJsonPath('0.id', $user->User_id);
            $this->assertDatabaseHas('User', ['User_id' => $user->User_id, 'status' => $status]);
        }
        $this->assertSame(0, $user->tokens()->count());
        $this->assertNotNull($user->fresh()->archived_at);
        $this->assertNotNull($user->fresh()->status_changed_at);
        $this->assertSame(3, AuditLog::where('entity_type', 'User')->where('entity_id', $user->User_id)->count());
        $this->getJson('/api/users')->assertOk()->assertJsonCount(2);
        $this->postJson('/api/users/'.$user->User_id.'/reactivate', ['status_change_confirmed' => true])
            ->assertOk()->assertJsonPath('user.status', 'Active');
        $this->assertNull($user->fresh()->archived_at);
        $this->deleteJson('/api/users/'.$user->User_id, ['status_change_confirmed' => true])->assertOk();
        $this->assertDatabaseHas('User', ['User_id' => $user->User_id, 'status' => 'Archived']);
    }

    public function test_cashier_cannot_manage_users_or_catalog_records(): void
    {
        Sanctum::actingAs($this->makeUser(['role' => 'Cashier']));
        $this->getJson('/api/users')->assertForbidden();
        $this->postJson('/api/users', $this->newUserPayload())->assertForbidden();
        $this->postJson('/api/suppliers', [])->assertForbidden();
        $this->postJson('/api/products', [])->assertForbidden();
        $this->postJson('/api/categories', [])->assertForbidden();
    }

    public function test_supplier_requires_all_fields_and_rejects_invalid_contact_on_create_and_edit(): void
    {
        $this->postJson('/api/suppliers', ['supplier_name' => 'Supplier', 'contact_number' => '09171234567'])
            ->assertUnprocessable()->assertJsonValidationErrors(['email', 'address']);
        $payload = ['supplier_name' => 'Supplier', 'contact_number' => '09171234567', 'email' => 'supplier@example.com', 'address' => 'City'];
        foreach (['123456', '123456789012', '0917abc4567', '+639171234567', '0917-1234567'] as $invalid) {
            $this->postJson('/api/suppliers', array_merge($payload, ['contact_number' => $invalid]))
                ->assertUnprocessable()->assertJsonValidationErrors('contact_number');
        }
        $response = $this->postJson('/api/suppliers', $payload)->assertCreated()->assertJsonPath('email', 'supplier@example.com');
        $id = $response->json('id');
        $this->putJson('/api/suppliers/'.$id, ['contact_number' => 'letters'])
            ->assertUnprocessable()->assertJsonValidationErrors('contact_number');
        $this->putJson('/api/suppliers/'.$id, ['supplier_name' => '', 'email' => null, 'address' => null])
            ->assertUnprocessable()->assertJsonValidationErrors(['supplier_name', 'email', 'address']);
    }

    public function test_category_archives_with_related_products_and_can_be_restored(): void
    {
        $product = $this->makeProduct();
        $id = $product->category_id;
        $this->deleteJson('/api/categories/'.$id)->assertOk()->assertJsonPath('status', 'Archived');
        $this->assertDatabaseHas('Category', ['Category_id' => $id, 'status' => 'Archived', 'archived_by' => $this->admin->User_id]);
        $this->assertDatabaseHas('Product', ['product_id' => $product->product_id, 'category_id' => $id]);
        $this->deleteJson('/api/suppliers/'.$product->supplier_id)->assertStatus(409);
        $this->getJson('/api/categories')->assertOk()->assertJsonCount(0);
        $this->getJson('/api/categories?status=Archived')->assertOk()->assertJsonPath('0.id', $id);
        $this->getJson('/api/categories?include_archived=true')->assertOk()->assertJsonCount(1);
        $this->deleteJson('/api/categories/'.$id)->assertOk();
        $this->assertSame(1, AuditLog::where('entity_type', 'Category')->count());
        $this->postJson('/api/categories/'.$id.'/restore')->assertOk()->assertJsonPath('status', 'Active');
        $this->assertNull(Category::findOrFail($id)->archived_at);
    }

    public function test_product_archive_is_idempotent_preserves_inventory_and_lookup_excludes_archive(): void
    {
        $product = $this->makeProduct();
        $id = $product->product_id;
        $this->deleteJson('/api/products/'.$id)->assertOk()->assertJsonPath('status', 'Archived');
        $this->deleteJson('/api/products/'.$id)->assertOk()->assertJsonPath('status', 'Archived');
        $this->assertDatabaseHas('Inventory', ['product_id' => $id, 'current_stock' => 12]);
        $this->getJson('/api/products')->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/products?status=Archived')->assertOk()->assertJsonPath('data.0.id', $id);
        $this->getJson('/api/products?include_archived=true')->assertOk()->assertJsonPath('total', 1);
        $this->getJson('/api/products/lookup/'.$product->barcode)->assertNotFound();
        $this->postJson('/api/products/'.$id.'/restore')->assertOk()->assertJsonPath('status', 'Active');
        $this->getJson('/api/products/lookup/'.$id)->assertOk()->assertJsonPath('id', $id);
        $this->assertSame(2, AuditLog::where('entity_type', 'Product')->count());
    }

    public function test_restore_preserves_a_products_previous_discontinued_status(): void
    {
        $product = $this->makeProduct(['status' => 'Discontinued']);
        $this->deleteJson('/api/products/'.$product->product_id)->assertOk();
        $this->assertSame('Discontinued', $product->fresh()->archive_previous_status);
        $this->postJson('/api/products/'.$product->product_id.'/restore')->assertOk()->assertJsonPath('status', 'Discontinued');
    }
}
