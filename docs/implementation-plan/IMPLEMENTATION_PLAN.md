# WiWaste Implementation Plan

**Target:** Philippine SMEs (Food-first, Pharmacy optional module)  
**Timeline:** 8 weeks MVP / 10-12 weeks production-ready  
**Architecture:** Multi-branch ready, capability-flagged modules, centralized DB  
**Compliance:** RA 10173 (DPA), RA 10611 (Food Safety), RA 7394 (Consumer Act), RA 10918 (Pharmacy Act - optional)

---

## Project Decisions (Locked)

| # | Decision | Outcome |
|---|----------|---------|
| 1 | FDA LTO/CPR | Number + expiry fields first; document attachment later |
| 2 | Controlled Substances | **Out of scope** for MVP |
| 3 | BIR | Design for integration pathway; don't claim compliance |
| 4 | Customer PII | Minimal, optional, purpose-based lawful bases |
| 5 | Multi-branch | **Design now** - `business_id` + `branch_id` on all relevant tables |
| 6 | Timeline | 8 weeks MVP, 10-12 weeks production |
| 7 | Testing | Automated + manual UAT for compliance workflows |

---

## MVP Scope

### Core
- POS, Inventory, Purchasing, Suppliers, Product Management
- Batch/Lot tracking, Expiration tracking, FEFO
- Audit trails, User roles (Owner, Inventory, Cashier)
- Multi-branch-ready architecture

### Food Compliance Module
- Food product classification (`food`, `drug`, `cosmetic`, `device`, `general`)
- Batch traceability (one-up/one-down)
- Supplier information (FDA LTO/CPR number + expiry)
- Expiration alerts (configurable thresholds)
- Receiving records (condition, temperature vs product requirement)
- Storage/temperature records where applicable
- Sanitation checklist (digital sign-off)
- Recall/quarantine workflow

### Privacy Module
- Privacy notice (`/privacy`)
- Purpose-based data collection
- Role-based access control
- Data subject request workflow (access/export/delete)
- Data retention configuration
- Audit logging (system + privacy processing records)
- Incident/breach response workflow

### Pharmacy Module (Optional - capability-flagged)
- Prescription handling (RX-only flag, prescription upload/verification)
- Pharmacist on duty (shift validation)
- Drug Price Reference (DOH ceiling)
- Controlled substances (DDB scheduling) - **deferred**

---

## Database Architecture

### New Tables

```sql
-- Business entity (single business, multi-branch)
businesses
----------
id
name
business_type ENUM('food_retail', 'minimart', 'restaurant', 'pharmacy', 'hybrid')
capabilities JSONB DEFAULT '{"food_safety": true, "pharmacy_rx": false, "controlled_substances": false, "prescription_handling": false}'
dpo_name
dpo_email
dpo_phone
created_at
updated_at

-- Branches
branches
--------
id
business_id
name
address
status ENUM('active', 'inactive')
created_at
updated_at

-- Privacy processing records (DPA Art. 30 equivalent - accountability)
privacy_processing_records
--------------------------
id
business_id
data_category VARCHAR(100)          -- 'customer_pii', 'employee_data', 'supplier_data'
purpose VARCHAR(255)                -- 'order_fulfillment', 'marketing', 'compliance'
legal_basis VARCHAR(100)            -- 'contract', 'legitimate_interest', 'consent', 'legal_obligation'
retention_period VARCHAR(100)       -- '7_years', '3_years_after_termination'
recipients JSONB                    -- ['payment_gateway', 'delivery_service']
safeguards TEXT                     -- 'encryption_at_rest', 'access_control'
status ENUM('active', 'archived')
created_at
updated_at

-- Data subject requests
data_subject_requests
---------------------
id
business_id
request_type ENUM('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection')
subject_identifier VARCHAR(255)     -- email or user_id
status ENUM('pending', 'in_progress', 'completed', 'rejected')
requested_at
completed_at
notes TEXT

-- Data breach incidents
data_breach_incidents
---------------------
id
business_id
detected_at
description TEXT
personal_data_affected TEXT
risk_assessment ENUM('low', 'medium', 'high', 'critical')
npc_notification_required BOOLEAN
npc_notified_at
subjects_notified_at
status ENUM('open', 'investigating', 'contained', 'resolved')
resolved_at
```

