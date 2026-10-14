# Implementation Plan: Comprehensive Test Suite

## Overview
Implement frontend (Vitest + Playwright) and backend (PHPUnit + k6) test suites covering all roles, security, and performance requirements.

## Current State
- Frontend: 2 basic test files (`api.test.ts`, `useDashboardData.test.ts`)
- Backend: 5 test files (ExampleTest, ForecastTest, LossRiskTest, OptimizationTest, InventorySyncTest)
- No E2E tests, no load tests, no security tests

---

## 4.1 Frontend Unit & Component Tests (Vitest + RTL)

### Structure
```
Frontend/src/
├── __tests__/
│   ├── setup.ts                    # Vitest setup (jsdom, mocks)
│   ├── test-utils.tsx              # Render with providers
│   ├── mocks/
│   │   ├── handlers.ts             # MSW request handlers
│   │   └── server.ts               # MSW server setup
│   ├── unit/
│   │   ├── hooks/
│   │   │   ├── useAuth.test.ts
│   │   │   ├── useDashboardData.test.ts
│   │   │   └── useApi.test.ts
│   │   ├── services/
│   │   │   └── api.test.ts
│   │   └── utils/
│   │       ├── cashierData.test.ts
│   │       └── formatters.test.ts
│   ├── components/
│   │   ├── auth/
│   │   │   └── ProtectedRoute.test.tsx
│   │   ├── ui/
│   │   │   ├── Toast.test.tsx
│   │   │   ├── DataTable.test.tsx
│   │   │   └── ErrorBoundary.test.tsx
│   │   └── forms/
│   │       └── FormField.test.tsx
│   └── integration/
│       ├── auth-flow.test.tsx
│       └── pos-checkout.test.tsx
```

### Key Test Files

#### `Frontend/src/__tests__/setup.ts`
```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch
global.fetch = vi.fn();

// Mock react-router
vi.mock('react-router-dom', () => ({
  ...vi.requireActual('react-router-dom'),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
}));

// Cleanup
afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReset();
  localStorageMock.setItem.mockReset();
});
```

#### `Frontend/src/__tests__/unit/hooks/useAuth.test.ts`
```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from '../../../hooks/useAuth';
import { auth } from '../../../services/api';

vi.mock('../../../services/api', () => ({
  auth: {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    refresh: vi.fn(),
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('logs in user and stores token', async () => {
    const mockUser = { id: 1, name: 'Test', email: 'test@test.com', role: 'Cashier' };
    auth.login.mockResolvedValue({ data: { access_token: 'token123', user: mockUser } });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.login('testuser', 'password123');
    });

    expect(result.current.user?.role).toBe('cashier');
    expect(localStorage.setItem).toHaveBeenCalledWith('wiwaste_token', 'token123');
  });

  it('redirects to login on 401', async () => {
    auth.me.mockRejectedValue(new Error('Session expired'));
    const { result } = renderHook(() => useAuth());
    
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('maps backend roles correctly', async () => {
    const roleTests = [
      { apiRole: 'Owner', expected: 'owner' },
      { apiRole: 'Inventory', expected: 'inventory' },
      { apiRole: 'Cashier', expected: 'cashier' },
      { apiRole: 'Business Owner', expected: 'owner' }, // Edge case
    ];

    for (const { apiRole, expected } of roleTests) {
      auth.me.mockResolvedValue({ role: apiRole, email: 'test@test.com', name: 'Test', id: 1 });
      const { result, rerender } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.user?.role).toBe(expected);
    }
  });
});
```

