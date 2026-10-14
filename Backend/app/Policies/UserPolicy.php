<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->canManageUsers();
    }

    public function view(User $user, $model): bool
    {
        return $user->canManageUsers();
    }

    public function create(User $user): bool
    {
        return $user->canManageUsers();
    }

    public function update(User $user, $model): bool
    {
        return $user->canManageUsers();
    }

    public function delete(User $user, $model): bool
    {
        return $user->canManageUsers();
    }

    public function quarantine(User $user, $model): bool
    {
        return $user->canManageUsers();
    }
}
