<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DataSubjectRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DataSubjectRequestController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'business_id' => 'required|exists:businesses,id',
            'request_type' => 'required|in:access,rectification,erasure,portability,restriction,objection',
            'subject_identifier' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $existing = DataSubjectRequest::where('business_id', $request->business_id)
            ->where('subject_identifier', $request->subject_identifier)
            ->where('request_type', $request->request_type)
            ->whereIn('status', ['pending', 'in_progress'])
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'A similar request is already pending or in progress.',
                'request' => $existing
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
            'request' => $requestObj
        ], 201);
    }

    public function show(DataSubjectRequest $request)
    {
        return response()->json($request);
    }

    public function update(Request $request, DataSubjectRequest $dataSubjectRequest)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,in_progress,completed,rejected',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $dataSubjectRequest->update($validator->validated());

        if ($request->status === 'completed') {
            $dataSubjectRequest->update(['completed_at' => now()]);
        }

        return response()->json([
            'message' => 'Data subject request updated successfully.',
            'request' => $dataSubjectRequest
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
        );
    }
}