### Modified Tables (Add `business_id`, `branch_id`)

| Table | New Columns |
|-------|-------------|
| `User` | `business_id`, `branch_id`, `role` (Owner/Inventory/Cashier/Pharmacist) |
| `Product` | `business_id`, `product_classification` ENUM('food','drug','cosmetic','device','general'), `required_temp_min`, `required_temp_max`, `storage_requirement` ENUM('refrigerated','frozen','controlled_room','ambient','custom'), `is_rx_only`, `ddb_schedule` |
| `Supplier` | `business_id`, `fda_lto_number`, `fda_lto_expiry`, `fda_cpr_number`, `fda_cpr_expiry` |
| `Inventory` | `business_id`, `branch_id` |
| `FEFO_Batch` | `business_id`, `branch_id`, `received_date`, `received_temperature`, `supplier_batch_number` |
| `Stock_Receiving` (new table - replace PO-based) | `business_id`, `branch_id`, `supplier_id`, `received_by`, `received_at`, `temperature_at_receipt`, `condition_check_passed`, `sanitation_check_passed` |
| `Purchase_Order` | `business_id`, `branch_id` |
| `Sales_Transaction` | `business_id`, `branch_id`, `customer_name`, `customer_phone`, `customer_email`, `senior_pwd_id`, `senior_pwd_type` |
| `Wastage_Record` | `business_id`, `branch_id`, `batch_id` |
| `Audit_Log` | `business_id`, `branch_id` |
| `Stock_Movement` | `business_id`, `branch_id`, `batch_id` |

---

## Sprint Breakdown

### Sprint 1: Legal/Compliance Foundation + Architecture (Week 1)

**Goal:** Establish compliance framework, privacy architecture, and multi-branch foundation

#### Backend Tasks

| Task | Files to Create/Modify | Description |
|------|------------------------|-------------|
| **1.1 Compliance Matrix** | `COMPLIANCE_MATRIX.md` | Living document: Regulation → Requirement → System Feature → Applicability → Status → Test Case |
| **1.2 DPA Data Inventory** | `PRIVACY/data_inventory.csv` | Map all personal data flows: what, purpose, legal basis, retention, recipients, safeguards |
| **1.3 Business + Branch Models + Migrations** | `database/migrations/xxxx_create_businesses_table.php`<br>`database/migrations/xxxx_create_branches_table.php`<br>`app/Models/Business.php`<br>`app/Models/Branch.php` | Core multi-branch architecture |
| **1.4 Privacy Processing Records** | `database/migrations/xxxx_create_privacy_processing_records_table.php`<br>`app/Models/PrivacyProcessingRecord.php` | DPA accountability documentation |
| **1.5 Data Subject Requests** | `database/migrations/xxxx_create_data_subject_requests_table.php`<br>`app/Models/DataSubjectRequest.php`<br>`app/Http/Controllers/Api/PrivacyController.php` | Access/export/delete endpoints |
| **1.6 Data Breach Incidents** | `database/migrations/xxxx_create_data_breach_incidents_table.php`<br>`app/Models/DataBreachIncident.php` | Incident detection → assessment → escalation → notification workflow |
| **1.7 Privacy Notice Route (Frontend)** | `Frontend/src/pages/PrivacyPolicy.tsx`<br>`Frontend/src/routes.tsx` (add route) | `/privacy` with NPC-compliant content |
| **1.8 Terms of Service Route (Frontend)** | `Frontend/src/pages/TermsOfService.tsx`<br>`Frontend/src/routes.tsx` | `/terms` with consumer rights, governing law (PH) |
| **1.9 Cookie/Privacy Notice Banner** | `Frontend/src/components/ui/PrivacyBanner.tsx`<br>`Frontend/src/hooks/usePrivacyConsent.ts` | Purpose-based consent, not generic GDPR banner |
| **1.10 Role/Permission System** | `app/Models/User.php` (add `business_id`, `branch_id`)<br>`app/Policies/*` (update for multi-branch)<br>`config/permission.php` (if using spatie) | RBAC: Owner, Inventory, Cashier, Pharmacist (capability-flagged) |
| **1.11 Audit Log Enhancement** | `database/migrations/xxxx_add_business_branch_to_audit_log.php`<br>`app/Models/AuditLog.php` | Add `business_id`, `branch_id` to system audit trail |

