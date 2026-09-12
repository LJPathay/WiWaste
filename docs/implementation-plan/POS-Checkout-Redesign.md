# POS Checkout & Payment Workflow Redesign

## Overview

Redesign the cashier-side checkout and payment workflow to accurately reflect a real-world cashier workflow. The physical payment terminal/card reader is external and not integrated with the POS. The POS must NOT pretend it can communicate with, detect, or automatically verify the external payment terminal.

## Real Cashier Workflow

```
Scan products → Review cart → Checkout → Select payment method
→ Enter required payment information from external payment machine/receipt
→ Cashier confirms payment → Print receipt → New transaction
```

---

## Payment Methods

### 1. CASH PAYMENT

**Display:**
- Total Amount Due (large, prominent)
- Amount Received input (large, ₱ prefix, numeric only)
- Quick denomination buttons: **₱200**, **₱500**, **₱1,000** (no Exact Amount button)
- Change Due (auto-calculated, green highlight)
- Complete Payment button (enabled when Amount Received ≥ Amount Due)

**Example:**
```
Amount Due:        ₱85.00
Amount Received:   [₱100.00    ]
Change Due:        ₱15.00
```

### 2. CARD PAYMENT

**Display:**
- Amount Due (large, prominent)
- Card Number input (auto-masks as `****-****-****-XXXX`, only last 4 digits visible)
- Transaction Number input (required, text from card machine receipt)
- Amount Charged input (pre-filled with grandTotal, editable)
- Amount match confirmation (✓ match / ⚠ mismatch)

**Card Number Handling:**
- Input accepts digits only, max 16 digits
- Auto-formats as `****-****-****-XXXX` — only last 4 digits visible
- Full number stored in state, only last 4 sent to API
- NEVER persisted to localStorage or any storage
- Cleared on transaction complete or unmount

**Example:**
```
Amount Due:         ₱85.00
Card Number:        ****-****-****-1234
Transaction No.:    [TXN-20260909-001 ]
Amount Charged:     [₱85.00            ]
✓ Amount matches
```

### 3. E-WALLET PAYMENT

**Display:**
- Amount Due (large, prominent)
- Account Details input (required — e.g., GCash number, Maya account)
- Transaction Number input (required, from e-wallet app receipt)
- Amount Paid input (pre-filled with grandTotal, editable)
- Amount match confirmation (✓ match / ⚠ mismatch)

**Example:**
```
Amount Due:         ₱85.00
Account Details:    [09171234567      ]
Transaction No.:    [GC-20260909-001  ]
Amount Paid:        [₱85.00            ]
✓ Amount matches
```

---

## Payment Confirmation (Card & E-Wallet)

Before completing a card or e-wallet transaction, show a clear confirmation:

**When amounts match:**
```
┌─────────────────────────────────────┐
│  ✓ Amount matches                   │
└─────────────────────────────────────┘
```
→ Complete Payment button is **ENABLED**

**When amounts DON'T match:**
```
┌─────────────────────────────────────┐
│  ⚠ Payment amount does not match    │
│  Order Total:    ₱85.00            │
│  Entered Amount: ₱80.00            │
└─────────────────────────────────────┘
```
→ Complete Payment button is **DISABLED** until resolved

---

## After Payment

After the cashier clicks "Complete Payment":

1. API call completes successfully
2. Receipt is rendered to thermal print portal
3. `window.print()` is triggered (browser print dialog)
4. Cart is cleared automatically
5. Cashier is returned to main POS screen ready for next customer

No success modal or confirmation screen — the print dialog IS the confirmation.

---

## Multiple Cashier Support

Every completed transaction records:
- Transaction ID (auto-generated)
- Cashier ID/name (from session)
- Register/POS ID (hardcoded "01" for now)
- Payment method
- Payment amount
- Payment reference (card last 4 + transaction number)
- Date and time

The external payment device does NOT need to be assigned to a specific cashier. The POS transaction itself identifies which cashier recorded the payment.

---

## API Payload Changes

The existing `CreateSalePayload` already supports the needed fields:

```typescript
{
  payment_method: 'Cash' | 'Credit Card' | 'E-wallet',
  payment_reference: string,  // Card: last 4 digits; E-Wallet: account details
  amount_tendered: number,
  change_due: number,
  // ... items, etc.
}
```

**Payment reference format:**
- Card: `"Card ending 1234 | TXN-20260909-001"`
- E-Wallet: `"09171234567 | GC-20260909-001"`
- Cash: `null` (no reference needed)

---

## Files to Modify

