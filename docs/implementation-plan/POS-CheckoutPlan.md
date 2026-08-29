# Implementation Plan: POS Terminal Payment Flow for Physical Minimart

## Overview
Replace PayMongo hosted checkout (designed for remote/online payments) with a **terminal payment flow** that matches how a physical minimart actually works: customer taps card on standalone terminal → terminal prints approval → cashier enters ref # in POS → sale recorded immediately.

---

## Files to Modify

| File | Action | Priority |
|------|--------|----------|
| `Frontend/src/utils/cashierData.ts` | Add `PosPaymentMethod` type export | High |
| `Frontend/src/pages/cashier/POSTerminal.tsx` | Core changes: types, state, UI, checkout logic | High |
| `Frontend/src/pages/cashier/POSPaymentStatus.tsx` | Delete (unused) | High |
| `Frontend/src/services/api.ts` | Remove `paymongo` export | Medium |

---

## Detailed Changes

### 1. `Frontend/src/utils/cashierData.ts`
**Add export** (after line 1):
```typescript
export type PosPaymentMethod = 'Cash' | 'Card (Terminal)' | 'E-wallet (Terminal)';
```

---

### 2. `Frontend/src/pages/cashier/POSTerminal.tsx`

#### A. Replace Payment Type Definitions (lines 39-40)
```typescript
// OLD
type PosPaymentMethod = PaymentMethod | 'GCash' | 'Maya' | 'Card';
const IS_PAYMONGO = (m: PosPaymentMethod) => m === 'GCash' || m === 'Maya' || m === 'Card';

// NEW
import { PosPaymentMethod } from '../../utils/cashierData';

const IS_TERMINAL = (m: PosPaymentMethod) => 
  m === 'Card (Terminal)' || m === 'E-wallet (Terminal)';
```

#### B. Update Initial State (line 185)
```typescript
const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('Cash');
```

#### C. Add Terminal State (after line 187)
```typescript
const [terminalRef, setTerminalRef] = useState('');
const [terminalAmount, setTerminalAmount] = useState('');
```

#### D. Reset Terminal State in `startNewTransaction` (line 672)
```typescript
setTerminalRef('');
setTerminalAmount('');
```

#### E. Checkout Modal UI (inside `showCheckout` modal)
**Payment method selector** — replace current radio/group with:
```tsx
<div className="space-y-2">
  {(['Cash', 'Card (Terminal)', 'E-wallet (Terminal)'] as PosPaymentMethod[]).map(m => (
    <label key={m} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
      <input
        type="radio"
        value={m}
        checked={paymentMethod === m}
        onChange={() => { setPaymentMethod(m); setTerminalRef(''); setTerminalAmount(''); }}
        className="w-5 h-5 text-[#0F766E] border-slate-300 focus:ring-[#0F766E]"
      />
      <span className="font-medium text-slate-800">{m}</span>
    </label>
  ))}
</div>
```

**Terminal fields** (conditionally shown when `IS_TERMINAL(paymentMethod)`):
```tsx
{IS_TERMINAL(paymentMethod) && (
  <div className="space-y-3 pt-3 border-t">
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1">Terminal Ref # <span className="text-red-500">*</span></label>
      <input
        value={terminalRef}
        onChange={e => setTerminalRef(e.target.value)}
        placeholder="Approval code from terminal slip"
        className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F766E] focus:border-transparent"
        autoFocus
      />
    </div>
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1">Terminal Amount (optional)</label>
      <input
        type="number"
        step="0.01"
        value={terminalAmount}
        onChange={e => setTerminalAmount(e.target.value)}
        placeholder={formatCurrency(grandTotal)}
        className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F766E] focus:border-transparent"
      />
    </div>
  </div>
)}
```

