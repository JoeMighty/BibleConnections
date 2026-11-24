const { test, expect } = require('@playwright/test');
const ready = (page) => page.waitForSelector('body[data-ready=true]');

test('the back button steps back through what was opened', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  await expect(page.locator('#panelBack')).toBeHidden();
  await page.locator('#panel [data-action=focusVerse]').first().click();
  await expect(page.locator('#panelTitle')).not.toHaveText('John 3:16');
  await expect(page.locator('#panelBack')).toBeVisible();
  await page.locator('#panelBack').click();
  await expect(page.locator('#panelTitle')).toHaveText('John 3:16');
  await expect(page.locator('#panelBack')).toBeHidden();
});

test.describe('phones', () => {
  test.skip(({ isMobile }) => !isMobile, 'the details sheet is for phones');
  test('details slide up as a sheet, and the map keeps the space above it', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
    await page.goto('/?view=map');
    await ready(page);
    const handle = page.locator('#sheetHandle');
    await expect(handle).toBeVisible();
    await expect(handle).toHaveAttribute('aria-expanded', 'false');
    const low = await page.locator('.sidebar').boundingBox();
    // a link to a verse opens the sheet half way, with the verse straight under the search box
    await page.goto('/?ref=John+3%3A16');
    await ready(page);
    await expect(handle).toHaveAttribute('aria-expanded', 'true');
    const half = await page.locator('.sidebar').boundingBox();
    expect(half.height).toBeGreaterThan(low.height);
    await expect(page.locator('#panelTitle')).toBeInViewport();
    // the map is resized to the space above the sheet
    const viz = await page.locator('#viz').boundingBox();
    expect(viz.y + viz.height).toBeLessThanOrEqual(half.y + 12);
    // tapping the handle opens it fully, and again brings it back
    await handle.click();
    await page.waitForTimeout(400);
    expect((await page.locator('.sidebar').boundingBox()).height).toBeGreaterThan(half.height);
    await handle.click();
    await page.waitForTimeout(400);
    expect(Math.round((await page.locator('.sidebar').boundingBox()).height)).toBe(Math.round(half.height));
  });
});

test('a word search also lists matching people, topics, words, journeys and prophecies', async ({ page }) => {
  await page.goto('/?q=shepherd');
  await ready(page);
  await expect(page.locator('#panelTitle')).toHaveText('“shepherd”');
  const also = page.locator('#alsoFound');
  await expect(also).toContainText('Also found');
  await expect(also).toContainText('Shepherd and sheep');
  await expect(also).toContainText('Jesus, the Good Shepherd');
  await expect(also.locator('[data-action=openWord]').first()).toBeVisible();
  await also.locator('[data-action=openChain]').first().click();
  await expect(page.locator('#panelTitle')).toHaveText('The shepherd');
});

test('verse sections open and close, and the choice is remembered', async ({ page }) => {
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  const orig = page.locator('[data-sec=secOrig]');
  await expect(orig).toHaveAttribute('open', '');
  await orig.locator('> summary').click();
  await expect(orig).not.toHaveAttribute('open', '');
  await page.goto('/?ref=Romans+8%3A28');
  await ready(page);
  await expect(page.locator('[data-sec=secOrig]')).not.toHaveAttribute('open', '');
  await expect(page.locator('[data-sec=secOrig] > summary')).toHaveText('Original text');
});

test('deleting a note can be undone', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bc.notes', JSON.stringify({ 'John.3.16': { text: 'God so loved', t: 1 } })));
  await page.goto('/?view=notes');
  await ready(page);
  await page.locator('[data-action=deleteNote]').click();
  await expect(page.locator('#undoToast')).toBeVisible();
  await expect(page.locator('#undoText')).toHaveText('Note deleted.');
  await page.locator('#undoBtn').click();
  await expect(page.locator('#undoToast')).toBeHidden();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bc.notes'))['John.3.16'].text)).toBe('God so loved');
});

test('the welcome page shows one verse\'s connections, and offers the plan in progress', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bc.plans', JSON.stringify({ story: { done: [0, 1] } })));
  await page.goto('/');
  await ready(page);
  // the picture explains itself: John 3:16's arcs, a caption, and three of its passages to open
  await expect(page.locator('#demoCaption')).toContainText('John 3:16 connects to 64 passages');
  await expect(page.locator('#demoCards .demo-card')).toHaveCount(3);
  await expect(page.locator('#landingPlan')).toContainText('Day 3 of');
  await page.locator('#landingPlan [data-season-plan]').click();
  await expect(page.locator('#panel .step-count')).toContainText('Day 3 of');
  await page.goto('/');
  await ready(page);
  await page.locator('#demoCards .demo-card').first().click();
  await expect(page.locator('#landing')).toBeHidden();
  await expect(page.locator('#panelTitle')).toHaveText('Connection');
});