#### Frontend Tasks

| Task | Files | Description |
|------|-------|-------------|
| **1.12 Privacy Policy Page** | `src/pages/PrivacyPolicy.tsx` | Controller identity, purposes, legal bases, retention, rights, DPO contact |
| **1.13 Terms of Service Page** | `src/pages/TermsOfService.tsx` | Consumer rights, liability, governing law (PH) |
| **1.14 Privacy Consent Hook** | `src/hooks/usePrivacyConsent.ts` | Granular consent per purpose (analytics, marketing, necessary) |
| **1.15 Privacy Banner Component** | `src/components/ui/PrivacyBanner.tsx` | Purpose-based, dismissible, links to policy |
| **1.16 Route Updates** | `src/routes.tsx` | Add `/privacy`, `/terms`, `/cookies` routes with `MainLayout` |

---

### Sprint 2: Database + Multi-branch + Business Tagging (Week 2)

**Goal:** Extend all core models with multi-branch support, product classification, supplier compliance fields

#### Backend Migrations

| Migration | Table | New Columns |
|-----------|-------|-------------|
| `xxxx_add_business_branch_to_users.php` | `User` | `business_id`, `branch_id`, `role` ENUM('Owner','Inventory','Cashier','Pharmacist') |
| `xxxx_add_classification_to_products.php` | `Product` | `business_id`, `product_classification` ENUM('food','drug','cosmetic','device','general'), `required_temp_min`, `required_temp_max`, `storage_requirement` ENUM('refrigerated','frozen','controlled_room','ambient','custom'), `is_rx_only`, `ddb_schedule` |
| `xxxx_add_compliance_to_suppliers.php` | `Supplier` | `business_id`, `fda_lto_number`, `fda_lto_expiry`, `fda_cpr_number`, `fda_cpr_expiry` |
| `xxxx_add_business_branch_to_inventory.php` | `Inventory` | `business_id`, `branch_id` |
| `xxxx_add_business_branch_to_fefo_batch.php` | `FEFO_Batch` | `business_id`, `branch_id`, `received_date`, `received_temperature`, `supplier_batch_number` |
| `xxxx_create_stock_receiving_table.php` | `Stock_Receiving` (NEW) | `business_id`, `branch_id`, `supplier_id`, `received_by`, `received_at`, `temperature_at_receipt`, `condition_check_passed`, `sanitation_check_passed`, `status` |
| `xxxx_add_business_branch_to_purchase_orders.php` | `Purchase_Order` | `business_id`, `branch_id` |
| `xxxx_add_business_branch_to_sales.php` | `Sales_Transaction` | `business_id`, `branch_id`, `customer_name`, `customer_phone`, `customer_email`, `senior_pwd_id`, `senior_pwd_type` |
| `xxxx_add_business_branch_to_wastage.php` | `Wastage_Record` | `business_id`, `branch_id`, `batch_id` |
| `xxxx_add_business_branch_to_stock_movements.php` | `Stock_Movement` | `business_id`, `branch_id`, `batch_id` |

#### Model Updates

| Model | Changes |
|-------|---------|
| `User.php` | Add `business_id`, `branch_id`, `role`, relationships to Business/Branch |
| `Product.php` | Add classification fields, `business()` relationship, scopes for classification |
| `Supplier.php` | Add FDA fields, `business()` relationship |
| `Inventory.php` | Add `business_id`, `branch_id`, relationships |
| `FEFOBatch.php` | Add `business_id`, `branch_id`, temperature fields |
| `PurchaseOrder.php` | Add `business_id`, `branch_id` |
| `SalesTransaction.php` | Add customer PII fields, `business_id`, `branch_id` |
| `WastageRecord.php` | Add `business_id`, `branch_id`, `batch_id` |
| `StockMovement.php` | Add `business_id`, `branch_id`, `batch_id` |

#### API Controller Updates