#### `Frontend/src/__tests__/integration/pos-checkout.test.tsx`
```typescript
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { POSTerminal } from '../../pages/cashier/POSTerminal';
import { sales, products } from '../../services/api';

vi.mock('../../services/api', () => ({
  sales: { create: vi.fn() },
  products: { list: vi.fn().mockResolvedValue({ data: [] }) },
}));

const renderPOS = () => render(
  <BrowserRouter>
    <POSTerminal />
  </BrowserRouter>
);

describe('POS Checkout Flow', () => {
  it('completes cash sale with barcode scan', async () => {
    const mockProduct = { 
      product_id: 'P-1', 
      product_name: 'Paracetamol 500mg', 
      barcode: '123456', 
      selling_price: 10.50, 
      current_stock: 100 
    };
    
    products.list.mockResolvedValue({ data: [mockProduct] });
    sales.create.mockResolvedValue({ transaction_id: 'TXN-001' });

    renderPOS();
    
    // Wait for catalog load
    await waitFor(() => screen.getByText('Paracetamol 500mg'));
    
    // Simulate barcode scan
    const input = screen.getByPlaceholderText(/scan barcode/i);
    fireEvent.change(input, { target: { value: '123456' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    // Verify added to cart
    await waitFor(() => expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument());
    
    // Proceed to checkout
    fireEvent.click(screen.getByText('Proceed to Checkout'));
    await waitFor(() => screen.getByText('CASH'));
    
    // Tender cash
    const tenderInput = screen.getByPlaceholderText(/amount tendered/i);
    fireEvent.change(tenderInput, { target: { value: '20' } });
    fireEvent.click(screen.getByText('Complete Payment'));
    
    // Verify API called
    await waitFor(() => expect(sales.create).toHaveBeenCalledWith(
      expect.objectContaining({ payment_method: 'Cash' })
    ));
  });
});
```

---

## 4.2 Frontend E2E Tests (Playwright)

### Config: `Frontend/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

### Test Files: `Frontend/e2e/`

```
e2e/
├── auth/
│   ├── login.spec.ts
│   ├── logout.spec.ts
│   └── forgot-password.spec.ts
├── cashier/
│   ├── pos-sale.spec.ts
│   ├── pos-return.spec.ts
│   └── pos-history.spec.ts
├── inventory/
│   ├── stock-in.spec.ts
│   ├── wastage-record.spec.ts
│   ├── fefo-tracking.spec.ts
│   └── stock-receiving.spec.ts
├── owner/
│   ├── user-management.spec.ts
│   ├── reports.spec.ts
│   └── settings.spec.ts
└── performance/
    └── load-times.spec.ts
```

#### Example: `e2e/cashier/pos-sale.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Cashier POS Sale', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'cashier');
    await page.fill('[name="password"]', 'cashier123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/cashier\/pos/);
  });

  test('completes cash sale with barcode scanner', async ({ page }) => {
    // Scan product
    await page.fill('input[placeholder*="barcode"]', 'PARACETAMOL-500');
    await page.keyboard.press('Enter');
    
    // Verify item added
    await expect(page.locator('text=Paracetamol 500mg')).toBeVisible();
    await expect(page.locator('text=₱10.50')).toBeVisible();
    
    // Checkout
    await page.click('button:has-text("Proceed to Checkout")');
    await expect(page.locator('text=CASH')).toBeVisible();
    
    // Tender cash
    await page.fill('input[placeholder*="tendered"]', '20');
    await page.click('button:has-text("Complete Payment")');
    
    // Verify receipt
    await expect(page.locator('text=Receipt')).toBeVisible({ timeout: 10000 });
  });

  test('applies senior discount', async ({ page }) => {
    await page.fill('input[placeholder*="barcode"]', 'PARACETAMOL-500');
    await page.keyboard.press('Enter');
    
    // Select item and apply discount
    await page.click('[data-testid="cart-item-0"]');
    await page.click('button:has-text("Discount")');
    await page.click('button:has-text("Senior/PWD")');
    await page.fill('input[name="seniorName"]', 'Juan Dela Cruz');
    await page.fill('input[name="seniorId"]', 'SC-12345');
    await page.click('button:has-text("Confirm")');
    
    // Verify 20% discount applied
    await expect(page.locator('text=-20%')).toBeVisible();
  });
});
```

---

## 4.3 Backend Tests (PHPUnit)

### Structure
```
Backend/tests/
├── Unit/
│   ├── Policies/
│   │   ├── SalesPolicyTest.php
│   │   ├── CashierPolicyTest.php
│   │   ├── UserPolicyTest.php
│   │   └── InventoryPolicyTest.php
│   ├── Services/
│   │   ├── LoginAttemptServiceTest.php
│   │   └── ReorderServiceTest.php
│   └── Middleware/
│       ├── RateLimitMiddlewareTest.php
│       └── DdosProtectionMiddlewareTest.php
├── Feature/
│   ├── Auth/
│   │   ├── LoginTest.php
│   │   ├── ForgotPasswordTest.php
│   │   └── ResetPasswordTest.php
│   ├── API/
│   │   ├── SalesTransactionTest.php
│   │   ├── InventoryTest.php
│   │   └── UserManagementTest.php
│   └── Security/
│       └── RateLimitTest.php
└── Integration/
    └── MlServiceIntegrationTest.php
