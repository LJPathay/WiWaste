<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return Role::isOwnerTier($user->role);
    }

    public function view(User $user, $model): bool
    {
        return Role::isOwnerTier($user->role);
    }

    public function create(User $user): bool
    {
        return Role::isOwnerTier($user->role);
    }

    public function update(User $user, $model): bool
    {
        return Role::isOwnerTier($user->role);
    }

    public function delete(User $user, $model): bool
    {
        return Role::isOwnerTier($user->role);
    }

    public function quarantine(User $user, $model): bool
    {
        return Role::isOwnerTier($user->role);
    }
}
