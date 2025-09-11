import { test as base, Page } from '@playwright/test';
import { login, logout, clearAuthData, TEST_CREDENTIALS, TestCredentials } from '../test-utils/auth';

// Extend the base test with custom fixtures
type AuthFixtures = {
  authenticatedPage: Page;
  loginPage: Page;
};

/**
 * Custom Playwright fixture for authenticated pages
 * This automatically logs in the user before each test and cleans up after
 */
export const test = base.extend<AuthFixtures>({
  // Fixture for a page that's automatically authenticated
  authenticatedPage: async ({ page }, use) => {
    // Setup: Login before test
    await login(page, TEST_CREDENTIALS);
    
    // Use the authenticated page in the test
    await use(page);
    
    // Teardown: Clear auth data after test
    await clearAuthData(page);
  },

  // Fixture for login page testing (no automatic authentication)
  loginPage: async ({ page }, use) => {
    // Navigate to login page
    await page.goto('/auth/login');
    
    // Use the page in the test
    await use(page);
    
    // Teardown: Clear auth data after test
    await clearAuthData(page);
  }
});

/**
 * Test with custom credentials
 * Use this when you need to test with different user credentials
 */
export function testWithCredentials(credentials: TestCredentials) {
  return base.extend<{ authenticatedPageWithCredentials: Page }>({
    authenticatedPageWithCredentials: async ({ page }, use) => {
      // Setup: Login with custom credentials
      await login(page, credentials);
      
      // Use the authenticated page in the test
      await use(page);
      
      // Teardown: Clear auth data after test
      await clearAuthData(page);
    }
  });
}

export { expect } from '@playwright/test';