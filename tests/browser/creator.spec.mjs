import { expect, test } from '@playwright/test';

const canvas = page => page.locator('#canvas');
const blocks = page => canvas(page).locator('[data-block]');
const palette = page => page.getByRole('complementary', { name: 'Elements' });
const structure = page => page.getByRole('complementary', { name: 'Structure' });
const kinds = page => blocks(page).evaluateAll(items => items.map(item => item.dataset.kind));

async function open(page) {
  await page.goto('/create/');
  await expect(blocks(page)).toHaveCount(5);
}

test('arrange elements without authoring copy and keep the layout through reload', async ({ page }) => {
  await open(page);
  await expect(canvas(page).locator('img, [contenteditable]')).toHaveCount(0);
  await palette(page).getByRole('button', { name: 'Media slot' }).press('Enter');
  expect(await kinds(page)).toEqual(['nav', 'media', 'split', 'grid', 'disclosure', 'action']);
  await structure(page).getByRole('button', { name: 'Move down' }).press('Enter');
  expect(await kinds(page)).toEqual(['nav', 'split', 'media', 'grid', 'disclosure', 'action']);
  await page.getByRole('button', { name: 'Undo' }).click();
  expect(await kinds(page)).toEqual(['nav', 'media', 'split', 'grid', 'disclosure', 'action']);
  await page.getByRole('button', { name: 'Redo' }).click();
  await page.reload();
  expect(await kinds(page)).toEqual(['nav', 'split', 'media', 'grid', 'disclosure', 'action']);
});

test('drag from the palette and reorder a block by its canvas handle', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  await open(page);
  const from = palette(page).getByRole('button', { name: 'Text stack' });
  const split = canvas(page).locator('[data-kind="split"] .handle');
  const source = await from.boundingBox();
  const target = await split.boundingBox();
  await page.mouse.move(source.x + 15, source.y + 12);
  await page.mouse.down();
  await page.mouse.move(target.x + 12, target.y + 12, { steps: 18 });
  await page.mouse.move(target.x + 17, target.y + 14, { steps: 3 });
  await page.mouse.up();
  await expect.poll(() => kinds(page)).toEqual(['nav', 'stack', 'split', 'grid', 'disclosure', 'action']);

  await page.getByRole('button', { name: /Back to top/ }).click();
  const handle = canvas(page).locator('[data-kind="stack"] .handle');
  const nav = canvas(page).locator('[data-kind="nav"] .handle');
  const start = await handle.boundingBox(), end = await nav.boundingBox();
  await page.mouse.move(start.x + 12, start.y + 10);
  await page.mouse.down();
  await page.mouse.move(start.x + 22, start.y + 7);
  await page.mouse.move(end.x + 12, end.y + 12);
  await page.mouse.up();
  await expect.poll(() => kinds(page)).toEqual(['stack', 'nav', 'split', 'grid', 'disclosure', 'action']);
});

test('responsive geometry reflows, scroll effects run, and Inspect reports native layout', async ({ page }) => {
  await page.setViewportSize({ width: 1660, height: 900 });
  await open(page);
  const grid = canvas(page).locator('.tiles');
  const columns = () => grid.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  await expect.poll(columns).toBe(3);
  await page.getByRole('button', { name: 'Phone width' }).click();
  await expect.poll(columns).toBe(1);
  await structure(page).getByRole('button', { name: 'Card grid' }).click();
  await structure(page).getByRole('combobox', { name: 'Scroll effect' }).selectOption('scale');
  const region = canvas(page).locator('[data-kind="grid"] .region');
  expect(await region.evaluate(el => getComputedStyle(el).animationTimeline)).toContain('view()');
  const scrollTo = offset => region.evaluate((el, offset) => {
    const host = el.getRootNode().host;
    const top = el.getBoundingClientRect().top - host.getBoundingClientRect().top + host.scrollTop;
    host.scrollTop = Math.max(0, top - host.clientHeight + offset);
  }, offset);
  const opacity = () => region.evaluate(el => Number(getComputedStyle(el).opacity));
  await scrollTo(30);
  await expect.poll(opacity).toBeLessThan(0.8);
  await scrollTo(350);
  await expect.poll(opacity).toBeGreaterThan(0.8);
  await structure(page).getByRole('button', { name: 'Inspect pattern' }).click();
  await expect(page.locator('.dock-title')).toHaveText('Responsive card grid');
  await expect(page.getByText(/Column tracks/)).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Render', exact: true }).click();
  await canvas(page).getByText('Expand region').click();
  await expect(canvas(page).locator('details')).toHaveAttribute('open', '');
  await canvas(page).getByRole('link', { name: 'Region 1', exact: true }).click();
  await expect(blocks(page)).toHaveCount(5);
});

test('Workflow produces reusable UX directions and tests a linked next step', async ({ page }) => {
  await open(page);
  await page.getByRole('tab', { name: 'Workflow' }).click();
  await page.getByLabel('UX philosophy').fill('Keep actions at the end and use compact spacing.');
  await page.getByRole('textbox', { name: 'Layout name' }).fill('Step two');
  const prompt = page.getByRole('textbox', { name: 'Reusable UX prompt' });
  await expect(prompt).toHaveValue(/sibling layout.*compact spacing/s);
  await page.getByLabel('Relationship').selectOption('next');
  await page.getByRole('textbox', { name: /Where visitors arrive/ }).fill('They completed the previous step.');
  await expect(prompt).toHaveValue(/Arrival and next task: They completed the previous step/);
  await page.getByRole('button', { name: 'Create related layout' }).click();
  const picker = page.getByRole('combobox', { name: 'Current layout' });
  await expect(picker.locator('option:checked')).toHaveText('Step two');
  await picker.selectOption({ label: 'Landing layout' });
  await page.getByRole('button', { name: 'Play prototype' }).click();
  await expect(canvas(page).locator('.handle').first()).toBeHidden();
  await canvas(page).getByRole('button', { name: 'Continue to next layout' }).click();
  await expect(picker.locator('option:checked')).toHaveText('Step two');
});

test.describe('touch and reduced motion', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  test('palette works without dragging and keeps animated regions static', async ({ page }) => {
    await open(page);
    await expect(page.locator('#motion-status')).toContainText('reduced motion');
    await expect(canvas(page).locator('[data-kind="grid"] .region')).toHaveCSS('animation-name', 'none');
    await palette(page).getByRole('button', { name: 'Text stack' }).tap();
    await expect(blocks(page)).toHaveCount(6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  });
});

test('a Library specimen starts a focused layout study', async ({ page }) => {
  await page.goto('/library/');
  await page.getByRole('link', { name: 'Use in Layout Studio' }).first().click();
  await expect(blocks(page)).toHaveCount(1);
  expect(await kinds(page)).toEqual(['grid']);
});
