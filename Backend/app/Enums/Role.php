<?php

namespace App\Enums;

enum Role: string
{
    case Owner = 'Owner';
    case Inventory = 'Inventory';
    case Cashier = 'Cashier';

    public function label(): string
    {
        return match ($this) {
            self::Owner => 'Business Owner',
            self::Inventory => 'Inventory Staff',
            self::Cashier => 'Cashier',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public static function labels(): array
    {
        return [
            self::Owner->value => self::Owner->label(),
            self::Inventory->value => self::Inventory->label(),
            self::Cashier->value => self::Cashier->label(),
        ];
    }
}