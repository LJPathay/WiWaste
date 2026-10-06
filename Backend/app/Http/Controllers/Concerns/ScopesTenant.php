<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

/**
 * Restricts a query to the tenant of the caller.
 *
 * Every operational table carries a nullable `business_id`, but only some of them
 * carry `branch_id`. The controllers each grew their own copy of this scoping helper
 * and all of them filtered on both columns unconditionally — which was harmless for
 * as long as every user had a null `branch_id`, and became a hard
 * `Unknown column 'branch_id' in 'where clause'` the moment a real branch was
 * assigned. Filtering per column, based on what the table actually has, keeps a
 * branch-level scope from silently turning into a 500.
 */
trait ScopesTenant
{
    /**
     * Applies the caller's business and, where the table supports it, branch.
     *
     * @param  Builder|\Illuminate\Database\Eloquent\Builder  $query
     * @return mixed
     */
    protected function scopeForBusinessAndBranch($query, Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return $query;
        }

        return $this->applyTenantScope($query, $user->business_id, $user->branch_id);
    }

    /**
     * Business-only variant, for resources that are not branch-scoped.
     *
     * @param  Builder|\Illuminate\Database\Eloquent\Builder  $query
     * @return mixed
     */
    protected function scopeForBusiness($query, Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return $query;
        }

        return $this->applyTenantScope($query, $user->business_id, null);
    }

    /**
     * @param  Builder|\Illuminate\Database\Eloquent\Builder  $query
     * @return mixed
     */
    private function applyTenantScope($query, $businessId, $branchId)
    {
        $table = $query instanceof \Illuminate\Database\Eloquent\Builder
            ? $query->getModel()->getTable()
            : $query->from;

        if ($businessId && $this->hasColumn($table, 'business_id')) {
            $query->where($table.'.business_id', $businessId);
        }

        if ($branchId && $this->hasColumn($table, 'branch_id')) {
            $query->where($table.'.branch_id', $branchId);
        }

        return $query;
    }

    /**
     * `Schema::hasColumn` issues a metadata query, so the answer is memoised for the
     * life of the request rather than re-asked for every scope call.
     */
    private function hasColumn(string $table, string $column): bool
    {
        $cache = $this->tenantColumnCache ??= [];

        return $cache["$table.$column"] ??= Schema::hasColumn($table, $column);
    }

    /** @var array<string, bool> */
    private ?array $tenantColumnCache = null;
}
