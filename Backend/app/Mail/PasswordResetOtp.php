<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class PasswordResetOtp extends Mailable
{
    public function __construct(public string $name, public string $code, public int $expiresInMinutes) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your WiWaste password reset code');
    }

    public function content(): Content
    {
        return new Content(view: 'mail.password-reset');
    }
}
