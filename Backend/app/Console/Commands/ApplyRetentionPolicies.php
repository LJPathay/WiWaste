<?php

namespace App\Console\Commands;

use App\Models\DataSubjectRequest;
use App\Models\DataBreachIncident;
use App\Models\AuditLog;
use App\Models\WastageRecord;
use App\Models\ReturnTransaction;
use App\Models\SalesTransaction;
use App\Models\StockMovement;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ApplyRetentionPolicies extends Command
{
    protected $signature = 'retention:apply 
                            {--dry-run : Show what would be purged without actually purging}
                            {--entity= : Specific entity to purge (audit_logs, wastage, returns, sales, movements, breach_incidents, subject_requests)}
                            {--days= : Override default retention days for specific entity}';

    protected $description = 'Apply data retention policies and purge expired records';

    protected array $retentionPolicies = [
        'audit_logs' => ['days' => 2555, 'table' => 'Audit_Log', 'date_column' => 'created_at'], // 7 years
        'wastage' => ['days' => 2555, 'table' => 'Wastage_Record', 'date_column' => 'date_recorded'],
        'returns' => ['days' => 2555, 'table' => 'Return_Transaction', 'date_column' => 'return_date'],
        'sales' => ['days' => 2555, 'table' => 'Sales_Transaction', 'date_column' => 'transaction_date'],
        'movements' => ['days' => 2555, 'table' => 'Stock_Movement', 'date_column' => 'movement_date'],
        'breach_incidents' => ['days' => 2555, 'table' => 'Data_Breach_Incidents', 'date_column' => 'detected_at'],
        'subject_requests' => ['days' => 2555, 'table' => 'Data_Subject_Requests', 'date_column' => 'requested_at'],
    ];

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $specificEntity = $this->option('entity');
        $overrideDays = $this->option('days');

        if ($dryRun) {
            $this->info('Running in DRY RUN mode - no data will be deleted');
        }

        $entities = $specificEntity ? [$specificEntity] : array_keys($this->retentionPolicies);
        $totalPurged = 0;

        foreach ($entities as $entity) {
            if (!isset($this->retentionPolicies[$entity])) {
                $this->error("Unknown entity: {$entity}");
                continue;
            }

            $policy = $this->retentionPolicies[$entity];
            if ($overrideDays) {
                $policy['days'] = (int) $overrideDays;
            }

            $purged = $this->applyRetentionPolicy($entity, $policy, $dryRun);
            $totalPurged += $purged;
        }

        $this->info("Retention policy application completed. Total records purged: {$totalPurged}");
        
        return Command::SUCCESS;
    }

    protected function applyRetentionPolicy(string $entity, array $policy, bool $dryRun): int
    {
        $cutoffDate = Carbon::now()->subDays($policy['days'])->toDateString();
        
        $this->info("Processing {$entity} (retention: {$policy['days']} days, cutoff: {$cutoffDate})...");

        $query = DB::table($policy['table'])
            ->where($policy['date_column'], '<', $cutoffDate);

        $count = $query->count();

        if ($count === 0) {
            $this->info("  No records to purge.");
            return 0;
        }

        if ($dryRun) {
            $this->warn("  [DRY RUN] Would purge {$count} records from {$policy['table']}");
            
            // Show sample of records to be purged
            $sample = DB::table($policy['table'])
                ->where($policy['date_column'], '<', $cutoffDate)
                ->limit(5)
                ->get();
            
            if ($sample->isNotEmpty()) {
                $this->table(
                    array_keys((array) $sample->first()),
                    $sample->toArray()
                );
            }
            
            return 0;
        }

        // Perform the actual purge
        $deleted = DB::table($policy['table'])
            ->where($policy['date_column'], '<', $cutoffDate)
            ->delete();

        $this->info("  Purged {$deleted} records from {$policy['table']}");

        // Log the purge action
        DB::table('Audit_Log')->insert([
            'user_id' => 1,
            'action' => "Retention policy applied: purged {$deleted} {$entity} records older than {$cutoffDate}",
            'entity_type' => 'RetentionPolicy',
            'entity_id' => 0,
            'new_values' => json_encode([
                'entity' => $entity,
                'table' => $policy['table'],
                'cutoff_date' => $cutoffDate,
                'records_purged' => $deleted,
                'dry_run' => false,
            ]),
            'created_at' => now(),
        ]);

        return $deleted;
    }
}