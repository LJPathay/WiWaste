# WiWaste ERP - Master Implementation Plan (All Sprints 1-8)

## Project Overview
- **Target:** Philippine SMEs (Food-first, Pharmacy optional module)
- **Timeline:** 8 weeks MVP / 10-12 weeks production-ready
- **Architecture:** Multi-branch ready, capability-flagged modules, centralized DB
- **Compliance:** RA 10173 (DPA), RA 10611 (Food Safety), RA 7394 (Consumer Act), RA 10918 (Pharmacy Act - optional)

---

## Sprint Status Overview

| Sprint | Theme | Status | Completion |
|--------|-------|--------|------------|
| 1 | Legal/Compliance Foundation + Architecture | ✅ DONE | 100% |
| 2 | Database + Multi-branch + Business Tagging | ✅ DONE | 100% |
| 3 | Food Safety + Traceability + FEFO | 🔄 IN PROGRESS | ~30% |
| 4 | POS + Pricing + Returns + Reporting | ⏳ PENDING | 0% |
| 5 | Automation + Audit + Privacy Workflows | ⏳ PENDING | 0% |
| 6 | Accessibility + Security + Integration Prep | ⏳ PENDING | 0% |
| 7 | Testing + UAT + Documentation | ⏳ PENDING | 0% |
| 8 | Production Hardening | ⏳ PENDING | 0% |

---

## Sprint 1: Legal/Compliance Foundation + Architecture (Week 1) ✅ COMPLETE

### Backend - All Done
- [x] Compliance Matrix (`COMPLIANCE_MATRIX.md`)
- [x] DPA Data Inventory (`PRIVACY/data_inventory.csv`)
- [x] Business + Branch Models + Migrations
- [x] Privacy Processing Records model/migration/controller
- [x] Data Subject Requests model/migration/controller
- [x] Data Breach Incidents model/migration/controller
- [x] Privacy Notice Route (Frontend)
- [x] Terms of Service Route (Frontend)
- [x] Cookie/Privacy Notice Banner (Frontend)
- [x] Role/Permission System (RBAC: Owner, Inventory, Cashier, Pharmacist)
- [x] Audit Log Enhancement (business_id, branch_id)

### Frontend - All Done
- [x] Privacy Policy Page
- [x] Terms of Service Page
- [x] Privacy Consent Hook
- [x] Privacy Banner Component
- [x] Route Updates (/privacy, /terms, /cookies)

---

## Sprint 2: Database + Multi-branch + Business Tagging (Week 2) ✅ COMPLETE

### Migrations - All Done
- [x] `add_business_branch_to_users.php` (role enum: Owner/Inventory/Cashier/Pharmacist)
- [x] `add_classification_to_products.php` (product_classification, temp fields, storage, is_rx_only, ddb_schedule)
- [x] `add_compliance_to_suppliers.php` (FDA LTO/CPR number + expiry)
- [x] `add_business_branch_to_inventory.php`
- [x] `add_business_branch_to_fefo_batch.php` (received_date, temperature, supplier_batch_number)
- [x] `create_stock_receiving_table.php` (temperature, condition, sanitation checks)
- [x] `add_business_branch_to_purchase_orders.php`
- [x] `add_business_branch_to_sales.php` (customer PII, senior_pwd fields)
- [x] `add_business_branch_to_wastage.php` (batch_id)
- [x] `add_business_branch_to_stock_movements.php` (batch_id)
- [x] `add_business_branch_to_audit_log.php`
- [x] `add_business_owner_to_user_role.php`

### Model Updates - All Done
- [x] `User.php` - business_id, branch_id, role, relationships
- [x] `Product.php` - classification fields, scopes
- [x] `Supplier.php` - FDA fields
- [x] `Inventory.php` - business_id, branch_id
- [x] `FEFOBatch.php` - business_id, branch_id, temp fields, traceability methods
- [x] `PurchaseOrder.php` - business_id, branch_id
- [x] `SalesTransaction.php` - customer PII, senior_pwd fields
- [x] `WastageRecord.php` - business_id, branch_id, batch_id
- [x] `StockMovement.php` - business_id, branch_id, batch_id

