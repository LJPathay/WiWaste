<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class FailedLoginMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $email,
        public ?string $ip,
        public ?string $userAgent,
        public bool $isLocked,
        public int $lockoutMinutes,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->isLocked ? 'Account Locked — Failed Login Attempts' : 'Failed Login Attempt Detected',
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
        $lockedAt = now()->format('F j, Y \a\t g:i A');
        $deviceInfo = $this->userAgent ?? 'Unknown device';
        $ipAddress = $this->ip ?? 'Unknown IP';

        $lockoutMessage = $this->isLocked
            ? "<p style='color:#dc2626;font-weight:bold;'>Your account has been locked for {$this->lockoutMinutes} minutes due to 5 consecutive failed login attempts.</p>"
            : "<p style='color:#d97706;'>A failed login attempt was detected on your account.</p>";

        return "
        <div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;'>
            <h2 style='color:#15803D;'>WiWaste Security Alert</h2>
            {$lockoutMessage}
            <table style='width:100%;border-collapse:collapse;margin:16px 0;'>
                <tr><td style='padding:8px;color:#666;'>Date & Time:</td><td style='padding:8px;'>{$lockedAt}</td></tr>
                <tr><td style='padding:8px;color:#666;'>IP Address:</td><td style='padding:8px;'>{$ipAddress}</td></tr>
                <tr><td style='padding:8px;color:#666;'>Device:</td><td style='padding:8px;'>{$deviceInfo}</td></tr>
            </table>
            <p style='color:#666;font-size:13px;'>If this was you, please wait {$this->lockoutMinutes} minutes and try again. If you did not attempt to log in, please change your password immediately or contact your administrator.</p>
            <hr style='border:none;border-top:1px solid #e5e7eb;margin:20px 0;'>
            <p style='color:#999;font-size:11px;'>WiWaste Pharmacy OS — Automated Security Notification</p>
        </div>";
    }
}
