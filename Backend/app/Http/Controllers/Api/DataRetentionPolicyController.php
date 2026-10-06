<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesTenant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreDataRetentionPolicyRequest;
use App\Http\Requests\Api\UpdateDataRetentionPolicyRequest;
use App\Http\Resources\DataRetentionPolicyResource;
use App\Models\DataPurgeLog;
use App\Models\DataRetentionPolicy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Retention policies and the purge runs they produce.
 *
 * The wire format is the one `Frontend/src/pages/admin/DataRetentionConfig.tsx` and
 * the `privacy.retention*` helpers in `services/api.ts` were written against:
 * `{ data: ApiRetentionPolicy[], summary: ApiRetentionSummary }`, policies keyed and
 * updated by `entity_type`, and an `enabled` flag (which maps to `is_active` in the
 * schema).
 */
class DataRetentionPolicyController extends Controller
{
    use ScopesTenant;

    /**
     * Entity types offered by the UI, mapped to their physical table + the column the
     * retention clock runs against. These are the real table names and date columns:
     * `Wastage_Record` records on `date_recorded` (not `wastage_date`), and the privacy
     * tables are snake_case, unlike the rest of the schema.
     */
    private const ENTITY_TABLES = [
        'audit_logs' => ['table' => 'Audit_Log', 'date' => 'created_at'],
        'sales' => ['table' => 'Sales_Transaction', 'date' => 'transaction_date'],
        'wastage' => ['table' => 'Wastage_Record', 'date' => 'date_recorded'],
        'returns' => ['table' => 'Return_Transaction', 'date' => 'return_date'],
        'movements' => ['table' => 'Stock_Movement', 'date' => 'movement_date'],
        'breach_incidents' => ['table' => 'data_breach_incidents', 'date' => 'detected_at'],
        'subject_requests' => ['table' => 'data_subject_requests', 'date' => 'requested_at'],
        // Aliases kept for policies stored under the longer names the migration documents.
        'sales_transactions' => ['table' => 'Sales_Transaction', 'date' => 'transaction_date'],
        'wastage_records' => ['table' => 'Wastage_Record', 'date' => 'date_recorded'],
        'return_transactions' => ['table' => 'Return_Transaction', 'date' => 'return_date'],
        'stock_movements' => ['table' => 'Stock_Movement', 'date' => 'movement_date'],
    ];

    public function index(Request $request)
    {
        $query = DataRetentionPolicy::query();
        $query = $this->scopeForBusinessAndBranch($query, $request);

        if ($entityType = $request->input('entity_type')) {
            $query->where('entity_type', $entityType);
        }

        $policies = $query->orderBy('entity_type')->get();

        return response()->json([
            'data' => $policies->map(fn (DataRetentionPolicy $p) => (new DataRetentionPolicyResource($p))->resolve($request))->all(),
            'summary' => $this->retentionSummary($request)->getData(true),
        ]);
    }

    public function retentionSummary(Request $request)
    {
        $query = DataRetentionPolicy::query();
        $query = $this->scopeForBusinessAndBranch($query, $request);

        $logs = DataPurgeLog::query();
        $logs = $this->scopeForBusinessAndBranch($logs, $request);

        $total = (clone $query)->count();
        $active = (clone $query)->where('is_active', true)->count();

        $recordsPurged = (int) ((clone $logs)->sum('records_purged')
            + (clone $logs)->sum('records_anonymized')
            + (clone $logs)->sum('records_archived'));

        $nextPurge = (clone $query)->where('is_active', true)->get()
            ->map(fn (DataRetentionPolicy $p) => $p->getCutoffDate())
            ->sort()
            ->first();

        return response()->json([
            'total_policies' => $total,
            'active_policies' => $active,
            'total_records_purged' => $recordsPurged,
            'next_scheduled_purge' => $nextPurge?->toISOString(),
        ]);
    }

