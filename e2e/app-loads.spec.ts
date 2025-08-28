import { test, expect } from '@playwright/test';

test('app loads successfully', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:8100');
  
  // Wait for the app to load
  await page.waitForSelector('ion-app', { timeout: 10000 });
  
  // Check that the page title is correct
  await expect(page).toHaveTitle(/Motoclub Connect/);
  
  // Check that the app content is loaded
  await expect(page.locator('ion-app')).toBeVisible();
  
  // Check for any console errors
  let consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  // Wait a bit for any initial load errors
  await page.waitForTimeout(2000);
  
  // Log any console errors found
  if (consoleErrors.length > 0) {
    console.log('Console errors found:', consoleErrors);
  }
  
  console.log('App loaded successfully!');
});