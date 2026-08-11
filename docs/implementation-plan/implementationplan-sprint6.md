# Sprint 6 — Payment Gateway (PayMongo)

> **Objective:** Replace the POS non-cash placeholder with a real payment flow via the **PayMongo**
> gateway (GCash, Maya, card). WiWaste never touches card numbers — the customer pays on PayMongo's
> hosted Checkout Session page and WiWaste finalizes the sale only after payment is confirmed.

---

## 1. Goal

By the end of this sprint:

1. Selecting **GCash / Maya / Card** at checkout creates a PayMongo **Checkout Session** and opens the
   hosted payment page.
2. When payment succeeds, the sale is marked **Completed** and stock is deducted **exactly once**.
   Confirmation comes from a signature-verified **webhook**, with a **poll-based fallback** so the demo
   works on localhost without a public tunnel.
3. The sale is stored with `payment_method = PayMongo`, a `payment_reference` (e.g. `GCash`, `Maya`,
   `Card`), and the PayMongo PaymentIntent ID for audit.

## 2. Status

- **Not started.**
- Current state: `Frontend/src/pages/cashier/POSTerminal.tsx` shows a placeholder box
  ("Process payment via {method} terminal.") for non-cash methods, and `completePayment` swallows API
  errors and always shows a success receipt — this must be restructured.
- Backend `SalesTransactionController::store` only accepts
  `Cash, E-wallet, Credit Card, Debit Card` and hardcodes `status = 'Completed'`.

## 3. Approach (decided)

- **Hosted Checkout Sessions** — `POST https://api.paymongo.com/v1/checkout_sessions` returns a hosted
  `checkout_url`. Redirect the browser there; no card data ever enters WiWaste.
- **Finalize = webhook + poll (hybrid):**
  - Webhook `POST /api/paymongo/webhook` verifies the `X-Paymongo-Signature` header
    (`hash_hmac('sha256', rawBody, webhook_secret)`) and dispatches a queued job
    (`ProcessPayMongoWebhook`, pattern from `app/Jobs/WarmAnalyticsCache.php`; database queue already
    configured).
  - `GET /api/paymongo/status/{transaction_id}` re-checks the PaymentIntent from PayMongo and finalizes
    when `paid`, so the POS works even when webhooks cannot reach localhost.
- **Stock is deducted only on payment confirmation** (`paid`). A `Pending` transaction holds zero stock;
  a cancelled/failed payment deducts nothing.
- The existing synchronous path for `Cash / E-wallet / Credit Card / Debit Card` is **unchanged**.

## 4. Scope

### In scope
- Schema change to record PayMongo payment state.
- `PayMongoService` (create checkout session, retrieve intent, verify webhook signature).
- Pending-sale path in `POST /sales`; webhook endpoint + queued job; status/poll endpoint.
- POS checkout flow: submit → open checkout URL → poll → receipt.
- `.env.example` entries + README notes.

