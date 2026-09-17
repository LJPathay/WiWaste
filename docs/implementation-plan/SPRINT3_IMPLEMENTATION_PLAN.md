# Sprint 3 Implementation Plan: Food Safety + Traceability + FEFO

## Current Status (as of 2026-09-16)

### Already Implemented ✅
- Business/Branch architecture with multi-branch support
- Privacy module (processing records, data subject requests, breach incidents)
- Product classification fields (food, drug, cosmetic, device, general)
- FDA LTO/CPR fields on Supplier
- FEFO Batch tracking with expiry_date, batch_number, supplier_batch_number
- Stock Receiving workflow (pending → received → verified → rejected)
- Expiration alerts (7/14/30 days) for batches and supplier licenses
- Sanitation checklist (daily/weekly/monthly with digital sign-off)
- Recall/Quarantine workflow (draft → active → quarantined → notified → resolved)
- Vendor Returns workflow

### In Progress 🔄
- StockReceivingItem model and migration (created)

### Missing / To Implement ❌

---

## Sprint 3 Remaining Tasks

### 1. StockReceivingItem Integration (High Priority)
**Files to create/modify:**
- `database/migrations/2026_09_16_081109_create_stock_receiving_items_table.php` ✅ (created)
- `app/Models/StockReceivingItem.php` ✅ (created)

**To do:**
- [ ] Add `items` relationship to `StockReceiving` model
- [ ] Update `StockReceivingController::store()` to accept `items` array
- [ ] Update `StockReceivingController::receive()` to process items with temperature/condition per item
- [ ] Update `StockReceivingController::verify()` to validate temperature against product requirements per item
- [ ] Add items to API response in `index()` and `show()`
- [ ] Run migration

### 2. FEFO Enforcement in Picking (High Priority)
**Files to modify:**
- `app/Http/Controllers/Api/SalesTransactionController.php`
- `app/Http/Controllers/Api/InventoryController.php`

**To do:**
- [ ] Add `getFEFOPickingBatch()` method to select earliest-expiry batch for sale
- [ ] Update `SalesTransactionController::store()` to use FEFO batch deduction
- [ ] Update `InventoryController::stockOut()` to use FEFO batch deduction
- [ ] Add override capability with justification (for damaged/near-expiry batches)
- [ ] Create `StockMovement` records with `batch_id`

### 3. Temperature Validation in Receiving (Medium Priority)
**Files to modify:**
- `app/Http/Controllers/Api/StockReceivingController.php`
- `app/Models/StockReceivingItem.php`

**To do:**
- [ ] Add temperature field to receiving items
- [ ] Validate temperature against `Product::required_temp_min/max` per item
- [ ] Generate warnings/errors when temperature out of range
- [ ] Store temperature warnings in notes

### 3.1 Temperature validation per item
- [ ] Each receiving item has its own `temperature_at_receipt`
- [ ] Validate against product's `required_temp_min` / `required_temp_max`
- [ ] If out of range: auto-set `condition_check_passed = false`, add warning to notes

### 3.2 Batch creation from receiving
- [ ] When receiving item confirmed → create FEFOBatch record
- [ ] Link batch to receiving item
- [ ] Set `supplier_batch_number` from receiving item

### 4. Batch Traceability Enhancement (Medium Priority)
**Files to modify:**
- `app/Models/FEFOBatch.php`
- `app/Http/Controllers/Api/FEFOController.php`

**To do:**
- [ ] Enhance `getUpstreamTrace()` to include receiving details
- [ ] Enhance `getDownstreamTrace()` to include sales/wastage per batch
- [ ] Add `/api/fefo/batches/{id}/trace` endpoint returning full trace

### 5. Stock Movement with Batch ID (High Priority)
**Files to modify:**
- `app/Http/Controllers/Api/InventoryController.php` (stockIn, stockOut)
- `app/Http/Controllers/Api/SalesTransactionController.php`
- `app/Models/StockMovement.php`

**To do:**
- [ ] Ensure all stock movements include `batch_id` when applicable
- [ ] FEFO deduction creates StockMovement with correct batch_id
- [ ] Stock-in from receiving creates FEFOBatch and StockMovement

### 6. Tests (High Priority)
**Files to create/modify:**
- `tests/Feature/StockReceivingTest.php`
- `tests/Feature/FEFOPickingTest.php`

**To do:**
- [ ] Test receiving with items (temperature validation)
- [ ] Test FEFO picking selects correct batch
- [ ] Test batch traceability (upstream/downstream)
- [ ] Test recall quarantine

---

## Implementation Order

| Order | Task | Dependencies | Est. Time |
|-------|------|--------------|-----------|
| 1 | StockReceivingItem integration | Migration + Model | 2h |
| 2 | StockReceivingController receive/verify | Item integration | 2h |
| 3 | FEFO enforcement in picking | SalesTransactionController | 2h |
| 4 | StockMovement with batch_id | FEFO enforcement | 1h |
| 5 | Temperature validation per item | StockReceivingItem | 1h |
| 6 | Batch traceability | FEFOBatch methods | 1h |
| 7 | Tests | All above | 2h |

**Total: ~12 hours**

---

## Database Changes Summary

### New Migration: `stock_receiving_items`
- `receiving_item_id` (PK)
- `receiving_id` (FK → stock_receiving)
- `product_id` (FK → Product)
- `batch_id` (FK → FEFO_Batch, nullable)
- `po_item_id` (FK → Purchase_Order_Item, nullable)
- `expected_quantity`, `received_quantity`, `rejected_quantity`
- `unit_cost`, `temperature_at_receipt`
- `condition_check_passed`, `sanitation_check_passed`
- `status` (pending/received/partial/rejected)
- `notes`, timestamps

### Existing Tables (already have batch_id)
- `stock_movements` ✅
- `wastage_records` ✅
- `vendor_return_items` ✅
- `sales_items` ❌ (needs batch_id - add in separate migration if needed)

---

## Frontend Updates (Later Sprint)
- `src/pages/inventory/StockReceiving.tsx` - Add items table with temperature fields
- `src/pages/inventory/FEFOTracking.tsx` - Enhance trace view
- `src/pages/cashier/POSTerminal.tsx` - Show batch being sold (optional)

---

## Validation Commands

```bash
# Run migration
php artisan migrate

# Run tests
php artisan test --filter=StockReceiving
php artisan test --filter=FEFOPicking

# Check syntax
php -l app/Models/StockReceivingItem.php
php -l app/Http/Controllers/Api/StockReceivingController.php
php -l app/Http/Controllers/Api/SalesTransactionController.php
```