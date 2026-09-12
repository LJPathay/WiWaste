<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    /**
     * Get all notifications.
     * GET /api/notifications
     */
    public function index(Request $request)
    {
        try {
            $notifications = DB::table('notifications')
                ->orderByDesc('created_at')
                ->limit(50)
                ->get();

            return response()->json([
                'data' => $notifications,
                'unread_count' => DB::table('notifications')->where('read', false)->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'data' => [],
                'unread_count' => 0,
            ]);
        }
    }

    /**
     * Mark a notification as read.
     * POST /api/notifications/{id}/read
     */
    public function markRead($id)
    {
        try {
            DB::table('notifications')
                ->where('id', $id)
                ->update(['read' => true, 'read_at' => now()]);

            return response()->json(['message' => 'Notification marked as read']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Notification not found'], 404);
        }
    }

    /**
     * Mark all notifications as read.
     * POST /api/notifications/read-all
     */
    public function markAllRead()
    {
        try {
            DB::table('notifications')
                ->where('read', false)
                ->update(['read' => true, 'read_at' => now()]);

            return response()->json(['message' => 'All notifications marked as read']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update notifications'], 500);
        }
    }
}