### Out of scope
- Storing or handling card numbers/tokens (entirely PayMongo's job).
- Mobile/desktop SDK embeds (hosted Checkout Session page only).
- Offline non-cash payments (PayMongo requires internet).
- Multiple simultaneous PayMongo providers (one gateway, three allowed methods).

## 5. Backend tasks (Laravel)

### 5.1 Migration — `add_paymongo_fields_to_sales_transaction_table`

- Widen `payment_method` from ENUM to `string(50)` and `status` from ENUM to `string(20)` (native
  `->change()`, Laravel 11+; no doctrine/dbal needed).
- Add nullable columns:
  - `paymongo_intent_id` — PayMongo PaymentIntent / checkout session ID.
  - `paymongo_checkout_url` — hosted checkout URL (for audit / re-send).
  - `payment_reference` — what the customer actually used (`GCash`, `Maya`, `Card`).
  - `payment_status` — `pending` | `paid` | `failed` (null for non-PayMongo sales).

Also update `SalesTransaction` `$fillable` and the `index()` payload to expose the new fields.

### 5.2 Config

- `config/services.php` → add `paymongo` block:
  ```php
  'paymongo' => [
      'secret_key'     => env('PAYMONGO_SECRET_KEY'),
      'public_key'     => env('PAYMONGO_PUBLIC_KEY'),
      'webhook_secret' => env('PAYMONGO_WEBHOOK_SECRET'),
      'success_url'    => env('PAYMONGO_SUCCESS_URL'),
      'cancel_url'     => env('PAYMONGO_CANCEL_URL'),
      'base_url'       => env('PAYMONGO_API_URL', 'https://api.paymongo.com/v1'),
  ],
  ```
- `Backend/.env.example` → add the `PAYMONGO_*` keys (sandbox values for dev/demo).

### 5.3 Service — `app/Services/PayMongoService.php`

- `createCheckoutSession(int $amountCents, string $description, string $successUrl, string $cancelUrl,
  ?string $intentId = null): array` — POST `/checkout_sessions` with Basic auth (secret key); returns
  `checkout_url` + `payment_intent_id`.
- `retrieveIntent(string $intentId): array` — GET `/payment_intents/{id}`; returns `status`, `amount`,
  and payment method used.
- `verifyWebhookSignature(string $payload, string $signature): bool` — constant-time compare of
  `hash_hmac('sha256', $payload, config('services.paymongo.webhook_secret'))`.
- Use Laravel `Http::` (Guzzle already ships with `laravel/framework`).

### 5.4 `SalesTransactionController::store` — pending path

- Add `PayMongo` to the `payment_method` `in:` rule.
- If `payment_method === 'PayMongo'`:
  - Create transaction with `status = 'Pending'`, `payment_status = 'pending'`,
    `amount_tendered = total`, `change_due = 0`. **Do not deduct stock yet.**
  - Create the checkout session (amount in **cents**, description = txn #), save `paymongo_intent_id`
    + `paymongo_checkout_url`.
  - Return `201` with `{ transaction_id, checkout_url, payment_intent_id, status: 'pending' }`.
- Else: keep the current synchronous flow unchanged (deduct stock, `status = 'Completed'`).

### 5.5 Finalize helper (shared by webhook + poll)

- `PayMongoController::finalize(int $transactionId)` — idempotent (no-op if already `Completed`):
  when intent is `paid`, set `status = 'Completed'`, `payment_status = 'paid'`, `payment_reference`
  from the intent's method, then create `Sales_Item` rows, deduct `Inventory`, write `Stock_Movement`,
  log `AuditLog`, dispatch `WarmAnalyticsCache` — all inside `DB::transaction`.

### 5.6 Webhook endpoint

- `POST /api/paymongo/webhook` — read raw body, verify `X-Paymongo-Signature`, dispatch
  `ProcessPayMongoWebhook` for `payment.paid` / `payment.failed` events, respond `200 { received: true }`.
- Not behind Sanctum (PayMongo calls it server-to-server); protection is the signature check.

### 5.7 Status / poll endpoint

- `GET /api/paymongo/status/{transaction_id}` — if `payment_status` is still `pending`, call
  `retrieveIntent()`; if `paid`, run `finalize()`. Return
  `{ transaction_id, payment_status, status, payment_reference }`.

## 6. Frontend tasks (React)

### 6.1 API client — `Frontend/src/services/api.ts`

- Extend `CreateSalePayload.payment_method` to include `'PayMongo'`.
- Add:
  ```ts
  export const paymongo = {
    createCheckout: (data: CreateSalePayload) => request<PayMongoCheckoutResponse>('/sales', { method: 'POST', body: JSON.stringify(data) }),
    getStatus: (transactionId: number) => request<PayMongoStatusResponse>(`/paymongo/status/${transactionId}`),
  };
  ```
- Add `PayMongoCheckoutResponse` (`checkout_url`, `payment_intent_id`, `status`) and
  `PayMongoStatusResponse` (`payment_status`, `status`, `payment_reference`).

### 6.2 POS checkout flow — `Frontend/src/pages/cashier/POSTerminal.tsx`

- For **GCash / Maya / Card** (replacing the placeholder box):
  1. `completePayment` calls `paymongo.createCheckout(...)` → gets `checkout_url`.
  2. Show a "Processing payment…" state, then open the checkout (`window.location.assign(checkout_url)`
     or a "Continue to payment" modal button).
  3. On return to `PAYMONGO_SUCCESS_URL`, poll `paymongo.getStatus(transactionId)` every ~2 s
     (max ~30 attempts).
  4. `paid` → build the receipt from the API response and show "Payment Successful".
  5. `failed` / timeout / network error → show a clear error and keep the cart intact — **never** show a
     success receipt on failure.
- Keep `Cash` behavior exactly as-is.

## 7. API contract

| Method | Endpoint | Body / Params | Response |
|--------|----------|---------------|----------|
| `POST` | `/sales` | `payment_method = "PayMongo"` + items | `201 { transaction_id, checkout_url, payment_intent_id, status: "pending" }` |
| `GET` | `/paymongo/status/{transaction_id}` | path | `{ transaction_id, payment_status, status, payment_reference }` |
| `POST` | `/paymongo/webhook` | raw JSON + `X-Paymongo-Signature` header | `200 { received: true }` |
| `POST` | `/sales` (other methods) | unchanged | unchanged `201` (immediate `Completed`) |

## 8. Env variables (new)

```env
# Backend/.env.example
PAYMONGO_SECRET_KEY=sk_test_...        # sandbox secret key
PAYMONGO_PUBLIC_KEY=pk_test_...        # sandbox public key
PAYMONGO_WEBHOOK_SECRET=whsec_...      # from PayMongo dashboard webhook settings
PAYMONGO_SUCCESS_URL=http://localhost:5173/pos/success
PAYMONGO_CANCEL_URL=http://localhost:5173/pos

# Frontend/.env.example (new file)
VITE_PAYMONGO_PUBLIC_KEY=pk_test_...
```

## 9. Testing

Backend — `Backend/tests/Feature/PayMongoTest.php`:
1. `POST /sales` with `payment_method=PayMongo` → 201, transaction `Pending`, **no** stock deducted.
2. Simulate `paid` and finalize → status `Completed`, stock deducted once, `Sales_Item` +
   `Stock_Movement` written.
3. Finalize again → no double deduction (idempotent).
4. Webhook with wrong signature → 401; with correct signature → `200` / job dispatched.
5. `POST /sales` Cash path unchanged (stock deducted immediately, status `Completed`).

Frontend:
- `npm run build` and ESLint pass.
- Manual walkthrough below.

## 10. Manual demo walkthrough (acceptance script)

1. Setup: PayMongo sandbox account; copy `sk_test_...` / `pk_test_...`; create a webhook pointing at
   `https://<tunnel-or-domain>/api/paymongo/webhook` subscribed to `payment.paid` / `payment.failed`.
   For localhost-only demos the poll endpoint finalizes the sale, so the webhook is optional.
2. Log in as **Cashier** → POS → add items → select **GCash** → total shows in PHP.
3. Browser opens the PayMongo hosted checkout → pay with PayMongo's sandbox test method.
4. Return to success page → POS polls → "Payment Successful" receipt shows `PayMongo` + `GCash`.
5. Inventory Staff → Manage Inventory → stock decreased by exactly the sold quantity.
6. Repeat with **Maya** and **Card**; then cancel on the checkout page → no sale, no stock change.
7. Sales list shows the transaction with `PayMongo`, reference, status `Completed`.

## 11. Definition of Done

**Acceptance criteria:** Selecting GCash/Maya/card opens the PayMongo checkout and the sale completes only
when payment is confirmed; stock is deducted exactly once.

- [ ] GCash / Maya / Card open the PayMongo hosted checkout and return with a receipt.
- [ ] Stock is deducted exactly once, only after payment is confirmed.
- [ ] Cancelled/failed payments create no sale and change no stock.
- [ ] Webhook endpoint verifies the signature; poll endpoint finalizes without a tunnel.
- [ ] Cash / E-wallet / Credit Card / Debit Card path is unchanged.
- [ ] Feature tests 1–5 pass with `php artisan test`.
- [ ] `npm run build` and ESLint pass.

> After this sprint, continue to Testing & Evaluation, then Deployment & Documentation.
