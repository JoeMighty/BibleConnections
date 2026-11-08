const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const ready = (page) => page.waitForSelector('body[data-ready=true]');
const search = async (page, q) => { await page.fill('#search', q); await page.press('#search', 'Enter'); };

test('how are you feeling opens the matching topic', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await expect(page.locator('#landingFeelings button')).toHaveCount(12);
  await page.locator('#landingFeelings [data-feel=anxiety]').click();
  await expect(page.locator('#landing')).toBeHidden();
  await expect(page.locator('#panelTitle')).toHaveText('Anxiety and worry');
});

test('surprise me opens an explained connection', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.locator('[data-start=surprise]').click();
  await expect(page.locator('#panelTitle')).toHaveText('Connection');
  await expect(page.locator('#panel .note')).toBeVisible();
});

test('search understands misspelled book names', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await search(page, 'Phillipians 4:6');
  await expect(page.locator('#panelTitle')).toHaveText('Philippians 4:6');
  await search(page, 'Revelations 3');
  await expect(page.locator('#panelTitle')).toHaveText('Revelation 3');
  await search(page, 'Genisis 1');
  await expect(page.locator('#panelTitle')).toHaveText('Genesis 1');
  // ordinary words are still word searches
  await search(page, 'shepherd');
  await expect(page.locator('#panelTitle')).toHaveText('“shepherd”');
});

test('Hebrew, Greek and Strong\'s numbers open a word study', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await search(page, 'ἀγάπη');
  await expect(page.locator('#panelTitle')).toContainText('agapē');
  await search(page, 'שלום');
  await expect(page.locator('#panelTitle')).toContainText('peace');
  await search(page, 'H7965');
  await expect(page.locator('#panelTitle')).toContainText('peace');
});

test('suggestions offer books and recent searches, and can be chosen with the keyboard', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await search(page, 'John 3:16');
  await page.fill('#search', '');
  await page.locator('#search').blur();
  await page.locator('#search').focus();
  const list = page.locator('#searchSuggest');
  await expect(list).toBeVisible();
  await expect(list).toContainText('John 3:16');
  await page.fill('#search', 'roma 8');
  await expect(list.locator('[role=option]').first()).toContainText('Romans 8');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#search')).toHaveAttribute('aria-activedescendant', 'searchSuggest-0');
  await page.keyboard.press('Enter');
  await expect(page.locator('#panelTitle')).toHaveText('Romans 8');
  await page.locator('#search').focus();
  await page.fill('#search', 'roma 8');
  const results = await new AxeBuilder({ page }).include('.search-field').analyze();
  expect(results.violations).toEqual([]);
});

test('keyboard shortcuts: ? shows the list, / goes to search, S surprises', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await page.locator('#panelTitle').click();
  await page.keyboard.press('?');
  await expect(page.locator('#keysDialog')).toBeVisible();
  await expect(page.locator('#keysDialog tbody tr')).toHaveCount(10);
  const results = await new AxeBuilder({ page }).include('#keysDialog').analyze();
  expect(results.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await page.keyboard.press('/');
  await expect(page.locator('#search')).toBeFocused();
  // typing in the search box does not trigger shortcuts
  await page.keyboard.type('s');
  await expect(page.locator('#search')).toHaveValue('s');
  await page.locator('#panelTitle').click();
  await page.keyboard.press('s');
  await expect(page.locator('#panelTitle')).toHaveText('Connection');
});
