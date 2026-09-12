<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ProductPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['Admin', 'Inventory', 'Business Owner']);
    }

    public function view(User $user, $product): bool
    {
        return in_array($user->role, ['Admin', 'Inventory', 'Business Owner']);
    }

    public function create(User $user): bool
    {
        return $user->role === 'Admin';
    }

    public function update(User $user, $product): bool
    {
        return $user->role === 'Admin';
    }

    public function delete(User $user, $product): bool
    {
        return $user->role === 'Admin';
    }

    public function manageCategories(User $user): bool
    {
        return $user->role === 'Admin';
    }
}
