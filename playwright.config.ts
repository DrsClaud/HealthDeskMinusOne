import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Config
 * 
 * Currently tests against Storybook for component visualization tests.
 * TODO: Add separate config/project for real app E2E tests when ready.
 * 
 * Run: npm run test:e2e
 * Debug: npm run test:e2e:debug
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:6006',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start Storybook before running tests
  webServer: {
    command: 'npm run storybook',
    url: 'http://localhost:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
