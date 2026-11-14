import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { unzipSync, strFromU8 } from 'fflate';

const preview = page => page.frameLocator('#page-preview');
const compose = page => page.getByRole('tabpanel', { name: 'Compose' });
const outline = page => page.getByRole('complementary', { name: 'Outline' });
const properties = page => page.getByRole('complementary', { name: 'Properties' });
const storageKey = 'blueprint-creator-v1';

async function openStudio(page) {
  await page.goto('/create/');
  await expect(preview(page).getByRole('heading', { name: 'Make space for better design.' })).toBeVisible();
  await expect.poll(() => preview(page).locator('.page-hero img').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
}

async function createPage(page, { name, goal, action = 'Learn more', href = '#toolkit' }) {
  await page.getByRole('button', { name: 'New page', exact: true }).click();
  const brief = page.getByRole('dialog', { name: 'New page' });
  await brief.getByRole('textbox', { name: 'Page name' }).fill(name);
  await brief.getByRole('combobox', { name: 'Page goal' }).selectOption(goal);
  await brief.getByRole('textbox', { name: 'Audience' }).fill('First-time makers');
  await brief.getByRole('textbox', { name: 'Page promise' }).fill('A short path from an idea to a first project.');
  await brief.getByRole('textbox', { name: 'Primary action' }).fill(action);
  await brief.getByRole('textbox', { name: 'Action destination' }).fill(href);
  await brief.getByRole('button', { name: 'Build draft' }).click();
  await expect(preview(page).getByRole('heading', { name, exact: true })).toBeVisible();
}

async function download(page, name) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  const file = await pending;
  return { filename: file.suggestedFilename(), contents: await readFile(await file.path()) };
}

test('different goals produce different plans, with section reordering, replacement, history, and reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/create\/$/);
  await createPage(page, { name: 'Early access', goal: 'signup' });
  await expect(preview(page).locator('.page-hero').getByRole('link', { name: 'Learn more' })).toBeVisible();
  await expect(properties(page).getByText(/Put the sign-up action beside the value proposition/)).toBeVisible();

  await createPage(page, { name: 'Product overview', goal: 'educate' });
  await expect(preview(page).locator('.page-hero').getByRole('link', { name: 'Learn more' })).toHaveCount(0);
  await expect(outline(page).getByRole('button', { name: /Editorial text/ })).toBeVisible();
  await expect(properties(page).getByText(/Establish what the subject is/)).toBeVisible();
  await outline(page).getByRole('button', { name: /FAQ/ }).click();
  const original = await outline(page).getByRole('listitem').allTextContents();
  await properties(page).getByRole('button', { name: 'Move section up' }).focus();
  await page.keyboard.press('Enter');
  const moved = await outline(page).getByRole('listitem').allTextContents();
  expect(moved[2]).toBe(original[3]);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await outline(page).getByRole('listitem').allTextContents()).toEqual(original);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(await outline(page).getByRole('listitem').allTextContents()).toEqual(moved);

  await outline(page).getByRole('button', { name: /Editorial text/ }).click();
  await properties(page).getByRole('button', { name: 'Replace section' }).click();
  await page.getByRole('dialog', { name: 'Replace section' }).getByRole('button', { name: /^Steps/ }).click();
  await expect(outline(page).getByRole('button', { name: /^Steps/ })).toBeVisible();
  await expect(outline(page).getByRole('button', { name: /^Editorial text/ })).toHaveCount(0);
  await page.reload();
  await expect(outline(page).getByRole('button', { name: /^Steps/ })).toBeVisible();
  await expect(preview(page).getByRole('heading', { name: 'Product overview', exact: true })).toBeVisible();
});

