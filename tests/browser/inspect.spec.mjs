import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

async function openCard(page) {
  await page.goto('/components/');
  await page.getByRole('button', { name: 'Inspect a specimen' }).click();
  await expect(page.locator('.dock-title')).toHaveText('Responsive card');
}

test('desktop keeps the live card visible and supports keyboard selection, references, and focus return', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openCard(page);
  const dock = page.getByRole('complementary', { name: 'Reference Dock' });
  await expect(dock).toBeVisible();
  await expect(dock.locator('.dock-title')).toBeFocused();
  await expect(dock.getByText('Progressive enhancement', { exact: true })).toBeVisible();
  await expect(dock.getByRole('heading', { name: 'Fallback' })).toBeVisible();
  await expect(dock.getByRole('link', { name: 'Container queries' })).toHaveAttribute('href', /developer\.mozilla\.org/);
  const [stageBox, dockBox] = await Promise.all([page.locator('.lab-card-stage').boundingBox(), dock.boundingBox()]);
  expect(stageBox.x + stageBox.width).toBeLessThan(dockBox.x);
  expect(stageBox.y).toBeGreaterThanOrEqual(0);

  const filePromise = page.waitForEvent('download');
  await dock.getByRole('link', { name: 'Download file' }).click();
  const file = await filePromise;
  expect(file.suggestedFilename()).toBe('specimens.css');
  expect(await readFile(await file.path(), 'utf8')).toContain('@container (min-width: 550px)');

  await dock.getByRole('button', { name: 'Next specimen' }).click();
  await expect(dock.locator('.dock-title')).toHaveText('Native dialog');
  await page.getByRole('button', { name: 'Open dialog' }).click();
  await expect(page.getByRole('dialog', { name: 'A native dialog.' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open dialog' })).toBeFocused();
  await expect(dock).toBeVisible();

  const motion = page.getByRole('button', { name: 'Inspect Layer shift' });
  await motion.focus();
  await page.keyboard.press('Enter');
  await expect(dock.locator('.dock-title')).toHaveText('Layer shift');
  await page.keyboard.press('Escape');
  await expect(dock).toBeHidden();
  await expect(motion).toBeFocused();

  const preview = page.getByRole('slider', { name: 'Preview width' });
  await preview.press('Home');
  await expect(page.locator('#preview-width-output')).toContainText('Stacked');
  await preview.press('End');
  await expect(page.locator('#preview-width-output')).toContainText('Two columns');

  await motion.click();
  await page.getByRole('button', { name: 'Wireframe' }).click();
  await expect(dock).toBeHidden();
  await expect(motion).toBeHidden();
  await page.getByRole('link', { name: 'Preferences', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Wireframe' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Inspect', exact: true }).click();
  await page.getByRole('link', { name: 'Open specimens' }).click();
  await expect(page.getByRole('button', { name: 'Inspect Responsive card' })).toBeVisible();
});

test.describe('touch layout', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('the sheet contains focus, restores it on close, and follows viewport changes', async ({ page }) => {
    await page.goto('/components/');
    const start = page.getByRole('button', { name: 'Inspect a specimen' });
    await start.tap();
    const sheet = page.getByRole('dialog', { name: 'Reference Dock' });
    await expect(sheet).toBeVisible();
    expect(await sheet.evaluate(el => el.matches(':modal'))).toBe(true);
    await start.evaluate(el => el.focus());
    await expect(start).not.toBeFocused();
    await sheet.getByRole('button', { name: 'Next specimen' }).tap();
    await expect(sheet.locator('.dock-title')).toHaveText('Native dialog');
    await sheet.getByRole('button', { name: 'Close reference' }).tap();
    await expect(start).toBeFocused();

    const motion = page.getByRole('button', { name: 'Inspect Layer shift' });
    await motion.tap();
    await page.setViewportSize({ width: 1200, height: 820 });
    await expect(page.locator('.reference-dock .dock-title')).toHaveText('Layer shift');
    await expect(sheet).toBeHidden();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(sheet.locator('.dock-title')).toHaveText('Layer shift');
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(motion).toBeFocused();
  });
});

test('reduced motion preserves the selected state without shifting the plates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/components/');
  await page.getByRole('checkbox', { name: 'Shift layers' }).check();
  const topLayer = page.locator('.lab-motion-art i').last();
  await expect(topLayer).toHaveCSS('translate', 'none');
  await expect(topLayer).toHaveCSS('background-color', 'rgb(32, 94, 80)');
  await page.getByRole('button', { name: 'Inspect a specimen' }).click();
  await expect(page.locator('.reference-sheet')).toHaveCSS('animation-name', 'none');
});

test('the fixed dock and inline disclosure cover unavailable browser APIs', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLDialogElement.prototype.showModal = undefined;
    HTMLElement.prototype.showPopover = undefined;
  });
  await page.setViewportSize({ width: 390, height: 800 });
  await openCard(page);
  await expect(page.locator('.reference-dock')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Inspect a specimen' })).toBeFocused();
  await page.getByText('Read the dialog content').click();
  await expect(page.locator('#dialog-fallback p')).toBeVisible();
});
