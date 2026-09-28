<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min((int) $request->get('per_page', 15), 100);
        $page = (int) $request->get('page', 1);

        $query = User::query();

        // Allow filtering
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('username', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('surname', 'like', "%{$search}%");
            });
        }

        if ($request->has('role')) {
            $query->where('role', $request->get('role'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->get('status'));
        }

        $paginated = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => $paginated->items()->map(fn ($u) => [
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
            ]),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
                'per_page'     => $paginated->perPage(),
                'total'        => $paginated->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'first_name'     => 'required|string|max:50',
            'middle_name'    => 'nullable|string|max:50',
            'surname'        => 'required|string|max:50',
            'contact_number' => 'nullable|string|max:20',
            'username'       => 'required|string|max:50|unique:User,username',
            'password'       => 'required|string|min:8|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/',
            'email'          => 'required|email|max:100|unique:User,email',
            'role'           => 'required|in:Admin,Inventory,Business Owner,Cashier,Pharmacist',
            'status'         => 'required|in:Active,Inactive,Quarantined',
        ], [
            'username.unique'  => 'This username is already taken.',
            'email.required'   => 'Email address is required.',
            'email.unique'     => 'This email address is already registered.',
            'password.regex'   => 'Password must contain uppercase, lowercase, number, and special character.',
        ]);

        if (($data['role'] ?? '') === 'Admin') {
            $data['role'] = 'Owner';
        }

        $data['Created_at'] = now();

        $user = User::create($data);

        return response()->json([
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
        ], 201);
    }

    public function show($id)
    {
        $u = User::findOrFail($id);
        return response()->json([
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

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $data = $request->validate([
            'first_name'     => 'sometimes|string|max:50',
            'middle_name'    => 'nullable|string|max:50',
            'surname'        => 'sometimes|string|max:50',
            'contact_number' => 'nullable|string|max:20',
            'email'          => 'sometimes|nullable|email|max:100|unique:User,email,' . $id . ',User_id',
            'role'           => 'sometimes|in:Admin,Inventory,Business Owner,Cashier,Pharmacist',
            'status'         => 'sometimes|in:Active,Inactive,Quarantined',
        ]);

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

        if ($request->filled('password')) {
            $data['password'] = $request->password;
        }

        $user->update($data);

        return response()->json(['message' => 'User updated.']);
    }

    public function destroy($id)
    {
        User::findOrFail($id)->delete();
        return response()->json(['message' => 'User deleted.']);
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

        return response()->json(['message' => 'User quarantined.']);
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

        return response()->json(['message' => 'User reactivated.']);
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

        return response()->json(['message' => 'User archived.']);
    }
}
