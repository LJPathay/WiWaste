<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuditService
{
    /**
     * Log an audit event
     */
    public function log(array $data): AuditLog
    {
        return DB::transaction(function () use ($data) {
            $auditLog = AuditLog::create([
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

            // Hash chain for integrity
            $this->updateHashChain($auditLog);

            return $auditLog;
        });
    }

    /**
     * Create hash chain for audit log integrity
     */
    protected function updateHashChain(AuditLog $log): void
    {
        $previous = AuditLog::where('log_id', '<', $log->log_id)
            ->orderByDesc('log_id')
            ->first();

        $chainData = $previous 
            ? $previous->hash_chain . '|' . $this->computeLogHash($log)
            : $this->computeLogHash($log);

        $log->update(['hash_chain' => $chainData]);
    }

    /**
     * Compute hash for a single log entry
     */
    protected function computeLogHash(AuditLog $log): string
    {
        $data = [
            'log_id' => $log->log_id,
            'user_id' => $log->user_id,
            'action' => $log->action,
            'entity_type' => $log->entity_type,
            'entity_id' => $log->entity_id,
            'old_values' => $log->old_values,
            'new_values' => $log->new_values,
            'created_at' => $log->created_at,
            'business_id' => $log->business_id,
            'branch_id' => $log->branch_id,
        ];

        return hash('sha256', json_encode($data, JSON_SORT_KEYS));
    }

    /**
     * Verify integrity of audit log chain
     */
    public function verifyIntegrity(int $businessId = null): array
    {
        $query = AuditLog::orderBy('log_id');
        
        if ($businessId) {
            $query->where('business_id', $businessId);
        }

        $logs = $query->get();
        $errors = [];
        $previousHash = null;

        foreach ($logs as $log) {
            $computedHash = $this->computeLogHash($log);
            
            if ($previousHash !== null) {
                $expectedChain = $previousHash . '|' . $computedHash;
                if ($log->hash_chain !== $expectedChain) {
                    $errors[] = [
                        'log_id' => $log->log_id,
                        'issue' => 'Hash chain broken',
                        'expected' => $expectedChain,
                        'actual' => $log->hash_chain,
                    ];
                }
            }
            
            $previousHash = $log->hash_chain;
        }

        return [
            'total_logs' => $logs->count(),
            'errors_count' => count($errors),
            'errors' => $errors,
            'verified' => count($errors) === 0,
        ];
    }

    /**
     * Query audit logs with filters
     */
    public function query(array $filters = []): \Illuminate\Database\Eloquent\Builder
    {
        $query = \App\Models\AuditLog::query()
            ->with('user')
            ->orderByDesc('created_at');

        if (isset($filters['business_id'])) {
            $query->where('business_id', $filters['business_id']);
        }

        if (isset($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
        }

        if (isset($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        if (isset($filters['entity_type'])) {
            $query->where('entity_type', $filters['entity_type']);
        }

        if (isset($filters['entity_id'])) {
            $query->where('entity_id', $filters['entity_id']);
        }

        if (isset($filters['action'])) {
            $query->where('action', 'like', '%' . $filters['action'] . '%');
        }

        if (isset($filters['from_date'])) {
            $query->whereDate('created_at', '>=', $filters['from_date']);
        }

        if (isset($filters['to_date'])) {
            $query->whereDate('created_at', '<=', $filters['to_date']);
        }

        return $query;
    }

    /**
     * Get audit trail for a specific entity
     */
    public function getEntityTrail(string $entityType, int $entityId): \Illuminate\Support\Collection
    {
        return AuditLog::where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->with('user')
            ->orderBy('created_at')
            ->get()
            ->map(fn ($log) => [
                'log_id' => $log->log_id,
                'user' => $log->user?->Full_name ?? 'System',
                'action' => $log->action,
                'old_values' => $log->old_values ? json_decode($log->old_values, true) : null,
                'new_values' => $log->new_values ? json_decode($log->new_values, true) : null,
                'created_at' => $log->created_at,
                'ip_address' => $log->ip_address,
                'user_agent' => $log->user_agent,
            ]);
    }
}