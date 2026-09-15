<?php

namespace App\Services;

use App\Models\PrivacyProcessingRecord;
use App\Models\DataSubjectRequest;
use App\Models\DataBreachIncident;
use Illuminate\Support\Facades\DB;

class PrivacyAuditService
{
    /**
     * Record a privacy processing activity (DPA Art. 30 accountability)
     */
    public function recordProcessingActivity(array $data): PrivacyProcessingRecord
    {
        return PrivacyProcessingRecord::create([
            'business_id' => $data['business_id'],
            'data_category' => $data['data_category'],
            'purpose' => $data['purpose'],
            'legal_basis' => $data['legal_basis'],
            'retention_period' => $data['retention_period'],
            'recipients' => isset($data['recipients']) ? json_encode($data['recipients']) : null,
            'safeguards' => $data['safeguards'] ?? null,
            'status' => $data['status'] ?? 'active',
        ]);
    }

    /**
     * Process a data subject request (Access/Erasure/Portability/Rectification/Restriction/Objection)
     */
    public function processDataSubjectRequest(array $data): DataSubjectRequest
    {
        $request = DataSubjectRequest::create([
            'business_id' => $data['business_id'],
            'request_type' => $data['request_type'],
            'subject_identifier' => $data['subject_identifier'],
            'status' => 'pending',
            'requested_at' => now(),
        ]);

        // Process based on request type
        switch ($data['request_type']) {
            case 'access':
                $this->processAccessRequest($request);
                break;
            case 'rectification':
                $this->processRectificationRequest($request, $data['rectification_data'] ?? []);
                break;
            case 'erasure':
                $this->processErasureRequest($request);
                break;
            case 'portability':
                $this->processPortabilityRequest($request);
                break;
            case 'restriction':
                $this->processRestrictionRequest($request);
                break;
            case 'objection':
                $this->processObjectionRequest($request);
                break;
        }

        $request->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        return $request;
    }

    /**
     * Process access request - export all personal data for subject
     */
    protected function processAccessRequest(DataSubjectRequest $request): array
    {
        $subjectId = $request->subject_identifier;
        $businessId = $request->business_id;

        // Collect all personal data across tables
        $personalData = [
            'user_profile' => $this->getUserProfileData($subjectId, $businessId),
            'transactions' => $this->getTransactionData($subjectId, $businessId),
            'returns' => $this->getReturnData($subjectId, $businessId),
            'wastage_records' => $this->getWastageData($subjectId, $businessId),
            'audit_logs' => $this->getAuditLogData($subjectId, $businessId),
            'consent_records' => $this->getConsentData($subjectId, $businessId),
        ];

        // Log the access
        \App\Models\AuditLog::create([
            'user_id' => 1, // System user
            'action' => "Data subject access request fulfilled for {$subjectId}",
            'entity_type' => 'DataSubjectRequest',
            'entity_id' => $request->id,
            'new_values' => json_encode(['request_type' => 'access', 'data_categories' => array_keys($personalData)]),
            'created_at' => now(),
            'business_id' => $request->business_id,
        ]);

        return $personalData;
    }

    /**
     * Process erasure request - anonymize/delete personal data
     */
    protected function processErasureRequest(DataSubjectRequest $request): void
    {
        $subjectId = $request->subject_identifier;
        $businessId = $request->business_id;

        // Anonymize rather than delete to preserve referential integrity
        DB::table('User')
            ->where('User_id', $subjectId)
            ->where('business_id', $businessId)
            ->update([
                'Full_name' => 'Anonymized User',
                'email' => 'anonymized_' . $subjectId . '@deleted.local',
                'username' => 'anon_' . $subjectId,
                'status' => 'Deleted',
            ]);

        // Anonymize in transactions
        DB::table('Sales_Transaction')
            ->where('customer_email', $subjectId)
            ->where('business_id', $businessId)
            ->update([
                'customer_name' => 'Anonymized Customer',
                'customer_email' => 'anonymized@deleted.local',
                'customer_phone' => null,
            ]);

        // Log the erasure
        \App\Models\AuditLog::create([
            'user_id' => 1,
            'action' => "Data subject erasure request fulfilled for {$subjectId}",
            'entity_type' => 'DataSubjectRequest',
            'entity_id' => $request->id,
            'new_values' => json_encode(['request_type' => 'erasure']),
            'created_at' => now(),
            'business_id' => $request->business_id,
        ]);
    }

    /**
     * Process portability request - structured export
     */
    protected function processPortabilityRequest(DataSubjectRequest $request): array
    {
        $subjectId = $request->subject_identifier;
        $businessId = $request->business_id;

        $portableData = [
            'profile' => $this->getUserProfileData($request->subject_identifier, $businessId),
            'transactions' => $this->getTransactionData($subjectId, $businessId),
            'preferences' => $this->getPreferenceData($subjectId, $businessId),
        ];

        return $portableData;
    }

