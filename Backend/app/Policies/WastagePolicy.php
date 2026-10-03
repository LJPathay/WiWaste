<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class WastagePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory']);
    }

    public function view(User $user, $wastage): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory']);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory']);
    }

    public function approve(User $user, $wastage): bool
    {
        return Role::isOwnerTier($user->role);
    }

    // New methods for flag/confirm workflow
    public function flag(User $user): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory', 'Cashier']);
    }

    public function confirm(User $user): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory']);
    }

    public function edit(User $user): bool
    {
        return Role::isOwnerTier($user->role);
    }

    public function delete(User $user): bool
    {
        return Role::isOwnerTier($user->role);
    }
}