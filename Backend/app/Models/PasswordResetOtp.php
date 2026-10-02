<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;

class PasswordResetOtp extends Model
{
    protected $table = 'password_reset_otps';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'email',
        'otp_hash',
        'attempts',
        'expires_at',
        'used',
    ];

    protected $casts = [
        'attempts' => 'integer',
        'expires_at' => 'datetime',
        'used' => 'boolean',
    ];

    public static function createOtp(string $email): string
    {
        // Invalidate any existing unused OTPs for this email
        self::where('email', $email)
            ->where('used', false)
            ->where('expires_at', '>', now())
            ->delete();

        // Generate 6-digit OTP
        $otp = (string) random_int(100000, 999999);
        $otpHash = Hash::make($otp);

        self::create([
            'email' => $email,
            'otp_hash' => $otpHash,
            'expires_at' => now()->addMinutes(10),
        ]);

        return $otp;
    }

    public static function verifyOtp(string $email, string $otp): bool
    {
        $record = self::where('email', $email)
            ->where('used', false)
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (!$record || !Hash::check($otp, $record->otp_hash)) {
            if ($record) {
                $record->increment('attempts');
                if ($record->attempts >= 5) {
                    $record->update(['used' => true]);
                }
            }
            return false;
        }

        return true;
    }

    public static function consumeOtp(string $email, string $otp): bool
    {
        $record = self::where('email', $email)
            ->where('used', false)
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (!$record || !Hash::check($otp, $record->otp_hash)) {
            return false;
        }

        if ($record->attempts >= 5) {
            return false;
        }

        $record->update(['used' => true]);
        self::where('email', $email)->where('used', false)->delete();

        return true;
    }
}