test('inline editing, FAQ rows, and native inspection work with real phone and desktop widths', async ({ page }) => {
  await openStudio(page);
  await expect.poll(() => page.locator('#page-preview').evaluate(frame => frame.clientWidth)).toBeGreaterThan(390);
  await page.getByRole('button', { name: 'Phone preview' }).click();
  await expect(page.locator('#viewport-width')).toHaveText('390 px');
  await page.getByRole('button', { name: 'Edit on canvas' }).click();
  const headline = preview(page).getByRole('textbox', { name: 'Section heading' }).first();
  await headline.fill('A better design system');
  await headline.press('Enter');
  await expect(properties(page).getByRole('textbox', { name: 'Section heading' })).toHaveValue('A better design system');
  await page.getByRole('button', { name: 'Edit on canvas' }).click();
  await expect(preview(page).getByRole('heading', { name: 'A better design system' })).toBeVisible();

  await outline(page).getByRole('button', { name: /FAQ/ }).click();
  await properties(page).getByRole('button', { name: 'Add question' }).click();
  await properties(page).getByRole('textbox', { name: 'Question', exact: true }).last().fill('Can I use it offline?');
  await properties(page).getByRole('textbox', { name: 'Answer', exact: true }).last().fill('Download the HTML and open it locally.');
  await preview(page).getByText('Can I use it offline?', { exact: true }).click();
  await expect(preview(page).getByText('Download the HTML and open it locally.')).toBeVisible();
  await preview(page).getByText('Who is Forma for?', { exact: true }).click();
  await expect(preview(page).getByText('Download the HTML and open it locally.')).toBeHidden();
  await page.getByRole('button', { name: 'Wireframe', exact: true }).click();
  await expect(preview(page).locator('html')).toHaveAttribute('data-mode', 'wireframe');
  const trigger = properties(page).getByRole('button', { name: 'Inspect selected section' });
  await trigger.focus();
  await trigger.press('Enter');
  const dock = page.locator('.reference-dock');
  await expect(dock.locator('.dock-title')).toHaveText('Native disclosure');
  await expect(dock.getByText('If grouping is unavailable', { exact: false })).toBeVisible();
  await expect(dock.getByRole('link', { name: 'Open original Blueprint specimen' })).toHaveAttribute('href', /\/#native-disclosure$/);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await properties(page).getByRole('button', { name: 'Remove question 4' }).click();
  await expect(preview(page).getByText('Can I use it offline?', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Fit preview' }).click();
  await expect.poll(() => page.locator('#page-preview').evaluate(frame => frame.clientWidth)).toBeGreaterThan(390);

  await page.reload();
  await expect(preview(page).getByRole('heading', { name: 'A better design system' })).toBeVisible();
});

test('a philosophy produces both prompts and an interactive complementary page handoff', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openStudio(page);
  await page.getByRole('tab', { name: 'Compose' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Workflow' })).toBeFocused();
  const workflow = page.getByRole('tabpanel', { name: 'Workflow' });
  await workflow.getByRole('combobox', { name: 'Tone' }).selectOption('warm');
  await workflow.getByRole('combobox', { name: 'Shared palette' }).selectOption('grove');
  await workflow.getByRole('combobox', { name: 'Primary action convention' }).selectOption('single');
  await workflow.getByRole('textbox', { name: 'Decision 1' }).fill('Assume the creator has only two minutes.');
  await workflow.getByRole('textbox', { name: 'Page name' }).fill('Forma Quickstart');
  await workflow.getByRole('textbox', { name: 'Primary action' }).fill('Create a project');
  const prompt = workflow.getByRole('textbox', { name: 'Generated build prompt' });
  await expect(prompt).toHaveValue(/sibling page.*Assume the creator has only two minutes\./s);
  await workflow.getByRole('radio', { name: /Complementary page/ }).check();
  await workflow.getByRole('combobox', { name: 'Page goal' }).selectOption('onboard');
  await workflow.getByRole('textbox', { name: 'Action destination' }).fill('#steps');
  await workflow.getByRole('textbox', { name: 'Arrival and what the visitor needs next' }).fill('The visitor just selected a toolkit and needs to set up a first project.');
  await expect(prompt).toHaveValue(/complementary page.*Arrival from source: Explore the toolkit.*set up a first project.*Inherited requirements.*Blueprint references/s);
  await workflow.getByRole('button', { name: 'Copy prompt' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await prompt.inputValue());
  const markdown = await download(page, 'Download Markdown prompt');
  expect(markdown.filename).toBe('forma-quickstart-build-prompt.md');
  expect(markdown.contents.toString()).toBe(await prompt.inputValue());
  await workflow.getByRole('button', { name: 'Create related draft' }).click();
  await expect(compose(page)).toBeVisible();
  await expect(preview(page).locator('html')).toHaveAttribute('data-theme', 'grove');
  await expect(preview(page).getByRole('heading', { name: 'Ready when you are' })).toBeVisible();
  await expect(preview(page).getByRole('link', { name: 'Create a project' })).toHaveCount(1);
  await expect(page.locator('#page-origin')).toHaveText('Complementary page · Back to Forma');

  await page.getByRole('button', { name: /Current page Forma Quickstart/ }).click();
  await page.getByRole('dialog', { name: 'Project pages' }).getByRole('button', { name: /^Forma Collect/ }).click();
  await expect(preview(page).locator('html')).toHaveAttribute('data-theme', 'cobalt');
  await preview(page).getByRole('link', { name: 'Explore the toolkit' }).first().click();
  await expect(preview(page).getByRole('heading', { name: 'Forma Quickstart', exact: true })).toBeVisible();
  await page.reload();
  await expect(preview(page).getByRole('heading', { name: 'Forma Quickstart', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Workflow' }).click();
  await expect(workflow.getByRole('textbox', { name: 'Decision 1' })).toHaveValue('Assume the creator has only two minutes.');
});

test('HTML and linked site downloads work offline with JavaScript disabled', async ({ page, browser }, testInfo) => {
  await openStudio(page);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const html = await download(page, 'Download HTML');
  expect(html.filename).toBe('forma.html');
  expect(html.contents.toString()).not.toMatch(/<script(?:\s|>)/i);
  expect(html.contents.toString()).toContain('data:image/webp;base64,');
  await page.getByRole('button', { name: 'Close export' }).click();

  await page.getByRole('tab', { name: 'Workflow' }).click();
  await page.getByRole('radio', { name: /Complementary page/ }).check();
  await page.getByRole('textbox', { name: 'Page name' }).fill('Forma Quickstart');
  await page.getByRole('textbox', { name: 'Primary action' }).fill('See the steps');
  await page.getByRole('textbox', { name: 'Action destination' }).fill('#steps');
  await page.getByRole('textbox', { name: 'Arrival and what the visitor needs next' }).fill('They just signed up and need the quickstart.');
  await page.getByRole('button', { name: 'Create related draft' }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const site = await download(page, 'Download linked site');
  expect(site.filename).toBe('blueprint-site.zip');
  const files = unzipSync(site.contents);
  expect(Object.keys(files).sort()).toEqual(['forma-quickstart.html', 'forma.html', 'start-here.html']);
  expect(strFromU8(files['forma.html'])).toContain('href="forma-quickstart.html"');
  const folder = testInfo.outputPath('site');
  await mkdir(folder, { recursive: true });
  for (const [name, data] of Object.entries(files)) await writeFile(join(folder, name), data);
  const offline = await browser.newPage({ javaScriptEnabled: false, offline: true });
  await offline.goto(pathToFileURL(join(folder, 'start-here.html')).href);
  await offline.getByRole('link', { name: 'Forma', exact: true }).click();
  await expect(offline.getByRole('heading', { name: 'Make space for better design.' })).toBeVisible();
  await offline.getByText('Who is Forma for?', { exact: true }).click();
  await expect(offline.getByText('Independent designers and small teams', { exact: false })).toBeVisible();
  await offline.getByRole('link', { name: 'Explore the toolkit' }).last().click();
  await expect(offline.getByRole('heading', { name: 'Forma Quickstart' })).toBeVisible();
  await offline.getByRole('link', { name: 'See the steps', exact: true }).click();
  await expect(offline).toHaveURL(/forma-quickstart\.html#steps$/);
  await offline.close();
});

test('backup repair protects the active project, and edited copy stays text in preview and export', async ({ page }) => {
  await openStudio(page);
  const payload = 'Design <strong>for everyone</strong> & “real life”';
  await properties(page).getByRole('textbox', { name: 'Section heading' }).fill(payload);
  await expect(preview(page).getByRole('heading', { name: payload, exact: true })).toBeVisible();
  await properties(page).getByRole('textbox', { name: 'Action destination' }).fill('javascript:alert(1)');
  await expect(preview(page).locator('a[href^="javascript:"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const exportDialog = page.getByRole('dialog', { name: 'Export your work' });
  await expect(exportDialog.getByText(/Set a valid action destination/)).toBeVisible();
  const backup = await download(page, 'Project backup');
  await exportDialog.getByRole('button', { name: 'Close export' }).click();

  await properties(page).getByRole('textbox', { name: 'Section heading' }).fill('Keep this until I restore');
  await page.getByRole('button', { name: /Current page Forma/ }).click();
  const input = page.locator('#project-import');
  await input.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1}') });
  await expect(page.locator('#import-status')).toContainText('Choose a Blueprint Studio project backup');
  await input.setInputFiles({ name: backup.filename, mimeType: 'application/json', buffer: backup.contents });
  const restore = page.getByRole('dialog', { name: 'Replace the current project?' });
  await restore.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(restore).toBeHidden();
  await input.setInputFiles({ name: backup.filename, mimeType: 'application/json', buffer: backup.contents });
  await restore.getByRole('button', { name: 'Restore backup' }).click();
  await expect(preview(page).getByRole('heading', { name: payload, exact: true })).toBeVisible();
});

test('a stale tab does not overwrite newer saved content', async ({ page, context }) => {
  await openStudio(page);
  const stale = await context.newPage();
  await openStudio(stale);
  await properties(page).getByRole('textbox', { name: 'Section heading' }).fill('Newer work');
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)).drafts[0].sections[0].title, storageKey)).toBe('Newer work');
  await expect(stale.locator('#save-status')).toContainText('another tab');
  await properties(stale).getByRole('textbox', { name: 'Section heading' }).fill('Stale work');
  await expect(stale.locator('#save-status')).toContainText('another tab');
  await stale.reload();
  await expect(preview(stale).getByRole('heading', { name: 'Newer work' })).toBeVisible();
  await stale.close();
});

test.describe('touch editor', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });

  test('small screens reach the same controls and use the native Reference Dock sheet', async ({ page }) => {
    await openStudio(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await outline(page).getByRole('button', { name: /FAQ/ }).tap();
    const trigger = properties(page).getByRole('button', { name: 'Inspect selected section' });
    await trigger.tap();
    const dock = page.getByRole('dialog', { name: 'Reference Dock' });
    await expect(dock.locator('.dock-title')).toHaveText('Native disclosure');
    await dock.getByRole('button', { name: 'Close reference' }).tap();
    await expect(trigger).toBeFocused();
    await page.getByRole('tab', { name: 'Workflow' }).tap();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  });
});

test('a Library pattern starts a new draft without changing the open page', async ({ page }) => {
  await page.goto('/library/');
  await page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Details', exact: true }) })
    .getByRole('link', { name: 'Use in Creator' }).click();
  await expect(page).toHaveURL(/\/create\/$/);
  const start = page.getByRole('dialog', { name: 'Start with FAQ' });
  await start.getByRole('textbox', { name: 'Page name' }).fill('Offline help');
  await start.getByRole('button', { name: 'Use this section' }).click();
  await expect(outline(page).getByRole('button', { name: /FAQ/ })).toHaveCount(1);
  await expect(outline(page).getByRole('listitem')).toHaveCount(1);
  await expect(preview(page).getByRole('heading', { name: 'Offline help' })).toBeVisible();
  await page.getByRole('button', { name: /Current page Offline help/ }).click();
  await page.getByRole('dialog', { name: 'Project pages' }).getByRole('button', { name: /^Forma Collect/ }).click();
  await expect(outline(page).getByRole('listitem')).toHaveCount(4);
});

test('the Reference Dock reports the generated grid as the real viewport changes', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 950 });
  await openStudio(page);
  await outline(page).getByRole('button', { name: /^Benefits grid/ }).click();
  await properties(page).getByRole('button', { name: 'Inspect selected section' }).click();
  const dock = page.getByRole('complementary', { name: 'Reference Dock' });
  await expect(dock.locator('.dock-title')).toHaveText('Responsive benefits grid');
  await expect(dock.getByText('3 columns · 1 row', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Phone preview' }).click();
  await expect(dock.getByText('2 columns · 2 rows', { exact: true })).toBeVisible();
});

test('the built-in sample loads a ready-to-run UX handoff', async ({ page }) => {
  await openStudio(page);
  await page.getByRole('tab', { name: 'Workflow' }).click();
  await page.getByRole('button', { name: 'Try a sample handoff' }).click();
  await expect(page.getByRole('textbox', { name: 'Generated build prompt' })).toHaveValue(/Build Forma Quickstart.*Help them pick a starter layout/s);
  await page.getByRole('button', { name: 'Create related draft' }).click();
  await expect(page.getByRole('button', { name: /Current page Forma Quickstart/ })).toBeVisible();
  await page.getByRole('button', { name: /Back to Forma/ }).click();
  await expect(page.getByRole('button', { name: /Current page Forma$/ })).toBeVisible();
});
