import { expect, test } from '@playwright/test';

const measure = (dock, field) => dock.locator('dt', { hasText: new RegExp(`^${field}$`) }).locator('+ dd');

test('the card draws live tracks in Wireframe and reports the same layout in Inspect', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/components/');
  const preview = page.getByRole('slider', { name: 'Preview width' });
  const grid = page.locator('.lab-adaptive');
  const overlay = grid.locator('.measurement-overlay');

  await expect(overlay).toBeHidden();
  await page.getByRole('button', { name: 'Wireframe' }).click();
  await preview.press('Home');
  await expect(overlay.locator('.measurement-label')).toContainText('Stacked · 550 px breakpoint');
  await expect(overlay.locator('.measurement-columns > span')).toHaveCount(1);
  await expect(overlay.locator('.measurement-rows > span')).toHaveCount(2);
  await preview.press('End');
  await expect(overlay.locator('.measurement-label')).toContainText('Two columns · 550 px breakpoint');
  await expect(overlay.locator('.measurement-columns > span')).toHaveCount(2);
  await expect(overlay.locator('.measurement-rows > span')).toHaveCount(1);
  const [track, content] = await Promise.all([
    overlay.locator('.measurement-columns > span').nth(1).boundingBox(),
    grid.locator('.lab-card-copy').boundingBox(),
  ]);
  expect(Math.abs(track.x - content.x)).toBeLessThan(1);

  await page.getByRole('button', { name: 'Inspect a specimen' }).click();
  const dock = page.getByRole('complementary', { name: 'Reference Dock' });
  await expect(measure(dock, 'Breakpoint')).toHaveText('550 px');
  await expect(measure(dock, 'Layout')).toHaveText('Two columns');
  const widthWithDock = await measure(dock, 'Container width').innerText();
  await preview.press('Home');
  await expect(measure(dock, 'Layout')).toHaveText('Stacked');
  await expect(measure(dock, 'Column tracks')).toHaveText(/^\d+(\.\d+)? px$/);
  await preview.press('End');
  await expect(measure(dock, 'Container width')).toHaveText(widthWithDock);

  await page.mouse.wheel(0, 160);
  await expect.poll(async () => {
    const [trackBox, cardBox] = await Promise.all([overlay.boundingBox(), grid.boundingBox()]);
    return Math.abs(trackBox.y - cardBox.y);
  }).toBeLessThan(2);

  await dock.getByRole('button', { name: 'Next specimen' }).click();
  await expect(dock.getByRole('heading', { name: 'Live layout' })).toBeHidden();
  await dock.getByRole('button', { name: 'Close reference' }).click();
  await expect(overlay).toBeHidden();
  await page.getByRole('button', { name: 'Wireframe' }).click();
  await expect(overlay.locator('.measurement-label')).not.toContainText(widthWithDock);
  await page.getByRole('button', { name: 'Render' }).click();
  await expect(overlay).toBeHidden();
});

test('the Library reports rendered tracks across reflow and filtering, with a touch dock on narrow screens', async ({ page, browser }) => {
  await page.setViewportSize({ width: 1300, height: 900 });
  await page.goto('/library/');
  await page.getByRole('button', { name: 'Wireframe' }).click();
  const overlay = page.locator('#specimens .measurement-overlay');
  await expect(overlay.locator('.measurement-columns > span')).toHaveCount(3);
  await expect(overlay.locator('.measurement-rows > span')).toHaveCount(3);
  const [track, card] = await Promise.all([
    overlay.locator('.measurement-columns > span').nth(1).boundingBox(),
    page.locator('#specimens .specimen').nth(1).boundingBox(),
  ]);
  expect(Math.abs(track.x - card.x)).toBeLessThan(1);

  await page.setViewportSize({ width: 780, height: 900 });
  await expect(overlay.locator('.measurement-columns > span')).toHaveCount(2);
  await page.setViewportSize({ width: 1300, height: 900 });
  await page.getByRole('button', { name: 'Inspect', exact: true }).click();
  await page.getByRole('button', { name: 'Inspect Library grid' }).click();
  const dock = page.getByRole('complementary', { name: 'Reference Dock' });
  await expect(measure(dock, 'Layout')).toHaveText('3 columns · 3 rows');

  const search = page.getByRole('searchbox', { name: 'Search specimens' });
  await search.fill('dialog');
  await expect(measure(dock, 'Layout')).toHaveText('3 columns · 1 row');
  await search.fill('no results here');
  await expect(measure(dock, 'Row tracks')).toHaveText('None');
  await expect(overlay).toBeHidden();
  await search.clear();
  await expect(measure(dock, 'Layout')).toHaveText('3 columns · 3 rows');

  const touch = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  try {
    await touch.goto('/library/');
    await touch.getByRole('button', { name: 'Inspect', exact: true }).tap();
    await touch.getByRole('button', { name: 'Inspect Library grid' }).tap();
    const sheet = touch.getByRole('dialog', { name: 'Reference Dock' });
    await expect(measure(sheet, 'Layout')).toHaveText('1 column · 9 rows');
    await sheet.getByRole('button', { name: 'Close reference' }).tap();
    await expect(touch.getByRole('button', { name: 'Inspect Library grid' })).toBeFocused();
  } finally {
    await touch.close();
  }
});
