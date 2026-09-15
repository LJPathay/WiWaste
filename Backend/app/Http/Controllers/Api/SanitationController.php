<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SanitationChecklist;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class SanitationController extends Controller
{
    protected function scopeForBusinessAndBranch($query, Request $request)
    {
        $user = $request->user();
        if ($user && $user->business_id) {
            $query->where('business_id', $user->business_id);
        }
        if ($user && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }
        return $query;
    }

    public function index(Request $request)
    {
        $query = SanitationChecklist::with(['creator', 'verifier']);
        $query = $this->scopeForBusinessAndBranch($query, $request);

        if ($frequency = $request->input('frequency')) {
            $query->where('frequency', $frequency);
        }

        if ($area = $request->input('area')) {
            $query->where('area', $area);
        }

        if ($date = $request->input('date')) {
            $query->where('checklist_date', $date);
        }

        if ($status = $request->input('status')) {
            $query->where('overall_status', $status);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json(
            $query->orderByDesc('checklist_date')->paginate($perPage)
        );
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'business_id' => 'sometimes|integer|exists:businesses,id',
            'branch_id'   => 'sometimes|integer|exists:branches,id',
            'checklist_date' => 'required|date',
            'frequency'   => 'required|in:daily,weekly,monthly',
            'area'        => 'required|in:receiving,storage,preparation,dispensing,waste,general',
            'checks'      => 'required|array|min:1',
            'checks.*.item'       => 'required|string|max:255',
            'checks.*.passed'     => 'required|boolean',
            'checks.*.notes'      => 'nullable|string|max:500',
            'checks.*.photo_url'  => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Auto-assign business_id and branch_id from user if not provided
        if (!isset($data['business_id']) && $user && $user->business_id) {
            $data['business_id'] = $user->business_id;
        }
        if (!isset($data['branch_id']) && $user && $user->branch_id) {
            $data['branch_id'] = $user->branch_id;
        }
        $data['created_by'] = $user?->User_id ?? 1;

        // Calculate overall status
        $allPassed = collect($data['checks'])->every(fn ($c) => $c['passed'] ?? false);
        $data['overall_status'] = $allPassed ? 'pass' : 'fail';

        $checklist = SanitationChecklist::create($data);

        AuditLog::create([
            'user_id'       => $user?->User_id ?? 1,
            'action'        => "Created sanitation checklist for {$data['frequency']} {$data['area']} on {$data['checklist_date']}",
            'entity_type'   => 'Sanitation_Checklist',
            'entity_id'     => $checklist->checklist_id,
            'old_values'    => null,
            'new_values'    => json_encode($data),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        $checklist->load(['creator', 'verifier']);

        return response()->json([
            'message' => 'Sanitation checklist created.',
            'checklist' => $checklist,
        ], 201);
    }

    public function show($id)
    {
        $query = SanitationChecklist::with(['creator', 'verifier']);
        $query = $this->scopeForBusinessAndBranch($query, request());
        $checklist = $query->findOrFail($id);

        return response()->json($checklist);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();

        $query = SanitationChecklist::with(['creator', 'verifier']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $checklist = $query->findOrFail($id);

        $data = $request->validate([
            'checklist_date' => 'sometimes|date',
            'frequency'      => 'sometimes|in:daily,weekly,monthly',
            'area'           => 'sometimes|in:receiving,storage,preparation,dispensing,waste,general',
            'checks'         => 'sometimes|array|min:1',
            'checks.*.item'       => 'required|string|max:255',
            'checks.*.passed'     => 'required|boolean',
            'checks.*.notes'      => 'nullable|string|max:500',
            'checks.*.photo_url'  => 'nullable|string|max:500',
            'notes'          => 'nullable|string|max:1000',
        ]);

        // Recalculate overall status if checks updated
        if (isset($data['checks'])) {
            $allPassed = collect($data['checks'])->every(fn ($c) => $c['passed'] ?? false);
            $data['overall_status'] = $allPassed ? 'pass' : 'fail';
        }

        $checklist->update($data);

        AuditLog::create([
            'user_id'       => $user?->User_id ?? 1,
            'action'        => "Updated sanitation checklist #{$checklist->checklist_id}",
            'entity_type'   => 'Sanitation_Checklist',
            'entity_id'     => $checklist->checklist_id,
            'old_values'    => json_encode($checklist->getOriginal()),
            'new_values'    => json_encode($data),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        $checklist->load(['creator', 'verifier']);

        return response()->json([
            'message' => 'Sanitation checklist updated.',
            'checklist' => $checklist,
        ]);
    }

    public function verify(Request $request, $id)
    {
        $user = $request->user();

        $query = SanitationChecklist::with(['creator', 'verifier']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $checklist = $query->findOrFail($id);

        $data = $request->validate([
            'verified_by' => 'sometimes|integer|exists:User,User_id',
        ]);

        if (!isset($data['verified_by']) && $user && $user->User_id) {
            $data['verified_by'] = $user->User_id;
        }
        $data['verified_at'] = now();

        $checklist->update($data);

        AuditLog::create([
            'user_id'       => $user?->User_id ?? 1,
            'action'        => "Verified sanitation checklist #{$checklist->checklist_id}",
            'entity_type'   => 'Sanitation_Checklist',
            'entity_id'     => $checklist->checklist_id,
            'old_values'    => json_encode($checklist->getOriginal()),
            'new_values'    => json_encode($data),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        $checklist->load(['creator', 'verifier']);

        return response()->json([
            'message' => 'Sanitation checklist verified.',
            'checklist' => $checklist,
        ]);
    }

    public function summary(Request $request)
    {
        $query = SanitationChecklist::query();
        $query = $this->scopeForBusinessAndBranch($query, $request);

        if ($date = $request->input('date')) {
            $query->where('checklist_date', $date);
        } else {
            $query->where('checklist_date', now()->toDateString());
        }

        $checklists = $query->get();

        $summary = [
            'total' => $checklists->count(),
            'passed' => $checklists->where('overall_status', 'pass')->count(),
            'failed' => $checklists->where('overall_status', 'fail')->count(),
            'pending' => $checklists->where('overall_status', 'pending')->count(),
            'verified' => $checklists->whereNotNull('verified_at')->count(),
            'by_frequency' => [
                'daily' => $checklists->where('frequency', 'daily')->count(),
                'weekly' => $checklists->where('frequency', 'weekly')->count(),
                'monthly' => $checklists->where('frequency', 'monthly')->count(),
            ],
            'by_area' => [
                'receiving' => $checklists->where('area', 'receiving')->count(),
                'storage' => $checklists->where('area', 'storage')->count(),
                'preparation' => $checklists->where('area', 'preparation')->count(),
                'dispensing' => $checklists->where('area', 'dispensing')->count(),
                'waste' => $checklists->where('area', 'waste')->count(),
                'general' => $checklists->where('area', 'general')->count(),
            ],
            'failed_checks' => $checklists
                ->flatMap(fn ($c) => collect($c->checks ?? [])->filter(fn ($check) => !($check['passed'] ?? false)))
                ->values()
                ->all(),
        ];

        return response()->json($summary);
    }
}