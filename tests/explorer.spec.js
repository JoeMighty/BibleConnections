const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const ready = (page) => page.waitForSelector('body[data-ready=true]');

test('a single verse opens the passage explorer with original text, context and reflection', async ({ page }) => {
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  const panel = page.locator('#panel');
  await expect(panel.locator('#secContext')).toHaveText('In context');
  await expect(panel).toContainText('Verse 16 of 36 in John 3');
  await expect(panel.locator('.book-intro')).toContainText('About John');
  // original Greek words, no English verse text
  const words = panel.locator('#origText .orig-word');
  await expect(words.first()).toContainText('οὕτως');
  await expect(panel.locator('#origText ol')).toHaveAttribute('lang', 'el');
  await expect(panel.locator('#origText button[data-code="G0025"]')).toHaveCount(1);
  // connections split by testament
  await expect(panel.locator('#secRefs + p, #secRefs ~ p').first()).toContainText('to the Old Testament');
  await expect(panel.locator('.reflect li')).toHaveCount(3);
  await expect(panel.locator('#verseEntities .chip').first()).toBeVisible();
  // next verse
  await panel.getByRole('button', { name: /^Next verse/ }).click();
  await expect(page.locator('#panelTitle')).toHaveText('John 3:17');
});

test('Hebrew text reads right to left and Aramaic is labelled', async ({ page }) => {
  await page.goto('/?ref=Daniel+2%3A5');
  await ready(page);
  const ol = page.locator('#origText ol');
  await expect(ol).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('#origText')).toContainText('Language: Aramaic');
  await page.goto('/?ref=Genesis+1%3A1');
  await ready(page);
  await expect(page.locator('#origText')).toContainText('Language: Hebrew');
  await expect(page.locator('#origText .orig-word').first()).toHaveAttribute('data-code', 'H7225');
});

test('choosing an original word opens the full word study', async ({ page }) => {
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  await page.locator('#origText button[data-code="G0025"]').click();
  await expect(page.locator('#panelTitle')).toContainText('agapaō');
  const d = page.locator('#wordDetail');
  await expect(d.locator('dl')).toContainText('Greek');
  await expect(d.locator('dl')).toContainText('G25');
  await expect(d.locator('dl')).toContainText('ah-gah-PAH-oh');
  await expect(d.locator('.book-bars li').first()).toContainText('John');
  await expect(d.locator('table.forms tbody tr').first()).toContainText('verb');
  await expect(d.locator('details.lexicon summary')).toHaveText('Dictionary entry');
  const results = await new AxeBuilder({ page }).include('#panel').analyze();
  expect(results.violations).toEqual([]);
});

test('words with several senses can be narrowed to one meaning', async ({ page }) => {
  await page.goto('/?word=H7965');
  await ready(page);
  const senses = page.locator('#wordDetail .sense-list button');
  await expect(senses.first()).toContainText('peace');
  await page.locator('#wordDetail .sense-list button', { hasText: 'greeting' }).click();
  await expect(page.locator('#panelTitle')).toContainText('greeting');
});

test('the passage explorer is translated into Spanish', async ({ page }) => {
  await page.goto('/?ref=John+3%3A16&lang=es');
  await ready(page);
  await expect(page.locator('#secContext')).toHaveText('En contexto');
  await expect(page.locator('#secReflect')).toHaveText('Reflexiona');
  await expect(page.locator('.book-intro')).toContainText('Escrito para que');
  await expect(page.locator('#origText')).toContainText('Idioma: Griego');
});
