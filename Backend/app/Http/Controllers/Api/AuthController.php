<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\AccountSecurityNotice;
use App\Mail\PasswordResetOtp;
use App\Models\User;
use App\Services\EmailDeliverySettings;
use App\Support\PasswordPolicy;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class AuthController extends Controller
{
    private const MAX_LOGIN_ATTEMPTS = 5;

    private const LOCKOUT_MINUTES = 15;

    private const OTP_MINUTES = 10;

    private const MAX_OTP_ATTEMPTS = 5;

    private const RESET_SENT_MESSAGE = 'If an active account exists for that email, a reset code has been sent.';

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'username' => 'required_without:email|nullable|string|max:100',
            'email' => 'required_without:username|nullable|email|max:100',
            'password' => 'required|string|max:1024',
        ]);

        // Lock the account row so concurrent requests cannot bypass the fifth failure.
        $result = DB::transaction(function () use ($credentials) {
            $identifier = trim($credentials['username'] ?? $credentials['email']);
            $user = User::where(function ($query) use ($identifier) {
                $query->where('username', $identifier)->orWhereRaw('LOWER(email) = ?', [mb_strtolower($identifier)]);
            })->lockForUpdate()->first();

            if (! $user) {
                return ['response' => $this->invalidCredentials()];
            }

            if (! $this->isActive($user)) {
                return ['response' => response()->json(['message' => 'Your account is inactive or unavailable. Contact your administrator.'], 403)];
            }

            $lockedUntil = $user->locked_until ? Carbon::parse($user->locked_until) : null;
            if ($lockedUntil && $lockedUntil->isFuture()) {
                return ['response' => $this->lockedResponse($lockedUntil)];
            }

            if ($lockedUntil) {
                $user->forceFill(['failed_login_attempts' => 0, 'locked_until' => null]);
            }

            if (! Hash::check($credentials['password'], $user->password)) {
                $attempts = (int) $user->failed_login_attempts + 1;
                $lockedUntil = $attempts >= self::MAX_LOGIN_ATTEMPTS ? now()->addMinutes(self::LOCKOUT_MINUTES) : null;
                $user->forceFill(['failed_login_attempts' => $attempts, 'locked_until' => $lockedUntil])->save();

                return [
                    'user' => $user,
                    'event' => $lockedUntil ? 'lockout' : 'failed_login',
                    'response' => $lockedUntil ? $this->lockedResponse($lockedUntil) : $this->invalidCredentials(),
                ];
            }

            $user->forceFill(['failed_login_attempts' => 0, 'locked_until' => null])->save();
            $token = $user->createToken('wiwaste-token')->plainTextToken;

            return [
                'user' => $user,
                'event' => 'login',
                'response' => response()->json(['token' => $token, 'user' => $this->userDetails($user)]),
            ];
        });

        if (! empty($result['event'])) {
            $this->sendSecurityNotice($result['user'], $request, $result['event']);
        }

        return $result['response'];
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => 'required|email|max:100']);
        $user = User::whereRaw('LOWER(email) = ?', [mb_strtolower(trim($data['email']))])->first();

        // Use the same response for unknown and disabled accounts.
        if (! $user || ! $this->isActive($user)) {
            return response()->json(['message' => self::RESET_SENT_MESSAGE]);
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $result = DB::transaction(function () use ($user, $code) {
            $account = User::whereKey($user->getKey())->lockForUpdate()->firstOrFail();
            if (! $this->isActive($account)) {
                return response()->json(['message' => self::RESET_SENT_MESSAGE]);
            }

            $previous = DB::table('password_reset_otps')->where('user_id', $account->getKey())->first();
            if ($previous && Carbon::parse($previous->created_at)->addSeconds(60)->isFuture()) {
                $retryAfter = (int) ceil(now()->diffInSeconds(Carbon::parse($previous->created_at)->addSeconds(60)));

                return response()->json(['message' => 'Please wait before requesting another code.', 'retry_after' => $retryAfter], 429)
                    ->header('Retry-After', $retryAfter);
            }

            $codeHash = Hash::make($code);
            DB::table('password_reset_otps')->updateOrInsert(['user_id' => $account->getKey()], [
                'code_hash' => $codeHash,
                'expires_at' => now()->addMinutes(self::OTP_MINUTES),
                'attempts' => 0,
                'created_at' => now(),
            ]);

            return $codeHash;
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        try {
            app(EmailDeliverySettings::class)->apply();
            Mail::to($user->email)->send(new PasswordResetOtp($user->Full_name, $code, self::OTP_MINUTES));
        } catch (Throwable $exception) {
            // Only remove this request's code; a later request may have replaced it.
            DB::table('password_reset_otps')->where('user_id', $user->getKey())->where('code_hash', $result)->delete();
            Log::error('Password reset email could not be delivered.', ['user_id' => $user->getKey(), 'exception_type' => get_class($exception)]);

            return response()->json(['message' => 'We could not send the reset email. Please try again later.'], 503);
        }

        return response()->json(['message' => self::RESET_SENT_MESSAGE]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email|max:100',
            'otp' => 'required|string|regex:/^\d{6}$/',
            'password' => array_merge(PasswordPolicy::rules(), ['confirmed']),
        ]);

        return DB::transaction(function () use ($data) {
            $user = User::whereRaw('LOWER(email) = ?', [mb_strtolower(trim($data['email']))])->lockForUpdate()->first();
            if (! $user || ! $this->isActive($user)) {
                return $this->invalidOtp();
            }

            $reset = DB::table('password_reset_otps')->where('user_id', $user->getKey())->lockForUpdate()->first();
            if (! $reset || Carbon::parse($reset->expires_at)->lessThanOrEqualTo(now()) || $reset->attempts >= self::MAX_OTP_ATTEMPTS) {
                return $this->invalidOtp();
            }

            if (! Hash::check($data['otp'], $reset->code_hash)) {
                DB::table('password_reset_otps')->where('user_id', $user->getKey())->increment('attempts');

                return $this->invalidOtp();
            }

            $user->forceFill(['password' => Hash::make($data['password']), 'failed_login_attempts' => 0])->save();
            $user->tokens()->delete();
            DB::table('password_reset_otps')->where('user_id', $user->getKey())->delete();

            return response()->json(['message' => 'Password reset successfully. Please sign in with your new password.']);
        });
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($this->userDetails($request->user()));
    }

    private function isActive(User $user): bool
    {
        return $user->status === 'Active' && $user->getAttribute('archived_at') === null;
    }

    private function invalidCredentials(): JsonResponse
    {
        return response()->json(['message' => 'Invalid credentials.', 'errors' => ['username' => ['Invalid credentials.']]], 422);
    }

    private function invalidOtp(): JsonResponse
    {
        $message = 'The reset code is invalid, expired, or has already been used. Request a new code.';

        return response()->json(['message' => $message, 'errors' => ['otp' => [$message]]], 422);
    }

    private function lockedResponse(Carbon $lockedUntil): JsonResponse
    {
        $retryAfter = max(1, (int) ceil(now()->diffInSeconds($lockedUntil)));

        return response()->json([
            'message' => 'Your account is temporarily locked after 5 failed login attempts. Try again in 15 minutes.',
            'locked_until' => $lockedUntil->toIso8601String(),
            'retry_after' => $retryAfter,
        ], 423)->header('Retry-After', $retryAfter);
    }

    private function sendSecurityNotice(User $user, Request $request, string $event): void
    {
        if (! $user->email) {
            Log::warning('Account security email skipped because the account has no email.', ['user_id' => $user->getKey(), 'event' => $event]);

            return;
        }

        try {
            app(EmailDeliverySettings::class)->apply();
            Mail::to($user->email)->send(new AccountSecurityNotice(
                $user->Full_name,
                $event,
                now()->toIso8601String(),
                $request->ip() ?? 'Unknown',
                mb_substr($request->userAgent() ?? 'Unknown device', 0, 512),
                $event === 'lockout' ? Carbon::parse($user->locked_until)->toIso8601String() : null,
            ));
        } catch (Throwable $exception) {
            // An unavailable mail server must not undo account lockout or crash login.
            Log::error('Account security email could not be delivered.', ['user_id' => $user->getKey(), 'event' => $event, 'exception_type' => get_class($exception)]);
        }
    }

    private function userDetails(User $user): array
    {
        return [
            'id' => $user->User_id,
            'name' => $user->Full_name,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role,
            'status' => $user->status,
        ];
    }
}
