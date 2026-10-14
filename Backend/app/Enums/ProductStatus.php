<?php

namespace App\Enums;

/**
 * Values the `Product.status` column accepts (`Product.status` ENUM in the
 * migration). Mirrors `UserStatus`: validating against the enum keeps the API's
 * accepted list and the column's stored list from drifting apart.
 */
enum ProductStatus: string
{
    case Active = 'Active';
    case Discontinued = 'Discontinued';
}
