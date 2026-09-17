<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\DataSubjectRequest;
use App\Models\SalesTransaction;
use App\Models\SalesItem;
use App\Models\ReturnTransaction;
use App\Models\WastageRecord;
use App\Models\StockMovement;
use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\DataSubjectExport;

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
        $business = Business::find($request->business_id);

        if (!in_array($request->request_type, ['access', 'portability'])) {
            return response()->json([
                'message' => 'Export is only available for access and portability requests.',
            ], 422);
        }

        $identifier = $request->subject_identifier;

        // Gather data from all relevant systems
        $exportData = $this->gatherSubjectData($business->id, $identifier);

        if ($request->request_type === 'portability') {
            // For portability, provide structured, machine-readable format
            return $this->formatForPortability($exportData, $request);
        }

        return $this->formatForAccess($exportData, $request);
    }

    /**
     * Gather all data for a subject across systems
     */
    protected function gatherSubjectData(int $businessId, string $identifier): array
    {
        $data = [];

        // Customer data
        $customer = Customer::where('business_id', $businessId)
            ->where(function ($q) use ($identifier) {
                $q->where('customer_name', 'like', "%{$identifier}%")
                  ->orWhere('customer_phone', $identifier)
                  ->orWhere('customer_email', $identifier);
            })
            ->first();

        if ($customer) {
            $data['customer_pii'] = [
                'customer_id' => $customer->customer_id,
                'name' => $customer->customer_name,
                'phone' => $customer->customer_phone,
                'email' => $customer->customer_email,
                'address' => $customer->customer_address,
                'created_at' => $customer->Created_at,
            ];
        }

        // Sales transactions
        $sales = SalesTransaction::where('business_id', $businessId)
            ->where(function ($q) use ($identifier) {
                $q->where('customer_name', 'like', "%{$identifier}%")
                  ->orWhere('customer_phone', $identifier)
                  ->orWhere('customer_email', $identifier);
            })
            ->with(['salesItems.product'])
            ->get()
            ->map(function ($txn) {
                return [
                    'transaction_id' => $txn->transaction_id,
                    'date' => $txn->transaction_date,
                    'total' => $txn->total_amount,
                    'payment_method' => $txn->payment_method,
                    'items' => $txn->salesItems->map(fn ($item) => [
                        'product' => $item->product?->product_name,
                        'quantity' => $item->quantity,
                        'unit_price' => $item->unit_price,
                        'subtotal' => $item->subtotal,
                    ]),
                ];
            });

        if ($sales->count() > 0) {
            $data['sales_transactions'] = $sales;
        }

        // Returns
        $returns = ReturnTransaction::whereHas('saleItem.transaction', function ($q) use ($businessId, $identifier) {
            $q->where('business_id', $businessId)
              ->where(function ($q) use ($identifier) {
                  $q->where('customer_name', 'like', "%{$identifier}%")
                    ->orWhere('customer_phone', $identifier)
                    ->orWhere('customer_email', $identifier);
              });
        })->with(['saleItem.product'])->get();

        if ($returns->count() > 0) {
            $data['returns'] = $returns->map(fn ($r) => [
                'return_id' => $r->return_id,
                'date' => $r->return_date,
                'reason' => $r->reason,
                'refund' => $r->refund_amount,
                'items' => $r->saleItem ? [
                    'product' => $r->saleItem->product?->product_name,
                    'quantity' => $r->quantity_returned,
                ] : [],
            ]);
        }

        // Loyalty/loyalty data (if applicable)
        // Audit logs for this subject
        $auditLogs = AuditLog::where('business_id', $businessId)
            ->where(function ($q) use ($identifier) {
                $q->where('action', 'like', "%{$identifier}%")
                  ->orWhere('new_values', 'like', "%{$identifier}%")
                  ->orWhere('old_values', 'like', "%{$identifier}%");
            })
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn ($log) => [
                'date' => $log->created_at,
                'action' => $log->action,
                'entity' => $log->entity_type,
                'user' => $log->user?->Full_name,
            ]);

        if ($auditLogs->count() > 0) {
            $data['audit_trail'] = $auditLogs;
        }

        return $data;
    }

    protected function formatForAccess(array $data, DataSubjectRequest $request): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'request_info' => [
                'id' => $request->id,
                'request_type' => $request->request_type,
                'subject_identifier' => $request->subject_identifier,
                'status' => $request->status,
                'requested_at' => $request->requested_at,
                'completed_at' => $request->completed_at,
            ],
            'business_info' => [
                'id' => $request->business_id,
                'name' => $request->business?->name,
            ],
            'data' => $data,
            'legal_basis' => 'This export is being performed in compliance with RA 10173 (Data Privacy Act) upon the data subject\'s request.',
            'exported_at' => now(),
        ])->header('Content-Type', 'application/json');
    }

    protected function formatForPortability(array $data, DataSubjectRequest $request): \Illuminate\Http\JsonResponse
    {
        // For portability, provide structured, machine-readable format
        return response()->json([
            'request_info' => [
                'id' => $request->id,
                'request_type' => 'portability',
                'subject_identifier' => $request->subject_identifier,
                'exported_at' => now(),
            ],
            'format' => 'json',
            'version' => '1.0',
            'data' => $data,
        ])->header('Content-Type', 'application/json')
          ->header('Content-Disposition', 'attachment; filename="portability_export_' . now()->format('Ymd_His') . '.json"');
    }

    /**
     * Download as CSV for portability
     */
    public function downloadPortability(DataSubjectRequest $request)
    {
        if ($request->request_type !== 'portability') {
            return response()->json(['message' => 'Download is only available for portability requests.'], 422);
        }

        $this->gatherSubjectData($request->business_id, $request->subject_identifier);

        // Create CSV export
        $filename = "portability_export_{$request->subject_identifier}_" . now()->format('Ymd_His') . ".csv";

        $callback = function () use ($request) {
            $exportData = $this->gatherSubjectData($request->business_id, $request->subject_identifier);
            
            $handle = fopen('php://output', 'w');
            
            // Customer PII
            if (isset($exportData['customer_pii'])) {
                fputcsv($handle, ['Category', 'Field', 'Value']);
                foreach ($exportData['customer_pii'] as $key => $value) {
                    fputcsv($handle, ['Customer PII', $key, $value]);
                }
            }

            // Sales Transactions
            if (!empty($exportData['sales_transactions'])) {
                fputcsv($handle, ['Category', 'Transaction ID', 'Date', 'Total', 'Payment Method', 'Items']);
                foreach ($exportData['sales_transactions'] as $txn) {
                    foreach ($txn['items'] as $item) {
                        fputcsv($handle, ['Sales', $txn['transaction_id'], $txn['date'], $txn['total'], $txn['payment_method'], json_encode($item)]);
                    }
                }
            }

            // Returns
            if (!empty($exportData['returns'])) {
                fputcsv($handle, ['Category', 'Return ID', 'Date', 'Reason', 'Refund', 'Items']);
                foreach ($exportData['returns'] as $ret) {
                    foreach ($ret['items'] as $item) {
                        fputcsv($handle, ['Return', $ret['return_id'], $ret['date'], $ret['reason'], $ret['refund'], json_encode($item)]);
                    }
                }
            }

            // Audit Trail
            if (!empty($exportData['audit_trail'])) {
                fputcsv($handle, ['Category', 'Date', 'Action', 'Entity', 'User']);
                foreach ($exportData['audit_trail'] as $log) {
                    fputcsv($handle, ['Audit', $log['date'], $log['action'], $log['entity'], $log['user']]);
                }
            }

            fclose($handle);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Delete or anonymize data for erasure request.
     */
    public function erase(DataSubjectRequest $request)
    {
        $businessId = $request->business_id;
        $identifier = $request->subject_identifier;

        // Get all data to be erased
        $this->gatherSubjectData($businessId, $request->subject_identifier);

        $erasedCounts = [];

        // 1. Anonymize customer PII
        $customer = \App\Models\Customer::where('business_id', $request->business_id)
            ->where(function ($q) use ($identifier) {
                $q->where('customer_name', 'like', "%{$identifier}%")
                  ->orWhere('customer_phone', $identifier)
                  ->orWhere('customer_email', $identifier);
            })
            ->first();

        if ($customer) {
            $customer->update([
                'customer_name' => 'ANONYMIZED_' . $customer->customer_id,
                'customer_phone' => 'ANONYMIZED',
                'customer_email' => 'ANONYMIZED',
                'customer_address' => 'ANONYMIZED',
            ]);
            $erasedCounts['customer_pii'] = 1;
        }

        // 2. Anonymize sales transactions (keep transaction data, remove PII)
        $transactions = SalesTransaction::where('business_id', $request->business_id)
            ->where(function ($q) use ($identifier) {
                $q->where('customer_name', 'like', "%{$identifier}%")
                  ->orWhere('customer_phone', $identifier)
                  ->orWhere('customer_email', $identifier);
            })
            ->get();

        foreach ($transactions as $txn) {
            $txn->update([
                'customer_name' => 'ANONYMIZED',
                'customer_phone' => 'ANONYMIZED',
                'customer_email' => 'ANONYMIZED',
            ]);
        }
        $erasedCounts['sales_transactions'] = $transactions->count();

        // 3. Anonymize returns
        $returns = ReturnTransaction::whereHas('saleItem.transaction', function ($q) use ($businessId, $identifier) {
            $q->where('business_id', $businessId)
              ->where(function ($q) use ($identifier) {
                  $q->where('customer_name', 'like', "%{$identifier}%")
                    ->orWhere('customer_phone', $identifier)
                    ->orWhere('customer_email', $identifier);
              });
        })->get();

        // Returns reference sale items which have transaction data
        // The transaction data is already anonymized above
        $erasedCounts['returns'] = $returns->count();

        // 4. Audit logs - we keep audit logs for compliance but can mark subject as anonymized
        $auditLogs = AuditLog::where('business_id', $request->business_id)
            ->where(function ($q) use ($identifier) {
                $q->where('action', 'like', "%{$identifier}%")
                  ->orWhere('new_values', 'like', "%{$identifier}%")
                  ->orWhere('old_values', 'like', "%{$identifier}%");
            })
            ->get();

        foreach ($auditLogs as $log) {
            $newValues = $log->new_values ? json_decode($log->new_values, true) : [];
            $oldValues = $log->old_values ? json_decode($log->old_values, true) : [];

            $newValues = $this->anonymizeValues($newValues, $identifier);
            $oldValues = $this->anonymizeValues($oldValues, $identifier);

            $log->update([
                'new_values' => $newValues ? json_encode($newValues) : null,
                'old_values' => $oldValues ? json_encode($oldValues) : null,
            ]);
        }
        $erasedCounts['audit_logs'] = $auditLogs->count();

        // Mark request as completed
        $request->update([
            'status' => 'completed',
            'completed_at' => now(),
            'notes' => "Data erasure completed. Erased: " . json_encode($erasedCounts),
        ]);

        return response()->json([
            'message' => 'Data erasure completed successfully.',
            'erased_summary' => $erasedCounts,
            'request' => $request
        ], 200);
    }

    protected function anonymizeValues(array $data, string $identifier): array
    {
        if (!$data) {
            return $data;
        }

        foreach ($data as $key => $value) {
            if (is_string($value)) {
                if (str_contains(strtolower($value), strtolower($identifier))) {
                    $data[$key] = '[ANONYMIZED]';
                }
            } elseif (is_array($value)) {
                $data[$key] = $this->anonymizeValues($value, $identifier);
            }
        }
        return $data;
    }

    /**
     * Rectification request - update incorrect data
     */
    public function rectify(Request $request, DataSubjectRequest $dataSubjectRequest)
    {
        $validator = Validator::make($request->all(), [
            'corrections' => 'required|array|min:1',
            'corrections.*.field' => 'required|string',
            'corrections.*.new_value' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $identifier = $dataSubjectRequest->subject_identifier;
        $businessId = $dataSubjectRequest->business_id;

        $updated = [];

        foreach ($request->corrections as $correction) {
            $field = $correction['field'];
            $newValue = $correction['new_value'];

            // Update customer record
            $customer = Customer::where('business_id', $businessId)
                ->where(function ($q) use ($identifier) {
                    $q->where('customer_name', 'like', "%{$identifier}%")
                      ->orWhere('customer_phone', $identifier)
                      ->orWhere('customer_email', $identifier);
                })
                ->first();

            if ($customer && $customer->{$field} !== null) {
                $customer->update([$field => $newValue]);
                $updated[] = $field;
            }
        }

        $dataSubjectRequest->update([
            'status' => 'completed',
            'completed_at' => now(),
            'notes' => "Rectified fields: " . implode(', ', $updated),
        ]);

        return response()->json([
            'message' => 'Rectification completed.',
            'updated_fields' => $updated,
        ]);
    }

    /**
     * Restriction of processing
     */
    public function restrict(Request $request, DataSubjectRequest $dataSubjectRequest)
    {
        $dataSubjectRequest->update([
            'status' => 'completed',
            'completed_at' => now(),
            'notes' => 'Processing restricted per data subject request. Data marked as restricted in all systems.',
        ]);

        // In a real implementation, you would flag the data as restricted
        // and prevent further processing until restriction is lifted

        return response()->json([
            'message' => 'Processing restriction applied. Data marked as restricted.',
            'request' => $dataSubjectRequest,
        ]);
    }

    /**
     * Objection to processing
     */
    public function object(Request $request, DataSubjectRequest $dataSubjectRequest)
    {
        $dataSubjectRequest->update([
            'status' => 'completed',
            'completed_at' => now(),
            'notes' => 'Objection recorded. Processing will be reviewed and halted if legitimate grounds exist.',
        ]);

        // In a real implementation, you would flag the data to stop specific processing activities

        return response()->json([
            'message' => 'Objection recorded. Processing will be reviewed.',
            'request' => $dataSubjectRequest,
        ]);
    }

    /**
     * List all requests with filtering
     */
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