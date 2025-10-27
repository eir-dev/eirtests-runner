import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for EirTests Runner
 *
 * This config is used when executing tests fetched from EirTests SaaS.
 * Environment variables are injected at runtime from your secrets provider.
 */
export default defineConfig({
  testDir: '/tmp',  // Tests written to temp directory at runtime
  testMatch: /.*\.spec\.ts$/,

  /* Maximum time one test can run for */
  timeout: 30 * 1000,

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : parseInt(process.env.EIRTESTS_RETRIES || '2'),

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list'],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL from environment */
    baseURL: process.env.BASE_URL,

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',

    /* Maximum time each action can take */
    actionTimeout: 10 * 1000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
