import { expect, test } from '@playwright/test';

test('the card simulation and live measurements share the rendered grid', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/components/#responsive-card');
  const dock = page.getByRole('complementary', { name: 'Reference Dock' });
  const toggle = dock.getByRole('button', { name: 'Show fallback' });
  const behavior = dock.getByRole('region', { name: 'Behavior preview' });
  const readout = page.locator('#preview-width-output');
  const tracks = page.locator('#responsive-card .measurement-columns > span');

  await expect(readout).toContainText('Two columns');
  await expect(behavior.getByRole('status')).toHaveText('Enhanced behavior active.');
  await toggle.press('Space');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(behavior.getByRole('status')).toContainText('Fallback simulation is on.');
  await expect(readout).toContainText('Stacked');
  await expect(tracks).toHaveCount(1);
  await expect(dock.locator('dt', { hasText: /^Layout$/ }).locator('+ dd')).toHaveText('Stacked');

  await toggle.press('Enter');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(readout).toContainText('Two columns');
  await expect(tracks).toHaveCount(2);

  await page.goto('/playground/#canvas-2d');
  await expect(page.getByRole('button', { name: 'Show fallback' })).toBeHidden();
});

test.describe('touch layouts', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the native modal and inline disclosure remain operable after switching paths', async ({ page }) => {
    await page.goto('/components/#native-dialog');
    const sheet = page.getByRole('dialog', { name: 'Reference Dock' });
    const inspect = page.getByRole('button', { name: 'Inspect Native dialog' });
    const modalButton = page.getByRole('button', { name: 'Open dialog' });
    const disclosure = page.getByText('Read the dialog content', { exact: true });
    await sheet.getByRole('button', { name: 'Show fallback' }).tap();
    await expect(sheet.getByRole('status').filter({ hasText: 'Fallback simulation' })).toBeVisible();
    await sheet.getByRole('button', { name: 'Close reference' }).tap();
    await expect(inspect).toBeFocused();
    await expect(modalButton).toBeHidden();
    await disclosure.tap();
    await expect(page.locator('#dialog-fallback')).toHaveAttribute('open', '');
    await disclosure.press('Enter');
    await expect(page.locator('#dialog-fallback')).not.toHaveAttribute('open', '');

    await inspect.tap();
    await sheet.getByRole('button', { name: 'Show fallback' }).tap();
    await sheet.getByRole('button', { name: 'Close reference' }).tap();
    await expect(inspect).toBeFocused();
    await expect(disclosure).toBeHidden();
    await modalButton.tap();
    await expect(page.getByRole('dialog', { name: 'A native dialog.' })).toBeVisible();
    await page.getByRole('button', { name: 'Close dialog' }).tap();
    await expect(modalButton).toBeFocused();
  });
});

test('clearing simulation preserves real browser limits', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'CSSContainerRule', { value: undefined });
    HTMLDialogElement.prototype.showModal = undefined;
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/components/#responsive-card');
  const dock = page.getByRole('complementary', { name: 'Reference Dock' });
  const toggle = dock.getByRole('button', { name: 'Show fallback' });
  const behavior = dock.getByRole('region', { name: 'Behavior preview' });

  await expect(behavior.getByRole('status')).toContainText('does not support size container queries');
  await toggle.click();
  await toggle.click();
  await expect(behavior.getByRole('status')).toHaveText('Fallback active. This browser does not support size container queries.');
  await expect(page.locator('#preview-width-output')).toContainText('Stacked');

  await dock.getByRole('button', { name: 'Next specimen' }).click();
  await expect(behavior.getByRole('status')).toContainText('does not support native modal dialogs');
  await toggle.click();
  await toggle.click();
  await expect(page.getByText('Read the dialog content', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open dialog' })).toBeHidden();
});

test('motion preserves its static selected state for system and Blueprint preferences', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/components/#layer-shift');
  const dock = page.getByRole('complementary', { name: 'Reference Dock' });
  const toggle = dock.getByRole('button', { name: 'Show fallback' });
  const behavior = dock.getByRole('region', { name: 'Behavior preview' });
  const activeLayer = page.locator('.lab-motion-art i').last();
  await page.getByRole('checkbox', { name: 'Shift layers' }).check();
  await expect(activeLayer).not.toHaveCSS('translate', 'none');
  await toggle.click();
  await expect(activeLayer).toHaveCSS('translate', 'none');
  await expect(activeLayer).toHaveCSS('background-color', 'rgb(32, 94, 80)');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await toggle.click();
  await expect(behavior.getByRole('status')).toHaveText('Fallback active. System preference requests reduced motion.');
  await expect(activeLayer).toHaveCSS('translate', 'none');

  await page.evaluate(() => {
    localStorage.setItem('blueprint-preferences', JSON.stringify({ reduceMotion: true }));
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await page.getByRole('checkbox', { name: 'Shift layers' }).check();
  await toggle.click();
  await toggle.click();
  await expect(behavior.getByRole('status')).toHaveText('Fallback active. Blueprint preference requests reduced motion.');
  await expect(activeLayer).toHaveCSS('translate', 'none');
});
