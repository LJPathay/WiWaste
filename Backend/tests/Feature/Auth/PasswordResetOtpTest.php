<?php

namespace Tests\Feature\Auth;

use App\Mail\PasswordResetOtpMail;
use App\Models\PasswordResetOtp;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class PasswordResetOtpTest extends TestCase
{
    use RefreshDatabase;

    private const VALID_PASSWORD = 'NewPass123!';

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('auth:ip:127.0.0.1');
    }

    private function user(string $email = 'test@example.com'): User
    {
        return User::factory()->role('Owner')->create(['email' => $email]);
    }

    /** Seeds an OTP row directly so the test controls the exact code. */
    private function seedOtp(string $email, string $otp, array $overrides = []): PasswordResetOtp
    {
        return PasswordResetOtp::create(array_merge([
            'email' => $email,
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(10),
        ], $overrides));
    }

    private function resetPayload(string $email, string $otp, string $password): array
    {
        return [
            'email' => $email,
            'otp' => $otp,
            'password' => $password,
            'password_confirmation' => $password,
        ];
    }

    // === POST /api/v1/password/forgot ===

    public function test_forgot_password_sends_an_otp_email(): void
    {
        $user = $this->user();
        Mail::fake();

        $this->postJson('/api/v1/password/forgot', ['email' => $user->email])
            ->assertOk()
            ->assertJsonPath('success', true);

        Mail::assertSent(PasswordResetOtpMail::class, function (PasswordResetOtpMail $mail) use ($user) {
            return $mail->hasTo($user->email) && preg_match('/^\d{6}$/', $mail->otp) === 1;
        });
    }

    public function test_forgot_password_stores_only_a_hash_of_the_code(): void
    {
        $user = $this->user();
        Mail::fake();

        $this->postJson('/api/v1/password/forgot', ['email' => $user->email])->assertOk();

        $sentOtp = null;
        Mail::assertSent(PasswordResetOtpMail::class, function (PasswordResetOtpMail $mail) use (&$sentOtp) {
            $sentOtp = $mail->otp;

            return true;
        });

        $record = PasswordResetOtp::where('email', $user->email)->latest('id')->firstOrFail();

        $this->assertNotSame($sentOtp, $record->otp_hash, 'The raw code must never be persisted.');
        $this->assertStringStartsWith('$2y$', $record->otp_hash, 'OTP must be bcrypt hashed.');
        $this->assertTrue(Hash::check($sentOtp, $record->otp_hash));
    }

    public function test_forgot_password_rejects_an_unknown_email(): void
    {
        Mail::fake();

        $this->postJson('/api/v1/password/forgot', ['email' => 'nobody@example.com'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_forgot_password_rejects_a_malformed_email(): void
    {
        $this->postJson('/api/v1/password/forgot', ['email' => 'not-an-email'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_issuing_a_new_code_invalidates_the_previous_one(): void
    {
        $user = $this->user();

        $first = PasswordResetOtp::createOtp($user->email);
        $second = PasswordResetOtp::createOtp($user->email);

        $this->assertFalse(
            PasswordResetOtp::verifyOtp($user->email, $first),
            'A superseded code must stop working.'
        );
        $this->assertTrue(PasswordResetOtp::verifyOtp($user->email, $second));
    }

    // === POST /api/v1/password/verify-otp ===

    public function test_verify_otp_accepts_the_current_code(): void
    {
        $user = $this->user();
        $this->seedOtp($user->email, '123456');

        $this->postJson('/api/v1/password/verify-otp', ['email' => $user->email, 'otp' => '123456'])
            ->assertOk()
            ->assertJsonPath('data.verified', true);
    }

    public function test_verify_otp_rejects_a_wrong_code(): void
    {
        $user = $this->user();
        $this->seedOtp($user->email, '123456');

        $this->postJson('/api/v1/password/verify-otp', ['email' => $user->email, 'otp' => '654321'])
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_verify_otp_rejects_an_expired_code(): void
    {
        $user = $this->user();
        $this->seedOtp($user->email, '123456', ['expires_at' => now()->subMinutes(1)]);

        $this->postJson('/api/v1/password/verify-otp', ['email' => $user->email, 'otp' => '123456'])
            ->assertStatus(422);
    }

    public function test_verify_otp_requires_six_digits(): void
    {
        $user = $this->user();

        $this->postJson('/api/v1/password/verify-otp', ['email' => $user->email, 'otp' => '123'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('otp');
    }

    /**
     * Exercised at the model level: five HTTP attempts would trip the
     * 3-per-15-minute password throttle before the cap could be reached.
     */
    public function test_five_failed_attempts_burn_the_code(): void
    {
        $user = $this->user();
        $record = $this->seedOtp($user->email, '123456');

        for ($i = 0; $i < 4; $i++) {
            $this->assertFalse(PasswordResetOtp::verifyOtp($user->email, '000000'));
            $this->assertFalse($record->fresh()->used, 'Must still be usable before the 5th attempt.');
        }

        $this->assertFalse(PasswordResetOtp::verifyOtp($user->email, '000000'));
        $this->assertTrue($record->fresh()->used, 'Code must be burnt after 5 failed attempts.');

        // Even the correct code no longer verifies.
        $this->assertFalse(PasswordResetOtp::verifyOtp($user->email, '123456'));
    }

    // === POST /api/v1/password/reset ===

    public function test_reset_password_updates_the_credential(): void
    {
        $user = $this->user();
        $this->seedOtp($user->email, '123456');

        $this->postJson('/api/v1/password/reset', $this->resetPayload($user->email, '123456', self::VALID_PASSWORD))
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertTrue(Hash::check(self::VALID_PASSWORD, $user->fresh()->password));
    }

    public function test_reset_password_revokes_every_active_token(): void
    {
        $user = $this->user();
        $this->seedOtp($user->email, '123456');

        $user->createToken('desktop')->plainTextToken;
        $user->createToken('tablet')->plainTextToken;
        $this->assertCount(2, $user->tokens()->get());

        $this->postJson('/api/v1/password/reset', $this->resetPayload($user->email, '123456', self::VALID_PASSWORD))
            ->assertOk();

        $this->assertCount(0, $user->fresh()->tokens()->get());
    }

    public function test_a_code_cannot_be_reused_after_reset(): void
    {
        $user = $this->user();
        $this->seedOtp($user->email, '123456');

        $this->postJson('/api/v1/password/reset', $this->resetPayload($user->email, '123456', self::VALID_PASSWORD))
            ->assertOk();

        $this->postJson('/api/v1/password/reset', $this->resetPayload($user->email, '123456', 'Another123!'))
            ->assertStatus(422);
    }

    public function test_reset_enforces_the_password_policy(): void
    {
        $user = $this->user();
        $this->seedOtp($user->email, '123456');

        // Too weak: no uppercase, digit or symbol.
        $this->postJson('/api/v1/password/reset', $this->resetPayload($user->email, '123456', 'weak'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }

    public function test_reset_requires_a_matching_confirmation(): void
    {
        $user = $this->user();
        $this->seedOtp($user->email, '123456');

        $this->postJson('/api/v1/password/reset', [
            'email' => $user->email,
            'otp' => '123456',
            'password' => self::VALID_PASSWORD,
            'password_confirmation' => 'Different123!',
        ])->assertStatus(422)->assertJsonValidationErrors('password_confirmation');
    }

    public function test_a_failed_policy_check_does_not_consume_the_code(): void
    {
        $user = $this->user();
        $this->seedOtp($user->email, '123456');

        $this->postJson('/api/v1/password/reset', $this->resetPayload($user->email, '123456', 'weak'))
            ->assertStatus(422);

        $this->postJson('/api/v1/password/reset', $this->resetPayload($user->email, '123456', self::VALID_PASSWORD))
            ->assertOk();
    }

    // === Throttling ===

    public function test_forgot_password_is_rate_limited(): void
    {
        Mail::fake();

        foreach (['a@', 'b@', 'c@'] as $prefix) {
            $email = "{$prefix}example.com";
            $this->user($email);

            $this->postJson('/api/v1/password/forgot', ['email' => $email])->assertOk();
        }

        $this->postJson('/api/v1/password/forgot', ['email' => 'd@example.com'])
            ->assertStatus(429)
            ->assertJsonPath('message', 'Too many requests. Please try again later.');
    }

    public function test_rate_limiting_also_covers_the_v1_prefixed_routes(): void
    {
        Mail::fake();

        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/v1/password/verify-otp', [
                'email' => 'nobody@example.com',
                'otp' => '000000',
            ])->assertStatus(422);
        }

        // Without the /api/v1/* arm in the matcher this would fall through to
        // the far looser guest read limit instead of returning 429.
        $this->postJson('/api/v1/password/verify-otp', ['email' => 'nobody@example.com', 'otp' => '000000'])
            ->assertStatus(429);
    }
}
