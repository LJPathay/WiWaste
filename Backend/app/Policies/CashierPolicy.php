<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CashierPolicy
{
    use HandlesAuthorization;

    public function posAccess(User $user): bool
    {
        return in_array($user->role, ['Cashier', 'Owner']);
    }

    public function saleCreate(User $user): bool
    {
        return in_array($user->role, ['Cashier', 'Owner']);
    }

    public function saleViewOwn(User $user, $sale): bool
    {
        return Role::isOwnerTier($user->role) || ($user->role === 'Cashier' && $sale->user_id === $user->User_id);
    }

    public function receiptPrint(User $user): bool
    {
        return in_array($user->role, ['Cashier', 'Owner']);
    }
}