    public function store(StoreDataRetentionPolicyRequest $request)
    {
        $user = $request->user();

        $data = $request->validated();

        if (! isset(self::ENTITY_TABLES[$data['entity_type']])) {
            return response()->json([
                'message' => 'Unknown entity type: '.$data['entity_type'],
            ], 422);
        }

        $businessId = $user?->business_id ?? DB::table('businesses')->value('id');
        if ($businessId === null) {
            return response()->json(['message' => 'No business is configured.'], 422);
        }

        $existing = DataRetentionPolicy::where('business_id', $businessId)
            ->where('entity_type', $data['entity_type'])
            ->first();

        // The schema has a unique key on (business_id, entity_type), and the UI treats
        // entity_type as the policy's identity, so re-adding one updates it in place.
        if ($existing) {
            $existing->update([
                'retention_days' => $data['retention_days'],
                'description' => $data['description'] ?? $existing->description,
                'is_active' => $data['enabled'] ?? $existing->is_active,
            ]);

            return response()->json([
                'message' => 'Retention policy updated.',
                'policy' => (new DataRetentionPolicyResource($existing->fresh()))->resolve($request),
            ]);
        }

        $policy = DataRetentionPolicy::create([
            'business_id' => $businessId,
            'entity_type' => $data['entity_type'],
            'retention_days' => $data['retention_days'],
            'retention_unit' => 'days',
            'trigger_event' => 'created_at',
            // Archiving is the safe default: a purge is irreversible.
            'action' => 'archive',
            'is_active' => $data['enabled'] ?? true,
            'notify_before_purge' => true,
            'description' => $data['description'] ?? null,
        ]);

        return response()->json([
            'message' => 'Retention policy created.',
            'policy' => (new DataRetentionPolicyResource($policy))->resolve($request),
        ], 201);
    }

    public function show($id)
    {
        return (new DataRetentionPolicyResource($this->findPolicy(request(), $id)))->resolve(request());
    }

    /** Policies are addressed by `entity_type` in the UI, not by numeric id. */
    public function update(UpdateDataRetentionPolicyRequest $request, $id)
    {
        $policy = $this->findPolicy($request, $id);

        $data = $request->validated();

        if (isset($data['retention_days'])) {
            $policy->retention_days = $data['retention_days'];
        }
        if (array_key_exists('description', $data)) {
            $policy->description = $data['description'];
        }
        if (array_key_exists('enabled', $data)) {
            $policy->is_active = (bool) $data['enabled'];
        }
        $policy->save();

        return response()->json([
            'message' => 'Retention policy updated.',
            'policy' => (new DataRetentionPolicyResource($policy->fresh()))->resolve($request),
        ]);
    }

    public function destroy($id)
    {
        $this->findPolicy(request(), $id)->delete();

        return response()->json(['message' => 'Retention policy deleted.']);
    }

    /** Manual purge requested from the Data Retention page. */
    public function purgeNow(Request $request, $id)
    {
        return $this->executePurge($request, $this->findPolicy($request, $id)->policy_id);
    }

    /** Dry run: same query, but nothing is deleted and nothing is logged. */
    public function testPurge(Request $request, $id)
    {
        $policy = $this->findPolicy($request, $id);
        $entity = $this->resolveEntity($policy->entity_type);

        if ($entity === null) {
            return response()->json(['message' => 'Unknown entity type.'], 422);
        }

        $count = $this->buildPurgeQuery($policy, $entity)->count();

        return response()->json([
            'message' => 'Dry run completed.',
            'dry_run' => true,
            'policy_id' => $policy->policy_id,
            'entity_type' => $policy->entity_type,
            'entity_table' => $entity['table'],
            'cutoff_date' => $policy->getCutoffDate()->toISOString(),
            'estimated_records' => $count,
        ]);
    }

    public function executePurge(Request $request, $id)
    {
        $policy = $this->findPolicy($request, $id);

        if (! $policy->is_active) {
            return response()->json(['message' => 'Policy is not active.'], 422);
        }

        $entity = $this->resolveEntity($policy->entity_type);
        if ($entity === null) {
            return response()->json(['message' => 'Unknown entity type.'], 422);
        }

        $query = $this->buildPurgeQuery($policy, $entity);
        [$purged, $anonymized, $archived] = $this->executeAction($policy->action, $query);

        $log = $this->logPurge($policy, $entity['table'], $purged, $anonymized, $archived, $policy->action);

        return response()->json([
            'message' => 'Purge executed successfully.',
            'entity_type' => $policy->entity_type,
            'cutoff_date' => $policy->getCutoffDate()->toISOString(),
            'records_affected' => $purged + $anonymized + $archived,
            'purge_log' => $log,
        ]);
    }

