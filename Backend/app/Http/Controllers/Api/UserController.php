<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index()
    {
        return response()->json(User::all()->map(fn ($u) => [
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

        // Map 'Admin' to 'Owner' — Admin is not in the DB enum
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

        // Map 'Admin' to 'Owner'
        if (($data['role'] ?? '') === 'Admin') {
            $data['role'] = 'Owner';
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
        $user->update(['status' => 'Quarantined']);
        return response()->json(['message' => 'User quarantined.']);
    }

    public function reactivate($id)
    {
        $user = User::findOrFail($id);
        $user->update(['status' => 'Active']);
        return response()->json(['message' => 'User reactivated.']);
    }
}
