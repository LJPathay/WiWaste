<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DataSubjectRequest;
use App\Models\Business;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class PrivacyController extends Controller
{
    /**
     * Store a new data subject request.
     */
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

        // Check if there's already a pending request for this subject and type
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

    /**
     * Get the status of a data subject request.
     */
    public function show(DataSubjectRequest $request)
    {
        // Check if the authenticated user's business matches the request's business
        // For simplicity, we're assuming the user is authenticated and we can get their business from the token
        // In a real app, you would check the user's business_id against the request's business_id
        return response()->json($request);
    }

    /**
     * Update the status of a data subject request (for internal use).
     */
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

        // If completed, set the completed_at timestamp
        if ($request->status === 'completed') {
            $dataSubjectRequest->update(['completed_at' => now()]);
        }

        return response()->json([
            'message' => 'Data subject request updated successfully.',
            'request' => $dataSubjectRequest
        ]);
    }

    /**
     * Export data for access or portability request.
     */
    public function export(DataSubjectRequest $request)
    {
        // This is a simplified example. In reality, you would gather all data
        // related to the subject identifier from various systems.
        $business = Business::find($request->business_id);

        // For demonstration, we'll return a structured JSON with placeholder data
        $data = [
            'request_info' => [
                'id' => $request->id,
                'request_type' => $request->request_type,
                'subject_identifier' => $request->subject_identifier,
                'status' => $request->status,
                'requested_at' => $request->requested_at,
                'completed_at' => $request->completed_at,
            ],
            'business_info' => [
                'id' => $business->id,
                'name' => $business->name,
                'business_type' => $business->business_type,
            ],
            'data_categories' => [
                'customer_pii' => [
                    // This would be actual data from your systems
                    'note' => 'Actual customer PII data would be exported here based on the subject_identifier.',
                ],
                'employee_data' => [
                    'note' => 'Actual employee data would be exported here if applicable.',
                ],
                // Add other data categories as needed
            ],
            'legal_basis' => 'This export is being performed in compliance with RA 10173 (Data Privacy Act) upon the data subject\'s request.',
            'exported_at' => now(),
        ];

        // For portability requests, we might want to format the data in a specific way
        if ($request->request_type === 'portability') {
            // You could convert to a specific format like JSON, CSV, etc.
            // For now, we'll just return the JSON as is.
        }

        return response()->json($data, 200)
            ->header('Content-Type', 'application/json');
    }

    /**
     * Delete or anonymize data for erasure request.
     */
    public function erase(DataSubjectRequest $request)
    {
        // This is a simplified example. In reality, you would anonymize or delete
        // all data related to the subject identifier from various systems.
        // For now, we'll just mark the request as completed and log the action.

        // In a real implementation, you would:
        // 1. Identify all systems where the subject's data is stored
        // 2. Either delete the data or anonymize it (depending on the request and legal requirements)
        // 3. Keep an audit trail of what was done

        $request->update([
            'status' => 'completed',
            'completed_at' => now(),
            'notes' => 'Data erasure/anonymization process initiated. Actual implementation would remove or anonymize data from all relevant systems.',
        ]);

        return response()->json([
            'message' => 'Data erasure request processed. Please note that this is a placeholder implementation. Actual data removal/anonymization would occur in a production system.',
            'request' => $request
        ], 200);
    }
}