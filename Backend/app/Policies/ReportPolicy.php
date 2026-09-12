<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ReportPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['Admin', 'Inventory', 'Business Owner']);
    }

    public function generate(User $user): bool
    {
        return in_array($user->role, ['Admin', 'Inventory']);
    }

    public function export(User $user): bool
    {
        return in_array($user->role, ['Admin', 'Inventory']);
    }
}