```

#### `Backend/tests/Feature/Auth/ForgotPasswordTest.php`

```php
<?php

namespace Tests\Feature\Auth;

use Tests\TestCase;
use App\Models\User;
use App\Models\PasswordResetOtp;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use App\Mail\PasswordResetOtpMail;

class ForgotPasswordTest extends TestCase
{
    public function test_forgot_password_sends_otp_email(): void
    {
        $user = User::factory()->create(['email' => 'test@example.com']);
        Mail::fake();

        $response = $this->postJson('/api/v1/password/forgot', [
            'email' => 'test@example.com',
        ]);

        $response->assertOk();
        Mail::assertSent(PasswordResetOtpMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email) && strlen($mail->otp) === 6;
        });
    }

    public function test_verify_otp_valid_code(): void
    {
        $user = User::factory()->create(['email' => 'test@example.com']);
        $otp = '123456';
        
        PasswordResetOtp::create([
            'email' => $user->email,
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(10),
        ]);

        $response = $this->postJson('/api/v1/password/verify-otp', [
            'email' => $user->email,
            'otp' => $otp,
        ]);

        $response->assertOk()
            ->assertJson(['verified' => true]);
    }

    public function test_reset_password_with_valid_otp(): void
    {
        $user = User::factory()->create(['email' => 'test@example.com', 'password' => Hash::make('oldpass')]);
        $otp = '123456';
        
        PasswordResetOtp::create([
            'email' => $user->email,
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(10),
        ]);

        $response = $this->postJson('/api/v1/password/reset', [
            'email' => $user->email,
            'otp' => $otp,
            'password' => 'NewPass123!',
            'password_confirmation' => 'NewPass123!',
        ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('NewPass123!', $user->fresh()->password));
    }

    public function test_rate_limits_forgot_password(): void
    {
        for ($i = 0; $i < 4; $i++) {
            $this->postJson('/api/v1/password/forgot', ['email' => 'test@example.com'])
                ->assertOk();
        }
        
        $this->postJson('/api/v1/password/forgot', ['email' => 'test@example.com'])
            ->assertStatus(429);
    }
}
```

#### `Backend/tests/Feature/Security/RateLimitTest.php`

```php
<?php

namespace Tests\Feature\Security;

use Tests\TestCase;
use App\Models\User;

class RateLimitTest extends TestCase
{
    public function test_cashier_rate_limits(): void
    {
        $cashier = User::factory()->create(['role' => 'Cashier']);
        
        // Cashier base: 300 read/hr, 100 write/hr with 2x burst
        for ($i = 0; $i < 600; $i++) { // 2x burst
            $response = $this->actingAs($cashier)->getJson('/api/v1/inventory');
            if ($i < 600) $response->assertOk();
        }
        
        // 601st should be rate limited
        $this->actingAs($cashier)->getJson('/api/v1/inventory')->assertStatus(429);
    }

    public function test_adaptive_rate_limiting_reduces_on_errors(): void
    {
        $user = User::factory()->create(['role' => 'Owner']);
        
        // Generate 4xx errors
        for ($i = 0; $i < 20; $i++) {
            $this->actingAs($user)->postJson('/api/v1/products', [])->assertStatus(422);
        }
        
        // Subsequent requests should have reduced limits
        // (behavior score < 0.5 after 50% error rate)
        $this->actingAs($user)->getJson('/api/v1/inventory')->assertStatus(429);
    }

    public function test_login_rate_limiting(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/v1/login', ['username' => 'invalid', 'password' => 'wrong'])
                ->assertStatus(422);
        }
        
