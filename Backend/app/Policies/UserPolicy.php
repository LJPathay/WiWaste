<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->role === 'Admin';
    }

    public function view(User $user, $model): bool
    {
        return $user->role === 'Admin';
    }

    public function create(User $user): bool
    {
        return $user->role === 'Admin';
    }

    public function update(User $user, $model): bool
    {
        return $user->role === 'Admin';
    }

    public function delete(User $user, $model): bool
    {
        return $user->role === 'Admin';
    }

    public function quarantine(User $user, $model): bool
    {
        return $user->role === 'Admin';
    }
}
