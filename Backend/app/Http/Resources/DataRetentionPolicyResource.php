<?php

namespace App\Http\Resources;

use App\Models\DataPurgeLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DataRetentionPolicyResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $lastLog = DataPurgeLog::where('policy_id', $this->policy_id)
            ->orderByDesc('purged_at')
            ->first();

        return [
            'id' => $this->policy_id,
            'entity_type' => $this->entity_type,
            'retention_days' => (int) $this->retention_days,
            'description' => $this->description ?? '',
            'enabled' => (bool) $this->is_active,
            'last_purged' => $lastLog?->purged_at?->toISOString(),
            'records_purged' => $lastLog
                ? (int) ($lastLog->records_purged + $lastLog->records_anonymized + $lastLog->records_archived)
                : 0,
        ];
    }
}
