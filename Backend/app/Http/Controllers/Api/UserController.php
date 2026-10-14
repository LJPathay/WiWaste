<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Support\PasswordPolicy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    private const ROLES = ['Admin', 'Owner', 'Inventory', 'Cashier', 'Pharmacist'];

    private const STATUSES = ['Active', 'Inactive', 'Quarantined', 'Archived'];

    private function authorizeManagement(Request $request): void
    {
        abort_unless($request->user()?->canManageUsers(), 403, 'Only administrators can manage user accounts.');
    }

    private function users(Request $request)
    {
        $query = User::with('statusChangedByUser');
        if ($request->user()?->business_id) {
            $query->where('business_id', $request->user()->business_id);
        }

        return $query;
    }

    private function serializeUser(User $user): array
    {
        return [
            'id' => $user->User_id,
            'name' => $user->Full_name,
            'Full_name' => $user->Full_name,
            'First_name' => $user->First_name,
            'Middle_name' => $user->Middle_name,
            'Surname' => $user->Surname,
            'contact_number' => $user->contact_number,
            'address' => $user->address,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role,
            'status' => $user->status,
            'created_at' => $user->Created_at,
            'archived_at' => $user->archived_at,
            'status_changed_by' => $user->status_changed_by,
            'status_changed_at' => $user->status_changed_at,
            'status_changed_by_user' => $user->statusChangedByUser ? [
                'id' => $user->statusChangedByUser->User_id,
                'name' => $user->statusChangedByUser->Full_name,
            ] : null,
        ];
    }

    public function index(Request $request)
    {
        $this->authorizeManagement($request);
        $filters = $request->validate([
            'status' => ['sometimes', Rule::in(self::STATUSES)],
            'role' => ['sometimes', Rule::in(self::ROLES)],
            'search' => 'sometimes|string|max:160',
        ]);
        $query = $this->users($request);
        foreach (['status', 'role'] as $field) {
            if (isset($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }
        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(fn ($q) => $q->where('Full_name', 'like', "%{$search}%")
                ->orWhere('username', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%"));
        }

        return response()->json($query->orderBy('User_id')->get()->map(fn ($user) => $this->serializeUser($user)));
    }

    public function store(Request $request)
    {
        $this->authorizeManagement($request);
        $this->normalizeLegacyRole($request);
        $data = $request->validate([
            'First_name' => 'required|string|max:50',
            'Middle_name' => 'nullable|string|max:50',
            'Surname' => 'required|string|max:50',
            'contact_number' => ['required', 'string', 'regex:/^[0-9]{7,11}$/'],
            'address' => 'nullable|string|max:255',
            'username' => 'required|string|max:50|unique:User,username',
            'password' => PasswordPolicy::rules(),
            'email' => 'required|email|max:100|unique:User,email',
            'role' => ['required', Rule::in(self::ROLES)],
            'status' => ['required', Rule::in(self::STATUSES)],
        ], [
            'contact_number.regex' => 'Contact number must contain 7 to 11 digits only.',
            'password.regex' => 'Password must contain a punctuation or symbol character.',
            'password.not_regex' => 'Password must not contain control characters.',
        ]);
        $data['Full_name'] = $this->fullName($data);
        $data['Created_at'] = now();
        $data['business_id'] = $request->user()->business_id;
        $data['branch_id'] = $request->user()->branch_id;
        $data['status_changed_by'] = $request->user()->User_id;
        $data['status_changed_at'] = now();
        $data['archived_at'] = $data['status'] === 'Archived' ? now() : null;

        $user = DB::transaction(function () use ($data, $request) {
            $user = User::create($data);
            $this->audit($request, $user, 'Created user account', null, $user->toArray());

            return $user;
        });

        return response()->json([
            'message' => 'User created.',
            'id' => $user->User_id,
            'user' => $this->serializeUser($user->load('statusChangedByUser')),
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $this->authorizeManagement($request);

        return response()->json($this->serializeUser($this->users($request)->findOrFail($id)));
    }

    public function update(Request $request, $id)
    {
        $this->authorizeManagement($request);
        $this->normalizeLegacyRole($request);
        if ($request->exists('password')) {
            throw ValidationException::withMessages(['password' => 'Use password recovery to change an existing password.']);
        }
        $user = $this->users($request)->findOrFail($id);
        $data = $request->validate([
            'First_name' => 'sometimes|required|string|max:50',
            'Middle_name' => 'sometimes|nullable|string|max:50',
            'Surname' => 'sometimes|required|string|max:50',
            'contact_number' => ['sometimes', 'required', 'string', 'regex:/^[0-9]{7,11}$/'],
            'address' => 'sometimes|nullable|string|max:255',
            'username' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('User', 'username')->ignore($user->User_id, 'User_id')],
            'email' => ['sometimes', 'required', 'email', 'max:100', Rule::unique('User', 'email')->ignore($user->User_id, 'User_id')],
            'role' => ['sometimes', Rule::in(self::ROLES)],
            'status' => ['sometimes', Rule::in(self::STATUSES)],
        ]);
        if (array_intersect(['First_name', 'Middle_name', 'Surname'], array_keys($data))) {
            $data['Full_name'] = $this->fullName(array_merge($user->getAttributes(), $data));
        }
        $statusChanged = isset($data['status']) && $data['status'] !== $user->status;
        if ($statusChanged) {
            $this->requireConfirmation($request);
        }

        DB::transaction(function () use ($request, $user, $data, $statusChanged) {
            $old = $user->toArray();
            if ($statusChanged) {
                $data = array_merge($data, $this->statusFields($request, $data['status']));
            }
            $user->update($data);
            if ($statusChanged && $user->status !== 'Active') {
                $user->tokens()->delete();
            }
            $this->audit($request, $user, $statusChanged ? 'Changed user status' : 'Updated user account', $old, $user->toArray());
        });

        return response()->json(['message' => 'User updated.', 'user' => $this->serializeUser($user->fresh('statusChangedByUser'))]);
    }

    public function destroy(Request $request, $id)
    {
        return $this->changeStatus($request, $id, 'Archived', 'User archived.');
    }

    public function quarantine(Request $request, $id)
    {
        return $this->changeStatus($request, $id, 'Quarantined', 'User quarantined.');
    }

    public function reactivate(Request $request, $id)
    {
        return $this->changeStatus($request, $id, 'Active', 'User reactivated.');
    }

    private function changeStatus(Request $request, $id, string $status, string $message)
    {
        $this->authorizeManagement($request);
        $user = $this->users($request)->findOrFail($id);
        if ($user->status !== $status) {
            $this->requireConfirmation($request);
            DB::transaction(function () use ($request, $user, $status) {
                $old = ['status' => $user->status];
                $user->update($this->statusFields($request, $status));
                if ($status !== 'Active') {
                    $user->tokens()->delete();
                }
                $this->audit($request, $user, 'Changed user status', $old, [
                    'status' => $status,
                    'status_changed_by' => $user->status_changed_by,
                    'status_changed_at' => $user->status_changed_at,
                ]);
            });
        }

        return response()->json(['message' => $message, 'user' => $this->serializeUser($user->fresh('statusChangedByUser'))]);
    }

    private function requireConfirmation(Request $request): void
    {
        $request->validate(['status_change_confirmed' => 'required|accepted']);
    }

    private function normalizeLegacyRole(Request $request): void
    {
        if ($request->input('role') === 'Business Owner') {
            $request->merge(['role' => 'Cashier']);
        }
    }

    private function statusFields(Request $request, string $status): array
    {
        return [
            'status' => $status,
            'status_changed_by' => $request->user()->User_id,
            'status_changed_at' => now(),
            'archived_at' => $status === 'Archived' ? now() : null,
        ];
    }

    private function fullName(array $data): string
    {
        return implode(' ', array_filter(array_map(fn ($part) => trim((string) $part), [
            $data['First_name'] ?? '', $data['Middle_name'] ?? '', $data['Surname'] ?? '',
        ]), fn ($part) => $part !== ''));
    }

    private function audit(Request $request, User $user, string $action, ?array $old, array $new): void
    {
        AuditLog::create([
            'user_id' => $request->user()->User_id,
            'action' => $action,
            'entity_type' => 'User',
            'entity_id' => $user->User_id,
            'old_values' => $old === null ? null : json_encode($old),
            'new_values' => json_encode($new),
            'created_at' => now(),
            'business_id' => $request->user()->business_id,
            'branch_id' => $request->user()->branch_id,
        ]);
    }
}