test('an offline note appears when the connection drops', async ({ page, context }) => {
  await page.goto('/?view=map');
  await ready(page);
  await expect(page.locator('#offlineNote')).toBeHidden();
  await context.setOffline(true);
  await expect(page.locator('#offlineNote')).toBeVisible();
  await context.setOffline(false);
  await expect(page.locator('#offlineNote')).toBeHidden();
});

test('the welcome page keeps rows short: six feelings and themes, with More for the rest', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await expect(page.locator('#todayTitle')).toHaveText('Today');
  const visible = (sel) => page.locator(`${sel} > li:visible .chip:not(.more-chip)`);
  await expect(visible('#landingFeelings')).toHaveCount(6);
  await page.locator('#landingFeelings .more-chip').click();
  await expect(visible('#landingFeelings')).toHaveCount(12);
  await expect(page.locator('#landingFeelings .more-chip')).toHaveAttribute('aria-expanded', 'true');
  await expect(visible('#landingThemes')).toHaveCount(6);
});

test('each section lists its own tools, and routes are called routes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
  await page.goto('/?view=map');
  await ready(page);
  for (const m of ['people', 'topics', 'timeline', 'prophecy']) await expect(page.locator(`#panelBody .me-row[data-mode=${m}]`)).toHaveCount(1);
  await page.goto('/?view=journeys');
  await ready(page);
  for (const m of ['plans', 'game', 'church']) await expect(page.locator(`#panelBody .me-row[data-mode=${m}]`)).toHaveCount(1);
  await page.goto('/?view=study');
  await ready(page);
  for (const m of ['wordstudy', 'path', 'shared', 'insights']) await expect(page.locator(`#panelBody .me-row[data-mode=${m}]`)).toHaveCount(1);
  await page.goto('/?view=places');
  await ready(page);
  await expect(page.locator('#panelBody')).toContainText('Routes on the map');
});

test('going home keeps your place: the welcome page offers to continue', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
  await page.goto('/?journey=lamb&step=3');
  await ready(page);
  await page.click('#homeLink');
  await expect(page.locator('#landing')).toBeVisible();
  await expect(page.locator('#continueRow')).toContainText('The Lamb of God, step 3');
  await page.locator('#continueRow .continue-chip').click();
  await expect(page.locator('#landing')).toBeHidden();
  await expect(page).toHaveURL(/journey=lamb&step=3/);
});

test('three different resets: clear all, reset filters, reset settings', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
  // one item: its own ✕ clears it, and Clear all is not shown
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  await expect(page.locator('#startOver')).toBeHidden();
  // Reset filters keeps the verse you are looking at
  await page.goto('/?ref=John+3%3A16&from=ot&to=nt');
  await ready(page);
  await expect(page.locator('#startOver')).toHaveText('Clear all');
  await page.evaluate(() => { document.getElementById('filtersBox').open = true; });
  await page.click('#resetAll');
  await expect(page.locator('#fromSel')).toHaveValue('all');
  await expect(page.locator('#panelTitle')).toHaveText('John 3:16');
  // Reset settings asks first, and keeps notes
  await page.evaluate(() => { localStorage.setItem('bc.textsize', JSON.stringify('large')); localStorage.setItem('bc.notes', JSON.stringify({ 'John.3.16': { text: 'keep me' } })); });
  const { openSettings } = require('./helpers');
  await openSettings(page);
  page.once('dialog', (d) => d.dismiss());
  await page.click('#resetSettings');
  expect(await page.evaluate(() => localStorage.getItem('bc.textsize'))).toBe('"large"');
  page.once('dialog', (d) => d.accept());
  await Promise.all([page.waitForEvent('load'), page.click('#resetSettings')]);
  expect(await page.evaluate(() => localStorage.getItem('bc.textsize'))).toBeNull();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bc.notes'))['John.3.16'].text)).toBe('keep me');
});

test('the three-step tour can be shown again from More, and strength is in plain words', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
  await page.goto('/?view=more');
  await ready(page);
  await page.click('.me-row[data-action=tour]');
  await expect(page.locator('#tips')).toBeVisible();
  await expect(page.locator('#tipsTitle')).toHaveText('Getting around');
  await expect(page.locator('#tipsCount')).toHaveText('1 of 3');
  await page.click('#tipsNext');
  await page.click('#tipsNext');
  await expect(page.locator('#tipsNext')).toHaveText('Got it');
  await page.click('#tipsNext');
  await expect(page.locator('#tips')).toBeHidden();
  await page.goto('/?c=Rom.8.28_Gen.50.20');
  await ready(page);
  await expect(page.locator('#panelBody')).toContainText('readers agree on this link');
  await expect(page.locator('label[for=votes]')).toContainText('Readers who agree');
});
