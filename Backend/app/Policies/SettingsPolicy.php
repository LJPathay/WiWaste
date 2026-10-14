<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SettingsPolicy
{
    use HandlesAuthorization;

    public function view(User $user): bool
    {
        return Role::isOwnerTier($user->role);
    }

    public function update(User $user): bool
    {
        return Role::isOwnerTier($user->role);
    }
}
