<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\LoginAttemptService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
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

        $email = $request->username;
        $ip = $request->ip();
        $userAgent = $request->userAgent();

        // Check if account is locked
        if ($this->loginAttemptService->isLocked($email)) {
            $remainingMinutes = $this->loginAttemptService->getRemainingLockoutMinutes($email);
            return response()->json([
                'message' => "Account locked due to too many failed attempts. Try again in {$remainingMinutes} minutes.",
            ], 429);
        }

        $user = User::where('username', $email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            // Record failed attempt
            $this->loginAttemptService->recordFailedAttempt($email, $ip, $userAgent);

            // Re-check if now locked after this attempt
            if ($this->loginAttemptService->isLocked($email)) {
                $remainingMinutes = $this->loginAttemptService->getRemainingLockoutMinutes($email);
                return response()->json([
                    'message' => "Account locked due to too many failed attempts. Try again in {$remainingMinutes} minutes.",
                ], 429);
            }

            throw ValidationException::withMessages(['username' => ['Invalid credentials.']]);
        }

        if ($user->status === 'Inactive') {
            return response()->json(['message' => 'Your account has been deactivated.'], 403);
        }

        if ($user->status === 'Quarantined') {
            return response()->json(['message' => 'Your account has been quarantined. Contact an administrator.'], 403);
        }

        // Clear failed attempts on successful login
        $this->loginAttemptService->clearAttempts($email);

        // Record successful login
        $this->loginAttemptService->recordSuccessfulAttempt($user, $ip, $userAgent);

        $token = $user->createToken('wiwaste-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'       => $user->User_id,
                'name'     => $user->Full_name,
                'username' => $user->username,
                'email'    => $user->email,
                'role'     => $user->role,
                'status'   => $user->status,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'id'       => $user->User_id,
            'name'     => $user->Full_name,
            'username' => $user->username,
            'email'    => $user->email,
            'role'     => $user->role,
            'status'   => $user->status,
        ]);
    }
}