| Controller | Changes |
|------------|---------|
| `ProductController` | Filter by `business_id` + `branch_id`, support classification fields |
| `SupplierController` | Filter by `business_id`, support FDA fields |
| `InventoryController` | Filter by `business_id` + `branch_id` |
| `StockReceivingController` | New receiving workflow with temperature/condition/sanitation |
| `SalesTransactionController` | Customer PII fields, Senior/PWD discount auto-apply |
| `FEFOController` | Filter by `business_id` + `branch_id` |

#### Frontend API Types

| File | Updates |
|------|---------|
| `Frontend/src/services/api.ts` | Add `business_id`, `branch_id` to all interfaces; add `product_classification`, `required_temp_min/max`, `storage_requirement`, `is_rx_only`, `fda_lto_number`, `fda_cpr_number`; new `ApiStockReceiving`, `ApiBusiness`, `ApiBranch` interfaces |

---

### Sprint 3: Food Safety + Traceability + FEFO (Weeks 3-4)

**Goal:** Complete food compliance module with traceability, FEFO enforcement, receiving verification, recall workflow

#### Backend Tasks

| Task | Files | Description |
|------|-------|-------------|
| **3.1 Product Classification** | `ProductController.php`, `Product.php` | Enum: `food`, `drug`, `cosmetic`, `device`, `general`; filter/scopes |
| **3.2 Batch Traceability (One-Up/One-Down)** | `FEFOBatch.php`, `StockMovement.php`, `FEFOController.php` | `supplier_batch_number` → internal batch → customer transaction; trace endpoint |
| **3.3 Supplier Compliance Tracking** | `SupplierController.php`, `Supplier.php` | FDA LTO/CPR number + expiry; alerts 30/14/7 days before expiry |
| **3.4 Expiration Alerts** | `AlertController.php`, `NotificationController.php` | Configurable thresholds (30/14/7/3 days); role-based notifications |
| **3.5 Receiving Verification Workflow** | `StockReceivingController.php` (enhance receive)<br>`database/migrations/xxxx_add_receiving_verification_fields.php` | Two-person sign-off (receiver + verifier), temperature vs product requirement, condition check, sanitation checklist |
| **3.6 Storage Temperature Monitoring** | `StockReceivingController.php` (receive)<br>`FEFOBatch.php` | Compare actual `received_temperature` vs product `required_temp_min/max`; flag deviations |
| **3.7 Sanitation Checklist** | `database/migrations/xxxx_create_sanitation_checklists_table.php`<br>`app/Models/SanitationChecklist.php`<br>`app/Http/Controllers/Api/SanitationController.php` | Daily/weekly digital checklists with photo evidence, sign-off |
| **3.8 Recall/Quarantine Workflow** | `database/migrations/xxxx_create_recalls_table.php`<br>`app/Models/Recall.php`<br>`app/Http/Controllers/Api/RecallController.php` | Identify affected batches → locate inventory → quarantine → notify → resolve |
| **3.9 FEFO Enforcement in Picking** | `SalesTransactionController.php` (store)<br>`InventoryController.php` (stockOut) | Auto-select earliest-expiry batch for sale; override with justification |

#### Frontend Tasks

| Task | Files | Description |
|------|-------|-------------|
| **3.10 Product Classification UI** | `src/pages/inventory/ManageProducts.tsx` | Classification badge, filter, conditional FDA fields |
| **3.11 Batch Traceability View** | `src/pages/inventory/FEFOTracking.tsx` (enhance) | One-up/one-down trace visualization |
| **3.12 Receiving with Verification** | `src/pages/inventory/StockReceiving.tsx` (enhance) | Temperature input, condition checkbox, sanitation checklist, dual sign-off |
| **3.13 Expiration Alerts Dashboard** | `src/pages/dashboard/InventoryDashboard.tsx` | Configurable thresholds, role-based notification preferences |
| **3.14 Recall Management** | `src/pages/inventory/RecallManagement.tsx` (NEW) | Create recall, trace affected inventory, quarantine status, resolution |
| **3.15 Sanitation Checklist** | `src/pages/inventory/SanitationChecklist.tsx` (NEW) | Daily/weekly forms, photo upload, digital signature |

---

### Sprint 4: POS + Pricing + Returns + Reporting (Weeks 4-5)

