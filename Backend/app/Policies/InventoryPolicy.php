<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class InventoryPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['Admin', 'Inventory', 'Business Owner']);
    }

    public function view(User $user, $inventory): bool
    {
        return in_array($user->role, ['Admin', 'Inventory', 'Business Owner']);
    }

    public function stockIn(User $user): bool
    {
        return in_array($user->role, ['Admin', 'Inventory']);
    }

    public function stockOut(User $user): bool
    {
        return in_array($user->role, ['Admin', 'Inventory']);
    }

    public function adjust(User $user): bool
    {
        return in_array($user->role, ['Admin', 'Inventory']);
    }

    public function export(User $user): bool
    {
        return in_array($user->role, ['Admin', 'Inventory', 'Business Owner']);
    }
}
