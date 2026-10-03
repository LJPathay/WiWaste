<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\User;
use App\Models\SalesTransaction;
use Illuminate\Auth\Access\HandlesAuthorization;

class SalesPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Cashier']);
    }

    public function view(User $user, SalesTransaction $sale): bool
    {
        if (Role::isOwnerTier($user->role)) {
            return true;
        }
        if ($user->role === 'Cashier') {
            return $sale->user_id === $user->User_id;
        }
        return false;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Cashier']);
    }

    public function refund(User $user, $sale): bool
    {
        return Role::isOwnerTier($user->role);
    }

    public function void(User $user, $sale): bool
    {
        return Role::isOwnerTier($user->role);
    }

    public function viewOwn(User $user, SalesTransaction $sale): bool
    {
        return Role::isOwnerTier($user->role) || ($user->role === 'Cashier' && $sale->user_id === $user->User_id);
    }
}