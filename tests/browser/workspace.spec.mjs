import { expect, test } from '@playwright/test';

test('Workspace switches reproducible datasets, sorts entries, and recovers from empty searches', async ({ page }) => {
  await page.goto('/workspace/');
  const dataset = page.getByLabel('Dataset');
  const search = page.getByRole('searchbox', { name: 'Search activity' });
  const count = page.getByRole('status');
  const rows = page.locator('.workspace-table-region tbody tr');

  await expect(count).toHaveText('3 of 3 entries');
  await dataset.selectOption('empty');
  await expect(count).toHaveText('0 of 0 entries');
  await expect(page.getByText('This dataset has no activity.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear search' })).toBeHidden();

  await dataset.selectOption('crowded');
  await expect(count).toHaveText('36 of 36 entries');
  await expect(rows).toHaveCount(36);
  await expect(page.locator('[data-workspace-metric="entries"]')).toHaveText('36');
  await page.getByLabel('Sort by').selectOption('name');
  await expect(page.getByRole('columnheader', { name: 'Specimen' })).toHaveAttribute('aria-sort', 'ascending');
  await expect(rows.first()).toContainText('Canvas board');

  await search.fill('html');
  await expect(count).toHaveText('7 of 36 entries');
  await search.fill('table with purple fish');
  await expect(count).toHaveText('0 of 36 entries');
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(search).toBeFocused();
  await expect(rows).toHaveCount(36);
  await dataset.selectOption('typical');
  await expect(rows).toHaveCount(3);
  await dataset.selectOption('crowded');
  await expect(rows.first()).toContainText('Canvas board');
});

test('the crowded table retains sticky headers and local horizontal scrolling at narrow CSS widths', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.addInitScript(() => {
    localStorage.setItem('blueprint-preferences', JSON.stringify({ density: 'compact' }));
  });
  await page.goto('/workspace/');
  await page.getByLabel('Dataset').selectOption('crowded');
  const region = page.getByRole('region', { name: 'Activity table', exact: true });
  const regionBox = await region.boundingBox();
  const available = await page.evaluate(() => document.documentElement.clientWidth);
  expect(regionBox.x + regionBox.width).toBeLessThanOrEqual(available);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(available);
  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
  await region.focus();
  await region.press('ArrowRight');
  await expect.poll(() => region.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
  await region.evaluate(node => node.scrollTo({ top: 150, behavior: 'instant' }));
  await expect.poll(() => region.evaluate(node => {
    const header = node.querySelector('th');
    return Math.abs(header.getBoundingClientRect().top - node.getBoundingClientRect().top);
  })).toBeLessThan(3);
  await expect(page.getByLabel('Sort by')).toBeVisible();
});

test('both Workspace layout regions open references with keyboard controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/workspace/');
  await page.getByRole('button', { name: 'Inspect', exact: true }).click();
  const overview = page.getByRole('button', { name: 'Inspect Workspace overview grid' });
  await overview.press('Enter');
  const dock = page.getByRole('complementary', { name: 'Reference Dock' });
  await expect(dock.getByRole('heading', { name: 'Workspace overview grid' })).toBeVisible();
  await expect(dock.getByRole('heading', { name: 'Live layout' })).toBeVisible();
  await dock.getByRole('button', { name: 'Next specimen' }).click();
  await expect(dock.getByRole('heading', { name: 'Workspace activity table' })).toBeVisible();
  const preview = page.locator('.workspace-activity-preview');
  await expect(preview).toHaveClass(/inspect-selected/);
  await page.getByLabel('Dataset').selectOption('empty');
  await expect(preview.getByText('This dataset has no activity.', { exact: false })).toBeVisible();
  await expect(preview).toHaveClass(/inspect-selected/);
  await dock.getByRole('button', { name: 'Close reference' }).click();
  await expect(overview).toBeFocused();
});

test.describe('touch Workspace', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('the Activity region opens its reference as a sheet', async ({ page }) => {
    await page.goto('/workspace/');
    await page.getByRole('button', { name: 'Inspect', exact: true }).tap();
    const trigger = page.getByRole('button', { name: 'Inspect Workspace activity table' });
    await trigger.tap();
    const sheet = page.getByRole('dialog', { name: 'Reference Dock' });
    await expect(sheet.getByRole('heading', { name: 'Workspace activity table' })).toBeVisible();
    await sheet.getByRole('button', { name: 'Close reference' }).tap();
    await expect(trigger).toBeFocused();
  });
});

test.describe('plain Workspace HTML', () => {
  test.use({ javaScriptEnabled: false });

  test('the three typical rows and section links remain available', async ({ page }) => {
    await page.goto('/workspace/');
    await expect(page.getByLabel('Dataset')).toBeHidden();
    await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link', { name: 'Activity' }).click();
    await expect(page).toHaveURL(/#activity$/);
    await expect(page.locator('tbody tr')).toHaveCount(3);
    await expect(page.getByText('Container queries', { exact: true })).toBeVisible();
  });
});
