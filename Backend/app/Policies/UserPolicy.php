<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->role === 'Owner';
    }

    public function view(User $user, $model): bool
    {
        return $user->role === 'Owner';
    }

    public function create(User $user): bool
    {
        return $user->role === 'Owner';
    }

    public function update(User $user, $model): bool
    {
        return $user->role === 'Owner';
    }

    public function delete(User $user, $model): bool
    {
        return $user->role === 'Owner';
    }

    public function quarantine(User $user, $model): bool
    {
        return $user->role === 'Owner';
    }
}
