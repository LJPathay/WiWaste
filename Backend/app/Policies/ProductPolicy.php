<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ProductPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['Owner', 'Inventory']);
    }

    public function view(User $user, $product): bool
    {
        return in_array($user->role, ['Owner', 'Inventory']);
    }

    public function create(User $user): bool
    {
        return $user->role === 'Owner';
    }

    public function update(User $user, $product): bool
    {
        return $user->role === 'Owner';
    }

    public function delete(User $user, $product): bool
    {
        return $user->role === 'Owner';
    }

    public function manageCategories(User $user): bool
    {
        return $user->role === 'Owner';
    }
}
