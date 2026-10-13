<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\PrivacyComplianceHelpers;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\CreateDataBreachIncidentRequest;
use App\Http\Requests\Api\ResolveDataBreachIncidentRequest;
use App\Models\DataBreachIncident;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Data breach incidents behind the `/privacy/breaches*` endpoints.
 *
 * Split out of `PrivacyComplianceController`, which had grown past the
 * method-count limit: the breach surface (list, log, escalate, notify,
 * contain, resolve) is its own resource with its own handlers.
 */
class DataBreachController extends Controller
{
    use PrivacyComplianceHelpers;

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

    public function createBreach(CreateDataBreachIncidentRequest $request)
    {
        $data = $request->validated();

        $businessId = $this->fallbackBusinessId($request);
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

    public function resolveBreach(ResolveDataBreachIncidentRequest $request, int $id)
    {
        $data = $request->validated();
        $breach = $this->findBreach($request, $id);
        $breach->update(['status' => 'resolved', 'resolved_at' => now()]);

        return response()->json([
            'message' => 'Incident resolved.',
            'resolution_notes' => $data['resolution_notes'] ?? null,
            'incident' => $this->breachPayload($breach->fresh()),
        ]);
    }
}
