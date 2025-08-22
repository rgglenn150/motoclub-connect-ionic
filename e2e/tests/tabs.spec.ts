import { test, expect } from '@playwright/test';

/**
 * This test suite validates the main home page (Tab 1).
 */
test.describe('Tab 1 (Home Page)', () => {

  /**
   * This test verifies that after logging in, the page loads correctly, 
   * and the dashboard content is rendered.
   */
  test('should load correctly and display the dashboard after login', async ({ page }) => {
    // 1. Navigate to the root of the application, which should redirect to login
    await page.goto('/');

    // --- Start of Login Steps ---
    // Wait for the login form to be visible before interacting with it.
    await expect(page.getByRole('heading', { name: 'MotoClub Connect' })).toBeVisible();

    // Fill in the login credentials. 
    // IMPORTANT: Replace with your actual test user's email and password.
    await page.locator('input[type="email"]').fill('rgmadredano@gmail.com');
    await page.locator('input[type="password"]').fill('qwe');

    // Click the login button.
    await page.getByRole('button', { name: 'Login' }).click();
    // --- End of Login Steps ---


    // 2. **Wait for a unique element on the dashboard to be visible.**
    // This is the most reliable way to ensure the home page has loaded
    // after the login redirect is complete. This assertion is sufficient
    // to confirm a successful login and page load.
    await expect(page.getByRole('heading', { name: 'YOUR NEXT RIDE' })).toBeVisible();

    // 3. Verify that the "Home" tab is selected by checking for the 'tab-selected' class.
    const homeTab = page.locator('ion-tab-button', { hasText: 'Home' });
    await expect(homeTab).toHaveClass(/tab-selected/);
  });

});
