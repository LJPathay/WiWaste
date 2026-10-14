# QA Findings — Implementation Plan

**Source:** QA-FOR-CAPSTONE-2.docx (11 test cases: Login/Auth, Password Reset, Admin Dashboard, Manage User module)
**Date:** September 27, 2026
**Purpose:** Turn the QA team's bug reports and requirements into an actionable, prioritized build plan.

---

## Table of Contents

1. [Codebase Summary](#1-codebase-summary)
2. [Priority Legend](#2-priority-legend)
3. [Phase 1 — P0: Critical Fixes](#3-phase-1--p0-critical-fixes)
4. [Phase 2 — P1: High Priority](#4-phase-2--p1-high-priority)
5. [Phase 3 — P2: UX & Navigation](#5-phase-3--p2-ux--navigation)
6. [Sprint Execution Order](#6-sprint-execution-order)
7. [Cross-Cutting Concerns](#7-cross-cutting-concerns)
8. [Regression / Validation Checklist](#8-regression--validation-checklist)
9. [Risks & Dependencies](#9-risks--dependencies)

---

## 1. Codebase Summary

| Layer | Stack | Key Files |
|-------|-------|-----------|
| **Backend** | Laravel 12 + MySQL | `Backend/routes/api.php`, `Backend/app/Http/Controllers/Api/AuthController.php`, `Backend/app/Http/Controllers/Api/UserController.php`, `Backend/app/Models/User.php` |
| **Frontend** | React + TypeScript + Vite + React Router v7 | `Frontend/src/routes.tsx`, `Frontend/src/pages/admin/ManageUsers.tsx`, `Frontend/src/pages/admin/UserConstants.ts`, `Frontend/src/pages/Login.tsx`, `Frontend/src/services/api.ts` |
| **DB Schema** | Users table: `User` with ENUM `role` = `[Owner, Inventory, Cashier, Pharmacist, Business Owner]`, ENUM `status` = `[Active, Inactive, Quarantined]` | `Backend/database/migrations/` |
| **Auth** | Laravel Sanctum tokens, no `auth:sanctum` middleware on routes, localStorage-based sessions on frontend | — |

### Confirmed Design Decisions

| Decision | Choice |
|----------|--------|
| Admin role handling | Map `Admin` -> `Owner` in controller; remove `Admin` from DB enum and UI |
| Name field split | Replace `Full_name` entirely with `first_name`, `middle_name`, `surname` |
| Email notifications | Log-only mailer for now; build infrastructure switchable to SMTP later |
| Delete vs archive | Replace permanent Delete with `Archived` status; admins can only archive |

---

## 2. Priority Legend

| Tier | Meaning |
|------|---------|
| **P0 — Critical** | Breaks a core flow or creates a security gap. Fix first. |
| **P1 — High** | Feature works but is incomplete, inconsistent, or missing a required safeguard. |
| **P2 — Medium** | UX, navigation, or labeling issue. Doesn't block core functionality. |

---

## 3. Phase 1 — P0: Critical Fixes

### BUG-01 — Forgot Password returns 500 Internal Server Error

| Field | Detail |
|-------|--------|
| **Module** | Authentication |
| **Effort** | M |
| **Current behavior** | Clicking "Forgot Password" throws a 500 error; the OTP reset flow cannot be started at all. |
| **Root cause** | The entire Forgot Password / Password Reset flow does not exist. No backend route, no controller method, no `password_reset_tokens` table migration, no Mailable classes, no frontend page. Login.tsx has a dead `href="#forgot"` link. `config/auth.php` references a `password_reset_tokens` table that was never created. |

**Files to create/change:**

Backend:
1. **New migration:** `create_password_reset_tokens_table.php`
   - Table: `password_reset_tokens` with columns: `email` (VARCHAR, PK), `token` (VARCHAR), `created_at` (TIMESTAMP)
2. **New Mailable:** `App\Mail\PasswordResetOtpMail`
   - Sends a 6-digit OTP code to the user's email
3. **New controller methods in `AuthController.php`:**
   - `forgotPassword(Request $request)` — Validate email, look up user, generate 6-digit OTP, store hashed token in `password_reset_tokens`, send OTP email, return success JSON
   - `verifyOtp(Request $request)` — Validate email + OTP, check against stored hash, return success/failure
   - `resetPassword(Request $request)` — Validate email + OTP + new password (min 8, complexity), verify OTP, update password, clear token
4. **New routes in `api.php`:**
   - `POST /forgot-password` -> `AuthController@forgotPassword`
   - `POST /verify-otp` -> `AuthController@verifyOtp`
   - `POST /reset-password` -> `AuthController@resetPassword`

Frontend:
5. **New page:** `Frontend/src/pages/ForgotPassword.tsx`
   - Enter email form, calls `auth.forgotPassword(email)`
6. **New page:** `Frontend/src/pages/ResetPassword.tsx`
   - Two-step flow: (1) enter email + OTP to verify, (2) enter new password + confirm
7. **New API methods in `api.ts`:**
   - `auth.forgotPassword(email)`
   - `auth.verifyOtp(email, otp)`
   - `auth.resetPassword(email, otp, password)`
8. **Update `routes.tsx`** — Add `/forgot-password` and `/reset-password` routes under `AuthLayout`
9. **Update `Login.tsx`** — Change `href="#forgot"` to `href="/forgot-password"` (line 188)

**Acceptance criteria:**
- Forgot Password screen loads without error
- Submitting a registered email triggers an OTP email (visible in Laravel log)
- OTP verification succeeds and allows password reset
- Invalid/expired OTP is rejected with a clear message (not a 500)

---

### BUG-02 — Co-admin account creation fails with DB truncation error

| Field | Detail |
|-------|--------|
| **Module** | Manage User (Admin creation) |
| **Effort** | S |
| **Current behavior** | `SQLSTATE[01000]: Warning: 1265 Data truncated for column 'role'` when inserting "Admin" as the role value. |
| **Root cause** | Controller validates `role` as `in:Admin,Inventory,Business Owner` but DB enum is `[Owner, Inventory, Cashier, Pharmacist, Business Owner]` — `Admin` is not in the enum. Decision: map `Admin` -> `Owner`. |

**Files to change:**

1. `Backend/app/Http/Controllers/Api/UserController.php`
   - `store()`: Accept `Admin` in validation, then map to `Owner` before insert:
     ```php
     if (($data['role'] ?? '') === 'Admin') {
         $data['role'] = 'Owner';
     }
     ```
   - `update()`: Same mapping
2. `Frontend/src/pages/admin/UserConstants.ts`
   - Remove `'Admin'` key from `ROLE_CONFIG`, add `'Owner'` key with Shield icon + "Owner" label
   - Update `UserForm.role` type: replace `'Admin'` with `'Owner'`
3. `Frontend/src/pages/admin/ManageUsers.tsx`
   - Update role filter dropdown: change `Admin` option value/label to `Owner`
   - Update any `form.role === 'Admin'` references to `'Owner'`
4. `Frontend/src/types/api.ts`
   - Remove `'Admin'` from `ApiUser.role` and `CreateUserPayload.role` union types
5. `Frontend/src/pages/Login.tsx` — Line 35 already handles `Admin || Owner`, no change needed
6. `Backend/database/seeders/DatabaseSeeder.php` — Seeded `admin` user already uses `'Owner'`, no change needed

**Acceptance criteria:**
- Role column schema cleanly accepts `Owner` (no `Admin` needed in DB)
- Creating a co-admin succeeds with no SQL warnings
- Existing roles (`Owner`, `Inventory`, `Cashier`, `Pharmacist`, `Business Owner`) still insert correctly

---

### BUG-03 — Creating Inventory Staff / Business Owner throws toLowerCase() error

| Field | Detail |
|-------|--------|
| **Module** | Manage User (User creation) |
| **Effort** | S |
| **Current behavior** | "Cannot read properties of undefined (reading 'toLowerCase')" after account creation. Account may still be created, but confirmation and updated list are unreliable. |
| **Root cause** | `UserController::store()` returns `['message' => 'User created.', 'id' => $user->User_id]` — NOT the full user object. In `ManageUsers.tsx:handleAddUser()`, the response is cast as `ApiUser` and passed to `addItem()`. The partial object (no `name`, `username`, `email` fields) is added to list state. Before `refetch()` completes, the component re-renders and `filteredUsers` calls `.toLowerCase()` on `undefined` fields -> crash. |

**Files to change:**

1. `Backend/app/Http/Controllers/Api/UserController.php`
   - `store()`: Return the full user object (matching `index()`/`show()` shape) instead of just `message`+`id`:
     ```php
     return response()->json([
         'id'         => $user->User_id,
         'name'       => $user->Full_name,
         'username'   => $user->username,
         'email'      => $user->email,
         'role'       => $user->role,
         'status'     => $user->status,
         'created_at' => $user->Created_at,
     ], 201);
     ```
2. `Frontend/src/pages/admin/ManageUsers.tsx`
   - In `handleAddUser()`, the `addItem(created)` call now receives a correctly-shaped object. Additionally, add a null-check guard in the `filteredUsers` filter:
     ```typescript
     const matchesSearch = (u.name?.toLowerCase() ?? '').includes(search.toLowerCase()) ||
                           (u.username?.toLowerCase() ?? '').includes(search.toLowerCase()) ||
                           (u.email?.toLowerCase() ?? '').includes(search.toLowerCase());
     ```

**Acceptance criteria:**
- No client-side error on creating Inventory Staff or Business Owner accounts
- Success notification shown to admin
- New user appears immediately in the Manage User list with correct role/status

---

### BUG-04 — No lockout after repeated failed login attempts

| Field | Detail |
|-------|--------|
| **Module** | Authentication / Security |
| **Effort** | M |
| **Current behavior** | Unlimited login attempts allowed; no lockout, no notification. |
| **Required behavior** | Lock account after 5 consecutive failed attempts. Lockout duration: 15 minutes. Further attempts blocked during lockout. Email notification sent on unsuccessful attempt + lockout with date/time, device info, IP/approximate location. |

**Files to create/change:**

Backend:
1. **New migration:** `create_login_attempts_table.php`
   - Columns: `id` (BIGINT PK), `user_id` (nullable FK -> User), `email_attempted` (VARCHAR), `ip_address` (VARCHAR), `user_agent` (TEXT), `attempt_type` (ENUM: `failed`, `successful`), `locked_until` (nullable TIMESTAMP), `created_at` (TIMESTAMP)
2. **New model:** `App\Models\LoginAttempt`
3. **New service:** `App\Services\LoginAttemptService`
   - `recordFailedAttempt($email, $ip, $userAgent)` — increment counter, lock if >= 5, dispatch failed login email
   - `isLocked($email)` — check if `locked_until` is in the future
   - `clearAttempts($email)` — reset counter on successful login
4. **New Mailable:** `App\Mail\FailedLoginMail`
   - Contains: date/time, IP address, device/user-agent, approximate location (from IP geolocation or placeholder)
5. **Update `AuthController::login()`:**
   - Before credential check: `LoginAttemptService::isLocked($email)` -> return 429 if locked
   - On failed credentials: `LoginAttemptService::recordFailedAttempt()`
   - On success: `LoginAttemptService::clearAttempts()`

**Frontend:**
6. `Frontend/src/pages/Login.tsx`
   - Handle 429 response -> display "Account locked. Try again in X minutes." message

**Acceptance criteria:**
- Account locks after 5 consecutive failed attempts
- Lockout lasts 15 minutes
- Further attempts blocked with clear message
- Email notification sent on failed attempt + lockout (visible in log)

---

### BUG-05 — Password policy message doesn't match enforced rule

| Field | Detail |
|-------|--------|
| **Module** | Authentication / Account creation |
| **Effort** | XS |
| **Current behavior** | UI says minimum 6 characters; backend actually requires 8. |
| **Root cause** | `Frontend/src/pages/admin/UserConstants.ts:59` — the length rule reads `password.length >= 6` while `UserController::store()` enforces `min:8`. |

**Files to change:**

1. `Frontend/src/pages/admin/UserConstants.ts`
   - Line 59: Change `password.length >= 6` to `password.length >= 8`
   - Change label from `'At least 6 characters'` to `'At least 8 characters'`

**Acceptance criteria:**
- Policy text updated to "minimum 8 characters"
- Backend validation confirmed at 8 characters minimum
- Account creation succeeds when password meets the displayed rule

---

## 4. Phase 2 — P1: High Priority

### BUG-06 — No email notification on successful login

| Field | Detail |
|-------|--------|
| **Module** | Authentication |
| **Effort** | S (shares infrastructure with BUG-04) |
| **Required behavior** | Every successful login sends an email with date/time, device info, and IP/approximate location. |

**Files to create/change:**

Backend:
1. **New Mailable:** `App\Mail\SuccessfulLoginMail`
   - Contains: date/time, IP address, device/user-agent, approximate location
   - Uses the same `LoginAttemptService` from BUG-04
2. **Update `AuthController::login()`:**
   - On successful login (after token creation): `LoginAttemptService::recordSuccessfulAttempt($user, $ip, $userAgent)`
   - This method logs the attempt and dispatches the `SuccessfulLoginMail`

**Shared with BUG-04:**
- `LoginAttemptService` handles both failed and successful attempt tracking + email dispatch
- Email template structure (date/time, device, IP, location) is reusable
- Both use the `login_attempts` table

**Acceptance criteria:**
- Notification fires on every successful login
- Content includes: date/time, device info, IP/approximate location

---

### BUG-07 — Add User form: missing name-field granularity and required email

| Field | Detail |
|-------|--------|
| **Module** | Manage User (User creation) |
| **Effort** | M |
| **Current behavior** | Single "Full Name" field only; no Contact Number field; Email not required. |
| **Required behavior** | Separate First Name / Middle Name / Surname fields; Contact Number field; Email is required and validated. |
| **Decision** | Replace `Full_name` entirely with `first_name`, `middle_name`, `surname`. |

**Files to change:**

Backend:
1. **New migration:** `split_full_name_on_users.php`
   - Add columns: `first_name` VARCHAR(50), `middle_name` VARCHAR(50) NULLABLE, `surname` VARCHAR(50), `contact_number` VARCHAR(20) NULLABLE
   - Migrate data: split `Full_name` on spaces -> first word = `first_name`, last word = `surname`, middle words = `middle_name`
   - Drop `Full_name` column
   - Update any direct DB references to `Full_name`
2. `Backend/app/Models/User.php`
   - Replace `Full_name` in `$fillable` with `first_name`, `middle_name`, `surname`, `contact_number`
   - Add accessor: `getFullNameAttribute()` returns `$this->first_name . ' ' . $this->surname`
   - Add mutator for backward compat if needed
3. `Backend/app/Http/Controllers/Api/UserController.php`
   - `store()`: Validate `first_name` (required|string|max:50), `surname` (required|string|max:50), `middle_name` (nullable|string|max:50), `contact_number` (nullable|string|max:20), `email` (required|email|...) — change from nullable to required
   - `update()`: Same fields, all optional
   - `index()`, `show()`: Return `name` as computed full name from accessor, plus individual fields
4. `Backend/app/Http/Controllers/Api/AuthController.php`
   - `login()` and `me()`: Return `name` from the new accessor for backward compatibility with frontend
5. `Backend/database/seeders/DatabaseSeeder.php`
   - Replace `'Full_name' => 'Lia Cruz'` with `'first_name' => 'Lia', 'surname' => 'Cruz'` for all seeded users

Frontend:
6. `Frontend/src/types/api.ts`
   - Update `ApiUser`: keep `name` (computed from API), add `first_name`, `middle_name?`, `surname`, `contact_number?`
   - Update `CreateUserPayload`: replace `Full_name` with `first_name`, `middle_name?`, `surname`, `contact_number?`
7. `Frontend/src/pages/admin/UserConstants.ts`
   - Update `UserForm` interface and `EMPTY_FORM` to use new fields
8. `Frontend/src/pages/admin/ManageUsers.tsx`
   - **Add User modal**: Replace single `Full_name` input with 3 name fields + contact number field. Make `email` required with `type="email"` and validation
   - **Edit User modal**: Same field changes, pre-populate from user data
   - **View User modal**: Display individual name fields
   - **Table columns**: Display computed name (API returns `name` field)
   - **Duplicate name check**: Update to check against `first_name + surname` combination

**Acceptance criteria:**
- Form has 3 discrete name fields + contact number field
- Email required, validated (format + required-field check) before submit
- Existing user records migrated gracefully from `Full_name`

---

### BUG-08 — Account status can be changed without Edit mode / no confirmation

| Field | Detail |
|-------|--------|
| **Module** | Manage User (Account status) |
| **Effort** | S |
| **Current behavior** | Admin can change and save account status directly from the view modal, bypassing the Edit button and any confirmation step. |
| **Root cause** | In `ManageUsers.tsx:1071-1088`, the view user modal has a `<select>` for status that fires `onChange` -> immediately calls `usersApi.update()`. |

**Files to change:**

1. `Frontend/src/pages/admin/ManageUsers.tsx`:
   - In the **view user modal** (lines 1068-1090):
     - Replace the interactive `<select>` with a **read-only status badge** (same style as the table status column)
     - Add a "Change Status" button that only appears when the admin enters edit mode
   - In the **edit user modal** (lines 940-1010):
     - The status `<select>` is already there — add a **confirmation step** before saving:
       - When the admin changes the status dropdown and clicks "Save Changes", show a confirmation modal:
         ```
         Change status of @username from Active to Inactive?
         This will [description of consequence].
         ```
       - Only persist after explicit "Confirm" click
   - Create a `StatusConfirmModal` component (inline or extracted):
     - Shows: current status -> new status with arrows
     - Shows the consequence text (e.g., "User will be blocked from logging in")
     - Confirm / Cancel buttons

**Acceptance criteria:**
- Status field is read-only outside edit mode
- Confirmation modal appears before status change is saved
- Change only persists after confirmation

---

### BUG-09 — Inactive/Quarantined accounts can still authenticate; no archive or filter view

| Field | Detail |
|-------|--------|
| **Module** | Manage User (Account lifecycle) |
| **Effort** | L |
| **Current behavior** | Status-changed accounts vanish from the Manage User list (no filter/tab for them) but can still log in. The opposite of intended behavior. |
| **Decision** | Replace Delete with Archive. Inactive + Quarantined + Archived all blocked from login. |

**Files to create/change:**

Backend:
1. **New migration:** `add_archived_to_user_status_enum.php`
   - Modify status ENUM to `['Active', 'Inactive', 'Quarantined', 'Archived']`
2. `Backend/app/Http/Controllers/Api/AuthController.php`
   - `login()`: Block `Inactive`, `Quarantined`, AND `Archived` accounts:
     ```php
     if (in_array($user->status, ['Inactive', 'Quarantined', 'Archived'])) {
         $message = match($user->status) {
             'Inactive' => 'Your account has been deactivated.',
             'Quarantined' => 'Your account has been quarantined. Contact an administrator.',
             'Archived' => 'Your account has been archived.',
             default => 'Your account is not active.',
         };
         return response()->json(['message' => $message], 403);
     }
     ```
3. `Backend/app/Http/Controllers/Api/UserController.php`
   - `store()`: Add `'Archived'` to status validation: `'status' => 'required|in:Active,Inactive,Quarantined'` (no Archived on creation)
   - New `archive($id)` method: Sets status to `Archived`, writes audit log entry
   - All status-changing methods (`update`, `quarantine`, `reactivate`, `archive`) write to `Audit_Log`:
     ```php
     AuditLog::create([
         'user_id'     => auth()->id() ?? null,
         'action'      => "Status changed: {$oldStatus} -> {$newStatus}",
         'entity_type' => 'User',
         'entity_id'   => $id,
         'old_values'  => json_encode(['status' => $oldStatus]),
         'new_values'  => json_encode(['status' => $newStatus]),
         'created_at'  => now(),
     ]);
     ```
   - `destroy()`: Soft-deprecate or remove; replace with `archive()`
4. `Backend/routes/api.php`
   - Add: `POST /users/{id}/archive` -> `UserController@archive`
   - Remove or deprecate: `DELETE /users/{id}`

Frontend:
5. `Frontend/src/pages/admin/ManageUsers.tsx`
   - **Status filter tabs** (already exist for All/Active/Inactive/Quarantined):
     - Add "Archived" tab with count
     - Update `allCount` filter to exclude Archived from default view
   - **Actions column**:
     - Replace "Delete" button with "Archive" button for Quarantined users
     - Add "Archive" confirmation modal (similar to quarantine modal)
     - Remove the permanent Delete action entirely
   - **Archive confirmation modal**: Shows warning that user will be blocked from login and archived from active records
6. `Frontend/src/services/api.ts`
   - Add: `users.archive: (id: number) => request(\`/users/\${id}/archive\`, { method: 'POST' })`
   - Remove or deprecate: `users.delete()`

**Acceptance criteria:**
- Manage User module has filters/tabs for Active, Inactive, Quarantined, Archived
- Inactive and Quarantined accounts are blocked from authenticating
- Admin cannot permanently delete users — only archive
- Archived accounts stay visible to authorized admins for recordkeeping
- Admin confirmation required before any status change
- Status changes are written to the audit log with admin ID + timestamp

---

## 5. Phase 3 — P2: UX & Navigation

### BUG-10 — 404 error navigating back from KPI detail view

| Field | Detail |
|-------|--------|
| **Module** | Admin Dashboard |
| **Effort** | XS–S |
| **Current behavior** | Clicking a KPI -> viewing details -> clicking "OWNER" in the nav path throws a React Router 404. |
| **Root cause** | No index route for `/owner`. The breadcrumb auto-generates links from URL segments; `/owner` has child routes (`/owner/users`, etc.) but no matching index route. |

**Files to change:**

1. `Frontend/src/routes.tsx`
   - Add an index route under the `owner` ProtectedRoute children:
     ```tsx
     { path: "owner", element: <Navigate to="/owner/users" replace /> },
     ```
     (or render ManageUsers directly as the index)
2. `Frontend/src/components/ui/breadcrumb.tsx`
   - Verify `ROUTE_LABELS` includes `'owner': 'Owner'`
   - Verify the breadcrumb link generation correctly builds `/owner` from the path segment

**Acceptance criteria:**
- Navigation path resolves correctly with no error
- Clicking "OWNER" breadcrumb lands on Home > Owner > Manage User

---

### BUG-11 — Edit icon shown where it shouldn't be; "Business Owner" role should read "Cashier"

| Field | Detail |
|-------|--------|
| **Module** | Manage User (labeling/permissions) |
| **Effort** | S |
| **Required behavior** | Edit icon hidden from the user list view; role label "Business Owner" renamed to "Cashier" system-wide with cashier-level permissions. |

**Files to change:**

1. `Frontend/src/pages/admin/ManageUsers.tsx`
   - In the `actions` callback for the DataTable (lines ~630-655): Remove the `Edit2` ActionButton for non-quarantined users. Keep only Quarantine/Reactivate/Archive actions in the list view
   - The Edit button remains accessible in the view user modal (line 1109-1119)
2. `Frontend/src/pages/admin/UserConstants.ts`
   - Rename key `'Business Owner'` to `'Cashier'` in `ROLE_CONFIG`
   - Change `label` from `'Business Owner'` to `'Cashier'`
   - Update `UserForm.role` type: replace `'Business Owner'` with `'Cashier'`
3. `Frontend/src/pages/admin/ManageUsers.tsx`
   - Role filter dropdown: change `Business Owner` option value/label to `Cashier`
   - All `ROLE_CONFIG` lookups automatically use the new key
4. `Backend/app/Http/Controllers/Api/UserController.php`
   - `store()` and `update()` validation: Replace `Business Owner` with `Cashier` in the `in:` rule
5. `Backend/app/Models/User.php`
   - No scope changes needed (scopes use `Owner`, `Inventory`, `Cashier`, `Pharmacist` — already correct)
6. `Backend/database/seeders/DatabaseSeeder.php`
   - Change seeded cashier user role from `'Business Owner'` to `'Cashier'`
7. `Frontend/src/types/api.ts`
   - Update role union types to final set: `'Owner' | 'Inventory' | 'Cashier' | 'Pharmacist'`

**Acceptance criteria:**
- Edit icon no longer shown on hover in the list view
- Role label reads "Cashier" everywhere (list, forms, filters)
- Cashier permissions scoped correctly (not carrying over Business Owner-level access)

---

## 6. Sprint Execution Order

| Sprint | Bugs | Est. Effort | Notes |
|--------|------|-------------|-------|
| **Sprint 1** | BUG-05 (password policy) -> BUG-02 (role enum) -> BUG-03 (toLowerCase crash) | XS + S + S | Flat-out broken flows or one-line fixes; clear these first |
| **Sprint 2** | BUG-04 + BUG-06 (lockout + login emails) | M + S | Build the login-attempt tracking and email-notification pipeline once, since both bugs need it |
| **Sprint 3** | BUG-07 (name fields) + BUG-08 (status edit mode) | M + S | Data model change + UX safeguard |
| **Sprint 4** | BUG-09 (account lifecycle/archive/audit) | L | Multi-day task — touches auth middleware, UI filtering, soft-delete/archive model, and audit logging |
| **Sprint 5** | BUG-10 (404 breadcrumb) + BUG-11 (Cashier rename + edit icon) | XS + S | Bundle BUG-11's role rename with BUG-02's role-enum fix if not already generalized |

---

## 7. Cross-Cutting Concerns

### Role/Enum Changes (BUG-02, BUG-07, BUG-11)

All three touch the role field. The work should be done **once**:

- **Final DB enum:** `[Owner, Inventory, Cashier, Pharmacist]` (drop `Business Owner`, no `Admin` in DB)
- **Controller validation:** Accept `Admin` in input but map to `Owner`
- **UI labels:** "Cashier" instead of "Business Owner"; "Owner" instead of "Admin"
- **Seeder:** Cashier user gets role `Cashier`

### Audit Log (BUG-09)

The existing `Audit_Log` table (`Backend/database/migrations/2026_07_22_140000_create_audit_log_table.php`) already has the right schema:
- `log_id`, `user_id`, `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `created_at`

The `AuditLogController` already provides `GET /audit-logs`. Use this for all status changes.

### Email Notifications (BUG-01, BUG-04, BUG-06)

Build Mailable infrastructure once and reuse:
- `PasswordResetOtpMail` (BUG-01)
- `FailedLoginMail` (BUG-04)
- `SuccessfulLoginMail` (BUG-06)

All use the `log` mailer. Templates share a common structure (date/time, IP, device info).

### AuthController Consolidation (BUG-04, BUG-06, BUG-09)

Update `AuthController::login()` in one pass for:
- Lockout check (BUG-04)
- Failed attempt recording + email (BUG-04)
- Successful login email (BUG-06)
- Block Inactive/Quarantined/Archived (BUG-09)

---

## 8. Regression / Validation Checklist

Before sign-off, re-run every original QA test step against the fix:

- [ ] Full login lockout cycle (5 fails -> 15-min lock -> email -> auto-unlock)
- [ ] Successful login email fires every time
- [ ] Forgot Password OTP round-trip end-to-end
- [ ] Create: Owner, Inventory Staff, Cashier — no console or SQL errors on any
- [ ] Password policy: 8-char minimum enforced and displayed consistently
- [ ] Status change requires Edit mode + confirmation, and is blocked from login while Inactive/Quarantined/Archived
- [ ] Archived users are not deletable and remain admin-visible
- [ ] Audit log captures every status change with actor + timestamp
- [ ] KPI -> breadcrumb navigation round-trip with no 404
- [ ] Edit icon / Cashier label correct across all list and form views

---

## 9. Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Role/enum changes (BUG-02, BUG-07, BUG-11) are schema-level — other parts of the app may query on old role strings | Do a broad search for `Business Owner`, `Admin` across the codebase before changing; update all references in one pass |
| BUG-09 (account lifecycle) depends on an audit-log mechanism | The `Audit_Log` table already exists; confirm the `AuditLog` model has the right fillable fields before coding |
| Email notifications (BUG-04, BUG-06) depend on a working mail service | Using `log` mailer; no external dependency. Switch to SMTP later by changing `MAIL_MAILER` in `.env` |
| BUG-07 (name field split) is a breaking data migration | Test the migration on a copy of production data first; ensure the `Full_name` split logic handles edge cases (single name, hyphenated names) |
| BUG-01 (Forgot Password) requires creating the `password_reset_tokens` table | This table is referenced in `config/auth.php` but never created; creating it aligns with Laravel's expected structure |

---

*Generated from QA-FOR-CAPSTONE-2.docx analysis. Update this document as fixes are implemented and verified.*
