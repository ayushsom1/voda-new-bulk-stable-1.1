// @ts-check
import { defineConfig, devices } from '@playwright/test';



/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  timeout: 7200000, // 60 minutes
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Optimize workers for batch processing */
  workers: process.env.CI ? 8 : 10,
  /* Configure for batch processing */
  maxFailures: 0,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    headless: true,
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'off',
    
    /* Increased timeouts for headless false mode */
    javaScriptEnabled: true,
    actionTimeout: 10000,
    navigationTimeout: 15000,
    
    /* Custom test runtime configuration */
    // runTime:  * 60 * 1000, // 3 minutes in milliseconds
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'Microsoft Edge',
      use: {
        channel: 'msedge', // This uses the Edge browser installed on your system
      },
    }

  ],

});

