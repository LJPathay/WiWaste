<?php

namespace Tests\Feature;

use App\Mail\AccountSecurityNotice;
use App\Models\Setting;
use App\Models\User;
use App\Services\EmailDeliverySettings;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class EmailDeliverySettingsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
        DB::purge('sqlite');
        Schema::create('User', function (Blueprint $table) {
            $table->integer('User_id')->autoIncrement();
            $table->string('Full_name');
            $table->string('username')->unique();
            $table->string('password');
            $table->string('email')->nullable()->unique();
            $table->string('role');
            $table->string('status');
            $table->dateTime('Created_at');
        });
        (require database_path('migrations/2026_07_22_065415_create_personal_access_tokens_table.php'))->up();
        (require database_path('migrations/2026_07_22_120000_create_settings_table.php'))->up();
        (require database_path('migrations/2026_10_14_000002_add_authentication_security_fields.php'))->up();
        Mail::fake();
    }

    private function account(string $role = 'Owner'): User
    {
        return User::create([
            'Full_name' => 'Email Settings '.$role,
            'username' => 'smtp-'.str_replace(' ', '-', strtolower($role)),
            'email' => str_replace(' ', '-', strtolower($role)).'@example.test',
            'password' => Hash::make('Existing1!'),
            'role' => $role,
            'status' => 'Active',
            'Created_at' => now(),
        ]);
    }

    private function authorize(User $user): void
    {
        $this->app['auth']->forgetGuards();
        $this->withToken($user->createToken('settings-session')->plainTextToken);
    }

    private function payload(): array
    {
        return [
            'enabled' => true,
            'host' => 'smtp.example.test',
            'port' => 587,
            'encryption' => 'tls',
            'username' => 'mailer@example.test',
            'password' => 'private-smtp-secret',
            'from_address' => 'security@example.test',
            'from_name' => 'WiWaste Security',
        ];
    }

    public function test_only_owner_and_admin_can_read_or_update_email_delivery(): void
    {
        $this->getJson('/api/settings/email')->assertUnauthorized();
        $this->putJson('/api/settings/email', $this->payload())->assertUnauthorized();
        foreach (['Inventory', 'Cashier', 'Business Owner', 'Pharmacist'] as $role) {
            $this->authorize($this->account($role));
            $this->getJson('/api/settings/email')->assertForbidden();
            $this->putJson('/api/settings/email', $this->payload())->assertForbidden();
        }
        foreach (['Owner', 'Admin'] as $role) {
            $this->authorize($this->account($role));
            $this->getJson('/api/settings/email')->assertOk();
            $this->putJson('/api/settings/email', $this->payload())->assertOk();
        }
        Mail::assertNothingSent();
    }

    public function test_credentials_are_encrypted_and_absent_from_all_settings_json(): void
    {
        $this->authorize($this->account());
        Setting::create(['key' => 'store_name', 'value' => 'QA Store']);
        $updated = $this->putJson('/api/settings/email', $this->payload())->assertOk()->assertJsonPath('password_configured', true);
        $encrypted = Setting::whereKey(EmailDeliverySettings::KEY)->value('value');
        $this->assertStringNotContainsString('private-smtp-secret', $encrypted);
        $this->assertStringNotContainsString('smtp.example.test', $encrypted);
        $stored = json_decode(Crypt::decryptString($encrypted), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('private-smtp-secret', $stored['password']);
        $this->assertLessThan(65535, strlen($encrypted));
        $read = $this->getJson('/api/settings/email')->assertOk();
        foreach ([$updated, $read] as $response) {
            $this->assertArrayNotHasKey('password', $response->json());
            $this->assertStringNotContainsString('private-smtp-secret', $response->getContent());
        }
        $this->getJson('/api/settings')->assertOk()->assertExactJson(['store_name' => 'QA Store']);
        Mail::assertNothingSent();
    }

    public function test_omitted_and_blank_password_preserve_existing_secret(): void
    {
        $this->authorize($this->account());
        $this->putJson('/api/settings/email', $this->payload())->assertOk();
        $payload = $this->payload();
        unset($payload['password']);
        $payload['host'] = 'changed.example.test';
        $this->putJson('/api/settings/email', $payload)->assertOk()->assertJsonPath('password_configured', true);
        $payload['password'] = '';
        $this->putJson('/api/settings/email', $payload)->assertOk()->assertJsonPath('password_configured', true);
        $stored = json_decode(Crypt::decryptString(Setting::whereKey(EmailDeliverySettings::KEY)->value('value')), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('private-smtp-secret', $stored['password']);
        $this->assertSame('changed.example.test', $stored['host']);
    }

    public function test_general_settings_cannot_overwrite_reserved_email_keys(): void
    {
        $this->authorize($this->account());
        $this->putJson('/api/settings/email', $this->payload())->assertOk();
        $before = Setting::whereKey(EmailDeliverySettings::KEY)->value('value');
        $this->putJson('/api/settings', ['store_name' => 'Changed', EmailDeliverySettings::KEY => 'plaintext'])->assertUnprocessable();
        $this->assertSame($before, Setting::whereKey(EmailDeliverySettings::KEY)->value('value'));
        $this->assertDatabaseMissing('Settings', ['key' => 'store_name']);
        $this->putJson('/api/settings', ['email.some-other-secret' => 'plaintext'])->assertUnprocessable();
        $this->putJson('/api/settings', ['EMAIL.DELIVERY' => 'plaintext'])->assertUnprocessable();
        $this->assertSame($before, Setting::whereKey(EmailDeliverySettings::KEY)->value('value'));
        $this->authorize($this->account('Inventory'));
        $this->putJson('/api/settings', ['store_name' => 'Changed'])->assertForbidden();
        $this->getJson('/api/settings')->assertOk()->assertExactJson([]);
    }

    public function test_email_settings_validate_host_port_encryption_and_sender(): void
    {
        $this->authorize($this->account());
        foreach ([['host', ''], ['host', 'https://smtp.example.test'], ['port', 0], ['port', 65536], ['encryption', 'invalid'], ['from_address', 'invalid'], ['password', str_repeat('a', 1025)]] as [$key, $value]) {
            $payload = $this->payload();
            $payload[$key] = $value;
            $this->putJson('/api/settings/email', $payload)->assertUnprocessable()->assertJsonValidationErrors($key);
        }
        $this->assertDatabaseCount('Settings', 0);
        $payload = $this->payload();
        $payload['enabled'] = false;
        $payload['host'] = null;
        $payload['from_address'] = null;
        $payload['from_name'] = null;
        $payload['username'] = null;
        unset($payload['password']);
        $this->putJson('/api/settings/email', $payload)->assertOk()->assertJsonPath('enabled', false)->assertJsonPath('host', '')->assertJsonPath('password_configured', false);
    }

    public function test_owner_smtp_settings_apply_to_login_mail_and_disabled_restores_environment(): void
    {
        $owner = $this->account();
        $environmentDefault = config('mail.default');
        $environmentFrom = config('mail.from');
        $this->authorize($owner);
        $this->putJson('/api/settings/email', $this->payload())->assertOk();
        Mail::assertNothingSent();
        $this->postJson('/api/login', ['email' => 'owner@example.test', 'password' => 'Existing1!'])->assertOk();
        Mail::assertSent(AccountSecurityNotice::class);
        $this->assertSame('owner-smtp', config('mail.default'));
        $this->assertSame('smtp.example.test', config('mail.mailers.owner-smtp.host'));
        $this->assertSame('smtp', config('mail.mailers.owner-smtp.scheme'));
        $this->assertTrue(config('mail.mailers.owner-smtp.auto_tls'));
        $this->assertTrue(config('mail.mailers.owner-smtp.require_tls'));
        $this->assertSame('mailer@example.test', config('mail.mailers.owner-smtp.username'));
        $this->assertSame('private-smtp-secret', config('mail.mailers.owner-smtp.password'));
        $this->assertSame('security@example.test', config('mail.from.address'));
        $payload = $this->payload();
        $payload['enabled'] = false;
        $this->putJson('/api/settings/email', $payload)->assertOk();
        app(EmailDeliverySettings::class)->apply();
        $this->assertSame($environmentDefault, config('mail.default'));
        $this->assertSame($environmentFrom, config('mail.from'));
        $this->assertNull(config('mail.mailers.owner-smtp'));
    }

    public function test_ssl_and_unencrypted_local_smtp_transport_modes_are_applied(): void
    {
        $this->authorize($this->account());
        $payload = $this->payload();
        $payload['encryption'] = 'ssl';
        $payload['port'] = 465;
        $this->putJson('/api/settings/email', $payload)->assertOk();
        app(EmailDeliverySettings::class)->apply();
        $this->assertSame('smtps', config('mail.mailers.owner-smtp.scheme'));
        $this->assertFalse(config('mail.mailers.owner-smtp.auto_tls'));
        $this->assertTrue(config('mail.mailers.owner-smtp.require_tls'));
        $payload['encryption'] = 'none';
        $payload['port'] = 2525;
        $payload['username'] = '';
        $this->putJson('/api/settings/email', $payload)->assertOk();
        app(EmailDeliverySettings::class)->apply();
        $this->assertSame('smtp', config('mail.mailers.owner-smtp.scheme'));
        $this->assertFalse(config('mail.mailers.owner-smtp.auto_tls'));
        $this->assertFalse(config('mail.mailers.owner-smtp.require_tls'));
        $this->assertNull(config('mail.mailers.owner-smtp.username'));
        Mail::assertNothingSent();
    }
}
