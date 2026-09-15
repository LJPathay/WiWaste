<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReorderService;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReorderController extends Controller
{
    protected ReorderService $reorderService;

    public function __construct(ReorderService $reorderService)
    {
        $this->reorderService = $reorderService;
    }

    public function index(Request $request)
    {
        $user = $request->user();
        
        $suggestions = $this->reorderService->generateSuggestions(
            $user->business_id,
            $user->branch_id,
            $request->only(['safety_stock_multiplier'])
        );

        return response()->json($suggestions);
    }

    public function show($id)
    {
        // Get specific reorder suggestion detail
        return response()->json(['message' => 'Not implemented yet']);
    }

    public function store(Request $request)
    {
        // Manually create a reorder suggestion (for manual overrides)
        return response()->json(['message' => 'Not implemented yet']);
    }

    public function approve(Request $request)
    {
        $user = $request->user();
        
        $data = $request->validate([
            'suggestions' => 'required|array|min:1',
            'suggestions.*.supplier_id' => 'required|integer|exists:Supplier,supplier_id',
            'suggestions.*.items' => 'required|array|min:1',
            'suggestions.*.items.*.product_id' => 'required|integer|exists:Product,product_id',
            'suggestions.*.items.*.adjusted_quantity' => 'required|integer|min:1',
            'suggestions.*.items.*.unit_cost' => 'required|numeric|min:0',
        ]);

        $createdPOs = $this->reorderService->createDraftPOs($data['suggestions'], $user->User_id);

        return response()->json([
            'message' => count($createdPOs) . ' draft purchase orders created.',
            'purchase_orders' => $createdPOs,
        ], 201);
    }

    public function autoApprove(Request $request)
    {
        // Auto-approve suggestions based on criteria
        $user = $request->user();
        
        $data = $request->validate([
            'criteria' => 'nullable|array',
            'criteria.max_cost_per_po' => 'nullable|numeric|min:0',
            'criteria.min_items_per_po' => 'nullable|integer|min:1',
        ]);

        $suggestions = $this->reorderService->generateSuggestions(
            $user->business_id,
            $user->branch_id
        );

        // Filter by criteria
        $approved = [];
        foreach ($suggestions['suggestions'] as $supplier) {
            $totalCost = $supplier['estimated_total_cost'];
            $itemCount = $supplier['total_items'];
            
            $meetsCriteria = true;
            
            if (isset($data['criteria']['max_cost_per_po']) && $totalCost > $data['criteria']['max_cost_per_po']) {
                $meetsCriteria = false;
            }
            if (isset($data['criteria']['min_items_per_po']) && $itemCount < $data['criteria']['min_items_per_po']) {
                $meetsCriteria = false;
            }
            
            if ($meetsCriteria) {
                $approved[] = $supplier;
            }
        }

        if (empty($approved)) {
            return response()->json(['message' => 'No suggestions meet the criteria.']);
        }

        $createdPOs = $this->reorderService->createDraftPOs($approved, $request->user()->User_id);

        return response()->json([
            'message' => count($createdPOs) . ' draft purchase orders auto-created.',
            'purchase_orders' => $createdPOs,
        ], 201);
    }
}