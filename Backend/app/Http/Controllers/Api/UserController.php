<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Api\CreateUserRequest;
use App\Http\Requests\Api\UpdateUserRequest;
use App\Models\User;
use App\Models\AuditLog;

class UserController extends BaseApiController
{
    /**
     * Narrows a user query by the `search` parameter.
     *
     * This used to be duplicated in index() and statusCounts(), and both copies ran
     * `LIKE %<whole query>%` against each column separately. That means no multi-word
     * query could ever match a name: searching "Lia Cruz" asked for a single value
     * containing a space to be found inside first_name ("Lia") or surname ("Cruz"), so
     * the list came back empty. It also ignored middle_name entirely.
     *
     * The query is split on whitespace and every term has to appear somewhere, in any
     * one column. So "Lia Cruz", "Cruz Lia", "crz" and "cashier" all still find people,
     * and the list and the tab counts cannot disagree about who matches.
     */
    private function applySearch($query)
    {
        $search = trim((string) request()->get('search', ''));

        if ($search === '') {
            return $query;
        }

        $terms = preg_split('/\s+/', $search) ?: [];

        return $query->where(function ($q) use ($terms) {
            foreach ($terms as $term) {
                $like = "%{$term}%";
                $q->where(function ($q) use ($like) {
                    $q->where('username', 'like', $like)
                      ->orWhere('email', 'like', $like)
                      ->orWhere('first_name', 'like', $like)
                      ->orWhere('middle_name', 'like', $like)
                      ->orWhere('surname', 'like', $like);
                });
            }
        });
    }

    public function index()
    {
        $perPage = min((int) request()->get('per_page', 15), 100);
        $page = (int) request()->get('page', 1);

        $query = User::query();

        $this->applySearch($query);

        if (request()->has('role')) {
            $query->where('role', request()->get('role'));
        }

        // `status` matches exactly, which cannot express the default tab of the user
        // screen: "every account that is not archived" (Active and Quarantined alike).
        if ($exclude = request()->get('exclude_status')) {
            $query->where('status', '!=', $exclude);
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

    /**
     * Totals per account status, honouring the same search/role filters as index().
     *
     * The Manage Users tabs need these because the list is server-side paginated: the
     * tab badges were previously derived from whatever rows happened to be on the
     * current page, so "Archived 0" was shown while archived accounts existed on page
     * two. `total` is every status, and `not_archived` is the count behind the default
     * "All Users" tab.
     */
    public function statusCounts()
    {
        $query = User::query();

        $this->applySearch($query);

        if (request()->has('role')) {
            $query->where('role', request()->get('role'));
        }

        $counts = $query
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->all();

        $byStatus = [];
        foreach (['Active', 'Inactive', 'Quarantined', 'Archived'] as $status) {
            $byStatus[$status] = (int) ($counts[$status] ?? 0);
        }

        return $this->success([
            'by_status'   => $byStatus,
            'total'       => array_sum($byStatus),
            'not_archived' => $byStatus['Active'] + $byStatus['Inactive'] + $byStatus['Quarantined'],
        ]);
    }

    public function update(\App\Http\Requests\Api\UpdateUserRequest $request, $id)
    {
        $user = User::findOrFail($id);

        $data = $request->validated();

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