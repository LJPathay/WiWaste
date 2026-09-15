<?php

namespace App\Services;

use App\Models\DataBreachIncident;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class BreachResponseService
{
    /**
     * Create a new breach incident
     */
    public function createIncident(array $data): DataBreachIncident
    {
        return DB::transaction(function () use ($data) {
            $incident = DataBreachIncident::create([
                'business_id' => $data['business_id'],
                'detected_at' => $data['detected_at'] ?? now(),
                'description' => $data['description'],
                'personal_data_affected' => $data['personal_data_affected'],
                'risk_assessment' => $data['risk_assessment'] ?? 'medium',
                'npc_notification_required' => $data['npc_notification_required'] ?? false,
                'status' => 'open',
            ]);

            $this->logAudit('created', $incident, null, $data);

            // If critical, auto-escalate
            if ($incident->risk_assessment === 'critical') {
                $this->escalate($incident);
            }

            return $incident;
        });
    }

    /**
     * Assess risk level of a breach
     */
    public function assessRisk(DataBreachIncident $incident): string
    {
        $risk = 'low';
        
        // Factors that increase risk
        $factors = [
            'sensitive_data' => 2,      // Health, financial, ID data
            'volume_high' => 2,         // > 1000 records
            'external_exposure' => 2,   // Data sent outside org
            'system_compromise' => 2,   // Server/DB breach
            'unencrypted' => 1,         // Data not encrypted
            'known_exploit' => 2,       // Active exploit in wild
        ];

        $score = 0;
        // In real implementation, these would be determined from incident data
        // For now, return the stored assessment
        return $incident->risk_assessment;
    }

    /**
     * Escalate breach to DPO and management
     */
    public function escalate(DataBreachIncident $incident): void
    {
        // Notify DPO
        $this->notifyDPO($incident);
        
        // Notify management
        $this->notifyManagement($incident);
        
        $incident->update(['status' => 'investigating']);
        
        $this->logAudit('escalated', $incident);
    }

    /**
     * Notify DPO
     */
    protected function notifyDPO(DataBreachIncident $incident): void
    {
        $business = $incident->business;
        if ($business && $business->dpo_email) {
            // In real implementation, send email
            // Mail::to($business->dpo_email)->send(new BreachNotification($incident));
        }
    }

    /**
     * Notify management
     */
    protected function notifyManagement(DataBreachIncident $incident): void
    {
        // Send to business owners/admins
    }

    /**
     * Notify NPC (National Privacy Commission) if required
     */
    public function notifyNPC(DataBreachIncident $incident): bool
    {
        if (!$incident->npc_notification_required) {
            return false;
        }

        // In real implementation, submit to NPC portal
        // This would include:
        // - Incident description
        // - Nature of breach
        // - Categories of data affected
        // - Number of data subjects affected
        // - Likely consequences
        // - Measures taken

        $incident->update([
            'npc_notified_at' => now(),
        ]);

        $this->logAudit('npc_notified', $incident);

        return true;
    }

    /**
     * Notify affected data subjects
     */
    public function notifySubjects(DataBreachIncident $incident): void
    {
        if ($incident->subjects_notified_at) {
            return; // Already notified
        }

        // In real implementation:
        // - Query affected users based on breach scope
        // - Send notification emails
        // - Provide guidance on protective measures

        $incident->update(['subjects_notified_at' => now()]);
        
        $this->logAudit('subjects_notified', $incident);
    }

    /**
     * Contain the breach
     */
    public function contain(DataBreachIncident $incident, array $containmentActions): void
    {
        $incident->update([
            'status' => 'contained',
            'description' => $incident->description . "\n\nContainment Actions:\n" . implode("\n", $containmentActions),
        ]);

        $this->logAudit('contained', $incident, ['actions' => $containmentActions]);
    }

    /**
     * Resolve the breach
     */
    public function resolve(DataBreachIncident $incident, array $resolutionData): void
    {
        $incident->update([
            'status' => 'resolved',
            'resolved_at' => now(),
            'description' => $incident->description . "\n\nResolution:\n" . ($resolutionData['notes'] ?? ''),
        ]);

        $this->logAudit('resolved', $incident, $resolutionData);
    }

    /**
     * Generate breach report for NPC submission
     */
    public function generateNPCReport(DataBreachIncident $incident): array
    {
        return [
            'incident_id' => $incident->id,
            'detected_at' => $incident->detected_at->toISOString(),
            'business' => $incident->business?->name,
            'description' => $incident->description,
            'personal_data_affected' => $incident->personal_data_affected,
            'risk_assessment' => $incident->risk_assessment,
            'data_subjects_affected' => $incident->data_subjects_affected ?? 0,
            'npc_notification_required' => $incident->npc_notification_required,
            'npc_notified_at' => $incident->npc_notified_at?->toISOString(),
            'subjects_notified_at' => $incident->subjects_notified_at?->toISOString(),
            'status' => $incident->status,
            'resolved_at' => $incident->resolved_at?->toISOString(),
        ];
    }

    /**
     * Get breach statistics for dashboard
     */
    public function getStatistics(int $businessId, string $fromDate = null, string $toDate = null): array
    {
        $query = DataBreachIncident::where('business_id', $businessId);
        
        if ($fromDate) $query->where('detected_at', '>=', $fromDate);
        if ($toDate) $query->where('detected_at', '<=', $toDate);

        return [
            'total' => $query->count(),
            'by_status' => [
                'open' => (clone $query)->where('status', 'open')->count(),
                'investigating' => (clone $query)->where('status', 'investigating')->count(),
                'contained' => (clone $query)->where('status', 'contained')->count(),
                'resolved' => (clone $query)->where('status', 'resolved')->count(),
            ],
            'by_risk' => [
                'low' => (clone $query)->where('risk_assessment', 'low')->count(),
                'medium' => (clone $query)->where('risk_assessment', 'medium')->count(),
                'high' => (clone $query)->where('risk_assessment', 'high')->count(),
                'critical' => (clone $query)->where('risk_assessment', 'critical')->count(),
            ],
            'npc_notified' => (clone $query)->where('npc_notified_at', '!=', null)->count(),
            'subjects_notified' => (clone $query)->where('subjects_notified_at', '!=', null)->count(),
            'avg_resolution_days' => DataBreachIncident::where('business_id', $businessId)
                ->where('status', 'resolved')
                ->get()
                ->avg(fn ($i) => $i->detected_at->diffInDays($i->resolved_at)),
        ];
    }

    protected function logAudit(string $action, DataBreachIncident $incident, array $additionalData = []): void
    {
        \App\Models\AuditLog::create([
            'user_id' => 1,
            'action' => "Breach {$action}: {$incident->description}",
            'entity_type' => 'DataBreachIncident',
            'entity_id' => $incident->id,
            'new_values' => json_encode(array_merge([
                'incident_id' => $incident->id,
                'risk' => $incident->risk_assessment,
                'status' => $incident->status,
            ], $additionalData)),
            'created_at' => now(),
            'business_id' => $incident->business_id,
        ]);
    }
}