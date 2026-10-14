# Master Implementation Plan: WiWaste Role-Based Access, Performance & Security

## Overview
Consolidated implementation plan covering 6 focused areas for the WiWaste pharmacy inventory & POS system.

---

## Plan Summary

| # | Plan | File | Effort | Priority |
|---|------|------|--------|----------|
| 1 | Role-Based Module Access | `01-ROLE_BASED_MODULE_ACCESS.md` | 9 hrs | 🔴 Critical |
| 2 | Frontend Performance (4K Products) | `02-FRONTEND_PERFORMANCE_OPTIMIZATION.md` | 23 hrs | 🔴 Critical |
| 3 | Backend Security Hardening | `03-BACKEND_SECURITY_HARDENING.md` | 15 hrs | 🔴 Critical |
| 4 | Forgot Password (6-Digit OTP) | `04-FORGOT_PASSWORD_OTP.md` | 12 hrs | 🟡 High |
| 5 | Test Suite (Vitest + Playwright + PHPUnit + k6) | `05-TEST_SUITE_IMPLEMENTATION.md` | 72 hrs | 🟡 High |
| 6 | Custom 404 & Error Handling | `06-ERROR_HANDLING_404.md` | 6.5 hrs | 🟢 Medium |

**Total Estimated Effort: ~137.5 hours (~3.5 weeks for 1 dev)**

---

## Execution Order (Dependency-Aware)

### Phase 1: Foundation (Week 1)
```
1.1 Backend Policy Fixes (SalesPolicy, CashierPolicy)     [Plan 1]
1.2 UserController role conversion fix                    [Plan 1]
1.3 Forgot Password Backend (migration, controller, mail) [Plan 4]
1.4 Custom 404 Page + Catch-all Route                     [Plan 6]
```
**Why:** Unblocks Cashier POS sales, fixes broken password reset, improves UX immediately.

### Phase 2: Frontend Architecture (Week 1-2)
```
2.1 API Service Tree-Shaking (role-specific services)     [Plan 1]
2.2 Route-Level Code Splitting                            [Plan 2]
2.3 Forgot Password Frontend (3-step form)                [Plan 4]
```
**Why:** Reduces bundle size before adding virtualization.

### Phase 3: POS Performance (Week 2)
```
3.1 Virtualized Product Grid (react-window)               [Plan 2]
3.2 Search-Only Catalog Loading (no 4K on mount)          [Plan 2]
3.3 POS-Specific Optimizations                            [Plan 2]
```
**Why:** Core requirement - 4K products must load < 700ms.

### Phase 4: Security Hardening (Week 2-3)
```
4.1 Adaptive Rate Limiting Middleware                     [Plan 3]
4.2 DDoS Detection (Alert-Only)                           [Plan 3]
4.3 Enhanced Security Headers                             [Plan 3]
```
**Why:** Production readiness, compliance.

### Phase 5: Testing & CI/CD (Week 3)
```
5.1 Vitest Unit/Component Tests                           [Plan 5]
5.2 Playwright E2E (15 scenarios)                         [Plan 5]
5.3 PHPUnit Backend Tests                                 [Plan 5]
5.4 k6 Load Tests                                         [Plan 5]
5.5 Lighthouse CI + GitHub Actions                        [Plan 5]
```
**Why:** Quality gates for all previous work.

### Phase 6: Polish (Week 3-4)
```
6.1 ErrorBoundary Enhancement                             [Plan 6]
6.2 API Error Handling Improvement                        [Plan 6]
6.3 Bundle Analysis + PWA Caching                         [Plan 2]
6.4 Documentation + Runbooks
```

---

## Key Technical Decisions (Locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Forgot Password** | Custom 6-digit OTP (not Laravel tokens) | Business requirement |
| **POS Product Loading** | Search/scan only, no initial catalog load | 4K products, barcode scanner primary |
| **Role Labels** | DB: `'Business Owner'` → Frontend: Update to match | Keep DB enum, fix frontend display |
| **Rate Limiting** | Adaptive per-role + behavior scoring | Cashier needs burst, security needs adaptation |
| **DDoS Response** | Alert-only (log channel), no auto-block | Business requirement |
| **Test Framework** | Vitest + Playwright + PHPUnit + k6 | Existing stack + industry standard |
| **404 Page** | Custom `NotFound.tsx` + catch-all route | Replace Vite error overlay |

---

## File Inventory (All Plans)

### Backend Changes
```
Backend/
├── app/Http/Controllers/Api/AuthController.php          # +forgotPassword, +verifyOtp, +resetPassword
├── app/Http/Controllers/Api/UserController.php          # Remove 'Admin'→'Owner' conversion
├── app/Http/Middleware/RateLimitMiddleware.php          # REPLACE with adaptive
├── app/Http/Middleware/DdosProtectionMiddleware.php     # NEW
├── app/Http/Middleware/SecurityHeaders.php              # UPDATE
├── app/Http/Requests/Api/ForgotPasswordRequest.php      # NEW
├── app/Http/Requests/Api/VerifyOtpRequest.php           # NEW
├── app/Http/Requests/Api/ResetPasswordRequest.php       # NEW
├── app/Policies/SalesPolicy.php                         # MODIFY (add Cashier)
├── app/Policies/CashierPolicy.php                       # NEW
├── app/Providers/AuthServiceProvider.php                # Register CashierPolicy
├── app/Mail/PasswordResetOtpMail.php                    # NEW
├── app/Models/PasswordResetOtp.php                      # NEW (Model)
├── database/migrations/xxxx_create_password_reset_otps_table.php  # NEW
├── routes/api.php                                       # +password routes
├── config/security.php                                  # NEW
├── tests/Feature/Auth/ForgotPasswordTest.php            # NEW
├── tests/Feature/Security/RateLimitTest.php             # NEW
├── tests/Unit/Policies/CashierPolicyTest.php            # NEW
├── tests/Unit/Middleware/RateLimitMiddlewareTest.php    # NEW
├── tests/Unit/Middleware/DdosProtectionMiddlewareTest.php # NEW
└── k6/load-test.js, pos-stress-test.js                  # NEW
```

