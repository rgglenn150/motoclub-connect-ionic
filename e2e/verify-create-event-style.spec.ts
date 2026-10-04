
import { test, expect } from '@playwright/test';

test.describe('Create Event Page Styling Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and log in
    await page.goto('/');
    await page.click('ion-button[routerLink="/login"]');
    await page.fill('ion-input[formControlName="email"]', 'tubiglang@gmail.com');
    await page.fill('ion-input[formControlName="password"]', 'qwe123qwe');
    await page.click('ion-button[type="submit"]');
    await page.waitForURL('/home');
  });

  test('should navigate to create event page and have improved styling', async ({ page }) => {
    // Navigate to the first club's detail page
    await page.click('ion-tab-button[tab="clubs"]');
    await page.waitForURL('/clubs');
    await page.locator('app-club-card').first().click();
    
    // Get clubId from URL
    const url = page.url();
    const clubId = url.split('/').pop();
    expect(clubId).toBeDefined();

    // Navigate to create event page
    await page.click('ion-button#create-event-btn');
    await page.waitForURL(`/clubs/${clubId}/create-event`);

    // Assert that the title is correct
    await expect(page.locator('ion-title')).toHaveText('Create Event');

    // Take a screenshot to visually verify the styling
    await page.screenshot({ path: 'e2e/screenshots/create-event-page-new-style.png', fullPage: true });
  });
});
