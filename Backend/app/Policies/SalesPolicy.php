<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SalesPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['Owner']);
    }

    public function view(User $user, $sale): bool
    {
        return in_array($user->role, ['Owner']);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['Owner']);
    }

    public function refund(User $user, $sale): bool
    {
        return $user->role === 'Owner';
    }

    public function void(User $user, $sale): bool
    {
        return $user->role === 'Owner';
    }
}
