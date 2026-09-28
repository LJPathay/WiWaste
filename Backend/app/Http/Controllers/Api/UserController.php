<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Api\CreateUserRequest;
use App\Http\Requests\Api\UpdateUserRequest;
use App\Models\User;
use App\Models\AuditLog;

class UserController extends BaseApiController
{
    public function index()
    {
        $perPage = min((int) request()->get('per_page', 15), 100);
        $page = (int) request()->get('page', 1);

        $query = User::query();

        if (request()->has('search')) {
            $search = request()->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('username', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('surname', 'like', "%{$search}%");
            });
        }

        if (request()->has('role')) {
            $query->where('role', request()->get('role'));
        }

        if (request()->has('status')) {
            $query->where('status', request()->get('status'));
        }

        $paginated = $query->paginate(min((int) request()->get('per_page', 15), 100), ['*'], 'page', (int) request()->get('page', 1));

        return $this->paginated($paginated->through(fn ($u) => [
            'id'             => $u->User_id,
            'name'           => $u->full_name,
            'first_name'     => $u->first_name,
            'middle_name'    => $u->middle_name,
            'surname'        => $u->surname,
            'contact_number' => $u->contact_number,
            'username'       => $u->username,
            'email'          => $u->email,
            'role'           => $u->role,
            'status'         => $u->status,
            'created_at'     => $u->Created_at,
        ]));
    }

    public function store(\App\Http\Requests\Api\CreateUserRequest $request)
    {
        $data = $request->validated();

        if (($data['role'] ?? '') === 'Admin') {
            $data['role'] = 'Owner';
        }

        $data['Created_at'] = now();

        $user = User::create($data);

        return $this->created([
            'id'             => $user->User_id,
            'name'           => $user->full_name,
            'first_name'     => $user->first_name,
            'middle_name'    => $user->middle_name,
            'surname'        => $user->surname,
            'contact_number' => $user->contact_number,
            'username'       => $user->username,
            'email'          => $user->email,
            'role'           => $user->role,
            'status'         => $user->status,
            'created_at'     => $user->Created_at,
        ]);
    }

    public function show($id)
    {
        $u = User::findOrFail($id);
        return $this->success([
            'id'             => $u->User_id,
            'name'           => $u->full_name,
            'first_name'     => $u->first_name,
            'middle_name'    => $u->middle_name,
            'surname'        => $u->surname,
            'contact_number' => $u->contact_number,
            'username'       => $u->username,
            'email'          => $u->email,
            'role'           => $u->role,
            'status'         => $u->status,
        ]);
    }

    public function update(\App\Http\Requests\Api\UpdateUserRequest $request, $id)
    {
        $user = User::findOrFail($id);

        $data = $request->validated();

        if (($data['role'] ?? '') === 'Admin') {
            $data['role'] = 'Owner';
        }

        // Audit log for status changes
        if (isset($data['status']) && $data['status'] !== $user->status) {
            $oldStatus = $user->status;
            $newStatus = $data['status'];
            AuditLog::create([
                'user_id'     => auth()->id() ?? null,
                'action'      => "Status changed: {$oldStatus} -> {$newStatus}",
                'entity_type' => 'User',
                'entity_id'   => $id,
                'old_values'  => json_encode(['status' => $oldStatus]),
                'new_values'  => json_encode(['status' => $newStatus]),
                'created_at'  => now(),
            ]);
        }

        if (request()->filled('password')) {
            $data['password'] = request()->password;
        }

        $user->update($data);

        return $this->success(null, 'User updated.');
    }

    public function destroy($id)
    {
        User::findOrFail($id)->delete();
        return $this->noContent('User deleted.');
    }

    public function quarantine($id)
    {
        $user = User::findOrFail($id);
        $oldStatus = $user->status;
        $user->update(['status' => 'Quarantined']);

        AuditLog::create([
            'user_id'     => auth()->id() ?? null,
            'action'      => "Status changed: {$oldStatus} -> Quarantined",
            'entity_type' => 'User',
            'entity_id'   => $id,
            'old_values'  => json_encode(['status' => $oldStatus]),
            'new_values'  => json_encode(['status' => 'Quarantined']),
            'created_at'  => now(),
        ]);

        return $this->success(null, 'User quarantined.');
    }

    public function reactivate($id)
    {
        $user = User::findOrFail($id);
        $oldStatus = $user->status;
        $user->update(['status' => 'Active']);

        AuditLog::create([
            'user_id'     => auth()->id() ?? null,
            'action'      => "Status changed: {$oldStatus} -> Active",
            'entity_type' => 'User',
            'entity_id'   => $id,
            'old_values'  => json_encode(['status' => $oldStatus]),
            'new_values'  => json_encode(['status' => 'Active']),
            'created_at'  => now(),
        ]);

        return $this->success(null, 'User reactivated.');
    }

    public function archive($id)
    {
        $user = User::findOrFail($id);
        $oldStatus = $user->status;
        $user->update(['status' => 'Archived']);

        AuditLog::create([
            'user_id'     => auth()->id() ?? null,
            'action'      => "Status changed: {$oldStatus} -> Archived",
            'entity_type' => 'User',
            'entity_id'   => $id,
            'old_values'  => json_encode(['status' => $oldStatus]),
            'new_values'  => json_encode(['status' => 'Archived']),
            'created_at'  => now(),
        ]);

        return $this->success(null, 'User archived.');
    }
}