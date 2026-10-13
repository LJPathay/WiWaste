<?php

namespace App\Http\Controllers\Concerns;

use App\Http\Resources\DataBreachIncidentResource;
use App\Http\Resources\DataSubjectRequestResource;
use App\Models\AuditLog;
use App\Models\DataBreachIncident;
use App\Models\DataSubjectRequest;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Lookups, audit writes and payload shaping shared by the privacy
 * compliance pages.
 *
 * `PrivacyComplianceController` and `DataBreachController` both needed
 * the same find/audit/payload helpers, which pushed the first one past
 * Sonar's method-count limit. The two controllers are split by resource
 * (data subject requests vs breach incidents); everything they still
 * share lives here.
 */
trait PrivacyComplianceHelpers
{
    protected function findRequest(Request $request, int $id): DataSubjectRequest
    {
        $query = DataSubjectRequest::query();
        if ($businessId = $request->user()?->business_id) {
            $query->where('business_id', $businessId);
        }

        return $query->findOrFail($id);
    }

    protected function findBreach(Request $request, int $id): DataBreachIncident
    {
        $query = DataBreachIncident::query();
        if ($businessId = $request->user()?->business_id) {
            $query->where('business_id', $businessId);
        }

        return $query->findOrFail($id);
    }

    protected function audit(Request $request, string $action, string $entityType, $entityId, array $new = []): void
    {
        AuditLog::create([
            'user_id' => $request->user()?->User_id,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => (string) $entityId,
            'new_values' => $new ? json_encode($new) : null,
            'created_at' => now(),
            'business_id' => $request->user()?->business_id,
            'branch_id' => $request->user()?->branch_id,
        ]);
    }

    protected function requestPayload(DataSubjectRequest $row): array
    {
        return (new DataSubjectRequestResource($row))->resolve(request());
    }

    protected function breachPayload(DataBreachIncident $b): array
    {
        return (new DataBreachIncidentResource($b))->resolve(request());
    }

    /**
     * Mean days between a record being raised and it being closed out.
     *
     * @param  Collection<int, Model>  $rows
     */
    protected function avgResolutionDays($rows, string $from = 'requested_at', string $to = 'completed_at'): float
    {
        if ($rows->isEmpty()) {
            return 0.0;
        }

        $total = $rows->sum(fn ($row) => max(0, $row->{$from}->diffInDays($row->{$to})));

        return round($total / $rows->count(), 2);
    }

    /** Fallback tenant id when the caller carries no business of their own. */
    protected function fallbackBusinessId(Request $request): ?int
    {
        return $request->user()?->business_id ?? DB::table('businesses')->value('id');
    }
}
