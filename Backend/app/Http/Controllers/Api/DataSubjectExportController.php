<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\DataSubjectRequest;

class DataSubjectExportController extends Controller
{
    use Concerns\GathersSubjectData;

    public function export(DataSubjectRequest $request)
    {
        $business = Business::find($request->business_id);

        if (!in_array($request->request_type, ['access', 'portability'])) {
            return response()->json([
                'message' => 'Export is only available for access and portability requests.',
            ], 422);
        }

        $exportData = $this->gatherSubjectData($business->id, $request->subject_identifier);

        if ($request->request_type === 'portability') {
            return $this->formatForPortability($exportData, $request);
        }

        return $this->formatForAccess($exportData, $request);
    }

    public function downloadPortability(DataSubjectRequest $request)
    {
        if ($request->request_type !== 'portability') {
            return response()->json(['message' => 'Download is only available for portability requests.'], 422);
        }

        $exportData = $this->gatherSubjectData($request->business_id, $request->subject_identifier);

        $filename = "portability_export_{$request->subject_identifier}_" . now()->format('Ymd_His') . ".csv";

        $callback = function () use ($exportData) {
            $handle = fopen('php://output', 'w');

            $this->writeCustomerCsv($handle, $exportData);
            $this->writeSalesCsv($handle, $exportData);
            $this->writeReturnsCsv($handle, $exportData);
            $this->writeAuditCsv($handle, $exportData);

            fclose($handle);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
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

    protected function writeCustomerCsv($handle, array $exportData): void
    {
        if (!isset($exportData['customer_pii'])) {
            return;
        }

        fputcsv($handle, ['Category', 'Field', 'Value']);
        foreach ($exportData['customer_pii'] as $key => $value) {
            fputcsv($handle, ['Customer PII', $key, $value]);
        }
    }

    protected function writeSalesCsv($handle, array $exportData): void
    {
        if (empty($exportData['sales_transactions'])) {
            return;
        }

        fputcsv($handle, ['Category', 'Transaction ID', 'Date', 'Total', 'Payment Method', 'Items']);
        foreach ($exportData['sales_transactions'] as $txn) {
            foreach ($txn['items'] as $item) {
                fputcsv($handle, ['Sales', $txn['transaction_id'], $txn['date'], $txn['total'], $txn['payment_method'], json_encode($item)]);
            }
        }
    }

    protected function writeReturnsCsv($handle, array $exportData): void
    {
        if (empty($exportData['returns'])) {
            return;
        }

        fputcsv($handle, ['Category', 'Return ID', 'Date', 'Reason', 'Refund', 'Items']);
        foreach ($exportData['returns'] as $ret) {
            foreach ($ret['items'] as $item) {
                fputcsv($handle, ['Return', $ret['return_id'], $ret['date'], $ret['reason'], $ret['refund'], json_encode($item)]);
            }
        }
    }

    protected function writeAuditCsv($handle, array $exportData): void
    {
        if (empty($exportData['audit_trail'])) {
            return;
        }

        fputcsv($handle, ['Category', 'Date', 'Action', 'Entity', 'User']);
        foreach ($exportData['audit_trail'] as $log) {
            fputcsv($handle, ['Audit', $log['date'], $log['action'], $log['entity'], $log['user']]);
        }
    }
}
