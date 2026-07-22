<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $query = AuditLog::with('user');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                  ->orWhere('entity_type', 'like', "%{$search}%")
                  ->orWhereHas('user', fn ($u) => $u->where('Full_name', 'like', "%{$search}%"));
            });
        }

        if ($action = $request->input('action')) {
            $query->where('action', $action);
        }

        if ($entityType = $request->input('entity_type')) {
            $query->where('entity_type', $entityType);
        }

        $perPage = min((int) $request->input('per_page', 50), 200);
        $logs = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($logs->through(fn ($log) => [
            'id' => $log->log_id,
            'action' => $log->action,
            'user' => $log->user?->Full_name ?? 'System',
            'role' => $log->user?->role ?? 'N/A',
            'entity_type' => $log->entity_type,
            'entity_id' => $log->entity_id,
            'old_values' => $log->old_values,
            'new_values' => $log->new_values,
            'timestamp' => $log->created_at,
        ]));
    }
}