#### F. Rewrite `completePayment` Function (lines 574-670)
```typescript
const completePayment = async () => {
  if (cart.length === 0) { error('Add at least one product.'); return; }
  
  const isCash = paymentMethod === 'Cash';
  const isTerminal = IS_TERMINAL(paymentMethod);

  if (isCash && tendered < grandTotal) { error('Amount tendered must cover the total.'); return; }
  if (isTerminal && !terminalRef.trim()) { error('Enter terminal approval/reference number.'); return; }
  if (terminalAmount && Number(terminalAmount) !== grandTotal) {
    error(`Terminal amount (${formatCurrency(Number(terminalAmount))}) doesn't match total (${formatCurrency(grandTotal)})`);
    return;
  }

  const payload = {
    payment_method: isCash ? 'Cash' 
      : paymentMethod === 'Card (Terminal)' ? 'Credit Card' 
      : 'E-wallet',
    payment_reference: isTerminal ? terminalRef : undefined,
    amount_tendered: isCash ? tendered : grandTotal,
    change_due: isCash ? changeDue : 0,
    senior_pwd_name: seniorPwdInfo?.name ?? null,
    senior_pwd_id: seniorPwdInfo?.id ?? null,
    items: cart.map(l => ({
      product_id: l.product.db_id ?? Number(l.product.plu_code ?? l.product.product_id.replace('P-', '')),
      quantity: l.quantity,
      unit_price: l.product.selling_price * (1 - (l.discountPct || 0)) - (l.discountAmount || 0),
      discount_pct: l.discountPct ?? 0,
      discount_amount: l.discountAmount ?? 0,
      override_reason: l.overrideReason ?? null,
    })),
  };

  try {
    await salesApi.create(payload);
  } catch (err: unknown) {
    error(err instanceof Error ? err.message : 'Unable to complete payment.');
    return;
  }

  // Stock adjustments, receipt, print, reset — keep existing logic after this point
  setStockAdjustments(prev => { /* ... */ });
  const completedReceipt = { /* ... */ };
  setReceipt(completedReceipt);
  setShowCheckout(false);
  setShowPrintedReceipt(true);
  setTimeout(() => { try { window.print(); } catch {} }, 400);
};
```

#### G. Remove PayMongo Dead Code
- Delete `IS_PAYMONGO` constant
- Delete `PAYMONGO_PENDING_KEY` constant
- Delete `PendingPayMongo` interface
- Delete `paymongoProcessing`, `paymongoPending` state
- Delete `paymongoApi` import
- Delete `useEffect` that restores PayMongo pending cart (lines 491-500)
- Delete processing overlay (lines 690-698)

---

### 3. `Frontend/src/pages/cashier/POSPaymentStatus.tsx`
**Delete entire file** — no longer needed (was for PayMongo polling).

---

### 4. `Frontend/src/services/api.ts`
**Remove** the `paymongo` export (lines 142-147) and its types (lines 349-361) since they're unused.

---

## Backend Changes
**None required.** `SalesTransactionController::store()` already:
- Accepts `Credit Card`, `Debit Card`, `E-wallet` as `payment_method`
- Only requires `payment_reference` when `payment_method === 'PayMongo'`
- Sets `status: 'Completed'` immediately for non-PayMongo
- Handles stock deduction, audit logs, analytics

---

## Testing Checklist

| Scenario | Expected |
|----------|----------|
| Cash payment | Completes immediately, prints receipt, shows change |
| Card (Terminal) + ref # | Completes immediately, `payment_reference` stored |
| E-wallet (Terminal) + ref # | Completes immediately, `payment_reference` stored |
| Missing terminal ref # | Blocked with error message |
| Terminal amount mismatch | Warning/error shown |
| Sales history | Shows correct `payment_method` and `payment_reference` |
| Stock deduction | Works for all payment types |
| Reports filter by payment method | Works |

---

## Rollback Plan
If issues arise:
1. Revert `POSTerminal.tsx` to previous version
2. Restore `POSPaymentStatus.tsx`
3. PayMongo flow remains functional

---

## Estimated Effort
- **Frontend changes**: ~120 lines modified across 2 files + 1 file deleted
- **Backend changes**: 0
- **Testing**: 30-45 minutes manual verification

---

## Questions for Clarification

1. **Terminal amount field** — required or optional warning? (Plan: optional warning)
2. **E-wallet sub-type tracking** — store "GCash" vs "Maya" in `payment_reference` (e.g., `GCash:#12345`) or free text?
3. **Split tender** — defer to v2?
4. **Receipt template** — add "Terminal Ref: #____" line to printed receipt?