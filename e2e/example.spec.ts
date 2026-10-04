import { test, expect } from '@playwright/test';

/**
 * Basic smoke tests for the application
 */

test('application should load without critical errors', async ({ page }) => {
  // Navigate to the application
  await page.goto('/');

  // Verify the page loads successfully (no 404 or 500 errors)
  // This test will pass if the application starts and serves the login page
  await expect(page).not.toHaveTitle(/Error/);
  
  // Verify we get some content (not a blank page)
  const bodyContent = await page.textContent('body');
  expect(bodyContent).not.toBe('');
  expect(bodyContent).not.toBe(null);
});
