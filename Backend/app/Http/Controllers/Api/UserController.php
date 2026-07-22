<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index()
    {
        return response()->json(User::all()->map(fn ($u) => [
            'id'         => $u->User_id,
            'name'       => $u->Full_name,
            'username'   => $u->username,
            'email'      => $u->email,
            'role'       => $u->role,
            'status'     => $u->status,
            'created_at' => $u->Created_at,
        ]));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'Full_name' => 'required|string|max:100',
            'username'  => 'required|string|max:50|unique:User,username',
            'password'  => 'required|string|min:6',
            'email'     => 'nullable|email|max:100|unique:User,email',
            'role'      => 'required|in:Admin,Inventory,Business Owner',
            'status'    => 'required|in:Active,Inactive',
        ]);

        $data['password']   = Hash::make($data['password']);
        $data['Created_at'] = now();

        $user = User::create($data);

        return response()->json(['message' => 'User created.', 'id' => $user->User_id], 201);
    }

    public function show($id)
    {
        $u = User::findOrFail($id);
        return response()->json([
            'id'       => $u->User_id,
            'name'     => $u->Full_name,
            'username' => $u->username,
            'email'    => $u->email,
            'role'     => $u->role,
            'status'   => $u->status,
        ]);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $data = $request->validate([
            'Full_name' => 'sometimes|string|max:100',
            'email'     => 'sometimes|nullable|email|max:100|unique:User,email,' . $id . ',User_id',
            'role'      => 'sometimes|in:Admin,Inventory,Business Owner',
            'status'    => 'sometimes|in:Active,Inactive',
        ]);

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return response()->json(['message' => 'User updated.']);
    }

    public function destroy($id)
    {
        User::findOrFail($id)->delete();
        return response()->json(['message' => 'User deleted.']);
    }
}
