<?php

namespace App\Services;

use App\Mail\FailedLoginMail;
use App\Mail\SuccessfulLoginMail;
use App\Models\LoginAttempt;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Mail;

class LoginAttemptService
{
    private const MAX_ATTEMPTS = 5;

    private const LOCKOUT_MINUTES = 15;

    public function isLocked(string $email): bool
    {
        $latestLock = LoginAttempt::where('email_attempted', $email)
            ->where('locked_until', '>', Carbon::now())
            ->latest()
            ->first();

        return $latestLock !== null;
    }

    public function getRemainingLockoutMinutes(string $email): int
    {
        $latestLock = LoginAttempt::where('email_attempted', $email)
            ->where('locked_until', '>', Carbon::now())
            ->latest()
            ->first();

        if (! $latestLock || ! $latestLock->locked_until) {
            return 0;
        }

        return (int) ceil($latestLock->locked_until->diffInSeconds(Carbon::now()) / 60);
    }

    public function recordFailedAttempt(string $email, ?string $ip, ?string $userAgent): void
    {
        $user = User::where('email', $email)->first();

        LoginAttempt::create([
            'user_id' => $user?->User_id,
            'email_attempted' => $email,
            'ip_address' => $ip,
            'user_agent' => $userAgent,
            'attempt_type' => 'failed',
        ]);

        $recentFailedCount = LoginAttempt::where('email_attempted', $email)
            ->where('attempt_type', 'failed')
            ->where('created_at', '>', Carbon::now()->subMinutes(self::LOCKOUT_MINUTES))
            ->count();

        if ($recentFailedCount >= self::MAX_ATTEMPTS) {
            $lockedUntil = Carbon::now()->addMinutes(self::LOCKOUT_MINUTES);

            LoginAttempt::where('email_attempted', $email)
                ->latest()
                ->first()
                ->update(['locked_until' => $lockedUntil]);

            // Send lockout notification
            if ($user && $user->email) {
                try {
                    Mail::to($user->email)->send(new FailedLoginMail($email, $ip, $userAgent, true, self::LOCKOUT_MINUTES));
                } catch (\Exception $e) {
                    \Log::error('Failed to send lockout email: '.$e->getMessage());
                }
            }
        } else {
            // Send failed attempt notification (not locked yet)
            if ($user && $user->email) {
                try {
                    Mail::to($user->email)->send(new FailedLoginMail($email, $ip, $userAgent, false, 0));
                } catch (\Exception $e) {
                    \Log::error('Failed to send failed login email: '.$e->getMessage());
                }
            }
        }
    }

    public function recordSuccessfulAttempt(User $user, ?string $ip, ?string $userAgent): void
    {
        LoginAttempt::create([
            'user_id' => $user->User_id,
            'email_attempted' => $user->email,
            'ip_address' => $ip,
            'user_agent' => $userAgent,
            'attempt_type' => 'successful',
        ]);

        // Send successful login notification
        if ($user->email) {
            try {
                Mail::to($user->email)->send(new SuccessfulLoginMail($user->email, $ip, $userAgent));
            } catch (\Exception $e) {
                \Log::error('Failed to send successful login email: '.$e->getMessage());
            }
        }
    }

    public function clearAttempts(string $email): void
    {
        LoginAttempt::where('email_attempted', $email)->delete();
    }
}