### API Controller Updates - All Done
- [x] `ProductController` - classification fields, filtering
- [x] `SupplierController` - FDA fields
- [x] `InventoryController` - multi-branch filtering
- [x] `StockReceivingController` - temperature/condition/sanitation workflow
- [x] `SalesTransactionController` - senior/PWD discount auto-apply
- [x] `FEFOController` - multi-branch filtering, traceability

### Frontend API Types - All Done
- [x] `Frontend/src/services/api.ts` - all interfaces extended with business_id, branch_id, classification, compliance fields

---

## Sprint 3: Food Safety + Traceability + FEFO (Weeks 3-4) 🔄 IN PROGRESS

### ✅ Already Done
- [x] Product Classification (food, drug, cosmetic, device, general)
- [x] Batch Traceability (One-Up/One-Down) - `FEFOBatch::getUpstreamTrace()`, `getDownstreamTrace()`
- [x] Supplier Compliance Tracking (FDA LTO/CPR + expiry alerts)
- [x] Expiration Alerts (configurable thresholds 7/14/30 days)
- [x] Receiving Verification Workflow (temperature, condition, sanitation)
- [x] Storage Temperature Monitoring (vs product requirements)
- [x] Sanitation Checklist (daily/weekly/monthly with sign-off)
- [x] Recall/Quarantine Workflow (draft → active → quarantined → notified → resolved)
- [x] Vendor Returns Workflow
- [x] StockReceivingItem migration + model (created)

### 🔄 In Progress
- [ ] StockReceivingItem integration with StockReceiving model/controller
- [ ] StockReceivingController receive/verify with item-level validation
- [ ] FEFO Enforcement in Picking (SalesTransactionController, InventoryController)
- [ ] Temperature validation per item against product requirements
- [ ] StockMovement with batch_id on all operations
- [ ] Batch traceability enhancement

### ❌ To Do (Sprint 3)
| Task | Priority | Est. Time |
|------|----------|-----------|
| StockReceivingItem relationship to StockReceiving model | High | 30 min |
| StockReceivingController::store() accept items array | High | 1h |
| StockReceivingController::receive() process items with validation | High | 1.5h |
| StockReceivingController::verify() temperature validation per item | High | 1h |
| Add items to API responses (index/show) | High | 30 min |
| Run stock_receiving_items migration | High | 5 min |
| FEFO Enforcement in Picking (SalesTransactionController) | High | 2h |
| FEFO Enforcement in InventoryController::stockOut() | High | 1h |
| StockMovement with batch_id on all operations | High | 1h |
| Temperature validation per item vs product requirements | Medium | 1h |
| Batch traceability enhancement (getUpstreamTrace/DownstreamTrace) | Medium | 1h |
| Tests for StockReceiving + FEFOPicking | High | 2h |

---

## Sprint 4: POS + Pricing + Returns + Reporting (Weeks 4-5) ⏳ PENDING

### Backend Tasks
| Task | Files | Status |
|------|-------|--------|
| 4.1 POS Price Display Compliance (RA 7394) | `SalesTransactionController.php`, `Product.php` | ⏳ |
| 4.2 Senior/PWD Discount Auto-Apply (RA 9994/10754) | `SalesTransactionController.php` (store) | ⏳ |
| 4.3 Returns/Refunds Workflow (7-day cooling off RA 7394) | `ReturnTransactionController.php` | ⏳ |
| 4.4 Customer PII (Optional) | `SalesTransaction.php` | ⏳ |
| 4.5 BIR-Ready Receipt Format (pathway only) | `ReceiptFormatter.php` | ⏳ |
| 4.6 Sales Reporting (VAT, discount, senior/PWD log) | `ReportController.php` | ⏳ |
| 4.7 Purchase Order Receiving Integration | `PurchaseOrderController.php` (receive) | ⏳ |

### Frontend Tasks
| Task | Files | Status |
|------|-------|--------|
| 4.8 POS Terminal Pricing | `src/pages/cashier/POSTerminal.tsx` | ⏳ |
| 4.9 Returns/Refunds UI | `src/pages/cashier/ReturnsRefunds.tsx` | ⏳ |
| 4.10 Sales Reports | `src/pages/inventory/Reports.tsx` | ⏳ |
| 4.11 Receipt Preview | `src/components/pos/ReceiptPreview.tsx` | ⏳ |

---

