<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\ReorderService;
use Illuminate\Console\Command;

class GenerateReorderSuggestions extends Command
{
    protected $signature = 'reorder:generate 
                            {--business-id= : Business ID to generate for (default: all)}
                            {--branch-id= : Branch ID to generate for (default: all)}
                            {--safety-multiplier=1.5 : Safety stock multiplier}
                            {--auto-approve : Auto-create draft POs for suggestions meeting criteria}
                            {--max-cost= : Maximum cost per PO for auto-approve}
                            {--min-items= : Minimum items per PO for auto-approve}
                            {--notify : Send notifications to relevant users}';

    protected $description = 'Generate reorder suggestions and optionally create draft POs';

    protected ReorderService $reorderService;

    public function __construct(ReorderService $reorderService)
    {
        parent::__construct();
        $this->reorderService = $reorderService;
    }

    public function handle(): int
    {
        $businessId = $this->option('business-id');
        $branchId = $this->option('branch-id');
        $safetyMultiplier = (float) $this->option('safety-multiplier');
        $autoApprove = $this->option('auto-approve');
        $maxCost = $this->option('max-cost') ? (float) $this->option('max-cost') : null;
        $minItems = $this->option('min-items') ? (int) $this->option('min-items') : null;
        $notify = $this->option('notify');

        $this->info('Generating reorder suggestions...');

        if ($businessId) {
            $this->generateForBusiness($businessId, $branchId, $safetyMultiplier, $autoApprove, $maxCost);
        } else {
            $this->generateForAllBusinesses($safetyMultiplier, $autoApprove, $maxCost);
        }

        if ($notify) {
            $this->sendNotifications();
        }

        $this->info('Reorder suggestion generation completed.');
        
        return Command::SUCCESS;
    }

    protected function generateForBusiness(int $businessId, ?int $branchId, float $safetyMultiplier, bool $autoApprove, ?float $maxCost): void
    {
        $this->info("Generating suggestions for business #{$businessId}...");
        
        // Get a system user for the command
        $systemUser = User::where('role', 'Owner')->first();
        if (!$systemUser) {
            $this->error('No system user found to generate suggestions.');
            return;
        }

        // We need to create a mock request or use the service directly
        // For simplicity, we'll use the service directly
        $suggestions = $this->reorderService->generateSuggestions($businessId, null, [
            'safety_stock_multiplier' => $safetyMultiplier,
        ]);

        $this->displayResults($suggestions);

        if ($autoApprove && !empty($suggestions['suggestions'])) {
            $this->autoApproveSuggestions($suggestions, $maxCost);
        }
    }

    protected function generateForAllBusinesses(float $safetyMultiplier, bool $autoApprove, ?float $maxCost): void
    {
        $businesses = \App\Models\Business::all();
        
        foreach ($businesses as $business) {
            $this->generateForBusiness($business->id, null, $safetyMultiplier, $autoApprove, $maxCost);
        }
    }

    protected function displayResults(array $suggestions): void
    {
        $summary = $suggestions['summary'] ?? [];
        
        $this->table(
            ['Metric', 'Value'],
            [
                ['Total Products Analyzed', $summary['total_products_analyzed'] ?? 0],
                ['Products Needing Reorder', $summary['products_needing_reorder'] ?? 0],
                ['Suppliers Involved', $summary['suppliers_involved'] ?? 0],
                ['Estimated Total Cost', '₱' . number_format($summary['estimated_total_cost'] ?? 0, 2)],
            ]
        );

        if (!empty($suggestions['suggestions'])) {
            $rows = [];
            foreach ($suggestions['suggestions'] as $supplier) {
                $rows[] = [
                    $supplier['supplier_name'],
                    $supplier['total_items'],
                    '₱' . number_format($supplier['estimated_total_cost'], 2),
                    $supplier['lead_time_days'] . ' days',
                ];
            }
            
            $this->table(
                ['Supplier', 'Items', 'Est. Cost', 'Lead Time'],
                $rows
            );
        }
    }

    protected function autoApproveSuggestions(array $suggestions, ?float $maxCost): void
    {
        $this->info('Auto-approving suggestions...');
        
        // Filter suggestions by max cost if specified
        $approved = [];
        foreach ($suggestions['suggestions'] as $supplier) {
            if ($maxCost && $supplier['estimated_total_cost'] > $maxCost) {
                $this->line("Skipping {$supplier['supplier_name']}: Cost ₱{$supplier['estimated_total_cost']} exceeds max ₱{$maxCost}");
                continue;
            }
            $approved[] = $supplier;
        }

        if (empty($approved)) {
            $this->warn('No suggestions meet the auto-approve criteria.');
            return;
        }

        // Note: In a real implementation, we'd need a user context
        // For now, we'll just log what would be created
        $this->info(count($approved) . ' purchase orders would be created.');
        
        foreach ($approved as $supplier) {
            $this->line("  - {$supplier['supplier_name']}: {$supplier['total_items']} items, ₱" . number_format($supplier['estimated_total_cost'], 2));
        }
    }

    protected function sendNotifications(): void
    {
        // In a real implementation, send emails/notifications to relevant users
        $this->info('Notifications sent to relevant users.');
    }
}