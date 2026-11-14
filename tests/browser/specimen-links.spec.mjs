import { expect, test } from '@playwright/test';

const liveLinks = [
  ['Container queries', '/components/#responsive-card', 'Responsive card'],
  ['Dialog', '/components/#native-dialog', 'Native dialog'],
  ['Details', '/#native-disclosure', 'Native disclosure'],
  ['Canvas 2D', '/playground/#canvas-2d', 'Canvas 2D'],
  ['Layer shift', '/components/#layer-shift', 'Layer shift'],
];

const cardFor = (page, name) => page.getByRole('article').filter({
  has: page.getByRole('heading', { name, exact: true }),
});

test('Library separates research links and opens each live destination with its reference selected', async ({ page }) => {
  await page.goto('/library/');
  await expect(page.getByRole('link', { name: 'Read research' })).toHaveCount(5);
  await expect(cardFor(page, 'Subgrid').getByRole('link')).toHaveAttribute('href', /Grid_layout\/Subgrid$/);
  await expect(cardFor(page, 'CSS if()').getByRole('link')).toHaveAttribute('href', /docs\/css-if-research\.md$/);

  for (const [name, path, title] of liveLinks) {
    await cardFor(page, name).getByRole('link', { name: 'Open live specimen' }).click();
    await expect(page).toHaveURL(new URL(path, page.url()).href);
    await expect(page.locator('.dock-title')).toHaveText(title);
    await expect(page.locator('[data-specimen-id]:target [data-inspect-target]')).toHaveClass(/inspect-selected/);
    await page.goBack();
    await expect(page).toHaveURL(/\/library\/$/);
  }

  await cardFor(page, 'Dialog').getByRole('link').click();
  await page.reload();
  await expect(page.locator('.dock-title')).toHaveText('Native dialog');
  await page.evaluate(() => { location.hash = 'unknown-specimen'; });
  await expect(page.locator('.reference-dock')).toBeHidden();
  await page.goBack();
  await expect(page.locator('.dock-title')).toHaveText('Native dialog');
});

test('Copy link uses the dock selection and opens it in a fresh session', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/components/#responsive-card');
  const dock = page.getByRole('complementary', { name: 'Reference Dock' });
  await dock.getByRole('button', { name: 'Next specimen' }).click();
  await expect(dock.locator('.dock-title')).toHaveText('Native dialog');
  await dock.getByRole('button', { name: 'Copy link' }).click();
  await expect(dock.getByText('Link copied.')).toBeVisible();
  const copiedUrl = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(copiedUrl).hash).toBe('#native-dialog');

  await page.evaluate(() => sessionStorage.clear());
  await page.goto(copiedUrl);
  await expect(dock.locator('.dock-title')).toHaveText('Native dialog');
  await expect(page.getByRole('button', { name: 'Open dialog' })).toBeVisible();
});

test('Copy link offers selectable text when clipboard access fails', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined });
  });
  await page.goto('/playground/#canvas-2d');
  await page.getByRole('button', { name: 'Copy link' }).click();
  const link = page.getByRole('textbox', { name: 'Specimen link' });
  await expect(link).toBeFocused();
  await expect(link).toHaveValue(page.url());
  expect(await link.evaluate(input => input.selectionEnd - input.selectionStart)).toBe(page.url().length);
});

test.describe('plain HTML navigation', () => {
  test.use({ javaScriptEnabled: false });

  test('the Library links still land on native content', async ({ page }) => {
    await page.goto('/library/');
    await cardFor(page, 'Details').getByRole('link', { name: 'Open live specimen' }).click();
    await expect(page).toHaveURL(/\/#native-disclosure$/);
    const target = page.locator('[data-specimen-id]:target');
    await expect(target.getByRole('heading', { name: 'Frequently asked.' })).toBeVisible();
    await target.getByText('What is this project?', { exact: true }).click();
    await expect(target.getByText('A complete web application', { exact: false })).toBeVisible();
  });
});