**Goal:** Complete retail operations with compliant pricing, returns, senior/PWD discounts, reporting

#### Backend Tasks

| Task | Files | Description |
|------|-------|-------------|
| **4.1 POS Price Display Compliance** | `SalesTransactionController.php`, `Product.php` | Price/unit, VAT breakdown, total; RA 7394 Art. 81 |
| **4.2 Senior/PWD Discount Auto-Apply** | `SalesTransactionController.php` (store) | 20% discount + VAT exemption (RA 9994/10754); validate ID |
| **4.3 Returns/Refunds Workflow** | `ReturnTransactionController.php` (enhance) | 7-day cooling off (RA 7394), defective goods, evidence capture, approval flow |
| **4.4 Customer PII (Optional)** | `SalesTransaction.php` (model) | `customer_name`, `customer_phone`, `customer_email` - optional, purpose-limited |
| **4.5 BIR-Ready Receipt Format** | `SalesTransactionController.php` (show)<br>`app/Services/ReceiptFormatter.php` | ATP, TIN, serial, VAT breakdown, business info - **integration pathway only** |
| **4.6 Sales Reporting** | `ReportController.php` (enhance) | Daily/periodic sales, VAT summary, discount summary |
| **4.7 Purchase Order Receiving Integration** | `PurchaseOrderController.php` (receive) | Link to `Stock_Receiving` for batch/temperature tracking |

#### Frontend Tasks

| Task | Files | Description |
|------|-------|-------------|
| **4.8 POS Terminal Pricing** | `src/pages/cashier/POSTerminal.tsx` | Show price/unit, VAT, total; senior/PWD ID input |
| **4.9 Returns/Refunds UI** | `src/pages/cashier/ReturnsRefunds.tsx` (enhance) | 7-day policy notice, reason codes, evidence upload, approval status |
| **4.10 Sales Reports** | `src/pages/inventory/Reports.tsx` (enhance) | VAT summary, discount report, senior/PWD transaction log |
| **4.11 Receipt Preview** | `src/components/pos/ReceiptPreview.tsx` | BIR-style format preview (not claiming compliance) |

---

### Sprint 5: Automation + Audit + Privacy Workflows (Weeks 5-6)

**Goal:** Smart operations automation, dual audit system, privacy request handling

#### Backend Tasks

| Task | Files | Description |
|------|-------|-------------|
| **5.1 Auto-Reorder Suggestions** | `app/Services/ReorderService.php`<br>`app/Http/Controllers/Api/ReorderController.php`<br>`app/Console/Commands/GenerateReorderSuggestions.php` | When stock ≤ reorder_level → PO draft with supplier lead time; scheduled command |
| **5.2 Expiry-Aware Ordering** | `ReorderService.php` | Reduce order qty if existing stock <30 days expiry (FEFO-aware) |
| **5.3 Batch Consolidation for MOQ** | `ReorderService.php` | Group same-supplier items to meet minimum order quantities |
| **5.4 ML-Driven Replenishment Integration** | `OptimizationController.php`, `ForecastController.php` | ARIMA forecast → GA optimization (existing ml-service) |
| **5.5 Wastage Recording Enhancement** | `WastageRecordController.php` | Witness required for high-value (>₱1000), batch linkage, type classification |
| **5.6 Supplier Returns Workflow** | `VendorReturnController.php` (enhance)<br>`database/migrations/xxxx_create_vendor_returns_table.php` | Return-to-supplier with credit tracking, reason codes |
| **5.7 Dual Audit System** | `app/Services/AuditService.php`<br>`app/Services/PrivacyAuditService.php` | System audit trail (operational) + Privacy processing records (DPA accountability) |
| **5.8 Data Subject Request Handler** | `PrivacyController.php` (enhance) | Access → export JSON; Erasure → anonymize; Portability → structured export |
| **5.9 Data Retention Policies** | `app/Console/Commands/ApplyRetentionPolicies.php`<br>`database/migrations/xxxx_add_retention_to_tables.php` | Configurable retention per entity type; scheduled purge with audit log |
| **5.10 Breach Response Workflow** | `app/Services/BreachResponseService.php`<br>`DataBreachIncident.php` (model) | Detect → Assess → DPO Review → NPC Notify (if required) → Subject Notify → Document → Resolve |

