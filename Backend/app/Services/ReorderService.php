<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\FEFOBatch;
use App\Services\Ml\ForecastService;
use App\Services\Ml\OptimizationService;
use App\Services\Ml\MlServiceUnavailableException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class ReorderService
{
    protected int $lastForecastCount = 0;
    protected ?float $lastOptimizationFitness = null;
    protected ?int $lastOptimizationGenerations = null;
    protected ?float $lastOptimizationConfidence = null;

    public function __construct(
        private ForecastService $forecastService,
        private OptimizationService $optimizationService
    ) {}

    /**
     * Generate reorder suggestions for a business/branch
     * Returns a collection of suggested PO drafts grouped by supplier
     */
    public function generateSuggestions(int $businessId, ?int $branchId = null, array $options = []): array
    {
        // Generate ML forecasts first
        $this->generateMLForecasts($businessId, $branchId);

        // Then run optimization for optimal replenishment plan
        $optimizationResult = $this->runOptimization($businessId, $branchId, $options);

        // Get products needing reorder (fallback to rule-based if ML unavailable)
        $products = $this->getProductsNeedingReorder($businessId, $branchId);
        
        $suggestions = [];
        
        foreach ($products as $product) {
            $suggestion = $this->calculateSuggestion($product, $businessId, $branchId, $options);
            if ($suggestion) {
                // Enhance with ML data if available
                $suggestion = $this->enhanceWithMLData($suggestion, $product);
                $suggestions[] = $suggestion;
            }
        }

        // Group by supplier and consolidate for MOQ
        $groupedBySupplier = $this->groupBySupplier($suggestions);
        
        // Apply MOQ consolidation
        $consolidated = $this->consolidateForMOQ($groupedBySupplier);
        
        return [
            'suggestions' => $consolidated,
            'summary' => [
                'total_products_analyzed' => $products->count(),
                'products_needing_reorder' => count($suggestions),
                'suppliers_involved' => count($consolidated),
                'estimated_total_cost' => array_sum(array_column($consolidated, 'estimated_total_cost')),
            ],
            'ml_insights' => [
                'forecast_generated' => $this->lastForecastCount,
                'optimization_fitness' => $this->lastOptimizationFitness ?? null,
                'optimization_generations' => $this->lastOptimizationGenerations ?? null,
                'optimization_confidence' => $this->lastOptimizationConfidence ?? null,
            ],
        ];
    }

    /**
     * Generate ML forecasts for products needing reorder
     */
    protected function generateMLForecasts(int $businessId, ?int $branchId): void
    {
        try {
            $this->lastForecastCount = $this->forecastService->generateForAll();
        } catch (MlServiceUnavailableException $e) {
            // ML service unavailable, fall back to rule-based
            $this->lastForecastCount = 0;
        }
    }

    /**
     * Run GA optimization for optimal replenishment plan
     */
    protected function runOptimization(int $businessId, ?int $branchId, array $options = []): array
    {
        try {
            $budget = $options['budget'] ?? 100000; // Default budget
            $horizonDays = $options['horizon_days'] ?? 30;
            
            $result = $this->optimizationService->optimize($budget, 30);
            
            $this->lastOptimizationFitness = $result['fitness'] ?? null;
            $this->lastOptimizationGenerations = $result['generations_run'] ?? null;
            $this->lastOptimizationConfidence = $result['confidence'] ?? null;
            
            return $result;
        } catch (MlServiceUnavailableException $e) {
            // ML service unavailable, skip optimization
            $this->lastOptimizationFitness = null;
            $this->lastOptimizationGenerations = null;
            $this->lastOptimizationConfidence = null;
            
            return [];
        }
    }

    /**
     * Enhance suggestion with ML data (forecast, risk, optimization)
     */
    protected function enhanceWithMLData(array $suggestion, Product $product): array
    {
        // Add forecast demand if available
        $latestForecast = \App\Models\ForecastResult::where('product_id', $suggestion['product_id'])
            ->latest('generated_date')
            ->first();
        
        if ($latestForecast) {
            $suggestion['ml_forecast'] = [
                'predicted_demand_30d' => (int) $latestForecast->forecast_period_sum ?? 0,
                'overstock_risk' => $latestForecast->overstock_risk ?? 'Low',
                'confidence' => $latestForecast->confidence ?? null,
            ];
        }

        // Add loss risk if available
        $lossRisk = \App\Models\LossRisk::where('product_id', $suggestion['product_id'])
            ->latest('generated_at')
            ->first();
        
        if ($lossRisk) {
            $suggestion['loss_risk'] = [
                'tier' => $lossRisk->risk_tier,
                'probability' => $lossRisk->loss_probability,
                'expected_loss' => $lossRisk->expected_loss,
            ];
        }

        return $suggestion;
    }

    /**
     * Get products that need reordering (stock <= reorder_level)
     */
    protected function getProductsNeedingReorder(int $businessId, ?int $branchId): Collection
    {
        $query = Product::with(['inventory', 'supplier'])
            ->where('business_id', $businessId)
            ->where('status', 'Active')
            ->whereHas('inventory', function ($q) use ($branchId) {
                $q->where('business_id', $branchId ? $branchId : null);
                if ($branchId) {
                    $q->where('branch_id', $branchId);
                }
                $q->whereRaw('current_stock <= reorder_level');
            });

        return $query->get();
    }

    /**
     * Calculate reorder suggestion for a single product
     */
    protected function calculateSuggestion(Product $product, int $businessId, ?int $branchId, array $options): ?array
    {
        $inventory = $product->inventory->firstWhere('branch_id', $branchId);
        if (!$inventory || $inventory->current_stock > $inventory->reorder_level) {
            return null;
        }

        $supplier = $product->supplier;
        if (!$supplier) {
            return null;
        }

        // Calculate suggested quantity
        $targetStock = $this->calculateTargetStock($product, $inventory, $options);
        $quantityNeeded = max(0, $targetStock - $inventory->current_stock);
        
        if ($quantityNeeded <= 0) {
            return null;
        }

        // Get lead time from supplier (default to 7 days if not set)
        $leadTimeDays = $supplier->lead_time_days ?? 7;
        
        // Check for FEFO expiry conflicts
        $expiryAdjustment = $this->checkExpiryConflicts($product, $quantityNeeded, $branchId);
        $adjustedQuantity = max(1, $quantityNeeded - $expiryAdjustment);

        $unitCost = $product->cost_price ?? 0;
        $estimatedCost = $adjustedQuantity * $unitCost;

        return [
            'product_id' => $product->product_id,
            'product_name' => $product->product_name,
            'sku' => $product->barcode,
            'supplier_id' => $supplier->supplier_id,
            'supplier_name' => $supplier->supplier_name,
            'current_stock' => $inventory->current_stock,
            'reorder_level' => $inventory->reorder_level,
            'target_stock' => $targetStock,
            'quantity_needed' => $quantityNeeded,
            'adjusted_quantity' => $adjustedQuantity,
            'unit_cost' => $unitCost,
            'estimated_cost' => $estimatedCost,
            'lead_time_days' => $leadTimeDays,
            'expiry_adjustment' => $expiryAdjustment,
            'branch_id' => $branchId,
            'business_id' => $businessId,
            'status' => 'draft',
        ];
    }

    /**
     * Calculate target stock level based on sales velocity and lead time
     */
    protected function calculateTargetStock(Product $product, $inventory, array $options): int
    {
        $baseReorderLevel = $inventory->reorder_level;
        $safetyStockMultiplier = $options['safety_stock_multiplier'] ?? 1.5;
        $leadTimeDays = $product->supplier->lead_time_days ?? 7;
        
        // Simple calculation: reorder_level * safety_multiplier
        // In a real implementation, this would use sales velocity from ML service
        return (int) ceil($baseReorderLevel * $safetyStockMultiplier);
    }

    /**
     * Check for products expiring soon that would conflict with new orders
     */
    protected function checkExpiryConflicts(Product $product, int $quantityNeeded, ?int $branchId): int
    {
        $expiringSoon = FEFOBatch::where('product_id', $product->product_id)
            ->where('status', 'active')
            ->where('quantity', '>', 0)
            ->where('expiry_date', '<=', now()->addDays(30))
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->sum('quantity');

        // Reduce order quantity if we have stock expiring soon
        // Only reduce if expiring stock is significant
        if ($expiringSoon > 0 && $quantityNeeded > 0) {
            return (int) min($quantityNeeded, $expiringSoon * 0.5);
        }

        return 0;
    }

    /**
     * Group suggestions by supplier
     */
    protected function groupBySupplier(array $suggestions): array
    {
        $grouped = [];
        
        foreach ($suggestions as $suggestion) {
            $supplierId = $suggestion['supplier_id'];
            if (!isset($grouped[$supplierId])) {
                $grouped[$supplierId] = [
                    'supplier_id' => $supplierId,
                    'supplier_name' => $suggestion['supplier_name'],
                    'items' => [],
                    'total_items' => 0,
                    'estimated_total_cost' => 0,
                    'lead_time_days' => $suggestion['lead_time_days'],
                ];
            }
            
            $grouped[$supplierId]['items'][] = $suggestion;
            $grouped[$supplierId]['total_items']++;
            $grouped[$supplierId]['estimated_total_cost'] += $suggestion['estimated_cost'];
        }

        return array_values($grouped);
    }

    /**
     * Consolidate orders per supplier to meet MOQ
     */
    protected function consolidateForMOQ(array $grouped): array
    {
        foreach ($grouped as &$supplier) {
            $moq = $supplier['items'][0]['product']->supplier->minimum_order_quantity ?? 0;
            
            if ($moq > 0) {
                $currentTotal = array_sum(array_column($supplier['items'], 'adjusted_quantity'));
                
                if ($currentTotal < $moq) {
                    // Need to increase quantities to meet MOQ
                    $shortfall = $moq - $currentTotal;
                    // Distribute shortfall proportionally
                    foreach ($supplier['items'] as &$item) {
                        $proportion = $item['adjusted_quantity'] / max(1, $currentTotal);
                        $additional = (int) ceil($shortfall * $proportion);
                        $item['adjusted_quantity'] += $additional;
                        $item['estimated_cost'] = $item['adjusted_quantity'] * $item['unit_cost'];
                    }
                }
            }
        }
        
        return $grouped;
    }

    /**
     * Create draft Purchase Orders from approved suggestions
     */
    public function createDraftPOs(array $approvedSuggestions, int $userId): array
    {
        $createdPOs = [];
        
        foreach ($approvedSuggestions as $supplierSuggestion) {
            $poNumber = 'PO-' . now()->format('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
            $totalAmount = 0;
            $poItems = [];

            foreach ($supplierSuggestion['items'] as $item) {
                $subtotal = $item['adjusted_quantity'] * $item['unit_cost'];
                $totalAmount += $subtotal;
                
                $poItems[] = new PurchaseOrderItem([
                    'product_id' => $item['product_id'],
                    'quantity' => $item['adjusted_quantity'],
                    'unit_price' => $item['unit_cost'],
                    'subtotal' => $subtotal,
                    'received_qty' => 0,
                ]);
            }

            $po = PurchaseOrder::create([
                'business_id' => $supplierSuggestion['business_id'],
                'branch_id' => $supplierSuggestion['branch_id'],
                'supplier_id' => $supplierSuggestion['supplier_id'],
                'user_id' => $userId,
                'po_number' => $poNumber,
                'status' => 'Draft',
                'total_amount' => $totalAmount,
                'notes' => 'Auto-generated from reorder suggestions',
                'created_at' => now(),
            ]);

            $po->items()->saveMany($poItems);
            $createdPOs[] = $po;
        }

        return $createdPOs;
    }
}