        // 11th attempt should be rate limited
        $this->postJson('/api/v1/login', ['username' => 'invalid', 'password' => 'wrong'])
            ->assertStatus(429);
    }
}
```

---

## 4.4 Load Testing (k6)

### File: `Backend/k6/load-test.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Steady state
    { duration: '2m', target: 200 },  // Stress
    { duration: '5m', target: 200 },  // Steady state
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const TOKEN = __ENV.AUTH_TOKEN || '';

const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  ...(TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : {}),
};

export default function () {
  const endpoints = [
    { name: 'health', url: '/api/v1/health', weight: 10 },
    { name: 'inventory', url: '/api/v1/inventory', weight: 30 },
    { name: 'products', url: '/api/v1/products', weight: 20 },
    { name: 'dashboard', url: '/api/v1/dashboard/overview', weight: 15 },
    { name: 'sales', url: '/api/v1/sales', weight: 15 },
    { name: 'analytics', url: '/api/v1/analytics/dashboard-summary', weight: 10 },
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE_URL}${endpoint.url}`, { headers });
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
  sleep(Math.random() * 2);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
  };
}
```

### File: `Backend/k6/pos-stress-test.js`

```javascript
// POS-specific stress test: simulate 50 cashiers making sales simultaneously
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 50,
  duration: '3m',
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
  // Login first
  const loginRes = http.post(`${BASE_URL}/api/v1/login`, 
    JSON.stringify({ username: `cashier${__VU}`, password: 'cashier123' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  if (loginRes.status !== 200) return;
  
  const token = loginRes.json('data.access_token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  
  // Create sale
  const salePayload = {
    payment_method: 'Cash',
    amount_tendered: 100,
    change_due: 10,
    items: [{ product_id: 1, quantity: 1, unit_price: 90 }]
  };
  
  const saleRes = http.post(`${BASE_URL}/api/v1/sales`, 
    JSON.stringify(salePayload), 
    { headers }
  );
  
  check(saleRes, {
    'sale created': (r) => r.status === 201,
    'sale response < 500ms': (r) => r.timings.duration < 500,
  });
}
```

---

## 4.5 CI/CD Integration

### GitHub Actions: `.github/workflows/test.yml`

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run test -- --run
      - run: npm run test:coverage

  backend-tests:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: secret
          MYSQL_DATABASE: testing
        ports: [3306:3306]
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with: { php-version: '8.3', extensions: mbstring, pdo_mysql }
      - run: composer install --prefer-dist --no-progress
      - run: cp .env.example .env && php artisan key:generate
      - run: php artisan migrate --force
      - run: php artisan test --coverage

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [frontend-tests, backend-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run preview -- --port 5173 &
      - run: npx playwright test

  load-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.2.0
        with:
          filename: k6/load-test.js
          env: BASE_URL=https://staging.example.com
```

---

## 4.6 Lighthouse CI (Frontend Performance)

### File: `.github/workflows/lighthouse.yml`

```yaml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci && npm run build
      - run: npx http-server dist -p 5173 &
      - uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:5173/cashier/pos
            http://localhost:5173/dashboard
            http://localhost:5173/inventory/manage
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

### File: `Frontend/lighthouse-budget.json`

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.8 }]
      }
    }
  }
}
```

---

## Acceptance Criteria
- [ ] Frontend unit tests: > 80% coverage (hooks, services, utils)
- [ ] Frontend component tests: Critical paths (auth, POS, ProtectedRoute)
- [ ] Playwright E2E: 15 scenarios (5 per role) passing
- [ ] Backend unit tests: > 85% coverage (policies, services, middleware)
- [ ] Backend feature tests: All API endpoints covered
- [ ] k6 load test: 1000 req/s sustained, p99 < 200ms
- [ ] Lighthouse CI: Performance > 90 on all key pages
- [ ] All tests run in CI on every PR

## Estimated Effort
- Vitest unit/component: 16 hours
- Playwright E2E: 20 hours
- PHPUnit backend: 20 hours
- k6 load tests: 8 hours
- CI/CD setup: 8 hours
**Total: ~72 hours**