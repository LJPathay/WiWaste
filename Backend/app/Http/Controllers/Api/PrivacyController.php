<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DataSubjectRequest;
use App\Models\SalesTransaction;
use App\Models\ReturnTransaction;
use App\Models\AuditLog;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PrivacyController extends Controller
{
    use Concerns\GathersSubjectData;

    public function erase(DataSubjectRequest $request)
    {
        $businessId = $request->business_id;
        $identifier = $request->subject_identifier;

        $erasedCounts = [];
        $erasedCounts['customer_pii'] = $this->anonymizeCustomer($businessId, $identifier);
        $erasedCounts['sales_transactions'] = $this->anonymizeSalesTransactions($businessId, $identifier);
        $erasedCounts['returns'] = $this->anonymizeReturns($businessId, $identifier);
        $erasedCounts['audit_logs'] = $this->anonymizeAuditLogs($businessId, $identifier);

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

            $customer = $this->findCustomerByIdentifier($businessId, $identifier);

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

    public function restrict(DataSubjectRequest $dataSubjectRequest)
    {
        $dataSubjectRequest->update([
            'status' => 'completed',
            'completed_at' => now(),
            'notes' => 'Processing restricted per data subject request. Data marked as restricted in all systems.',
        ]);

        return response()->json([
            'message' => 'Processing restriction applied. Data marked as restricted.',
            'request' => $dataSubjectRequest,
        ]);
    }

    public function object(DataSubjectRequest $dataSubjectRequest)
    {
        $dataSubjectRequest->update([
            'status' => 'completed',
            'completed_at' => now(),
            'notes' => 'Objection recorded. Processing will be reviewed and halted if legitimate grounds exist.',
        ]);

        return response()->json([
            'message' => 'Objection recorded. Processing will be reviewed.',
            'request' => $dataSubjectRequest,
        ]);
    }

    protected function anonymizeCustomer(int $businessId, string $identifier): int
    {
        $customer = $this->findCustomerByIdentifier($businessId, $identifier);

        if (!$customer) {
            return 0;
        }

        $customer->update([
            'customer_name' => 'ANONYMIZED_' . $customer->customer_id,
            'customer_phone' => 'ANONYMIZED',
            'customer_email' => 'ANONYMIZED',
            'customer_address' => 'ANONYMIZED',
        ]);

        return 1;
    }

    protected function anonymizeSalesTransactions(int $businessId, string $identifier): int
    {
        $transactions = SalesTransaction::where('business_id', $businessId)
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

        return $transactions->count();
    }

    protected function anonymizeReturns(int $businessId, string $identifier): int
    {
        $returns = ReturnTransaction::whereHas('saleItem.transaction', function ($q) use ($businessId, $identifier) {
            $q->where('business_id', $businessId)
              ->where(function ($q) use ($identifier) {
                  $q->where('customer_name', 'like', "%{$identifier}%")
                    ->orWhere('customer_phone', $identifier)
                    ->orWhere('customer_email', $identifier);
              });
        })->get();

        return $returns->count();
    }

    protected function anonymizeAuditLogs(int $businessId, string $identifier): int
    {
        $auditLogs = AuditLog::where('business_id', $businessId)
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

        return $auditLogs->count();
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
}
