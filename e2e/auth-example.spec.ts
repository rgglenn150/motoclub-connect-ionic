import { test, expect } from './fixtures/auth-fixture';
import { TEST_CREDENTIALS } from './test-utils/auth';

test.describe('Authentication Examples', () => {
  
  test('should access authenticated pages using fixture', async ({ authenticatedPage }) => {
    // This test automatically starts with an authenticated user
    // No need to manually login - the fixture handles it
    
    // Navigate to a protected page
    await authenticatedPage.goto('/tabs/home');
    
    // Verify we can access authenticated content
    await expect(authenticatedPage.locator('ion-tab-bar')).toBeVisible();
    // Home page doesn't have ion-title, check for main content instead
    await expect(authenticatedPage.locator('h1').first()).toBeVisible();
  });

  test('should test login functionality', async ({ loginPage }) => {
    // This test starts at the login page
    
    // Verify login form is present
    await expect(loginPage.locator('ion-input[name="email"]')).toBeVisible();
    await expect(loginPage.locator('ion-input[name="password"]')).toBeVisible();
    
    // Fill in credentials - Ionic inputs require targeting the native input element
    await loginPage.locator('ion-input[name="email"] input').fill(TEST_CREDENTIALS.email);
    await loginPage.locator('ion-input[name="password"] input').fill(TEST_CREDENTIALS.password);
    
    // Submit login
    await loginPage.click('ion-button[type="submit"]');
    
    // Verify successful login
    await loginPage.waitForURL(/\/(home|dashboard|tabs)/);
    await expect(loginPage.locator('ion-tab-bar')).toBeVisible();
  });

  test('should access user profile', async ({ authenticatedPage }) => {
    // Navigate to profile page
    await authenticatedPage.goto('/tabs/profile');
    
    // Verify profile page elements
    await expect(authenticatedPage.locator('ion-content')).toBeVisible();
    
    // Check for user-specific content - profile page elements
    await expect(authenticatedPage.locator('.profile-photo-button')).toBeVisible();
    await expect(authenticatedPage.locator('h1')).toContainText(/rider|glenn|user/i);
  });

  test('should access clubs page', async ({ authenticatedPage }) => {
    // Navigate to clubs page
    await authenticatedPage.goto('/tabs/clubs');
    
    // Verify clubs page loaded
    await expect(authenticatedPage.locator('ion-content')).toBeVisible();
    await expect(authenticatedPage.locator('ion-header ion-title').first()).toContainText('Clubs');
  });

  test('should access events page', async ({ authenticatedPage }) => {
    // Navigate to events page
    await authenticatedPage.goto('/tabs/events');
    
    // Verify events page loaded
    await expect(authenticatedPage.locator('ion-content')).toBeVisible();
    await expect(authenticatedPage.locator('ion-header ion-title').first()).toContainText('Events');
  });
});