| File | Changes |
|------|---------|
| `Frontend/src/pages/cashier/POSTerminal.tsx` | Payment modal redesign, state changes, quick amounts |
| `Frontend/src/utils/cashierData.ts` | Update `PosPaymentMethod` type |
| `Frontend/src/pages/admin/GenerateReports.tsx` | (Already fixed in prior commit) |
| `Frontend/src/pages/inventory/ManageInventory.tsx` | (Already fixed in prior commit) |
| `Frontend/src/components/layout/DashboardLayout.tsx` | (Already fixed in prior commit) |

---

## UX Principles (Checklist)

- [x] Optimize for fast cashier operation
- [x] Minimize unnecessary fields
- [x] Don't add payment-provider complexity
- [x] Don't pretend external machine is integrated
- [x] Clearly separate Cash, Card, E-Wallet workflows
- [x] Prevent incorrect payment amounts (amount match required)
- [x] Make payment confirmation extremely obvious
- [x] Preserve existing WiWaste POS visual style
- [x] Large touch-friendly controls
- [x] Total amount prominently visible throughout checkout
- [x] Usable with mouse/touch and keyboard shortcuts
- [x] Clear validation and error states
- [x] Clean and professional interface

---

## Detailed State Changes

### REMOVE
| Variable | Reason |
|----------|--------|
| `terminalRef` | Replaced by `transactionRef` |
| `terminalAmount` | Replaced by `chargedAmount` (Card) and `amountPaid` (E-Wallet) |
| `customerName` | Not needed in simplified flow |
| `customerPhone` | Not needed in simplified flow |
| `customerEmail` | Not needed in simplified flow |
| `customerNotes` | Not needed in simplified flow |
| `showPrintedReceipt` | Already removed |

### ADD
| Variable | Type | Purpose |
|----------|------|---------|
| `transactionRef` | `string` | Transaction number from external payment receipt |
| `chargedAmount` | `string` | Amount charged on card (Card payment) |
| `amountPaid` | `string` | Amount paid via e-wallet (E-Wallet payment) |
| `accountDetails` | `string` | E-wallet account info (E-Wallet payment) |
| `cardLast4` | `string` | Last 4 digits of card number (Card payment) |
| `cardRaw` | `string` | Full card number (Card payment, never persisted) |

### KEEP
| Variable | Reason |
|----------|--------|
| `paymentMethod` | Updated type values |
| `amountTendered` | For cash payments |
| `receipt` | For thermal print portal |

---

## Quick Amounts (Cash)

Updated denominations:
```
₱200, ₱500, ₱1,000
```

Logic:
```typescript
const quickAmounts = [200, 500, 1000];
```

---

## Card Number Masking

```typescript
// Accept only digits, max 16
const formatCardInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  // Store last 4 separately
  const last4 = digits.slice(-4);
  // Mask everything except last 4
  if (digits.length <= 4) return digits;
  const masked = '*'.repeat(Math.max(0, digits.length - 4)) + last4;
  // Format as groups of 4
  return masked.replace(/(.{4})/g, '$1-').replace(/-$/, '');
};
```

---

## Amount Match Logic

```typescript
const isCardAmountMatch = Math.abs(Number(chargedAmount) - grandTotal) < 0.01;
const isEwalletAmountMatch = Math.abs(Number(amountPaid) - grandTotal) < 0.01;
```

---

## Complete Button Enabled State

```typescript
const isCompleteEnabled = paymentMethod === 'Cash'
  ? Number(amountTendered) >= grandTotal
  : paymentMethod === 'Card'
    ? transactionRef.trim() !== '' && cardLast4.length === 4 && isCardAmountMatch
    : accountDetails.trim() !== '' && transactionRef.trim() !== '' && isEwalletAmountMatch;
```

---

## Payment Reference Format

| Method | Format | Example |
|--------|--------|---------|
| Cash | `null` | — |
| Card | `Card ending {last4} \| {txnRef}` | `Card ending 1234 \| TXN-20260909-001` |
| E-Wallet | `{accountDetails} \| {txnRef}` | `09171234567 \| GC-20260909-001` |

---

## Complete Payment Flow

```
1. Cashier clicks "Complete Payment"
    ↓
2. Validate inputs (amounts, references, card last 4)
    ↓
3. Build CreateSalePayload
    ↓
4. POST /api/sales
    ↓
5. Update local stock adjustments
    ↓
6. Build receipt object for thermal print
    ↓
7. Render thermal print portal
    ↓
8. window.print() — browser print dialog
    ↓
9. startNewTransaction() — clear cart, reset all state
    ↓
10. Ready for next customer
```
