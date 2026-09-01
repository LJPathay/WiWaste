# POS Checkout Modal Redesign — Implementation Plan

## Overview
Redesign the checkout modal in `POSTerminal.tsx` to match real-world cashier workflow observed in supermarkets/convenience stores. The current modal has correct logic but wrong visual hierarchy — it looks like an admin form instead of a fast cashier screen.

**Workflow modeled:**
- **Cash**: Cashier receives cash → enters amount → POS calculates change
- **Card/E-wallet**: Customer pays on external terminal → terminal prints receipt → cashier enters reference details from receipt → POS records transaction

---

## Priority
**HIGH** — Directly impacts cashier speed and UX; core POS functionality

---

## Files to Modify

| File | Action | Lines |
|------|--------|-------|
| `Frontend/src/pages/cashier/POSTerminal.tsx` | Complete modal rewrite | ~1395–1557 |

---

## Detailed Changes

### 1. Modal Layout Structure

**Current**: Split left/right (40/60), large green panel dominates
**Target**: Single column, compact, TOTAL DUE prominent

```
┌─────────────────────────────────────────────────────────────┐
│  Complete Payment                                    ✕      │
├─────────────────────────────────────────────────────────────┤
│  TOTAL DUE                                                  │
│  ₱230.00          ← Huge, prominent, centered              │
│                                                             │
│  PAYMENT METHOD                                             │
│  ┌────────┐ ┌────────┐ ┌──────────────┐                   │
│  │ 💵CASH │ │ 💳CARD │ │ 📱 E-WALLET  │                   │
│  └────────┘ └────────┘ └──────────────┘                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [Payment-specific interface — dynamic per method]         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [ Cancel ]                                        [ Pay ]  │
└─────────────────────────────────────────────────────────────┘
```

### 2. Payment Method Selector

Replace radio buttons with large selectable cards:

```tsx
const paymentMethods = [
  { id: 'Cash', icon: Banknote, label: 'CASH', sublabel: '' },
  { id: 'Card (Terminal)', icon: CreditCard, label: 'CARD', sublabel: 'TERMINAL' },
  { id: 'E-wallet (Terminal)', icon: Wallet, label: 'E-WALLET', sublabel: 'TERMINAL' },
];

// Selected: border-[#0F766E] bg-[#E8F7F2] shadow-md
// Unselected: border-slate-200 hover:border-[#0F766E]
```

### 3. Cash Payment Interface

```
Amount Tendered
┌──────────────────────────────────────────┐
│ ₱ 250.00                                 │  ← Huge input, no browser arrows
└──────────────────────────────────────────┘

Quick Amount
[ Exact ₱230 ] [ ₱250 ] [ ₱300 ] [ ₱500 ] [ ₱1000 ]

Change
₱20.00    ← Large, prominent, green
```

**Smart quick amounts** (computed from grandTotal):
```tsx
const quickAmounts = useMemo(() => {
  const base = Math.ceil(grandTotal);
  return [
    base,                          // Exact
    Math.ceil(base / 50) * 50,     // Next 50
    Math.ceil(base / 100) * 100,   // Next 100
    500,
    1000,
  ].filter((v, i, arr) => arr.indexOf(v) === i);
}, [grandTotal]);
```

**Validation**: Complete button disabled until `amountTendered >= grandTotal`

### 4. Card Terminal Interface

```
┌────────────────────────────────────────────────────────────┐
│ 💳  CARD PAYMENT                                            │
│     Processed on external terminal. Enter the details      │
│     from the terminal receipt below.                       │
└────────────────────────────────────────────────────────────┘

Approval / Reference No. *
┌────────────────────────────────────────────────────────────┐
│ Enter reference from terminal receipt                      │
└────────────────────────────────────────────────────────────┘

Terminal Amount
┌────────────────────────────────────────────────────────────┐
│ ₱230.00                    ← Pre-filled, editable          │
└────────────────────────────────────────────────────────────┘
     ↓ If edited and ≠ grandTotal:
     ⚠ Terminal amount (₱220.00) doesn't match total (₱230.00)
```

**Validation**: Complete button disabled until `terminalRef.trim() !== ''`

### 5. E-Wallet Terminal Interface

```
┌────────────────────────────────────────────────────────────┐
│ 📱  E-WALLET PAYMENT                                        │
│     Processed on external terminal. Enter the details      │
│     from the terminal receipt below.                       │
└────────────────────────────────────────────────────────────┘

Transaction Reference No. *
┌────────────────────────────────────────────────────────────┐
│ Enter reference from terminal receipt                      │
└────────────────────────────────────────────────────────────┘

Terminal Amount
┌────────────────────────────────────────────────────────────┐
│ ₱230.00                    ← Pre-filled, editable          │
└────────────────────────────────────────────────────────────┘
```

