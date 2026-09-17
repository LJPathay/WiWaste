import { createPortal } from 'react-dom';
import { formatCurrency, type SalesTransaction } from '../../utils/cashierData';

interface ReceiptPreviewProps {
  receipt: SalesTransaction;
  isVatRegistered: boolean;
}

export function ReceiptPreview({ receipt, isVatRegistered }: ReceiptPreviewProps) {
  return createPortal(
    <div id="thermal-receipt-print-target">
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>WiWaste Store</div>
        <div style={{ fontSize: '10px' }}>123 Retail Avenue, Metro Manila</div>
        <div style={{ fontSize: '10px', fontWeight: 'bold' }}>
          {isVatRegistered ? 'VAT REG TIN: 000-123-456-000' : 'NON-VAT OFFICIAL RECEIPT'}
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '4px 0', marginBottom: '8px' }}>
        <div className="flex-row-item">
          <span>Txn #:</span>
          <span>#POS-2026-{receipt.transaction_id.slice(-6)}</span>
        </div>
        <div className="flex-row-item">
          <span>Date:</span>
          <span>{receipt.transaction_date}</span>
        </div>
        <div className="flex-row-item">
          <span>Cashier:</span>
          <span>{receipt.cashier_name}</span>
        </div>
      </div>

      <div style={{ borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '8px' }}>
        <div className="flex-row-item" style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          <span style={{ width: '30px' }}>Qty</span>
          <span style={{ flex: 1 }}>Item</span>
          <span style={{ textAlign: 'right' }}>Total</span>
        </div>
        {receipt.items.map((item, idx) => (
          <div key={idx} className="flex-row-item" style={{ marginBottom: '2px' }}>
            <span style={{ width: '30px' }}>{item.quantity}</span>
            <span style={{ flex: 1, paddingRight: '4px' }}>{item.product_name}</span>
            <span style={{ textAlign: 'right' }}>{formatCurrency(item.subtotal)}</span>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div className="flex-row-item">
          <span>Subtotal:</span>
          <span>{formatCurrency(receipt.total_amount - (isVatRegistered ? receipt.total_amount * 0.12 : 0))}</span>
        </div>
        {receipt.seniorPwdName && (
          <div className="flex-row-item" style={{ fontSize: '9px' }}>
            <span>Senior/PWD:</span>
            <span>{receipt.seniorPwdName}</span>
          </div>
        )}
        {receipt.seniorPwdId && (
          <div className="flex-row-item" style={{ fontSize: '9px' }}>
            <span>ID No:</span>
            <span>{receipt.seniorPwdId}</span>
          </div>
        )}
        {isVatRegistered && (
          <div className="flex-row-item">
            <span>VAT (12%):</span>
            <span>{formatCurrency(receipt.total_amount * 0.12)}</span>
          </div>
        )}
        <div className="flex-row-item" style={{ fontWeight: 'bold', fontSize: '13px', borderTop: '1px solid #000', paddingTop: '4px', marginTop: '4px' }}>
          <span>Grand Total:</span>
          <span>{formatCurrency(receipt.total_amount)}</span>
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #000', paddingTop: '4px', marginBottom: '8px' }}>
        <div className="flex-row-item">
          <span>Payment Method:</span>
          <span>{receipt.payment_method}</span>
        </div>
        <div className="flex-row-item">
          <span>Amount Tendered:</span>
          <span>{receipt.amount_tendered ? formatCurrency(receipt.amount_tendered) : formatCurrency(receipt.total_amount)}</span>
        </div>
        <div className="flex-row-item" style={{ fontWeight: 'bold' }}>
          <span>Change Due:</span>
          <span>{formatCurrency(receipt.change_due ?? 0)}</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '10px' }}>
        <div>Thank you for shopping with us!</div>
        <div>Please come again.</div>
        <div style={{ marginTop: '4px', fontSize: '9px' }}>Powered by WiWaste POS</div>
      </div>
    </div>,
    document.body
  );
}
