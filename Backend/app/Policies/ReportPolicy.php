<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ReportPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['Owner', 'Inventory']);
    }

    public function generate(User $user): bool
    {
        return in_array($user->role, ['Owner', 'Inventory']);
    }

    public function export(User $user): bool
    {
        return in_array($user->role, ['Owner', 'Inventory']);
    }
}
