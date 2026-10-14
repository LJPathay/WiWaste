import { defineConfig, devices } from '@playwright/test';

const BACKEND_URL = 'http://localhost:8000/api/v1/health';
const FRONTEND_URL = 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  // The Laravel API and the Vite dev server must both be up, and the suite mutates
  // real records (users, stock, wastage) — run serially to keep state predictable.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  globalSetup: './e2e/global-setup.ts',
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // The dashboards fan out to several API calls before they render anything,
  // so assertions need more headroom than Playwright's 5s default.
  expect: {
    timeout: 20_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'php artisan serve --host=127.0.0.1 --port=8000',
      cwd: '../Backend',
      url: BACKEND_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'npm run dev',
      url: FRONTEND_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});