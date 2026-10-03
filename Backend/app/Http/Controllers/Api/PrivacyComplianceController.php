<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\DataBreachIncident;
use App\Models\DataSubjectRequest;
use App\Models\PrivacyProcessingRecord;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Serves the `/privacy/*` endpoints the admin compliance pages call.
 *
 * The admin pages (Data Subject Requests, Breach Incident Log, Data Retention
 * Configuration) all live under `Frontend/src/pages/admin` and call `privacy.*`
 * in `services/api.ts`, but none of those paths were ever routed — every request
 * 404'd and each page rendered with empty tables. This controller provides them.
 */
class PrivacyComplianceController extends Controller
{
    /** Data subject requests (access / rectification / erasure / …). */
    public function requests(Request $request)
    {
        $query = DataSubjectRequest::query();

        if ($businessId = $request->user()?->business_id) {
            $query->where('business_id', $businessId);
        }
        if ($type = $request->input('type')) {
            $query->where('request_type', $type);
        }
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $perPage = min((int) $request->input('per_page', 50), 100);
        $page = (int) $request->input('page', 1);

        $total = (clone $query)->count();
        $rows = $query->orderByDesc('requested_at')
            ->forPage($page, $perPage)
            ->get()
            ->map(fn (DataSubjectRequest $r) => $this->requestPayload($r));

        return response()->json([
            'data' => $rows,
            'meta' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => max(1, (int) ceil($total / $perPage)),
            ],
        ]);
    }

    public function createRequest(Request $request)
    {
        $data = $request->validate([
            'request_type' => 'required|in:access,rectification,erasure,portability,restriction,objection',
            'subject_identifier' => 'required|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ]);

        $businessId = $request->user()?->business_id ?? DB::table('businesses')->value('id');
        if ($businessId === null) {
            return response()->json(['message' => 'No business is configured.'], 422);
        }

        $duplicate = DataSubjectRequest::where('business_id', $businessId)
            ->where('subject_identifier', $data['subject_identifier'])
            ->where('request_type', $data['request_type'])
            ->whereIn('status', ['pending', 'in_progress'])
            ->exists();

        if ($duplicate) {
            return response()->json([
                'message' => 'A similar request is already pending or in progress.',
            ], 409);
        }

        $row = DataSubjectRequest::create([
            'business_id' => $businessId,
            'request_type' => $data['request_type'],
            'subject_identifier' => $data['subject_identifier'],
            'status' => 'pending',
            'notes' => $data['notes'] ?? null,
        ]);

        $this->audit($request, 'created', 'DataSubjectRequest', $row->id, ['status' => 'pending']);

        return response()->json([
            'message' => 'Data subject request submitted successfully.',
            'request' => $this->requestPayload($row),
        ], 201);
    }

    public function approveRequest(Request $request, int $id)
    {
        return $this->transitionRequest($request, $id, 'completed', 'Data subject request approved.');
    }

    public function rejectRequest(Request $request, int $id)
    {
        return $this->transitionRequest($request, $id, 'rejected', 'Data subject request rejected.');
    }

    public function deleteRequest(Request $request, int $id)
    {
        $row = $this->findRequest($request, $id);
        $this->audit($request, 'deleted', 'DataSubjectRequest', $row->id);
        $row->delete();

        return response()->json(['message' => 'Data subject request deleted.']);
    }

    /** Aggregate counters for the compliance dashboard. */
    public function complianceReport(Request $request)
    {
        $businessId = $request->user()?->business_id;
        $from = $request->input('from');
        $to = $request->input('to');

        $requests = DataSubjectRequest::query()
            ->when($businessId, fn ($q) => $q->where('business_id', $businessId))
            ->when($from, fn ($q) => $q->whereDate('requested_at', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('requested_at', '<=', $to));

        $breaches = DataBreachIncident::query()
            ->when($businessId, fn ($q) => $q->where('business_id', $businessId))
            ->when($from, fn ($q) => $q->whereDate('detected_at', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('detected_at', '<=', $to));

        $processing = PrivacyProcessingRecord::query()
            ->when($businessId, fn ($q) => $q->where('business_id', $businessId));

        $byStatus = (clone $requests)->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')->pluck('total', 'status');
        $byType = (clone $requests)->select('request_type', DB::raw('COUNT(*) as total'))
            ->groupBy('request_type')->pluck('total', 'request_type');
        $byRisk = (clone $breaches)->select('risk_assessment', DB::raw('COUNT(*) as total'))
            ->groupBy('risk_assessment')->pluck('total', 'risk_assessment');
        $byCategory = (clone $processing)->select('data_category', DB::raw('COUNT(*) as total'))
            ->groupBy('data_category')->pluck('total', 'data_category');
        $byLegalBasis = (clone $processing)->select('legal_basis', DB::raw('COUNT(*) as total'))
            ->groupBy('legal_basis')->pluck('total', 'legal_basis');

        return response()->json([
            'period' => [
                'from' => $from ?? now()->startOfYear()->toDateString(),
                'to' => $to ?? now()->toDateString(),
            ],
            'processing_records' => [
                'total' => (clone $processing)->count(),
                'by_category' => $byCategory,
                'by_legal_basis' => $byLegalBasis,
            ],
            'subject_requests' => [
                'total' => (clone $requests)->count(),
                'by_type' => $byType,
                'by_status' => $byStatus,
                'avg_resolution_days' => $this->avgResolutionDays(
                    (clone $requests)->whereNotNull('completed_at')->get(['requested_at', 'completed_at'])
                ),
            ],
            'breaches' => [
                'total' => (clone $breaches)->count(),
                'by_risk' => $byRisk,
                'npc_notified' => (clone $breaches)->whereNotNull('npc_notified_at')->count(),
                'subjects_notified' => (clone $breaches)->whereNotNull('subjects_notified_at')->count(),
            ],
        ]);
    }

    /**
     * Mean days between a record being raised and it being closed out.
     *
     * @param  \Illuminate\Support\Collection<int, \Illuminate\Database\Eloquent\Model>  $rows
     */
    private function avgResolutionDays($rows, string $from = 'requested_at', string $to = 'completed_at'): float
    {
        if ($rows->isEmpty()) {
            return 0.0;
        }

        $total = $rows->sum(fn ($row) => max(0, $row->{$from}->diffInDays($row->{$to})));

        return round($total / $rows->count(), 2);
    }

    /** Data breach incidents. */
    public function breaches(Request $request)
    {
        $query = DataBreachIncident::query();

        if ($businessId = $request->user()?->business_id) {
            $query->where('business_id', $businessId);
        }
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }
        if ($risk = $request->input('risk')) {
            $query->where('risk_assessment', $risk);
        }

        $perPage = min((int) $request->input('per_page', 50), 100);
        $page = (int) $request->input('page', 1);

        $total = (clone $query)->count();
        $rows = $query->orderByDesc('detected_at')
            ->forPage($page, $perPage)
            ->get()
            ->map(fn (DataBreachIncident $b) => $this->breachPayload($b));

        return response()->json([
            'data' => $rows,
            'meta' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => max(1, (int) ceil($total / $perPage)),
            ],
        ]);
    }

    public function createBreach(Request $request)
    {
        $data = $request->validate([
            'description' => 'required|string|max:1000',
            'personal_data_affected' => 'required|string|max:1000',
            'risk_assessment' => 'required|in:low,medium,high,critical',
            'detected_at' => 'nullable|date',
            'npc_notification_required' => 'nullable|boolean',
        ]);

        $businessId = $request->user()?->business_id ?? DB::table('businesses')->value('id');
        if ($businessId === null) {
            return response()->json(['message' => 'No business is configured.'], 422);
        }

        $breach = DataBreachIncident::create([
            'business_id' => $businessId,
            'detected_at' => $data['detected_at'] ?? now(),
            'description' => $data['description'],
            'personal_data_affected' => $data['personal_data_affected'],
            'risk_assessment' => $data['risk_assessment'],
            // A high/critical breach always triggers an NPC notification requirement.
            'npc_notification_required' => $data['npc_notification_required']
                ?? in_array($data['risk_assessment'], ['high', 'critical'], true),
            'status' => 'open',
        ]);

        return response()->json([
            'message' => 'Breach incident logged.',
            'incident' => $this->breachPayload($breach),
        ], 201);
    }

    public function breachStatistics(Request $request)
    {
        $businessId = $request->user()?->business_id;
        $base = fn () => DataBreachIncident::query()
            ->when($businessId, fn ($q) => $q->where('business_id', $businessId));

        $byStatus = $base()->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')->pluck('total', 'status');
        $byRisk = $base()->select('risk_assessment', DB::raw('COUNT(*) as total'))
            ->groupBy('risk_assessment')->pluck('total', 'risk_assessment');

        return response()->json([
            'total' => $base()->count(),
            'by_status' => $byStatus,
            'by_risk' => $byRisk,
            'npc_notified' => (clone $base())->whereNotNull('npc_notified_at')->count(),
            'subjects_notified' => (clone $base())->whereNotNull('subjects_notified_at')->count(),
            'avg_resolution_days' => $this->avgResolutionDays(
                (clone $base())->whereNotNull('resolved_at')->get(['detected_at', 'resolved_at']),
                'detected_at',
                'resolved_at'
            ),
        ]);
    }

    public function escalateBreach(Request $request, int $id)
    {
        $breach = $this->findBreach($request, $id);
        $breach->update([
            'status' => 'investigating',
            'npc_notification_required' => true,
        ]);

        return response()->json([
            'message' => 'Incident escalated for investigation.',
            'incident' => $this->breachPayload($breach->fresh()),
        ]);
    }

    public function notifyNPC(Request $request, int $id)
    {
        $breach = $this->findBreach($request, $id);
        $breach->update(['npc_notified_at' => now()]);

        return response()->json([
            'message' => 'National Privacy Commission notified.',
            'incident' => $this->breachPayload($breach->fresh()),
        ]);
    }

    public function notifySubjects(Request $request, int $id)
    {
        $breach = $this->findBreach($request, $id);
        $breach->update(['subjects_notified_at' => now()]);

        return response()->json([
            'message' => 'Affected data subjects notified.',
            'incident' => $this->breachPayload($breach->fresh()),
        ]);
    }

    public function containBreach(Request $request, int $id)
    {
        $breach = $this->findBreach($request, $id);
        $breach->update(['status' => 'contained']);

        return response()->json([
            'message' => 'Incident contained.',
            'incident' => $this->breachPayload($breach->fresh()),
        ]);
    }

    public function resolveBreach(Request $request, int $id)
    {
        $data = $request->validate(['resolution_notes' => 'nullable|string|max:1000']);
        $breach = $this->findBreach($request, $id);
        $breach->update(['status' => 'resolved', 'resolved_at' => now()]);

        return response()->json([
            'message' => 'Incident resolved.',
            'resolution_notes' => $data['resolution_notes'] ?? null,
            'incident' => $this->breachPayload($breach->fresh()),
        ]);
    }

    // ── helpers ────────────────────────────────────────────────────────────

    private function findRequest(Request $request, int $id): DataSubjectRequest
    {
        $query = DataSubjectRequest::query();
        if ($businessId = $request->user()?->business_id) {
            $query->where('business_id', $businessId);
        }

        return $query->findOrFail($id);
    }

    private function transitionRequest(Request $request, int $id, string $status, string $message)
    {
        $row = $this->findRequest($request, $id);
        $row->update([
            'status' => $status,
            'completed_at' => $status === 'completed' ? now() : $row->completed_at,
        ]);

        $this->audit($request, $status, 'DataSubjectRequest', $row->id, ['status' => $status]);

        return response()->json([
            'message' => $message,
            'request' => $this->requestPayload($row->fresh()),
        ]);
    }

    private function findBreach(Request $request, int $id): DataBreachIncident
    {
        $query = DataBreachIncident::query();
        if ($businessId = $request->user()?->business_id) {
            $query->where('business_id', $businessId);
        }

        return $query->findOrFail($id);
    }

    private function audit(Request $request, string $action, string $entityType, $entityId, array $new = []): void
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

    private function requestPayload(DataSubjectRequest $row): array
    {
        return [
            'id' => $row->id,
            'business_id' => $row->business_id,
            'request_type' => $row->request_type,
            'subject_identifier' => $row->subject_identifier,
            'status' => $row->status,
            'notes' => $row->notes,
            'requested_at' => $row->requested_at?->toISOString(),
            'completed_at' => $row->completed_at?->toISOString(),
        ];
    }

    private function breachPayload(DataBreachIncident $b): array
    {
        return [
            'id' => $b->id,
            'business_id' => $b->business_id,
            'detected_at' => $b->detected_at?->toISOString(),
            'description' => $b->description,
            'personal_data_affected' => $b->personal_data_affected,
            'risk_assessment' => $b->risk_assessment,
            'npc_notification_required' => (bool) $b->npc_notification_required,
            'npc_notified_at' => $b->npc_notified_at?->toISOString(),
            'subjects_notified_at' => $b->subjects_notified_at?->toISOString(),
            'status' => $b->status,
            'resolved_at' => $b->resolved_at?->toISOString(),
        ];
    }
}