    /**
     * Process rectification request
     */
    protected function processRectificationRequest(DataSubjectRequest $request, array $data): void
    {
        // Implementation would update specific fields based on rectification data
    }

    /**
     * Process restriction request
     */
    protected function processRestrictionRequest(DataSubjectRequest $request): void
    {
        // Mark records as restricted from processing
    }

    /**
     * Process objection request
     */
    protected function processObjectionRequest(DataSubjectRequest $request): void
    {
        // Handle objection to processing
    }

    /**
     * Record a data breach incident
     */
    public function recordBreachIncident(array $data): DataBreachIncident
    {
        $incident = DataBreachIncident::create([
            'business_id' => $data['business_id'],
            'detected_at' => $data['detected_at'] ?? now(),
            'description' => $data['description'],
            'personal_data_affected' => $data['personal_data_affected'],
            'risk_assessment' => $data['risk_assessment'] ?? 'medium',
            'npc_notification_required' => $data['npc_notification_required'] ?? false,
            'status' => 'open',
        ]);

        // Log the breach
        \App\Models\AuditLog::create([
            'user_id' => 1,
            'action' => "Data breach incident recorded: {$data['description']}",
            'entity_type' => 'DataBreachIncident',
            'entity_id' => $incident->id,
            'new_values' => json_encode($data),
            'created_at' => now(),
            'business_id' => $data['business_id'],
        ]);

        return $incident;
    }

    /**
     * Generate privacy compliance report
     */
    public function generateComplianceReport(int $businessId, string $fromDate, string $toDate): array
    {
        $processingRecords = \App\Models\PrivacyProcessingRecord::where('business_id', $businessId)
            ->where('status', 'active')
            ->get();

        $subjectRequests = \App\Models\DataSubjectRequest::where('business_id', $businessId)
            ->whereBetween('requested_at', [$fromDate, $toDate])
            ->get();

        $breaches = \App\Models\DataBreachIncident::where('business_id', $businessId)
            ->whereBetween('detected_at', [$fromDate, $toDate])
            ->get();

        return [
            'period' => ['from' => $fromDate, 'to' => $toDate],
            'processing_records' => [
                'total' => $processingRecords->count(),
                'by_category' => $processingRecords->groupBy('data_category')->map->count(),
                'by_legal_basis' => $processingRecords->groupBy('legal_basis')->map->count(),
            ],
            'subject_requests' => [
                'total' => $subjectRequests->count(),
                'by_type' => $subjectRequests->groupBy('request_type')->map->count(),
                'by_status' => $subjectRequests->groupBy('status')->map->count(),
                'avg_resolution_days' => $subjectRequests
                    ->where('status', 'completed')
                    ->avg(fn ($r) => $r->requested_at->diffInDays($r->completed_at)),
            ],
            'breaches' => [
                'total' => $breaches->count(),
                'by_risk' => $breaches->groupBy('risk_assessment')->map->count(),
                'npc_notified' => $breaches->where('npc_notified_at', '!=', null)->count(),
                'subjects_notified' => $breaches->where('subjects_notified_at', '!=', null)->count(),
            ],
        ];
    }

    // Helper methods to fetch personal data
    protected function getUserProfileData(string $subjectId, int $businessId): array
    {
        return DB::table('User')
            ->where('User_id', $subjectId)
            ->where('business_id', $businessId)
            ->first();
    }

    protected function getTransactionData(string $subjectId, int $businessId): array
    {
        return DB::table('Sales_Transaction')
            ->where(function ($q) use ($subjectId) {
                $q->where('customer_email', $subjectId)
                  ->orWhere('customer_phone', $subjectId);
            })
            ->where('business_id', $businessId)
            ->get()
            ->toArray();
    }

    protected function getReturnData(string $subjectId, int $businessId): array
    {
        return DB::table('Return_Transaction')
            ->join('Sales_Item', 'Return_Transaction.sale_item_id', '=', 'Sales_Item.sales_item_id')
            ->join('Sales_Transaction', 'Sales_Item.transaction_id', '=', 'Sales_Transaction.transaction_id')
            ->where('Sales_Transaction.customer_email', $subjectId)
            ->where('Sales_Transaction.business_id', $businessId)
            ->get()
            ->toArray();
    }

    protected function getWastageData(string $subjectId, int $businessId): array
    {
        return DB::table('Wastage_Record')
            ->join('User', 'Wastage_Record.user_id', '=', 'User.User_id')
            ->where('User.User_id', $subjectId)
            ->where('Wastage_Record.business_id', $businessId)
            ->get()
            ->toArray();
    }

    protected function getAuditLogData(string $subjectId, int $businessId): array
    {
        return DB::table('Audit_Log')
            ->where('user_id', $subjectId)
            ->where('business_id', $businessId)
            ->get()
            ->toArray();
    }

    protected function getConsentData(string $subjectId, int $businessId): array
    {
        // Would check privacy consent records
        return [];
    }

    protected function getPreferenceData(string $subjectId, int $businessId): array
    {
        // Would check user preferences
        return [];
    }
}