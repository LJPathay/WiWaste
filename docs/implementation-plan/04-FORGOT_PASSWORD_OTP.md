# Implementation Plan: Forgot Password with Custom 6-Digit OTP

## Overview
Implement password reset flow using 6-digit OTP sent via email. Custom implementation (not Laravel's default token-based reset).

## Flow
1. User clicks "Forgot Password" on login page
2. Enters registered email
3. System generates 6-digit OTP, stores with 10-min expiry
4. Email sent with OTP
5. User enters OTP on verification page
6. If valid, user enters new password (twice)
7. Password updated, OTP invalidated
8. Redirect to login with success message

## Database

### Migration: Password Reset OTPs
**File:** `Backend/database/migrations/xxxx_create_password_reset_otps_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('password_reset_otps', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            $table->string('otp_hash', 255); // Hashed OTP
            $table->integer('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->boolean('used')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_otps');
    }
};
```

## Backend Implementation

### 3.1 Request Classes

**File:** `Backend/app/Http/Requests/Api/ForgotPasswordRequest.php` (NEW)

```php
<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class ForgotPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => 'required|email|exists:User,email',
        ];
    }

    public function messages(): array
    {
        return [
            'email.exists' => 'No account found with this email address.',
        ];
    }
}
```

**File:** `Backend/app/Http/Requests/Api/VerifyOtpRequest.php` (NEW)

```php
<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class VerifyOtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => 'required|email|exists:User,email',
            'otp' => 'required|digits:6',
        ];
    }
}
```

**File:** `Backend/app/Http/Requests/Api/ResetPasswordRequest.php` (NEW)

```php
<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => 'required|email|exists:User,email',
            'otp' => 'required|digits:6',
            'password' => 'required|string|min:8|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/',
            'password_confirmation' => 'required|same:password',
        ];
    }

    public function messages(): array
    {
        return [
            'password.regex' => 'Password must contain uppercase, lowercase, number, and special character.',
            'password_confirmation.same' => 'Passwords do not match.',
        ];
    }
}
```

### 3.2 AuthController Methods

**File:** `Backend/app/Http/Controllers/Api/AuthController.php` (ADD METHODS)

```php
use App\Http\Requests\Api\ForgotPasswordRequest;
use App\Http\Requests\Api\VerifyOtpRequest;
use App\Http\Requests\Api\ResetPasswordRequest;
use App\Models\PasswordResetOtp;
use App\Mail\PasswordResetOtpMail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

// POST /api/v1/password/forgot
public function forgotPassword(ForgotPasswordRequest $request)
{
    $email = $request->validated('email');
    $user = User::where('email', $email)->firstOrFail();

    // Invalidate any existing unused OTPs for this email
    PasswordResetOtp::where('email', $email)
        ->where('used', false)
        ->where('expires_at', '>', now())
        ->delete();

    // Generate 6-digit OTP
    $otp = (string) random_int(100000, 999999);
    $otpHash = Hash::make($otp);

    // Store OTP (10 min expiry)
    PasswordResetOtp::create([
        'email' => $email,
        'otp_hash' => $otpHash,
        'expires_at' => now()->addMinutes(10),
    ]);

    // Send email
    try {
        Mail::to($email)->send(new PasswordResetOtpMail($user->full_name, $otp));
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

    $record = PasswordResetOtp::where('email', $email)
        ->where('used', false)
        ->where('expires_at', '>', now())
        ->latest()
        ->first();

    if (!$record || !Hash::check($otp, $record->otp_hash)) {
        // Increment attempts
        if ($record) {
            $record->increment('attempts');
            if ($record->attempts >= 5) {
                $record->update(['used' => true]); // Lock after 5 failed attempts
            }
        }
        return $this->error('Invalid or expired code.', 422);
    }

    // Mark as verified (not used yet - used on password reset)
    return $this->success(['verified' => true], 'Code verified. You may now reset your password.');
}

// POST /api/v1/password/reset
public function resetPassword(ResetPasswordRequest $request)
{
    $email = $request->validated('email');
    $otp = $request->validated('otp');
    $password = $request->validated('password');

    $record = PasswordResetOtp::where('email', $email)
        ->where('used', false)
        ->where('expires_at', '>', now())
        ->latest()
        ->first();

    if (!$record || !Hash::check($otp, $record->otp_hash)) {
        return $this->error('Invalid or expired code.', 422);
    }

    if ($record->attempts >= 5) {
        return $this->error('Too many failed attempts. Request a new code.', 429);
    }

    // Update user password
    $user = User::where('email', $email)->firstOrFail();
    $user->update(['password' => Hash::make($password)]);

    // Mark OTP as used
    $record->update(['used' => true]);

    // Clear any other OTPs for this email
    PasswordResetOtp::where('email', $email)->where('used', false)->delete();

    // Revoke all user tokens (force re-login)
    $user->tokens()->delete();

    return $this->success(null, 'Password reset successful. Please log in with your new password.');
}
```

### 3.3 Password Reset OTP Mail

**File:** `Backend/app/Mail/PasswordResetOtpMail.php` (NEW)

```php
<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $name,
        public string $otp,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your WiWaste Password Reset Code',
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: $this->buildHtml(),
        );
    }

    private function buildHtml(): string
    {
        return "
        <div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;'>
            <h2 style='color:#15803D;'>WiWaste Password Reset</h2>
            <p>Hello {$this->name},</p>
            <p>You requested a password reset. Your verification code is:</p>
            <div style='background:#f0fdf4;border:2px solid #15803D;border-radius:8px;padding:20px;text-align:center;margin:20px 0;'>
                <span style='font-size:32px;font-weight:bold;color:#15803D;letter-spacing:4px;font-family:monospace;'>{$this->otp}</span>
            </div>
            <p><strong>This code expires in 10 minutes.</strong></p>
            <p>If you did not request this, please ignore this email or contact your administrator.</p>
            <hr style='border:none;border-top:1px solid #e5e7eb;margin:20px 0;'>
            <p style='color:#999;font-size:11px;'>WiWaste Pharmacy OS — Automated Security Notification</p>
        </div>";
    }
}
```

### 3.4 Routes

**File:** `Backend/routes/api.php` (ADD)

```php
// Password Reset (no auth required)
Route::post('/password/forgot', [AuthController::class, 'forgotPassword']);
Route::post('/password/verify-otp', [AuthController::class, 'verifyOtp']);
Route::post('/password/reset', [AuthController::class, 'resetPassword']);
```

## Frontend Implementation

### 4.1 ForgotPassword Page (UPDATE)

**File:** `Frontend/src/pages/ForgotPassword.tsx`

```tsx
// Replace mock with real API calls
import { auth } from '../../services/api';

const ForgotPassword = () => {
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleForgotPassword = async () => {
    setLoading(true);
    setError('');
    try {
      await auth.forgotPassword(email);
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError('');
    try {
      await auth.verifyOtp(email, otp);
      setStep('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await auth.resetPassword(email, otp, password);
      navigate('/login', { state: { message: 'Password reset successful' } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render steps...
};
```

### 4.2 API Service Methods

**File:** `Frontend/src/services/api.ts` (ADD to auth object)

```typescript
export const auth = {
  // ... existing
  forgotPassword: (email: string) =>
    request('/password/forgot', { method: 'POST', body: JSON.stringify({ email }) }),
  
  verifyOtp: (email: string, otp: string) =>
    request('/password/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),
  
  resetPassword: (email: string, otp: string, password: string) =>
    request('/password/reset', { method: 'POST', body: JSON.stringify({ email, otp, password, password_confirmation: password }) }),
};
```

## Security Considerations
- OTP hashed in database (bcrypt)
- 10-minute expiry
- Max 5 verification attempts per OTP
- OTP invalidated after use
- All user tokens revoked on password reset
- Rate limited: 3 requests per 15 min per email/IP

## Acceptance Criteria
- [ ] User receives 6-digit OTP via email within 30 seconds
- [ ] OTP expires after 10 minutes
- [ ] Invalid OTP shows error, allows retry (max 5)
- [ ] Valid OTP allows password reset
- [ ] Password policy enforced (8 chars, upper, lower, number, special)
- [ ] After reset, user must log in again (tokens revoked)
- [ ] No 500 errors on any step
- [ ] Email template professional and clear

## Dependencies
- Migration must run before deployment
- Mail configuration in `.env` (MAIL_MAILER, MAIL_FROM_ADDRESS)

## Estimated Effort
- Backend (migration, requests, controller, mail): 6 hours
- Frontend (3-step form, validation): 4 hours
- Testing: 2 hours
**Total: ~12 hours**