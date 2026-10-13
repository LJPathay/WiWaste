<?php

namespace App\Models\Concerns;

use App\Models\Branch;
use App\Models\Business;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The tenant pair every operational row is stamped with.
 *
 * `business_id` and `branch_id` live on the same tables, and the relation and
 * scope pair for each was copied verbatim into more than a dozen models. The
 * four members below are therefore one trait: adding a column to the tenant
 * contract used to mean editing every model that declared it.
 *
 * Models that resolve their tenant through a parent (e.g. `StockReceivingItem`
 * via `whereHas('receiving', ...)`) must NOT use this trait — their scopes
 * traverse a relationship rather than a local column.
 */
trait BelongsToTenant
{
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class, 'business_id', 'id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }

    /**
     * @param  Builder  $query
     * @return Builder
     */
    public function scopeForBusiness($query, $businessId)
    {
        return $query->where('business_id', $businessId);
    }

    /**
     * @param  Builder  $query
     * @return Builder
     */
    public function scopeForBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }
}