### Frontend Changes
```
Frontend/
├── src/pages/NotFound.tsx                               # NEW
├── src/pages/ForgotPassword.tsx                         # REWRITE (real API)
├── src/pages/admin/ManageUsers.tsx                      # Status filters, role label
├── src/pages/admin/UserConstants.ts                     # 'Business Owner' label
├── src/pages/cashier/POSTerminal.tsx                    # Virtualized grid
├── src/routes.tsx                                       # Catch-all + ErrorBoundary
├── src/services/api.ts                                  # +auth methods
├── src/services/api-core.ts                             # NEW (shared)
├── src/services/api-owner.ts                            # NEW
├── src/services/api-inventory.ts                        # NEW
├── src/services/api-cashier.ts                          # NEW
├── src/services/api-analytics.ts                        # NEW
├── src/hooks/useVirtualizedCatalog.ts                   # NEW
├── src/hooks/useAuth.ts                                 # Role mapping fix
├── src/components/ui/ErrorBoundary.tsx                  # ENHANCE
├── src/__tests__/setup.ts                               # NEW
├── src/__tests__/unit/...                               # NEW test files
├── src/__tests__/integration/...                        # NEW
├── e2e/...                                              # NEW Playwright tests
├── playwright.config.ts                                 # NEW
├── vite.config.ts                                       # UPDATE (chunks, PWA)
├── lighthouse-budget.json                               # NEW
├── .github/workflows/test.yml                           # NEW
├── .github/workflows/lighthouse.yml                     # NEW
└── .github/workflows/security.yml                       # NEW
```

---

## Acceptance Criteria Checklist

### Role-Based Access
- [ ] Cashier can create sales via POS
- [ ] Cashier blocked from `/owner/*`, `/inventory/*`, `/admin/*`
- [ ] Inventory blocked from `/owner/users`, `/owner/settings`, `/owner/reports`
- [ ] Owner has full access
- [ ] API services tree-shaken per role

### Performance (Cashier POS)
- [ ] Cold load < 700ms (3G throttled, Lighthouse)
- [ ] Initial JS bundle < 150KB gzipped
- [ ] 4K products handled via virtualization (60fps)
- [ ] Barcode scan → product add < 100ms
- [ ] Search debounced, server-side, results < 300ms

### Security
- [ ] Adaptive rate limiting adjusts on error rate
- [ ] Cashier gets 2x burst during POS rush
- [ ] DDoS alerts logged to `security` channel
- [ ] No auto-blocking (alert-only)
- [ ] Security headers pass securityheaders.com
- [ ] Request size limited to 1MB

### Forgot Password
- [ ] 6-digit OTP emailed within 30s
- [ ] OTP expires 10 min, max 5 attempts
- [ ] Password policy enforced (8 chars, upper, lower, number, special)
- [ ] Tokens revoked on reset, forces re-login
- [ ] No 500 errors

### Testing
- [ ] Frontend unit: > 80% coverage
- [ ] Playwright E2E: 15 scenarios passing
- [ ] Backend unit: > 85% coverage
- [ ] k6: 1000 req/s, p99 < 200ms
- [ ] Lighthouse CI: Performance > 90

### Error Handling
- [ ] `/invalid` shows custom 404 (not Vite error)
- [ ] ErrorBoundary catches render errors with friendly UI
- [ ] API 401 → login redirect, 403 → permission msg, 500 → generic msg

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Virtualization breaks on mobile | Medium | High | Test on device, fallback to pagination |
| Rate limiting too aggressive | Medium | Medium | Start conservative, tune via config |
| OTP emails not delivered | Low | High | Queue emails, retry logic, logging |
| Playwright flaky in CI | Medium | Medium | Retries, stable selectors, waitFor |
| Bundle splitting breaks imports | Low | High | Test build locally first, analyze chunks |

---

## Next Steps

1. **Approve this master plan** - Confirm scope, timeline, decisions
2. **Create feature branches** - One per plan (or combined Phase 1)
3. **Start Phase 1** - Backend policy fixes + Forgot Password + 404
4. **Daily standups** - Track progress against phase goals
5. **Weekly demo** - Show working features to stakeholders

---

## Document Locations

All implementation plans in `docs/implementation-plan/`:
- `01-ROLE_BASED_MODULE_ACCESS.md`
- `02-FRONTEND_PERFORMANCE_OPTIMIZATION.md`
- `03-BACKEND_SECURITY_HARDENING.md`
- `04-FORGOT_PASSWORD_OTP.md`
- `05-TEST_SUITE_IMPLEMENTATION.md`
- `06-ERROR_HANDLING_404.md`
- `MASTER_IMPLEMENTATION_PLAN.md` (this file)