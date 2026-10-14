<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Crypt;

class EmailDeliverySettings
{
    public const KEY = 'email.delivery';

    private array $environmentMail;

    public function __construct()
    {
        $this->environmentMail = config('mail');
    }

    private function configuration(): array
    {
        $encrypted = Setting::whereKey(self::KEY)->value('value');

        return $encrypted ? json_decode(Crypt::decryptString($encrypted), true, 512, JSON_THROW_ON_ERROR) : [];
    }

    public function publicSettings(): array
    {
        $settings = $this->configuration();

        return [
            'enabled' => (bool) ($settings['enabled'] ?? false),
            'host' => $settings['host'] ?? '',
            'port' => (int) ($settings['port'] ?? 587),
            'encryption' => $settings['encryption'] ?? 'tls',
            'username' => $settings['username'] ?? '',
            'from_address' => $settings['from_address'] ?? $this->environmentMail['from']['address'],
            'from_name' => $settings['from_name'] ?? $this->environmentMail['from']['name'],
            'password_configured' => ! empty($settings['password']),
        ];
    }

    public function save(array $data): array
    {
        $previous = $this->configuration();
        $data['password'] = $data['password'] ?? $previous['password'] ?? null;
        Setting::updateOrCreate(['key' => self::KEY], ['value' => Crypt::encryptString(json_encode($data, JSON_THROW_ON_ERROR))]);

        return $this->publicSettings();
    }

    public function apply(): void
    {
        $settings = $this->configuration();
        // Restore environment defaults when the owner disables the override, including in long-lived workers.
        config(['mail' => $this->environmentMail]);
        app('mail.manager')->forgetMailers();

        if (empty($settings['enabled'])) {
            return;
        }

        config([
            'mail.default' => 'owner-smtp',
            'mail.mailers.owner-smtp' => [
                'transport' => 'smtp',
                'host' => $settings['host'],
                'port' => (int) $settings['port'],
                'scheme' => $settings['encryption'] === 'ssl' ? 'smtps' : 'smtp',
                'auto_tls' => $settings['encryption'] === 'tls',
                'require_tls' => $settings['encryption'] !== 'none',
                'username' => $settings['username'] ?: null,
                'password' => $settings['password'] ?? null,
                'timeout' => 10,
            ],
            'mail.from.address' => $settings['from_address'],
            'mail.from.name' => $settings['from_name'],
        ]);
    }
}
