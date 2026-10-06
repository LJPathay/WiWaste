<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesTenant;
use App\Http\Controllers\Controller;
use App\Models\SanitationChecklist;
use App\Models\AuditLog;
use App\Http\Requests\Api\StoreSanitationChecklistRequest;
use App\Http\Requests\Api\UpdateSanitationChecklistRequest;
use App\Http\Requests\Api\VerifySanitationChecklistRequest;
use App\Http\Resources\SanitationChecklistResource;
use Illuminate\Http\Request;

class SanitationController extends Controller
{
    use ScopesTenant;

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
                ->through(fn ($c) => (new SanitationChecklistResource($c))->toArray($request))
        );
    }

    public function store(StoreSanitationChecklistRequest $request)
    {
        $user = $request->user();

        $data = $request->validated();

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
            'checklist' => (new SanitationChecklistResource($checklist))->toArray($request),
        ], 201);
    }

    public function show($id)
    {
        $query = SanitationChecklist::with(['creator', 'verifier']);
        $query = $this->scopeForBusinessAndBranch($query, request());
        $checklist = $query->findOrFail($id);

        return new SanitationChecklistResource($checklist);
    }

    public function update(UpdateSanitationChecklistRequest $request, $id)
    {
        $user = $request->user();

        $query = SanitationChecklist::with(['creator', 'verifier']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $checklist = $query->findOrFail($id);

        $data = $request->validated();

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
            'checklist' => (new SanitationChecklistResource($checklist))->toArray($request),
        ]);
    }

    public function verify(VerifySanitationChecklistRequest $request, $id)
    {
        $user = $request->user();

        $query = SanitationChecklist::with(['creator', 'verifier']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $checklist = $query->findOrFail($id);

        $data = $request->validated();

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
            'checklist' => (new SanitationChecklistResource($checklist))->toArray($request),
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