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