**Validation**: Same as Card

### 6. VAT Display Fix

**Current issue**: Shows `VAT (12%) ₱0.00` for VAT-inclusive pricing

**Fix**: Detect and display proper breakdown:
- If `isVatRegistered` + prices VAT-inclusive:
  ```
  Subtotal                 ₱205.36
  VAT (12%)                 ₱24.64
  ─────────────────────────────
  TOTAL                    ₱230.00
  ```
- If VAT-exclusive: current behavior (add VAT on top)

### 7. Visual Polish

| Property | Current | Target |
|----------|---------|--------|
| Background overlay | `bg-slate-900/50` + heavy blur | `bg-slate-900/40` + `backdrop-blur-sm` (4-8px) |
| Modal max-width | `max-w-3xl` | `max-w-md` (more compact) |
| Vertical spacing | Loose, tall | Dense, `space-y-4` |
| Complete button | Always enabled style | Contextual enabled/disabled |

### 8. Complete Payment Button State

```tsx
const isCompleteEnabled = paymentMethod === 'Cash'
  ? Number(amountTendered) >= grandTotal
  : terminalRef.trim() !== '';

<button
  disabled={!isCompleteEnabled}
  className={isCompleteEnabled
    ? 'bg-[#0F766E] text-white hover:bg-[#0d615b]'
    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
  }
>
  Complete Payment
</button>
```

---

## State Changes Required

```tsx
// Add/modify in POSTerminal component:
const [terminalAmount, setTerminalAmount] = useState(grandTotal); // Pre-fill on method change
const [showTerminalMismatch, setShowTerminalMismatch] = useState(false);

// Reset terminal fields when switching payment method
const resetTerminalFields = () => {
  setTerminalRef('');
  setTerminalAmount(String(grandTotal)); // Re-sync to current total
};

// Watch for mismatch
useEffect(() => {
  if (IS_TERMINAL(paymentMethod) && terminalAmount) {
    setShowTerminalMismatch(Number(terminalAmount) !== grandTotal);
  }
}, [terminalAmount, grandTotal, paymentMethod]);
```

---

## Acceptance Criteria

### Cash
- [ ] Enter amount < total → Complete button disabled
- [ ] Enter amount >= total → Complete button enabled, change shown
- [ ] Quick amount buttons work (Exact, +50, +100, +500, +1000)
- [ ] Change displays prominently in green
- [ ] Keyboard Enter works for amount input

### Card Terminal
- [ ] Empty reference → Complete button disabled
- [ ] Reference entered → Complete button enabled
- [ ] Terminal amount pre-filled with grandTotal
- [ ] Mismatch warning shown if edited ≠ total

### E-Wallet Terminal
- [ ] Same as Card Terminal
- [ ] Label says "Transaction Reference No."

### VAT
- [ ] VAT-inclusive pricing shows correct breakdown (Subtotal + VAT = Total)
- [ ] VAT-exclusive shows VAT added on top

### Visual
- [ ] Modal is compact, no excessive vertical space
- [ ] Background blur is lighter (~40% opacity, 4-8px)
- [ ] TOTAL DUE is huge and prominent
- [ ] Payment method cards are large and touch-friendly

---

## Testing Checklist

| Scenario | Expected |
|----------|----------|
| Cash payment with exact amount | Completes, change = ₱0.00 |
| Cash payment with overage | Completes, change calculated correctly |
| Cash payment under amount | Blocked, button disabled |
| Card payment with valid ref | Completes, ref stored |
| Card payment without ref | Blocked, button disabled |
| E-wallet payment with valid ref | Completes, ref stored |
| Terminal amount mismatch | Warning shown, still completable |
| VAT-inclusive product | Breakdown shows correctly |
| Switch payment methods | Fields reset appropriately |
| Modal open/close | No flicker, smooth |

---

## Rollout

1. Implement in `feature/pos-terminal-checkout` branch
2. Test locally with various totals
3. Verify backend still receives correct payload (no API changes needed)
4. Merge to main after verification

---

## Notes for Capstone Defense

> "The checkout workflow was designed based on the actual payment process observed in small retail establishments, where cash payments are entered directly into the POS, while card and e-wallet payments are processed through external payment terminals and their transaction references are subsequently recorded in the POS."

This distinguishes WiWaste from POS systems that try to be the payment terminal itself — a realistic architectural decision for a minimart context.

---

## Estimated Effort

- **Frontend only**: ~150 lines modified in single file
- **Time**: 2-3 hours implementation + 30 min testing
- **Risk**: Low (no backend changes, isolated component)

---

*Generated: 2026-09-01*
*Based on real-world cashier workflow observation*