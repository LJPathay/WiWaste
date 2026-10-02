<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Models\PasswordResetOtp;
use App\Services\LoginAttemptService;
use App\Http\Requests\Api\ForgotPasswordRequest;
use App\Http\Requests\Api\ResetPasswordRequest;
use App\Http\Requests\Api\VerifyOtpRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class AuthController extends BaseApiController
{
    protected LoginAttemptService $loginAttemptService;

    public function __construct(LoginAttemptService $loginAttemptService)
    {
        $this->loginAttemptService = $loginAttemptService;
    }

    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $identifier = $request->username;
        $ip = $request->ip();
        $userAgent = $request->userAgent();

        // Check if account is locked
        if ($this->loginAttemptService->isLocked($identifier)) {
            $remainingMinutes = $this->loginAttemptService->getRemainingLockoutMinutes($identifier);
            return $this->tooManyRequests("Account locked due to too many failed attempts. Try again in {$remainingMinutes} minutes.");
        }

        $user = User::where('username', $identifier)
            ->orWhere('email', $identifier)
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            // Record failed attempt
            $this->loginAttemptService->recordFailedAttempt($identifier, $ip, $userAgent);

            // Re-check if now locked after this attempt
            if ($this->loginAttemptService->isLocked($identifier)) {
                $remainingMinutes = $this->loginAttemptService->getRemainingLockoutMinutes($identifier);
                return $this->tooManyRequests("Account locked due to too many failed attempts. Try again in {$remainingMinutes} minutes.");
            }

            throw ValidationException::withMessages(['username' => ['Invalid credentials.']]);
        }

        if ($user->status === 'Inactive') {
            return $this->forbidden('Your account has been deactivated.');
        }

        if ($user->status === 'Quarantined') {
            return $this->forbidden('Your account has been quarantined. Contact an administrator.');
        }

        if ($user->status === 'Archived') {
            return $this->forbidden('Your account has been archived.');
        }

        // Clear failed attempts on successful login
        $this->loginAttemptService->clearAttempts($identifier);

        // Record successful login
        $this->loginAttemptService->recordSuccessfulAttempt($user, $ip, $userAgent);

        // Create access token (short-lived: 15 minutes)
        $accessToken = $user->createToken('wiwaste-access', ['access'], now()->addMinutes(15))->plainTextToken;

        // Create refresh token (long-lived: 7 days)
        $refreshToken = $user->createToken('wiwaste-refresh', ['refresh'], now()->addDays(7))->plainTextToken;

        $userData = [
            'id'       => $user->User_id,
            'name'     => $user->full_name,
            'username' => $user->username,
            'email'    => $user->email,
            'role'     => $user->role,
            'status'   => $user->status,
        ];

        // Set refresh token as HttpOnly cookie (secure, same-site)
        $cookie = cookie('refresh_token', $refreshToken, 10080, '/', null, true, true, false, 'lax'); // 7 days = 10080 minutes

        return $this->created([
            'access_token' => $accessToken,
            'user'         => $userData,
        ], 'Login successful')->withCookie($cookie);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        
        // Clear refresh token cookie
        $cookie = cookie('refresh_token', '', -1, '/', null, true, true, false, 'lax');

        return $this->success(null, 'Logged out successfully.')->withCookie($cookie);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        return $this->success([
            'id'       => $user->User_id,
            'name'     => $user->full_name,
            'username' => $user->username,
            'email'    => $user->email,
            'role'     => $user->role,
            'status'   => $user->status,
        ]);
    }

    public function refresh(Request $request)
    {
        // Get refresh token from HttpOnly cookie
        $refreshToken = $request->cookie('refresh_token');

        if (! $refreshToken) {
            return $this->unauthorized('Refresh token not found.');
        }

        // Find the token in database
        $token = $request->user()->tokens()->where('token', hash('sha256', $refreshToken))->first();

        if (! $token || ! $token->abilities->contains('refresh')) {
            return $this->unauthorized('Invalid refresh token.');
        }

        // Check if refresh token is expired
        if ($token->expires_at && $token->expires_at->isPast()) {
            $token->delete();
            return $this->unauthorized('Refresh token expired. Please log in again.');
        }

        $user = $request->user();

        // Revoke old refresh token
        $token->delete();

        // Create new access token (15 minutes)
        $accessToken = $request->user()->createToken('wiwaste-access', ['access'], now()->addMinutes(15))->plainTextToken;

        // Create new refresh token (7 days)
        $newRefreshToken = $request->user()->createToken('wiwaste-refresh', ['refresh'], now()->addDays(7))->plainTextToken;

        $cookie = cookie('refresh_token', $newRefreshToken, 10080, '/', null, true, true, false, 'lax');

        return $this->success([
            'access_token' => $accessToken,
        ], 'Token refreshed successfully')->withCookie($cookie);
    }

    // POST /api/v1/password/forgot
    public function forgotPassword(ForgotPasswordRequest $request)
    {
        $email = $request->validated('email');
        $user = User::where('email', $email)->firstOrFail();

        // Generate and store OTP
        $otp = PasswordResetOtp::createOtp($email);

        // Send email (queue in production)
        try {
            Mail::to($email)->send(new \App\Mail\PasswordResetOtpMail($user->full_name, $otp));
        } catch (\Exception $e) {
            \Log::error('Failed to send OTP email: ' . $e->getMessage());
            return $this->error('Failed to send reset email. Please try again.', 500);
        }

        return $this->success(null, 'Password reset code sent to your email.');
    }

    // POST /api/v1/password/verify-otp
    public function verifyOtp(VerifyOtpRequest $request)
    {
        $email = $request->validated('email');
        $otp = $request->validated('otp');

        $valid = PasswordResetOtp::verifyOtp($email, $otp);

        if (!$valid) {
            return $this->error('Invalid or expired code.', 422);
        }

        return $this->success(['verified' => true], 'Code verified. You may now reset your password.');
    }

    // POST /api/v1/password/reset
    public function resetPassword(ResetPasswordRequest $request)
    {
        $email = $request->validated('email');
        $otp = $request->validated('otp');
        $password = $request->validated('password');

        $success = PasswordResetOtp::consumeOtp($email, $otp);

        if (!$success) {
            return $this->error('Invalid or expired code.', 422);
        }

        $user = User::where('email', $email)->firstOrFail();
        $user->update(['password' => Hash::make($password)]);

        // Revoke all user tokens (force re-login)
        $user->tokens()->delete();

        return $this->success(null, 'Password reset successful. Please log in with your new password.');
    }
}