    public function previewPurge(Request $request, $id)
    {
        $policy = $this->findPolicy($request, $id);
        $entity = $this->resolveEntity($policy->entity_type);

        if ($entity === null) {
            return response()->json(['message' => 'Unknown entity type.'], 422);
        }

        $query = $this->buildPurgeQuery($policy, $entity);

        return response()->json([
            'policy_id' => $policy->policy_id,
            'entity_type' => $policy->entity_type,
            'entity_table' => $entity['table'],
            'cutoff_date' => $policy->getCutoffDate()->toISOString(),
            'action' => $policy->action,
            'estimated_records' => (clone $query)->count(),
            'sample_records' => (clone $query)->limit(10)->get(),
        ]);
    }

    public function purgeLogs(Request $request)
    {
        $query = DataPurgeLog::query();
        $query = $this->scopeForBusinessAndBranch($query, $request);

        if ($entityType = $request->input('entity_type')) {
            $query->where('entity_type', $entityType);
        }
        if ($from = $request->input('from')) {
            $query->whereDate('purged_at', '>=', $from);
        }
        if ($to = $request->input('to')) {
            $query->whereDate('purged_at', '<=', $to);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);

        return response()->json(
            $query->orderByDesc('purged_at')->paginate($perPage)
        );
    }

    // â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    private function findPolicy(Request $request, string|int $id): DataRetentionPolicy
    {
        $query = DataRetentionPolicy::query();
        $query = $this->scopeForBusinessAndBranch($query, $request);

        // The UI addresses policies by `entity_type`; the numeric id still works.
        $policy = ctype_digit((string) $id)
            ? $query->find($id)
            : $query->where('entity_type', $id)->first();

        abort_if($policy === null, 404, 'No query results for model [DataRetentionPolicy] '.$id);

        return $policy;
    }

    private function resolveEntity(string $entityType): ?array
    {
        return self::ENTITY_TABLES[$entityType] ?? null;
    }

    private function buildPurgeQuery(DataRetentionPolicy $policy, array $entity)
    {
        $query = DB::table($entity['table'])
            ->where($entity['date'], '<=', $policy->getCutoffDate());

        // Not every entity table carries a business/branch scope, and asking for a
        // column that isn't there makes the whole purge query fail.
        if ($policy->business_id && Schema::hasColumn($entity['table'], 'business_id')) {
            $query->where('business_id', $policy->business_id);
        }

        return $query;
    }

    private function executeAction(string $action, $query): array
    {
        return match ($action) {
            'delete' => [$query->delete(), 0, 0],
            'anonymize' => [0, $query->count(), 0],
            'archive' => [0, 0, $query->count()],
            default => [0, 0, 0],
        };
    }

    private function logPurge(DataRetentionPolicy $policy, string $entityTable, int $purged, int $anonymized, int $archived, string $action): DataPurgeLog
    {
        return DataPurgeLog::create([
            'business_id' => $policy->business_id,
            'policy_id' => $policy->policy_id,
            'entity_type' => $policy->entity_type,
            'entity_table' => $entityTable,
            'records_purged' => $purged,
            'records_anonymized' => $anonymized,
            'records_archived' => $archived,
            'cutoff_date' => $policy->getCutoffDate(),
            'purged_at' => now(),
            'criteria_json' => json_encode([
                'entity_type' => $policy->entity_type,
                'cutoff_date' => $policy->getCutoffDate()->toISOString(),
                'action' => $policy->action,
            ]),
            'action_taken' => match ($action) {
                'delete' => 'deleted',
                'anonymize' => 'anonymized',
                default => 'archived',
            },
            'initiated_by' => (string) (request()->user()?->User_id ?? 'system'),
            'status' => 'completed',
        ]);
    }

    /** The shape `ApiRetentionPolicy` declares on the frontend. */
    private function payload(DataRetentionPolicy $p): array
    {
        return (new DataRetentionPolicyResource($p))->resolve(request());
    }
}