#### Frontend Tasks

| Task | Files | Description |
|------|-------|-------------|
| **5.11 Reorder Suggestions Dashboard** | `src/pages/inventory/ManageInventory.tsx` (enhance) | Auto-generated PO drafts, expiry-aware adjustments |
| **5.12 Privacy Request Management** | `src/pages/admin/PrivacyRequests.tsx` (NEW) | View/process access/erasure/portability requests |
| **5.13 Data Retention Config** | `src/pages/admin/SystemSettings.tsx` (enhance) | Per-entity retention periods, scheduled purge preview |
| **5.14 Breach Incident Log** | `src/pages/admin/BreachIncidents.tsx` (NEW) | Incident timeline, risk assessment, notification tracking |

---

### Sprint 6: Accessibility + Security + Integration Prep (Weeks 6-7)

**Goal:** WCAG 2.1 AA, security hardening, BIR/ML integration pathways

#### Accessibility (WCAG 2.1 AA)

| Task | Files | Description |
|------|-------|-------------|
| **6.1 Skip Links** | `Frontend/src/components/layout/SkipLink.tsx`<br>`Frontend/src/App.tsx` | "Skip to main content" on all pages |
| **6.2 Landmark Regions** | All layout components | `<main>`, `<nav>`, `<aside>`, `<header>`, `<footer>` with proper roles |
| **6.3 Focus Management** | `Frontend/src/components/ui/*` | Visible focus rings, logical tab order, focus trapping in modals |
| **6.4 Color Contrast** | `Frontend/src/styles/theme.css` | Audit all color combinations ≥ 4.5:1 (text) / 3:1 (UI) |
| **6.5 Reduced Motion** | `Frontend/src/styles/theme.css`<br>`Frontend/src/hooks/useReducedMotion.ts` | Respect `prefers-reduced-motion` |
| **6.6 ARIA Live Regions** | `Frontend/src/components/ui/Toast.tsx` | `role="status"` / `role="alert"` for dynamic content |
| **6.7 Keyboard Navigation** | All interactive components | Arrow keys in tables, Escape to close, Enter/Space to activate |
| **6.8 Form Labels** | All forms | Explicit `<label htmlFor>`, `aria-describedby` for errors |

#### Security Hardening

| Task | Files | Description |
|------|-------|-------------|
| **6.9 HTTPS Enforcement** | `Backend/config/app.php`, nginx config | `APP_URL=https://`, HSTS, secure cookies |
| **6.10 CSP Headers** | `Backend/app/Http/Middleware/SecurityHeaders.php` | Restrict scripts, styles, fonts, frames |
| **6.11 Rate Limiting** | `Backend/routes/api.php`<br>`Backend/app/Http/Kernel.php` | Per-IP + per-user limits on auth, write endpoints |
| **6.12 Secrets Management** | `.env.example`, `Backend/config/services.php` | No secrets in code; use env vars for API keys |
| **6.13 Input Validation** | All controllers | Strict validation rules, sanitization, SQL injection prevention |
| **6.14 Audit Log Integrity** | `AuditLog.php` | Hash chaining (optional: append-only table) |

#### Integration Preparation

| Task | Files | Description |
|------|-------|-------------|
| **6.14 BIR CAS Pathway** | `app/Services/BirIntegrationService.php` | Interface for fiscal printer / CAS integration; document requirements |
| **6.15 ML Service Contracts** | `ml-service/app/main.py` (review)<br>`Backend/app/Services/Ml/*` | Ensure API contracts stable; add health checks |
| **6.16 Webhook Framework** | `app/Http/Controllers/Api/WebhookController.php` | For future: payment gateway, delivery, BIR |

---

### Sprint 7: Testing + UAT + Documentation (Weeks 7-8)

**Goal:** Validate all compliance workflows, user acceptance, produce documentation

#### Test Categories

