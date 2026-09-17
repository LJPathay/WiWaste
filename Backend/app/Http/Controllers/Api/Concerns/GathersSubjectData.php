<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\SalesTransaction;
use App\Models\ReturnTransaction;
use App\Models\AuditLog;
use App\Models\Customer;

trait GathersSubjectData
{
    protected function gatherSubjectData(int $businessId, string $identifier): array
    {
        $data = [];

        $customer = $this->findCustomerByIdentifier($businessId, $identifier);
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

        $sales = $this->findSalesByIdentifier($businessId, $identifier);
        if ($sales->count() > 0) {
            $data['sales_transactions'] = $sales;
        }

        $returns = $this->findReturnsByIdentifier($businessId, $identifier);
        if ($returns->count() > 0) {
            $data['returns'] = $returns;
        }

        $auditLogs = $this->findAuditLogsByIdentifier($businessId, $identifier);
        if ($auditLogs->count() > 0) {
            $data['audit_trail'] = $auditLogs;
        }

        return $data;
    }

    protected function findCustomerByIdentifier(int $businessId, string $identifier): ?Customer
    {
        return Customer::where('business_id', $businessId)
            ->where(function ($q) use ($identifier) {
                $q->where('customer_name', 'like', "%{$identifier}%")
                  ->orWhere('customer_phone', $identifier)
                  ->orWhere('customer_email', $identifier);
            })
            ->first();
    }

    protected function findSalesByIdentifier(int $businessId, string $identifier)
    {
        return SalesTransaction::where('business_id', $businessId)
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
    }

    protected function findReturnsByIdentifier(int $businessId, string $identifier)
    {
        return ReturnTransaction::whereHas('saleItem.transaction', function ($q) use ($businessId, $identifier) {
            $q->where('business_id', $businessId)
              ->where(function ($q) use ($identifier) {
                  $q->where('customer_name', 'like', "%{$identifier}%")
                    ->orWhere('customer_phone', $identifier)
                    ->orWhere('customer_email', $identifier);
              });
        })->with(['saleItem.product'])->get()
          ->map(fn ($r) => [
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

    protected function findAuditLogsByIdentifier(int $businessId, string $identifier)
    {
        return AuditLog::where('business_id', $businessId)
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
    }
}
