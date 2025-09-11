import { Page, expect } from '@playwright/test';

export interface TestCredentials {
  email: string;
  password: string;
}

/**
 * Test credentials from environment variables
 */
export const TEST_CREDENTIALS: TestCredentials = {
  email: process.env.TEST_USER_EMAIL || 'tubiglang@gmail.com',
  password: process.env.TEST_USER_PASSWORD || 'qwe123qwe'
};

/**
 * Login to the application using test credentials
 * @param page - Playwright page object
 * @param credentials - Optional custom credentials, defaults to TEST_CREDENTIALS
 */
export async function login(page: Page, credentials: TestCredentials = TEST_CREDENTIALS) {
  // Navigate to login page
  await page.goto('/auth/login');
  
  // Wait for login form to be visible
  await page.waitForSelector('ion-input[name="email"]');
  
  // Fill in email
  await page.fill('ion-input[name="email"] input', credentials.email);
  
  // Fill in password
  await page.fill('ion-input[name="password"] input', credentials.password);
  
  // Click login button
  await page.click('ion-button[type="submit"]');
  
  // Wait for successful login (redirect to home or dashboard)
  await page.waitForURL(/\/(home|dashboard|tabs)/);
  
  // Verify we're logged in by checking for user-specific elements
  await expect(page.locator('ion-tab-bar')).toBeVisible();
}

/**
 * Logout from the application
 * @param page - Playwright page object
 */
export async function logout(page: Page) {
  // Navigate to profile/settings page
  await page.goto('/tabs/profile');
  
  // Wait for profile page to load
  await page.waitForSelector('ion-content');
  
  // Look for logout button (adjust selector based on your UI)
  const logoutButton = page.locator('ion-button:has-text("Logout"), ion-item:has-text("Logout")');
  
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    
    // Wait for redirect to login page
    await page.waitForURL(/\/auth\/login/);
  }
}

/**
 * Check if user is currently logged in
 * @param page - Playwright page object
 * @returns boolean indicating if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    // Check for presence of tab bar or other authenticated UI elements
    await page.waitForSelector('ion-tab-bar', { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure user is logged in before running test
 * @param page - Playwright page object
 * @param credentials - Optional custom credentials
 */
export async function ensureLoggedIn(page: Page, credentials: TestCredentials = TEST_CREDENTIALS) {
  const loggedIn = await isLoggedIn(page);
  
  if (!loggedIn) {
    await login(page, credentials);
  }
}

/**
 * Clear all authentication data (localStorage, sessionStorage, cookies)
 * @param page - Playwright page object
 */
export async function clearAuthData(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // Clear cookies
  const context = page.context();
  await context.clearCookies();
}