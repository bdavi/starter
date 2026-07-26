import { test, expect } from '@playwright/test';

test('renders the home page', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('h1')).toHaveText('Hello, world');
});
