import { test, expect } from '@playwright/test';

/**
 * This test suite validates basic application functionality.
 * Authentication-dependent tests have been temporarily removed due to 
 * credential dependency issues.
 */
test.describe('Basic Application Tests', () => {

  /**
   * Test that the login page loads correctly
   */
  test('should load login page correctly', async ({ page }) => {
    // Navigate to the root of the application, which should redirect to login
    await page.goto('/');

    // Wait for the login form to be visible
    await expect(page.getByRole('heading', { name: 'MotoClub Connect' })).toBeVisible();
    
    // Verify login form elements are present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    
    // Verify additional login page elements
    await expect(page.getByText('Sign in to join the ride')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with Facebook' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
  });

});
