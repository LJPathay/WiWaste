<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
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

        return response()->json($logs->through(fn ($log) => (new AuditLogResource($log))->resolve($request)));
    }
}
