<?php

namespace App\Enums;

enum Role: string
{
    case Owner = 'Owner';
    case Admin = 'Admin';
    case Inventory = 'Inventory';
    case Cashier = 'Cashier';
    case Pharmacist = 'Pharmacist';

    /**
     * Roles that carry business-wide administrative authority.
     *
     * Policies used to hard-code `$user->role === 'Owner'`, so a co-admin created with
     * the Admin role could not manage anything — including the account it had just
     * been given. Every administrative check now asks for this list instead.
     *
     * @return list<string>
     */
    public static function ownerTier(): array
    {
        return [self::Owner->value, self::Admin->value];
    }

    public static function isOwnerTier(?string $role): bool
    {
        return $role !== null && in_array($role, self::ownerTier(), true);
    }

    public function label(): string
    {
        return match ($this) {
            // QA asked for the "Business Owner" label to go: it described access, not a
            // person, and the role column is what the admin actually assigns. Labelling
            // it "Cashier" was also requested, but Cashier is a distinct, far more
            // restricted role and reusing its name here would make the table lie about
            // what access the account has.
            self::Owner => 'Owner',
            self::Admin => 'Admin',
            self::Inventory => 'Inventory Staff',
            self::Cashier => 'Cashier',
            self::Pharmacist => 'Pharmacist',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public static function labels(): array
    {
        $labels = [];

        foreach (self::cases() as $case) {
            $labels[$case->value] = $case->label();
        }

        return $labels;
    }
}