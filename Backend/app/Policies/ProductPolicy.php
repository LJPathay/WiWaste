<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ProductPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory']);
    }

    public function view(User $user, $product): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory']);
    }

    public function create(User $user): bool
    {
        return Role::isOwnerTier($user->role);
    }

    public function update(User $user, $product): bool
    {
        return Role::isOwnerTier($user->role);
    }

    public function delete(User $user, $product): bool
    {
        return Role::isOwnerTier($user->role);
    }

    public function manageCategories(User $user): bool
    {
        return Role::isOwnerTier($user->role);
    }
}