## Sprint 5: Automation + Audit + Privacy Workflows (Weeks 5-6) ⏳ PENDING

### Backend Tasks
| Task | Files | Status |
|------|-------|--------|
| 5.1 Auto-Reorder Suggestions | `ReorderService.php`, `ReorderController.php`, `GenerateReorderSuggestions.php` | ⏳ |
| 5.2 Expiry-Aware Ordering | `ReorderService.php` | ⏳ |
| 5.3 Batch Consolidation for MOQ | `ReorderService.php` | ⏳ |
| 5.4 ML-Driven Replenishment Integration | `OptimizationController.php`, `ForecastController.php` | ⏳ |
| 5.5 Wastage Recording Enhancement | `WastageRecordController.php` | ⏳ |
| 5.6 Supplier Returns Workflow | `VendorReturnController.php` (enhance) | ⏳ |
| 5.7 Dual Audit System | `AuditService.php`, `PrivacyAuditService.php` | ⏳ |
| 5.8 Data Subject Request Handler | `PrivacyController.php` | ⏳ |
| 5.9 Data Retention Policies | `ApplyRetentionPolicies.php`, retention migrations | ⏳ |
| 5.10 Breach Response Workflow | `BreachResponseService.php`, `DataBreachIncident.php` | ⏳ |

### Frontend Tasks
| Task | Files | Status |
|------|-------|--------|
| 5.11 Reorder Suggestions Dashboard | `src/pages/inventory/ManageInventory.tsx` | ⏳ |
| 5.12 Privacy Request Management | `src/pages/admin/PrivacyRequests.tsx` | ⏳ |
| 5.13 Data Retention Config | `src/pages/admin/SystemSettings.tsx` | ⏳ |
| 5.14 Breach Incident Log | `src/pages/admin/BreachIncidents.tsx` | ⏳ |

---

## Sprint 6: Accessibility + Security + Integration Prep (Weeks 6-7) ⏳ PENDING

### Accessibility (WCAG 2.1 AA)
| Task | Files | Status |
|------|-------|--------|
| 6.1 Skip Links | `SkipLink.tsx`, `App.tsx` | ⏳ |
| 6.2 Landmark Regions | All layout components | ⏳ |
| 6.3 Focus Management | All UI components | ⏳ |
| 6.4 Color Contrast | `theme.css` | ⏳ |
| 6.5 Reduced Motion | `theme.css`, `useReducedMotion.ts` | ⏳ |
| 6.6 ARIA Live Regions | `Toast.tsx` | ⏳ |
| 6.7 Keyboard Navigation | All interactive components | ⏳ |
| 6.8 Form Labels | All forms | ⏳ |

### Security Hardening
| Task | Files | Status |
|------|-------|--------|
| 6.9 HTTPS Enforcement | `config/app.php`, nginx | ⏳ |
| 6.10 CSP Headers | `SecurityHeaders.php` | ⏳ |
| 6.11 Rate Limiting | `routes/api.php`, `Kernel.php` | ⏳ |
| 6.12 Secrets Management | `.env.example`, `services.php` | ⏳ |
| 6.13 Input Validation | All controllers | ⏳ |
| 6.14 Audit Log Integrity | `AuditLog.php` (hash chaining) | ⏳ |

### Integration Preparation
| Task | Files | Status |
|------|-------|--------|
| 6.14 BIR CAS Pathway | `BirIntegrationService.php` | ⏳ |
| 6.15 ML Service Contracts | `ml-service/app/main.py`, `Backend/app/Services/Ml/*` | ⏳ |
| 6.16 Webhook Framework | `WebhookController.php` | ⏳ |

---

## Sprint 7: Testing + UAT + Documentation (Weeks 7-8) ⏳ PENDING

### Test Categories
| Category | Test Cases | Tools |
|----------|------------|-------|
| Functional | CRUD all entities, role permissions, workflows | Pest/PHPUnit, Vitest |
| Privacy/Security | Consent flows, data export/deletion, breach simulation | Pest, custom scripts |
| Permission Testing | Capability flags enforce module access | Pest |
| Traceability | One-up/one-down batch trace < 30 seconds | Pest, integration |
| Expiration/FEFO | Alerts fire correctly, picking enforces FEFO | Pest |
| POS | Senior/PWD discount, RX verification, payment methods | Vitest + Cypress |
| Compliance | From Compliance Matrix (TC-001 through TC-013+) | Pest + manual UAT |
| Accessibility | axe-core, keyboard-only navigation | Cypress + axe, manual |

