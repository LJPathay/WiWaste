<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\PrivacyComplianceHelpers;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\CreateDataSubjectRequestRequest;
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
 *
 * The breach-incident handlers moved to `DataBreachController`; the two
 * controllers share their lookups, audit writes and payload shaping through
 * the `PrivacyComplianceHelpers` trait.
 */
class PrivacyComplianceController extends Controller
{
    use PrivacyComplianceHelpers;

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

    public function createRequest(CreateDataSubjectRequestRequest $request)
    {
        $data = $request->validated();

        $businessId = $this->fallbackBusinessId($request);
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

        $byStatus = $this->countByGroup(clone $requests, 'status');
        $byType = $this->countByGroup(clone $requests, 'request_type');
        $byRisk = $this->countByGroup(clone $breaches, 'risk_assessment');
        $byCategory = $this->countByGroup(clone $processing, 'data_category');
        $byLegalBasis = $this->countByGroup(clone $processing, 'legal_basis');

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

    // ── helpers ──

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

    /**
     * Counts rows grouped by the given column, keyed by the column value.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Support\Collection
     */
    private function countByGroup($query, string $column)
    {
        return $query->select($column, DB::raw('COUNT(*) as total'))
            ->groupBy($column)->pluck('total', $column);
    }
}
