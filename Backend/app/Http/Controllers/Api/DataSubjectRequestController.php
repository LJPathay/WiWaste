<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DataSubjectRequest;
use App\Http\Requests\Api\StoreDataSubjectRequestRequest;
use App\Http\Requests\Api\UpdateDataSubjectRequestRequest;
use App\Http\Resources\DataSubjectRequestResource;
use Illuminate\Http\Request;

class DataSubjectRequestController extends Controller
{
    public function store(StoreDataSubjectRequestRequest $request)
    {
        $request->validated();

        $existing = DataSubjectRequest::where('business_id', $request->business_id)
            ->where('subject_identifier', $request->subject_identifier)
            ->where('request_type', $request->request_type)
            ->whereIn('status', ['pending', 'in_progress'])
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'A similar request is already pending or in progress.',
                'request' => (new DataSubjectRequestResource($existing))->toArray($request)
            ], 409);
        }

        $requestObj = DataSubjectRequest::create([
            'business_id' => $request->business_id,
            'request_type' => $request->request_type,
            'subject_identifier' => $request->subject_identifier,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Data subject request submitted successfully.',
            'request' => (new DataSubjectRequestResource($requestObj))->toArray($request)
        ], 201);
    }

    public function show(DataSubjectRequest $request)
    {
        return new DataSubjectRequestResource($request);
    }

    public function update(UpdateDataSubjectRequestRequest $request, DataSubjectRequest $dataSubjectRequest)
    {
        $dataSubjectRequest->update($request->validated());

        if ($request->status === 'completed') {
            $dataSubjectRequest->update(['completed_at' => now()]);
        }

        return response()->json([
            'message' => 'Data subject request updated successfully.',
            'request' => (new DataSubjectRequestResource($dataSubjectRequest))->toArray($request)
        ]);
    }

    public function index(Request $request)
    {
        $query = DataSubjectRequest::with('business');

        if ($businessId = $request->input('business_id')) {
            $query->where('business_id', $businessId);
        }

        if ($type = $request->input('request_type')) {
            $query->where('request_type', $type);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json(
            $query->orderByDesc('requested_at')->paginate($perPage)
                ->through(fn ($r) => (new DataSubjectRequestResource($r))->toArray($request))
        );
    }
}
