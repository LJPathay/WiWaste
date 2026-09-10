<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SettingsPolicy
{
    use HandlesAuthorization;

    public function view(User $user): bool
    {
        return $user->role === 'Admin';
    }

    public function update(User $user): bool
    {
        return $user->role === 'Admin';
    }
}
