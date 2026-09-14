<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class FEFOPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['Owner', 'Inventory']);
    }

    public function view(User $user, $batch): bool
    {
        return in_array($user->role, ['Owner', 'Inventory']);
    }

    public function flag(User $user, $batch): bool
    {
        return in_array($user->role, ['Owner', 'Inventory']);
    }

    public function clear(User $user, $batch): bool
    {
        return in_array($user->role, ['Owner', 'Inventory']);
    }

    public function notify(User $user): bool
    {
        return $user->role === 'Owner';
    }
}
