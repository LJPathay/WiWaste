<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureActiveUser;
use App\Mail\AccountSecurityNotice;
use App\Mail\PasswordResetOtp;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Mail\PendingMail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Mockery;
use Tests\TestCase;

class AuthenticationSecurityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Dedicated in-memory fixtures never connect to or reset application data.
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
            $table->dateTime('archived_at')->nullable();
        });
        (require database_path('migrations/2026_07_22_065415_create_personal_access_tokens_table.php'))->up();
        (require database_path('migrations/2026_10_14_000002_add_authentication_security_fields.php'))->up();
        (require database_path('migrations/2026_07_22_120000_create_settings_table.php'))->up();
        Mail::fake();
    }

    private function account(array $attributes = []): User
    {
        return User::create(array_merge([
            'Full_name' => 'Security Test User',
            'username' => 'security-user',
            'password' => Hash::make('Existing1!'),
            'email' => 'security@example.test',
            'role' => 'Admin',
            'status' => 'Active',
            'Created_at' => now(),
        ], $attributes));
    }

    private function signIn(string $password = 'Existing1!')
    {
        return $this->withHeader('User-Agent', 'QA Browser')->postJson('/api/login', ['username' => 'security-user', 'password' => $password]);
    }

    private function resetPayload(string $code): array
    {
        return ['email' => 'security@example.test', 'otp' => $code, 'password' => 'Changed2!', 'password_confirmation' => 'Changed2!'];
    }

    private function requestCode(): string
    {
        $this->postJson('/api/forgot-password', ['email' => 'security@example.test'])->assertOk();

        return Mail::sent(PasswordResetOtp::class)->last()->code;
    }

    public function test_fifth_failure_locks_account_across_ips_and_correct_password_until_fifteen_minutes(): void
    {
        $user = $this->account();
        $this->freezeTime();
        for ($attempt = 1; $attempt < 5; $attempt++) {
            $this->signIn('wrong')->assertUnprocessable();
            $this->assertSame($attempt, $user->fresh()->failed_login_attempts);
        }

        $this->signIn('wrong')->assertStatus(423)->assertJsonPath('retry_after', 900);
        $lockedUntil = $user->fresh()->locked_until;
        Mail::assertSent(AccountSecurityNotice::class, fn ($mail) => $mail->event === 'lockout' && $mail->ipAddress === '127.0.0.1' && $mail->device === 'QA Browser' && $mail->lockedUntil === $lockedUntil->toIso8601String());

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.20']);
        $this->signIn()->assertStatus(423);
        $this->travel(14)->minutes();
        $this->signIn()->assertStatus(423)->assertJsonPath('retry_after', 60);
        $this->assertTrue($user->fresh()->locked_until->equalTo($lockedUntil));
        Mail::assertSentCount(5);

        $this->travel(1)->minutes();
        $this->signIn()->assertOk()->assertJsonStructure(['token', 'user']);
        $this->assertSame(0, $user->fresh()->failed_login_attempts);
        $this->assertNull($user->fresh()->locked_until);
        Mail::assertSentCount(6);
    }

    public function test_each_successful_login_sends_notice_and_resets_consecutive_failure_count(): void
    {
        $user = $this->account();
        for ($attempt = 0; $attempt < 3; $attempt++) {
            $this->signIn('wrong')->assertUnprocessable();
        }
        $this->signIn()->assertOk();
        $this->signIn()->assertOk();
        $this->assertCount(2, Mail::sent(AccountSecurityNotice::class, fn ($mail) => $mail->event === 'login'));
        $this->assertCount(3, Mail::sent(AccountSecurityNotice::class, fn ($mail) => $mail->event === 'failed_login'));
        Mail::assertSent(AccountSecurityNotice::class, fn ($mail) => $mail->event === 'login' && $mail->occurredAt && $mail->ipAddress && $mail->device === 'QA Browser');
        $this->assertSame(0, $user->fresh()->failed_login_attempts);
        $this->signIn('wrong')->assertUnprocessable();
        $this->assertSame(1, $user->fresh()->failed_login_attempts);
    }

    public function test_unknown_username_does_not_lock_a_registered_account(): void
    {
        $user = $this->account();
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/login', ['username' => 'unknown', 'password' => 'wrong'])->assertUnprocessable();
        }
        $this->assertSame(0, $user->fresh()->failed_login_attempts);
        $this->signIn()->assertOk();
        Mail::assertSentCount(1);
    }

    public function test_login_accepts_registered_email_in_existing_field_or_email_alias(): void
    {
        $this->account();
        $this->postJson('/api/login', ['username' => '  SECURITY@EXAMPLE.TEST  ', 'password' => 'Existing1!'])->assertOk()->assertJsonPath('user.username', 'security-user');
        $this->postJson('/api/login', ['email' => 'SECURITY@EXAMPLE.TEST', 'password' => 'Existing1!'])->assertOk();
        $this->assertCount(2, Mail::sent(AccountSecurityNotice::class, fn ($mail) => $mail->event === 'login'));
    }

    public function test_email_and_username_share_same_account_failure_counter(): void
    {
        $user = $this->account();
        $this->signIn('wrong')->assertUnprocessable();
        $this->postJson('/api/login', ['email' => 'SECURITY@EXAMPLE.TEST', 'password' => 'wrong'])->assertUnprocessable();
        $this->assertSame(2, $user->fresh()->failed_login_attempts);
    }

    public function test_disabled_and_archived_accounts_are_denied_login_and_existing_tokens(): void
    {
        $user = $this->account();
        $token = $user->createToken('existing')->plainTextToken;
        foreach (['Inactive', 'Quarantined', 'Archived'] as $status) {
            $user->forceFill(['status' => $status])->save();
            $this->signIn()->assertForbidden();
            $this->withToken($token)->getJson('/api/me')->assertForbidden();
            $this->app['auth']->forgetGuards();
        }
        Mail::assertNothingSent();
    }

    public function test_application_routes_require_authentication_while_health_is_public(): void
    {
        foreach (['me', 'users', 'products', 'categories', 'settings', 'sales'] as $path) {
            $this->getJson('/api/'.$path)->assertUnauthorized();
        }
        $this->getJson('/api/health')->assertOk();
        $this->postJson('/api/logout')->assertUnauthorized();
    }

    public function test_reset_code_is_hashed_single_use_and_revokes_existing_tokens(): void
    {
        $user = $this->account();
        $oldToken = $user->createToken('old-session')->plainTextToken;
        $code = $this->requestCode();
        $stored = DB::table('password_reset_otps')->first();
        $this->assertNotSame($code, $stored->code_hash);
        $this->assertTrue(Hash::check($code, $stored->code_hash));

        $this->postJson('/api/reset-password', $this->resetPayload($code))->assertOk();
        $this->assertTrue(Hash::check('Changed2!', $user->fresh()->password));
        $this->assertDatabaseCount('password_reset_otps', 0);
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->withToken($oldToken)->getJson('/api/me')->assertUnauthorized();
        $this->postJson('/api/reset-password', $this->resetPayload($code))->assertUnprocessable();
    }

    public function test_reset_code_expires_at_ten_minutes(): void
    {
        $user = $this->account();
        $this->freezeTime();
        $code = $this->requestCode();
        $this->travel(10)->minutes();
        $this->postJson('/api/reset-password', $this->resetPayload($code))->assertUnprocessable()->assertJsonValidationErrors('otp');
        $this->assertTrue(Hash::check('Existing1!', $user->fresh()->password));
    }

    public function test_reset_code_is_blocked_after_five_incorrect_guesses(): void
    {
        $this->account();
        $code = $this->requestCode();
        $wrongCode = $code === '000000' ? '000001' : '000000';
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/reset-password', $this->resetPayload($wrongCode))->assertUnprocessable();
        }
        $this->postJson('/api/reset-password', $this->resetPayload($code))->assertUnprocessable();
        $this->assertDatabaseHas('password_reset_otps', ['attempts' => 5]);
    }

    public function test_resend_cooldown_then_new_code_invalidates_previous_code(): void
    {
        $this->account();
        $this->freezeTime();
        $this->requestCode();
        $firstHash = DB::table('password_reset_otps')->value('code_hash');
        $this->postJson('/api/forgot-password', ['email' => 'security@example.test'])->assertStatus(429)->assertJsonPath('retry_after', 60);
        Mail::assertSentCount(1);
        $this->travel(1)->minutes();
        $newCode = $this->requestCode();
        $this->assertNotSame($firstHash, DB::table('password_reset_otps')->value('code_hash'));
        $this->postJson('/api/reset-password', $this->resetPayload($newCode))->assertOk();
    }

    public function test_password_reset_preserves_active_login_lockout(): void
    {
        $user = $this->account();
        $user->forceFill(['failed_login_attempts' => 5, 'locked_until' => now()->addMinutes(15)])->save();
        $code = $this->requestCode();
        $this->postJson('/api/reset-password', $this->resetPayload($code))->assertOk();
        $this->signIn('Changed2!')->assertStatus(423);
    }

    public function test_unknown_or_disabled_email_gets_generic_response_without_sending_code(): void
    {
        $this->account(['status' => 'Inactive']);
        $known = $this->postJson('/api/forgot-password', ['email' => 'security@example.test'])->assertOk();
        $unknown = $this->postJson('/api/forgot-password', ['email' => 'unknown@example.test'])->assertOk();
        $this->assertSame($known->json(), $unknown->json());
        $this->assertDatabaseCount('password_reset_otps', 0);
        Mail::assertNothingSent();
    }

    public function test_reset_validates_password_confirmation_and_strength(): void
    {
        $this->account();
        $code = $this->requestCode();
        $payload = $this->resetPayload($code);
        $payload['password_confirmation'] = 'mismatch';
        $this->postJson('/api/reset-password', $payload)->assertUnprocessable()->assertJsonValidationErrors('password');
        $payload['password'] = $payload['password_confirmation'] = 'weakpass';
        $this->postJson('/api/reset-password', $payload)->assertUnprocessable()->assertJsonValidationErrors('password');
        $payload['password'] = $payload['password_confirmation'] = str_repeat('密', 30).'Strong1!';
        $this->postJson('/api/reset-password', $payload)->assertUnprocessable()->assertJsonValidationErrors('password');
        $payload['password'] = $payload['password_confirmation'] = "Strong1!\0extra";
        $this->postJson('/api/reset-password', $payload)->assertUnprocessable()->assertJsonValidationErrors('password');
        $payload['password'] = $payload['password_confirmation'] = "Strong1!\u{0085}extra";
        $this->postJson('/api/reset-password', $payload)->assertUnprocessable()->assertJsonValidationErrors('password');
        $payload['password'] = $payload['password_confirmation'] = 'Strong1 password';
        $this->postJson('/api/reset-password', $payload)->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->postJson('/api/reset-password', $this->resetPayload($code))->assertOk();
    }

    public function test_failed_reset_mail_returns_service_error_and_removes_unusable_code(): void
    {
        $this->account();
        $pending = Mockery::mock(PendingMail::class);
        $pending->shouldReceive('send')->once()->andThrow(new \RuntimeException('Transport unavailable'));
        Mail::shouldReceive('to')->once()->with('security@example.test')->andReturn($pending);
        Mail::shouldReceive('forgetMailers')->once()->andReturnSelf();

        $this->postJson('/api/forgot-password', ['email' => 'security@example.test'])->assertStatus(503);
        $this->assertDatabaseCount('password_reset_otps', 0);
    }

    public function test_security_mail_failure_does_not_undo_account_lockout(): void
    {
        $user = $this->account();
        $pending = Mockery::mock(PendingMail::class);
        $pending->shouldReceive('send')->times(5)->andThrow(new \RuntimeException('Transport unavailable'));
        Mail::shouldReceive('to')->times(5)->with('security@example.test')->andReturn($pending);
        Mail::shouldReceive('forgetMailers')->times(5)->andReturnSelf();
        for ($attempt = 0; $attempt < 4; $attempt++) {
            $this->signIn('wrong')->assertUnprocessable();
        }
        $this->signIn('wrong')->assertStatus(423);
        $this->assertNotNull($user->fresh()->locked_until);
        $this->signIn()->assertStatus(423);
    }

    public function test_security_mail_renders_activity_details_and_escapes_device_text(): void
    {
        $notice = new AccountSecurityNotice('Test Person', 'lockout', '2026-10-14T00:00:00+00:00', '203.0.113.5', '<script>browser</script>', '2026-10-14T00:15:00+00:00');
        $html = $notice->render();
        $this->assertStringContainsString('203.0.113.5', $html);
        $this->assertStringContainsString('2026-10-14T00:00:00+00:00', $html);
        $this->assertStringContainsString('2026-10-14T00:15:00+00:00', $html);
        $this->assertStringContainsString('&lt;script&gt;browser&lt;/script&gt;', $html);
        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringContainsString('123456', (new PasswordResetOtp('Test Person', '123456', 10))->render());
    }

    public function test_cashier_cannot_access_admin_apis_or_approve_returns(): void
    {
        $user = $this->account(['role' => 'Cashier']);
        $token = $user->createToken('cashier-session')->plainTextToken;
        foreach (['users', 'settings', 'audit-logs', 'dashboard/overview', 'inventory', 'suppliers'] as $path) {
            $this->withToken($token)->getJson('/api/'.$path)->assertForbidden();
        }
        $this->withToken($token)->postJson('/api/returns/1/approve')->assertForbidden();
        $this->withToken($token)->postJson('/api/products', [])->assertForbidden();
        $this->withToken($token)->getJson('/api/me')->assertOk();
    }

    public function test_cashier_routes_allow_pos_reads_sales_returns_and_shift_operations(): void
    {
        $cashier = $this->account(['role' => 'Cashier']);
        foreach ([['GET', '/api/products'], ['GET', '/api/products/lookup/123'], ['GET', '/api/categories'], ['GET', '/api/sales'], ['GET', '/api/sales/1/receipt'], ['POST', '/api/sales'], ['GET', '/api/returns'], ['POST', '/api/returns'], ['POST', '/api/shifts/open'], ['POST', '/api/shifts/close']] as [$method, $path]) {
            $request = Request::create($path, $method);
            $request->setUserResolver(fn () => $cashier);
            $response = (new EnsureActiveUser)->handle($request, fn () => response()->json(['allowed' => true]));
            $this->assertSame(200, $response->getStatusCode(), $method.' '.$path);
        }
    }

    public function test_cashier_only_sees_own_sales_and_receipts(): void
    {
        $cashier = $this->account(['role' => 'Cashier']);
        $other = $this->account(['role' => 'Cashier', 'username' => 'other-cashier', 'email' => 'other@example.test']);
        (require database_path('migrations/2024_01_01_000005_create_sales_transaction_table.php'))->up();
        Schema::create('Sales_Item', function (Blueprint $table) {
            $table->integer('sales_item_id')->autoIncrement();
            $table->integer('transaction_id');
        });
        foreach ([$cashier, $other] as $user) {
            DB::table('Sales_Transaction')->insert([
                'user_id' => $user->getKey(), 'total_amount' => 50, 'transaction_date' => now(), 'payment_method' => 'Cash', 'status' => 'Completed',
            ]);
        }
        $ownId = DB::table('Sales_Transaction')->where('user_id', $cashier->getKey())->value('transaction_id');
        $otherId = DB::table('Sales_Transaction')->where('user_id', $other->getKey())->value('transaction_id');
        $token = $cashier->createToken('cashier-session')->plainTextToken;
        $this->withToken($token)->getJson('/api/sales')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $ownId);
        $this->withToken($token)->getJson('/api/sales/'.$ownId)->assertOk();
        $this->withToken($token)->getJson('/api/sales/'.$otherId)->assertNotFound();
        $this->withToken($token)->getJson('/api/sales/'.$otherId.'/receipt')->assertNotFound();
    }

    public function test_cashier_only_sees_own_return_requests(): void
    {
        $cashier = $this->account(['role' => 'Cashier']);
        $other = $this->account(['role' => 'Cashier', 'username' => 'other-cashier', 'email' => 'other@example.test']);
        Schema::create('Return_Transaction', function (Blueprint $table) {
            $table->integer('return_id')->autoIncrement();
            $table->integer('user_id');
            $table->integer('sale_item_id')->nullable();
            $table->integer('quantity_returned')->default(1);
            $table->decimal('refund_amount', 10, 2)->default(50);
            $table->date('return_date');
            $table->string('approval_status')->default('pending');
            $table->integer('approved_by')->nullable();
        });
        foreach ([$cashier, $other] as $user) {
            DB::table('Return_Transaction')->insert(['user_id' => $user->getKey(), 'return_date' => now()]);
        }
        $ownId = DB::table('Return_Transaction')->where('user_id', $cashier->getKey())->value('return_id');
        $otherId = DB::table('Return_Transaction')->where('user_id', $other->getKey())->value('return_id');
        $token = $cashier->createToken('cashier-session')->plainTextToken;
        $this->withToken($token)->getJson('/api/returns')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $ownId);
        $this->withToken($token)->getJson('/api/returns/'.$ownId)->assertOk();
        $this->withToken($token)->getJson('/api/returns/'.$otherId)->assertNotFound();
    }
}
