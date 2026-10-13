<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Api\CreateUserRequest;
use App\Http\Requests\Api\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\User;

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

        $paginated = $query->paginate($perPage, ['*'], 'page', (int) request()->get('page', 1));

        return $this->paginated($paginated->through(fn ($u) => (new UserResource($u))->resolve(request())));
    }

    public function store(CreateUserRequest $request)
    {
        $data = $request->validated();

        $data['Created_at'] = now();

        $user = User::create($data);

        return $this->created((new UserResource($user))->resolve($request));
    }

    public function show($id)
    {
        $u = User::findOrFail($id);

        return $this->success((new UserResource($u))->resolve(request()));
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
            'by_status' => $byStatus,
            'total' => array_sum($byStatus),
            'not_archived' => $byStatus['Active'] + $byStatus['Inactive'] + $byStatus['Quarantined'],
        ]);
    }

    public function update(UpdateUserRequest $request, $id)
    {
        $user = User::findOrFail($id);

        $data = $request->validated();

        // Audit log for status changes
        if (isset($data['status']) && $data['status'] !== $user->status) {
            $this->logStatusChange($id, $user->status, $data['status']);
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
        return $this->transitionStatus($id, 'Quarantined', 'User quarantined.');
    }

    public function reactivate($id)
    {
        return $this->transitionStatus($id, 'Active', 'User reactivated.');
    }

    public function archive($id)
    {
        return $this->transitionStatus($id, 'Archived', 'User archived.');
    }

    /**
     * Moves an account to a new status, writes the audit trail, and returns the
     * success response.
     *
     * The three single-status endpoints (quarantine / reactivate / archive) are
     * identical apart from the target status and the message, so they all funnel
     * through here.
     */
    private function transitionStatus($id, string $newStatus, string $successMessage)
    {
        $user = User::findOrFail($id);
        $oldStatus = $user->status;
        $user->update(['status' => $newStatus]);

        $this->logStatusChange($id, $oldStatus, $newStatus);

        return $this->success(null, $successMessage);
    }

    /**
     * Records a status transition on the audit trail.
     *
     * @param  int|string  $id
     * @param  string  $oldStatus
     * @param  string  $newStatus
     */
    private function logStatusChange($id, string $oldStatus, string $newStatus): void
    {
        AuditLog::create([
            'user_id' => auth()->id() ?? null,
            'action' => "Status changed: {$oldStatus} -> {$newStatus}",
            'entity_type' => 'User',
            'entity_id' => $id,
            'old_values' => json_encode(['status' => $oldStatus]),
            'new_values' => json_encode(['status' => $newStatus]),
            'created_at' => now(),
        ]);
    }
}
