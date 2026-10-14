<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class AccountSecurityNotice extends Mailable
{
    public function __construct(
        public string $name,
        public string $event,
        public string $occurredAt,
        public string $ipAddress,
        public string $device,
        public ?string $lockedUntil = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: match ($this->event) {
            'lockout' => 'WiWaste account temporarily locked',
            'failed_login' => 'Unsuccessful WiWaste login attempt',
            default => 'Successful WiWaste login',
        });
    }

    public function content(): Content
    {
        return new Content(view: 'mail.account-security');
    }
}
