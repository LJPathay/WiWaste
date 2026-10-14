<?php

namespace App\Enums;

/**
 * Values the `User.status` column accepts.
 *
 * The column is a MySQL ENUM, so a value outside this list does not fail loudly —
 * it produces SQLSTATE[01000] "Data truncated" and stores an empty string. Keeping
 * the domain in one place lets the validation rules ask the enum what is allowed
 * instead of repeating a hardcoded `in:` list that drifts out of step with the
 * migration (that drift is exactly how `role` ended up accepting "Business Owner").
 */
enum UserStatus: string
{
    case Active = 'Active';
    case Inactive = 'Inactive';
    case Quarantined = 'Quarantined';
    case Archived = 'Archived';

    /**
     * Statuses an account may be created with. Archiving is an end-of-life action
     * taken on an existing account, so `POST /users` must not accept it.
     *
     * @return list<self>
     */
    public static function creatable(): array
    {
        return [self::Active, self::Inactive, self::Quarantined];
    }
}