| Category | Test Cases | Tools |
|----------|------------|-------|
| **Functional** | CRUD all entities, role permissions, workflows | Pest/PHPUnit, Vitest |
| **Privacy/Security** | Consent flows, data export/deletion, breach simulation, access control | Pest, custom scripts |
| **Permission Testing** | Capability flags enforce module access | Pest |
| **Traceability** | One-up/one-down batch trace < 30 seconds | Pest, integration tests |
| **Expiration/FEFO** | Alerts fire correctly, picking enforces FEFO | Pest |
| **POS** | Senior/PWD discount, RX verification, payment methods | Vitest + Cypress |
| **Compliance** | From Compliance Matrix (TC-001 through TC-013+) | Pest + manual UAT scripts |
| **Accessibility** | axe-core, keyboard-only navigation | Cypress + axe, manual |

#### UAT Scenarios

| Role | Key Scenarios |
|------|---------------|
| **Owner** | Dashboard review, user mgmt, settings, reports, privacy requests, breach log |
| **Inventory** | Receiving with verification, FEFO picking, wastage recording, sanitation checklist, recall |
| **Cashier** | POS sale with senior/PWD, returns with 7-day policy, void/refund, shift open/close |
| **Pharmacist** (if enabled) | RX verification, pharmacist on duty, controlled substance log |

#### Documentation Deliverables

| Document | Description |
|----------|-------------|
| **Compliance Matrix** | Final version with all test results (thesis artifact) |
| **User Manual** | Role-based: Owner, Inventory, Cashier, Pharmacist |
| **Admin Manual** | Backup, purge, user mgmt, FDA license renewal, capability config |
| **Incident Response Plan** | Data breach, system outage, product recall procedures |
| **Recall Procedure** | Step-by-step with templates |
| **Backup/Restore Testing** | Documented RPO/RTO, quarterly drill results |
| **Security Configuration** | HTTPS, CSP, rate limiting, secrets management |
| **Deployment Checklist** | Production deployment steps, monitoring, alerting |

---

### Sprint 8: Production Hardening (Weeks 9-10+) - Optional

| Task | Description |
|------|-------------|
| **Load Testing** | k6/JMeter: 100 concurrent POS users, 1000 products |
| **Penetration Testing** | OWASP Top 10 assessment |
| **Disaster Recovery** | Full backup/restore drill, RPO/RTO validation |
| **Monitoring/Alerting** | Prometheus/Grafana: API latency, error rates, queue depth |
| **Log Aggregation** | Loki/ELK: structured JSON logs, correlation IDs |
| **Performance Optimization** | Query optimization, Redis caching, queue workers |
| **Multi-region Deployment** | If scaling beyond single branch |

---

## File-Level Summary

### Backend (Laravel)

#### New Models (12)
- `Business`, `Branch`
- `PrivacyProcessingRecord`, `DataSubjectRequest`, `DataBreachIncident`
- `StockReceiving`, `SanitationChecklist`, `Recall`, `VendorReturn`
- `BusinessCapability` (enum/service)

#### Modified Models (10)
- `User`, `Product`, `Supplier`, `Inventory`, `FEFOBatch`
- `PurchaseOrder`, `SalesTransaction`, `WastageRecord`, `StockMovement`, `AuditLog`

#### New Controllers (6)
- `PrivacyController`, `SanitationController`, `RecallController`
- `ReorderController`, `BirIntegrationService`, `BreachResponseService`

#### Modified Controllers (8)
- `ProductController`, `SupplierController`, `InventoryController`
- `StockReceivingController`, `SalesTransactionController`, `ReturnTransactionController`
- `PurchaseOrderController`, `FEFOController`

#### New Migrations (18+)
- `businesses`, `branches`, `privacy_processing_records`, `data_subject_requests`, `data_breach_incidents`
- `stock_receiving`, `sanitation_checklists`, `recalls`, `vendor_returns`
- 10+ `add_business_branch_to_*` migrations

#### New Jobs/Commands (5)
- `GenerateReorderSuggestions`, `ApplyRetentionPolicies`
- `WarmAnalyticsCache` (exists), `SendExpirationAlerts`, `CheckSupplierLicenses`

### Frontend (React + Vite)

#### New Pages (8)
- `PrivacyPolicy.tsx`, `TermsOfService.tsx`
- `RecallManagement.tsx`, `SanitationChecklist.tsx`
- `PrivacyRequests.tsx`, `BreachIncidents.tsx`
- `ReorderDashboard.tsx`, `DataRetentionConfig.tsx`

