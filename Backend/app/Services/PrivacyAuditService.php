<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\PrivacyProcessingRecord;
use App\Models\DataSubjectRequest;
use App\Models\DataBreachIncident;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class PrivacyAuditService
{
    /**
     * Log a privacy-related audit event
     */
    public function logPrivacyEvent(array $data): \App\Models\AuditLog
    {
        return DB::transaction(function () use ($data) {
            $auditLog = \App\Models\AuditLog::create([
                'user_id' => $data['user_id'] ?? auth()->id() ?? 1,
                'action' => $data['action'],
                'entity_type' => $data['entity_type'],
                'entity_id' => $data['entity_id'],
                'old_values' => isset($data['old_values']) ? json_encode($data['old_values']) : null,
                'new_values' => isset($data['new_values']) ? json_encode($data['new_values']) : null,
                'created_at' => now(),
                'business_id' => $data['business_id'] ?? auth()->user()?->business_id,
                'branch_id' => $data['branch_id'] ?? auth()->user()?->branch_id,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'request_id' => Str::uuid(),
            ]);

            // Also create a privacy processing record for DPA compliance
            if (isset($data['privacy_category'])) {
                $this->recordPrivacyProcessing($data);
            }

            return $auditLog;
        });
    }

    /**
     * Record privacy processing activity (DPA Art. 30)
     */
    protected function recordPrivacyProcessing(array $data): void
    {
        PrivacyProcessingRecord::create([
            'business_id' => $data['business_id'] ?? auth()->user()?->business_id,
            'processing_purpose' => $data['privacy_purpose'] ?? $data['action'],
            'legal_basis' => $data['legal_basis'] ?? 'legitimate_interest',
            'data_categories' => $data['data_categories'] ?? [],
            'data_subjects' => $data['data_subjects'] ?? 'customers',
            'recipients' => $data['recipients'] ?? [],
            'retention_period' => $data['retention_period'] ?? '7_years',
            'security_measures' => $data['security_measures'] ?? ['encryption', 'access_control'],
            'dpo_contact' => $data['dpo_contact'] ?? null,
            'status' => 'active',
        ]);
    }

    /**
     * Log data subject request
     */
    public function logDataSubjectRequest(\App\Models\DataSubjectRequest $request, string $action): void
    {
        $this->logPrivacyEvent([
            'action' => "Data Subject Request {$action}",
            'entity_type' => 'DataSubjectRequest',
            'entity_id' => $request->id,
            'privacy_category' => 'data_subject_rights',
            'privacy_purpose' => $request->request_type,
            'legal_basis' => 'legal_obligation',
            'data_categories' => ['personal_identifiers', 'contact_info'],
            'data_subjects' => 'data_subject',
            'new_values' => [
                'request_type' => $request->request_type,
                'status' => $request->status,
                'action' => $action,
            ],
        ]);
    }

    /**
     * Log data breach incident
     */
    public function logBreachIncident(\App\Models\DataBreachIncident $incident, string $action): void
    {
        $this->logPrivacyEvent([
            'action' => "Data Breach {$action}",
            'entity_type' => 'DataBreachIncident',
            'entity_id' => $incident->id,
            'privacy_category' => 'breach_incident',
            'privacy_purpose' => 'breach_management',
            'legal_basis' => 'legal_obligation',
            'data_categories' => [$incident->personal_data_affected],
            'data_subjects' => 'affected_individuals',
            'recipients' => $incident->npc_notification_required ? ['NPC'] : [],
            'new_values' => [
                'description' => $incident->description,
                'risk_assessment' => $incident->risk_assessment,
                'status' => $incident->status,
                'action' => $action,
            ],
        ]);
    }

    /**
     * Log consent withdrawal
     */
    public function logConsentWithdrawal(int $businessId, string $subjectIdentifier, string $consentType): void
    {
        $this->logPrivacyEvent([
            'action' => 'Consent Withdrawn',
            'entity_type' => 'Consent',
            'entity_id' => null,
            'business_id' => $businessId,
            'privacy_category' => 'consent_management',
            'privacy_purpose' => $consentType,
            'legal_basis' => 'consent',
            'data_categories' => ['consent_record'],
            'data_subjects' => 'data_subject',
            'new_values' => [
                'subject_identifier' => $subjectIdentifier,
                'consent_type' => $consentType,
                'withdrawn_at' => now()->toISOString(),
            ],
        ]);
    }

    /**
     * Log data export (access/portability)
     */
    public function logDataExport(int $businessId, string $subjectIdentifier, string $requestType, array $dataCategories): void
    {
        $this->logPrivacyEvent([
            'action' => 'Data Export',
            'entity_type' => 'DataExport',
            'entity_id' => null,
            'business_id' => $businessId,
            'privacy_category' => 'data_subject_rights',
            'privacy_purpose' => $requestType,
            'legal_basis' => 'legal_obligation',
            'data_categories' => $dataCategories,
            'data_subjects' => 'data_subject',
            'new_values' => [
                'subject_identifier' => $subjectIdentifier,
                'export_type' => $requestType,
                'categories' => $dataCategories,
            ],
        ]);
    }

    /**
     * Log data erasure
     */
    public function logDataErasure(int $businessId, string $subjectIdentifier, array $dataCategories): void
    {
        $this->logPrivacyEvent([
            'action' => 'Data Erasure',
            'entity_type' => 'DataErasure',
            'entity_id' => null,
            'business_id' => $businessId,
            'privacy_category' => 'data_subject_rights',
            'privacy_purpose' => 'erasure',
            'legal_basis' => 'legal_obligation',
            'data_categories' => $dataCategories,
            'data_subjects' => 'data_subject',
            'new_values' => [
                'subject_identifier' => $subjectIdentifier,
                'categories_erased' => $dataCategories,
                'erased_at' => now()->toISOString(),
            ],
        ]);
    }

    /**
     * Get privacy audit trail for a business
     */
    public function getPrivacyAuditTrail(int $businessId, array $filters = []): \Illuminate\Database\Eloquent\Builder
    {
        $query = \App\Models\AuditLog::query()
            ->where('business_id', $businessId)
            ->whereIn('entity_type', [
                'DataSubjectRequest',
                'DataBreachIncident',
                'PrivacyProcessingRecord',
                'Consent',
                'DataExport',
                'DataErasure',
            ])
            ->with('user')
            ->orderByDesc('created_at');

        if (isset($filters['from_date'])) {
            $query->whereDate('created_at', '>=', $filters['from_date']);
        }
        if (isset($filters['to_date'])) {
            $query->whereDate('created_at', '<=', $filters['to_date']);
        }
        if (isset($filters['entity_type'])) {
            $query->where('entity_type', $filters['entity_type']);
        }
        if (isset($filters['action'])) {
            $query->where('action', 'like', '%' . $filters['action'] . '%');
        }

        return $query;
    }

    /**
     * Generate privacy compliance report
     */
    public function generateComplianceReport(int $businessId, string $from, string $to): array
    {
        $requests = \App\Models\DataSubjectRequest::where('business_id', $businessId)
            ->whereBetween('requested_at', [$from, $to])
            ->get();

        $breaches = \App\Models\DataBreachIncident::where('business_id', $businessId)
            ->whereBetween('detected_at', [$from, $to])
            ->get();

        $processingRecords = \App\Models\PrivacyProcessingRecord::where('business_id', $businessId)
            ->where('status', 'active')
            ->get();

        return [
            'period' => ['from' => $from, 'to' => $to],
            'data_subject_requests' => [
                'total' => $requests->count(),
                'by_type' => $requests->groupBy('request_type')->map->count(),
                'by_status' => $requests->groupBy('status')->map->count(),
                'avg_resolution_days' => $requests->where('status', 'completed')
                    ->avg(fn($r) => $r->requested_at->diffInDays($r->completed_at)),
            ],
            'breach_incidents' => [
                'total' => $breaches->count(),
                'by_risk' => $breaches->groupBy('risk_assessment')->map->count(),
                'npc_notified' => $breaches->where('npc_notified_at', '!=', null)->count(),
                'subjects_notified' => $breaches->where('subjects_notified_at', '!=', null)->count(),
            ],
            'processing_records' => [
                'active' => $processingRecords->where('status', 'active')->count(),
                'by_category' => $processingRecords->groupBy('data_category')->map->count(),
                'by_legal_basis' => $processingRecords->groupBy('legal_basis')->map->count(),
            ],
        ];
    }
}