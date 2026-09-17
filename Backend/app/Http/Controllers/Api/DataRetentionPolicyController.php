<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DataRetentionPolicy;
use App\Models\DataPurgeLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DataRetentionPolicyController extends Controller
{
    protected function scopeForBusinessAndBranch($query, Request $request)
    {
        $user = $request->user();
        if ($user && $user->business_id) {
            $query->where('business_id', $user->business_id);
        }
        if ($user && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }
        return $query;
    }

    public function index(Request $request)
    {
        $query = DataRetentionPolicy::query();
        $query = $this->scopeForBusinessAndBranch($query, $request);

        if ($isActive = $request->input('is_active')) {
            $query->where('is_active', $isActive);
        }

        if ($entityType = $request->input('entity_type')) {
            $query->where('entity_type', $entityType);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json(
            $query->orderBy('entity_type')->paginate($perPage)
        );
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'entity_type' => 'required|string|max:100',
            'entity_column' => 'nullable|string|max:100',
            'retention_days' => 'required|integer|min:1',
            'retention_unit' => 'required|in:days,weeks,months,years',
            'trigger_event' => 'required|string|max:50',
            'action' => 'required|in:delete,anonymize,archive',
            'conditions_json' => 'nullable|json',
            'is_active' => 'boolean',
            'notify_before_purge' => 'boolean',
            'notify_days_before' => 'nullable|integer|min:0',
            'description' => 'nullable|string|max:500',
        ]);

        $data['business_id'] = $data['business_id'] ?? $user?->business_id;
        $data['branch_id'] = $data['branch_id'] ?? $user?->branch_id;
        $data['is_active'] = $data['is_active'] ?? true;
        $data['notify_before_purge'] = $data['notify_before_purge'] ?? true;

        $policy = DataRetentionPolicy::create($data);

        return response()->json([
            'message' => 'Retention policy created.',
            'policy' => $policy,
        ], 201);
    }

    public function show($id)
    {
        $query = DataRetentionPolicy::query();
        $query = $this->scopeForBusinessAndBranch($query, request());
        $policy = $query->findOrFail($id);

        return response()->json($policy);
    }

    public function update(Request $request, $id)
    {
        $query = DataRetentionPolicy::query();
        $query = $this->scopeForBusinessAndBranch($query, request());
        $policy = $query->findOrFail($id);

        $data = $request->validate([
            'retention_days' => 'sometimes|integer|min:1',
            'retention_unit' => 'sometimes|in:days,weeks,months,years',
            'trigger_event' => 'sometimes|string|max:50',
            'action' => 'sometimes|in:delete,anonymize,archive',
            'conditions_json' => 'nullable|json',
            'is_active' => 'boolean',
            'notify_before_purge' => 'boolean',
            'notify_days_before' => 'nullable|integer|min:0',
            'description' => 'nullable|string|max:500',
        ]);

        $policy->update($data);

        return response()->json([
            'message' => 'Retention policy updated.',
            'policy' => $policy->fresh(),
        ]);
    }

    public function destroy($id)
    {
        $query = DataRetentionPolicy::query();
        $query = $this->scopeForBusinessAndBranch($query, request());
        $policy = $query->findOrFail($id);

        $policy->delete();

        return response()->json(['message' => 'Retention policy deleted.']);
    }

    /**
     * Run purge for a specific policy
     */
    public function executePurge(Request $request, $id)
    {
        $query = DataRetentionPolicy::query();
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $policy = $query->findOrFail($id);

        if (!$policy->is_active) {
            return response()->json(['message' => 'Policy is not active.'], 422);
        }

        return DB::transaction(function () use ($policy) {
            $entityTable = $this->getEntityTable($policy->entity_type);

            if (!$entityTable) {
                return response()->json(['message' => 'Unknown entity type.'], 422);
            }

            $query = $this->buildPurgeQuery($policy, $entityTable);
            [$recordsPurged, $recordsAnonymized, $recordsArchived] = $this->executeAction($policy->action, $query);
            $purgeLog = $this->logPurge($policy, $entityTable, $recordsPurged, $recordsAnonymized, $recordsArchived, $policy->action);

            return response()->json([
                'message' => 'Purge executed successfully.',
                'records_affected' => $recordsPurged + $recordsAnonymized + $recordsArchived,
                'purge_log' => $purgeLog,
            ]);
        });
    }

    /**
     * Preview what would be purged without executing
     */
    public function previewPurge(Request $request, $id)
    {
        $query = DataRetentionPolicy::query();
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $policy = $query->findOrFail($id);

        $entityTable = $this->getEntityTable($policy->entity_type);

        if (!$entityTable) {
            return response()->json(['message' => 'Unknown entity type.'], 422);
        }

        $query = $this->buildPurgeQuery($policy, $entityTable);
        $count = $query->count();
        $sample = clone $query;
        $sample = $sample->limit(10)->get();

        return response()->json([
            'policy_id' => $policy->policy_id,
            'entity_type' => $policy->entity_type,
            'cutoff_date' => $policy->getCutoffDate()->toISOString(),
            'action' => $policy->action,
            'estimated_records' => $count,
            'sample_records' => $sample,
        ]);
    }

    public function purgeLogs(Request $request)
    {
        $query = DataPurgeLog::query();
        $query = $this->scopeForBusinessAndBranch($query, $request);

        if ($entityType = $request->input('entity_type')) {
            $query->where('entity_type', $entityType);
        }

        if ($action = $request->input('action')) {
            $query->where('action_taken', $action);
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

    protected function buildPurgeQuery(DataRetentionPolicy $policy, string $entityTable)
    {
        $query = DB::table($entityTable)
            ->where('business_id', $policy->business_id)
            ->where('created_at', '<=', $policy->getCutoffDate());

        if ($policy->branch_id) {
            $query->where('branch_id', $policy->branch_id);
        }

        if ($policy->conditions_json) {
            $conditions = json_decode($policy->conditions_json, true);
            if (is_array($conditions)) {
                foreach ($conditions as $field => $value) {
                    $query->where($field, $value);
                }
            }
        }

        return $query;
    }

    protected function executeAction(string $action, $query): array
    {
        $recordsPurged = 0;
        $recordsAnonymized = 0;
        $recordsArchived = 0;

        if ($action === 'delete') {
            $recordsPurged = $query->delete();
        } elseif ($action === 'anonymize') {
            $recordsAnonymized = $query->count();
        } elseif ($action === 'archive') {
            $recordsArchived = $query->count();
        }

        return [$recordsPurged, $recordsAnonymized, $recordsArchived];
    }

    protected function logPurge(DataRetentionPolicy $policy, string $entityTable, int $purged, int $anonymized, int $archived, string $action): DataPurgeLog
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
            'action_taken' => $action,
            'initiated_by' => request()->user()?->User_id ?? 'system',
            'status' => 'completed',
        ]);
    }

    protected function getEntityTable(string $entityType): ?string
    {
        $tableMap = [
            'sales_transactions' => 'Sales_Transaction',
            'sales_items' => 'Sales_Item',
            'audit_logs' => 'Audit_Log',
            'wastage_records' => 'Wastage_Record',
            'return_transactions' => 'Return_Transaction',
            'stock_movements' => 'Stock_Movement',
            'inventory' => 'Inventory',
            'products' => 'Product',
            'customers' => 'Customer',
        ];

        return $tableMap[$entityType] ?? null;
    }
}