#### Modified Pages (12+)
- `ManageProducts.tsx`, `ManageInventory.tsx`, `FEFOTracking.tsx`
- `StockReceiving.tsx`, `POSTerminal.tsx`, `ReturnsRefunds.tsx`
- `InventoryDashboard.tsx`, `Reports.tsx`, `ManageUsers.tsx`
- `SystemSettings.tsx`, `Login.tsx`

#### New Components (6)
- `PrivacyBanner.tsx`, `SkipLink.tsx`, `ReceiptPreview.tsx`
- `TemperatureInput.tsx`, `DualSignOff.tsx`, `SanitationChecklistForm.tsx`

#### New Hooks (3)
- `usePrivacyConsent.ts`, `useReducedMotion.ts`, `useReorderSuggestions.ts`

#### API Types Updates
- `api.ts`: All interfaces extended with `business_id`, `branch_id`, classification, compliance fields

---

## Compliance Matrix (Thesis Artifact)

| Regulation | Requirement | System Feature | Applicability | Sprint | Test Case |
|------------|-------------|----------------|---------------|--------|-----------|
| RA 10173 | Lawful processing | Purpose-based consent | Always | 1 | TC-001 |
| RA 10173 | Data subject rights | Access/export/delete endpoints | Always | 1, 5 | TC-002 |
| RA 10173 | Breach response | Incident workflow | Always | 1, 5 | TC-003 |
| RA 10173 | Accountability docs | Processing records | Always | 1 | TC-004 |
| RA 10173 | Data retention | Configurable retention + purge | Always | 5 | TC-005 |
| RA 10611 | Traceability | Batch one-up/one-down | Food businesses | 2, 3 | TC-006 |
| RA 10611 | Expiration control | FEFO + alerts | Food businesses | 2, 3 | TC-007 |
| RA 10611 | Receiving control | Temp check vs product req | Food businesses | 3 | TC-008 |
| RA 10611 | Sanitation | Digital checklist + sign-off | Food businesses | 3 | TC-009 |
| RA 10611 | Recall | Quarantine → trace → resolve | Food businesses | 3 | TC-010 |
| RA 7394 | Price transparency | POS price/unit + VAT display | All retail | 4 | TC-011 |
| RA 7394 | Returns/refunds | 7-day + defective flow | All retail | 4 | TC-012 |
| RA 9994/10754 | Senior/PWD discount | Auto-apply at POS | All retail | 4 | TC-013 |
| RA 10918 | Pharmacist on duty | Shift validation | Pharmacy only | Optional | TC-014 |
| RA 10918 | RX handling | Prescription verification | Pharmacy only | Optional | TC-015 |

**Applicability:** Always | Food businesses | Pharmacy only | Conditional

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Multi-branch migration breaks existing data | Medium | High | Run on staging first; backup; phased rollout |
| FDA license tracking complexity | Low | Medium | Start with number+expiry only; docs later |
| BIR integration scope creep | Medium | Medium | Document pathway only; no fiscal printer in MVP |
| Accessibility audit findings | Medium | Medium | Build WCAG into components from Sprint 1 |
| ML service contract changes | Low | High | Pin versions; contract tests; health checks |
| Single developer timeline | High | High | Prioritize core + food compliance; defer pharmacy |

---

## Definition of Done (Per Sprint)

- [ ] All migrations run successfully on clean DB
- [ ] All new/modified models have factory + tests
- [ ] All API endpoints return correct types (Frontend compiles)
- [ ] Compliance test cases from matrix pass
- [ ] Accessibility audit (axe) passes for new pages
- [ ] Code reviewed, merged to `dev`
- [ ] Documentation updated

---

## Next Steps

1. **Approve this plan** - Confirm scope, timeline, decisions
2. **Create Sprint 1 branch** - `feature/sprint-1-compliance-foundation`
3. **Start with Compliance Matrix + Data Inventory** - Thesis artifacts first
4. **Parallel track:** Backend migrations + Frontend legal pages
5. **Weekly sync** - Review progress against sprint goals

---

*This plan is a living document. Update the Compliance Matrix and sprint tasks as decisions evolve.*