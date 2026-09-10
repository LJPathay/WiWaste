<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class WastagePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['Admin', 'Inventory']);
    }

    public function view(User $user, $wastage): bool
    {
        return in_array($user->role, ['Admin', 'Inventory']);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['Admin', 'Inventory']);
    }

    public function approve(User $user, $wastage): bool
    {
        return $user->role === 'Admin';
    }
}
