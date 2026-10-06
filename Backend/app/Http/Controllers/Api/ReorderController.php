<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReorderService;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Http\Requests\Api\ApproveReorderRequest;
use App\Http\Requests\Api\AutoApproveReorderRequest;
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

        // Accounts are not guaranteed to be attached to a business/branch, so the
        // service treats both as "no scope filter" instead of erroring out.
        $suggestions = $this->reorderService->generateSuggestions(
            $user?->business_id,
            $user?->branch_id,
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

    public function approve(ApproveReorderRequest $request)
    {
        $user = $request->user();

        $data = $request->validated();

        $createdPOs = $this->reorderService->createDraftPOs($data['suggestions'], $user->User_id);

        return response()->json([
            'message' => count($createdPOs) . ' draft purchase orders created.',
            'purchase_orders' => $createdPOs,
        ], 201);
    }

    public function autoApprove(AutoApproveReorderRequest $request)
    {
        // Auto-approve suggestions based on criteria
        $user = $request->user();

        $data = $request->validated();

        $suggestions = $this->reorderService->generateSuggestions(
            $user?->business_id,
            $user?->branch_id
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