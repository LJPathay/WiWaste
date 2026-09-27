<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SuccessfulLoginMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $email,
        public ?string $ip,
        public ?string $userAgent,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Successful Login to Your WiWaste Account',
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
        $loginAt = now()->format('F j, Y \a\t g:i A');
        $deviceInfo = $this->userAgent ?? 'Unknown device';
        $ipAddress = $this->ip ?? 'Unknown IP';

        return "
        <div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;'>
            <h2 style='color:#15803D;'>WiWaste Login Confirmation</h2>
            <p>A successful login was recorded on your account:</p>
            <table style='width:100%;border-collapse:collapse;margin:16px 0;'>
                <tr><td style='padding:8px;color:#666;'>Date & Time:</td><td style='padding:8px;'>{$loginAt}</td></tr>
                <tr><td style='padding:8px;color:#666;'>IP Address:</td><td style='padding:8px;'>{$ipAddress}</td></tr>
                <tr><td style='padding:8px;color:#666;'>Device:</td><td style='padding:8px;'>{$deviceInfo}</td></tr>
            </table>
            <p style='color:#666;font-size:13px;'>If you did not perform this login, please change your password immediately and contact your administrator.</p>
            <hr style='border:none;border-top:1px solid #e5e7eb;margin:20px 0;'>
            <p style='color:#999;font-size:11px;'>WiWaste Pharmacy OS — Automated Security Notification</p>
        </div>";
    }
}
