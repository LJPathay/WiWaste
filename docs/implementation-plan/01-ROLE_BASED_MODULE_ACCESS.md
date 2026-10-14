# Implementation Plan: Role-Based Module Access Audit & Cleanup

## Overview
Audit and enforce role-based access across backend policies, frontend routes, and API services. Remove unnecessary module access per role.

## Current Role Definitions
| Role | Backend Enum | Frontend Key | Description |
|------|--------------|--------------|-------------|
| Owner | `Owner` | `owner` | Full system access |
| Inventory Staff | `Inventory` | `inventory` | Stock, products, wastage, PO |
| Cashier | `Cashier` | `cashier` | POS terminal only |

## Tasks

### 1.1 Backend Policy Fixes (Critical)

#### SalesPolicy - Add Cashier Access
**File:** `Backend/app/Policies/SalesPolicy.php`
```php
public function create(User $user): bool
{
    return in_array($user->role, ['Owner', 'Cashier']);
}

public function viewAny(User $user): bool
{
    return in_array($user->role, ['Owner', 'Cashier']); // Cashier sees own sales
}

public function view(User $user, $sale): bool
{
    return in_array($user->role, ['Owner', 'Cashier']);
}
```

#### Create CashierPolicy
**File:** `Backend/app/Policies/CashierPolicy.php` (NEW)
```php
<?php
namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CashierPolicy
{
    use HandlesAuthorization;

    public function posAccess(User $user): bool
    {
        return $user->role === 'Cashier' || $user->role === 'Owner';
    }

    public function saleCreate(User $user): bool
    {
        return in_array($user->role, ['Cashier', 'Owner']);
    }

    public function saleViewOwn(User $user, $sale): bool
    {
        return $user->role === 'Owner' || ($user->role === 'Cashier' && $sale->user_id === $user->User_id);
    }

    public function receiptPrint(User $user): bool
    {
        return in_array($user->role, ['Cashier', 'Owner']);
    }
}
```

**Register in AuthServiceProvider:**
```php
protected $policies = [
    // ... existing
    \App\Models\SalesTransaction::class => SalesPolicy::class,
];

// Add gates
Gate::define('pos.access', [CashierPolicy::class, 'posAccess']);
Gate::define('sale.create', [CashierPolicy::class, 'saleCreate']);
Gate::define('sale.viewOwn', [CashierPolicy::class, 'saleViewOwn']);
Gate::define('receipt.print', [CashierPolicy::class, 'receiptPrint']);
```

### 1.2 Frontend Route Optimization

**File:** `Frontend/src/routes.tsx`
- Verify `ProtectedRoute` correctly restricts by role
- Cashier routes: only `/cashier/*` + `/dashboard` redirect
- Inventory routes: `/inventory/*` + `/dashboard/inventory` + `/dashboard/fefo`
- Owner routes: all `/owner/*` + `/dashboard/*` + `/reports/*` + `/admin/*`

### 1.3 API Service Tree-Shaking (Role-Specific Services)

Create role-specific API service files to prevent loading unused endpoints:

```
Frontend/src/services/
├── api-core.ts           # Auth, health (ALL roles)
├── api-owner.ts          # Users, settings, reports, audit, analytics
├── api-inventory.ts      # Products, inventory, wastage, PO, FEFO, suppliers
├── api-cashier.ts        # Sales, returns, receipts (POS only)
└── api-analytics.ts      # Forecast, loss-risk, optimization (Owner only)
```

**Usage in components:**
```typescript
// Cashier POS - only loads what it needs
import { sales, products } from '../services/api-cashier';

// Owner Dashboard - loads analytics
import { dashboard, forecast, lossRisk } from '../services/api-owner';
```

### 1.4 UserController Role Conversion Fix

**File:** `Backend/app/Http/Controllers/Api/UserController.php` (lines 58-60)
```php
// REMOVE this conversion - accept 'Business Owner' directly
if (($data['role'] ?? '') === 'Admin') {
    $data['role'] = 'Owner';
}
```
- DB enum uses `'Business Owner'`
- Frontend `ROLE_CONFIG` uses `'Cashier'` label
- **Decision:** Keep DB as `'Business Owner'`, update Frontend label to match

## Acceptance Criteria
- [ ] Cashier can create sales via POS
- [ ] Cashier cannot access `/owner/*`, `/inventory/*`, `/admin/*`
- [ ] Inventory cannot access `/owner/users`, `/owner/settings`, `/owner/reports`
- [ ] Owner has full access
- [ ] API services tree-shaken per role (bundle size reduced)
- [ ] No console errors on role-based navigation

## Dependencies
- None (can start immediately)

## Estimated Effort
- Backend policies: 2 hours
- Frontend routes verification: 1 hour
- API service split: 4 hours
- Testing: 2 hours
**Total: ~9 hours**