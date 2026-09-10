<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShiftController extends Controller
{
    /**
     * Open a new shift.
     * POST /api/shifts/open
     */
    public function open(Request $request)
    {
        $validated = $request->validate([
            'opening_cash' => 'required|numeric|min:0',
            'cashier_name' => 'nullable|string|max:255',
        ]);

        // In a real system, this would create a shift record
        // For now, return success with shift details
        $shiftId = 'SHIFT-' . date('Ymd-His');

        return response()->json([
            'message' => 'Shift opened successfully',
            'shift_id' => $shiftId,
            'opening_cash' => $validated['opening_cash'],
            'opened_at' => now()->toISOString(),
            'cashier' => $validated['cashier_name'] ?? $request->user()?->name ?? 'Unknown',
        ]);
    }

    /**
     * Close the current shift.
     * POST /api/shifts/close
     */
    public function close(Request $request)
    {
        $validated = $request->validate([
            'shift_id' => 'required|string',
            'closing_cash' => 'required|numeric|min:0',
            'remarks' => 'nullable|string|max:500',
        ]);

        // In a real system, this would update the shift record
        // and calculate any variance between expected and actual cash
        return response()->json([
            'message' => 'Shift closed successfully',
            'shift_id' => $validated['shift_id'],
            'closing_cash' => $validated['closing_cash'],
            'closed_at' => now()->toISOString(),
        ]);
    }
}