### UAT Scenarios
| Role | Key Scenarios |
|------|---------------|
| Owner | Dashboard review, user mgmt, settings, reports, privacy requests, breach log |
| Inventory | Receiving with verification, FEFO picking, wastage recording, sanitation checklist, recall |
| Cashier | POS sale with senior/PWD, returns with 7-day policy, void/refund, shift open/close |
| Pharmacist (if enabled) | RX verification, pharmacist on duty, controlled substance log |

### Documentation Deliverables
| Document | Description |
|----------|-------------|
| Compliance Matrix | Final version with all test results (thesis artifact) |
| User Manual | Role-based: Owner, Inventory, Cashier, Pharmacist |
| Admin Manual | Backup, purge, user mgmt, FDA license renewal, capability config |
| Incident Response Plan | Data breach, system outage, product recall procedures |
| Recall Procedure | Step-by-step with templates |
| Backup/Restore Testing | Documented RPO/RTO, quarterly drill results |
| Security Configuration | HTTPS, CSP, rate limiting, secrets management |
| Deployment Checklist | Production deployment steps, monitoring, alerting |

---

## Sprint 8: Production Hardening (Weeks 9-10+) ⏳ PENDING

| Task | Description | Status |
|------|-------------|--------|
| Load Testing | k6/JMeter: 100 concurrent POS users, 1000 products | ⏳ |
| Penetration Testing | OWASP Top 10 assessment | ⏳ |
| Disaster Recovery | Full backup/restore drill, RPO/RTO validation | ⏳ |
| Monitoring/Alerting | Prometheus/Grafana: API latency, error rates, queue depth | ⏳ |
| Log Aggregation | Loki/ELK: structured JSON logs, correlation IDs | ⏳ |
| Performance Optimization | Query optimization, Redis caching, queue workers | ⏳ |
| Multi-region Deployment | If scaling beyond single branch | ⏳ |

---

## Current Sprint 3 Action Items (Next Steps)

### Immediate (This Week)
1. [ ] Add `items()` relationship to `StockReceiving` model
2. [ ] Update `StockReceivingController::store()` to accept `items` array
3. [ ] Update `StockReceivingController::receive()` to process items with temperature/condition per item
4. [ ] Update `StockReceivingController::verify()` to validate temperature against product requirements
5. [ ] Add items to API responses in `index()` and `show()`
6. [ ] Run `stock_receiving_items` migration
7. [ ] Implement FEFO enforcement in `SalesTransactionController::store()`
8. [ ] Implement FEFO enforcement in `InventoryController::stockOut()`
9. [ ] Add `batch_id` to all `StockMovement` creations
10. [ ] Run tests: `php artisan test --filter=StockReceiving` and `--filter=FEFOPicking`

### Validation Commands
```bash
# Run migration
cd Backend && php artisan migrate

# Check syntax
php -l app/Models/StockReceivingItem.php
php -l app/Http/Controllers/Api/StockReceivingController.php
php -l app/Http/Controllers/Api/SalesTransactionController.php

# Run tests
php artisan test --filter=StockReceiving
php artisan test --filter=FEFOPicking
php artisan test --filter=InventorySync
```

---

## Key Files Reference

### Models to Modify (Sprint 3)
- `app/Models/StockReceiving.php` - add `items()` relationship
- `app/Http/Controllers/Api/StockReceivingController.php` - major updates to store/receive/verify
- `app/Http/Controllers/Api/SalesTransactionController.php` - FEFO enforcement in `store()`
- `app/Http/Controllers/Api/InventoryController.php` - FEFO enforcement in `stockOut()`
- `app/Models/StockMovement.php` - ensure batch_id on all creations

### New Files Created (Sprint 3)
- `database/migrations/2026_09_16_081109_create_stock_receiving_items_table.php` ✅
- `app/Models/StockReceivingItem.php` ✅

### Tests to Create
- `tests/Feature/StockReceivingTest.php`
- `tests/Feature/FEFOPickingTest.php`