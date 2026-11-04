const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const ready = (page) => page.waitForSelector('body[data-ready=true]');

test('Listen opens the chapter in the Bible.com audio Bible, only for translations with audio', async ({ page }) => {
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  const listen = page.locator('.verse-card a.listen').first();
  await expect(listen).toHaveAttribute('href', 'https://www.bible.com/audio-bible/111/JHN.3.NIV');
  await expect(listen).toHaveAttribute('title', 'Listen to John 3 in NIV');
  await expect(listen.locator('svg')).toHaveCount(1);
  // AMP has no audio on Bible.com, so no Listen button
  await page.click('#readInPick'); await page.fill('#readInPick', 'AMP'); await page.keyboard.press('Enter');
  await expect(page.locator('.verse-card a.listen')).toHaveCount(0);
});

test('notes are saved on the device, listed, and can be deleted', async ({ page }) => {
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  await page.fill('#verseNote', 'God so loved the world: so loved me.');
  await expect(page.locator('#noteStatus')).toHaveText('Saved on this device.');
  await page.reload();
  await ready(page);
  await expect(page.locator('#verseNote')).toHaveValue('God so loved the world: so loved me.');
  await page.goto('/?view=notes');
  await ready(page);
  await expect(page.locator('.notes-list li')).toHaveCount(1);
  await expect(page.locator('.notes-list')).toContainText('John 3:16');
  await page.locator('[data-action=deleteNote]').click();
  await expect(page.locator('.notes-list li')).toHaveCount(0);
});

test('notes can be imported from an exported file', async ({ page }) => {
  await page.goto('/?view=notes');
  await ready(page);
  const file = { name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app: 'Bible Connections', type: 'notes', version: 1, notes: { 'Ps.23.1': { text: 'The Lord is my shepherd', t: 1 }, 'Nope.1.1': { text: 'bad', t: 1 } } })) };
  await page.setInputFiles('#importNotes', file);
  await expect(page.locator('#notesMsg')).toHaveText('Imported 1 note.');
  await expect(page.locator('.notes-list')).toContainText('Psalms 23:1');
  const results = await new AxeBuilder({ page }).include('#panel').analyze();
  expect(results.violations).toEqual([]);
});

test('the passage handout prints original words, connections and questions without translation text', async ({ page }) => {
  await page.goto('/?ref=Matthew+2%3A1');
  await ready(page);
  const link = page.getByRole('link', { name: /Printable handout/ });
  await expect(link).toHaveAttribute('href', 'handout.html?verse=Matt.2.1');
  await page.goto('/handout.html?verse=Matt.2.1');
  await expect(page.locator('h1')).toHaveText('Matthew 2:1');
  await expect(page.locator('ol.orig li').first()).toContainText('Τοῦ');
  await expect(page.locator('ol.conns li').first()).toContainText('Micah 5:2');
  const refs = await page.locator('ol.conns li strong').allTextContents();
  expect(new Set(refs).size).toBe(refs.length);
  await expect(page.locator('ol.qs li')).toHaveCount(3);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('places map opens a place and shows places in a verse', async ({ page }) => {
  await page.goto('/?view=places');
  await ready(page);
  await expect(page.locator('#placesMap')).toBeVisible();
  await page.fill('#placeQ', 'bethle');
  await page.locator('#placeResults [data-action=openGeo]').first().click();
  await expect(page.locator('#panelTitle')).toHaveText('Bethlehem');
  await expect(page.locator('#geoMini')).toBeVisible();
  await page.goto('/?ref=Matthew+2%3A1');
  await ready(page);
  await expect(page.locator('#versePlaces')).toContainText('Bethlehem');
  await expect(page.locator('#versePlacesMap')).toBeVisible();
});

test('shared connections lists passages linked to both', async ({ page }) => {
  await page.goto('/?view=shared');
  await ready(page);
  await page.locator('[data-action=sharedExample]').first().click();
  await expect(page.locator('#panel h3').first()).toContainText('shared passage');
  await expect(page.locator('.shared-list li').first()).toBeVisible();
  await expect(page).toHaveURL(/shared=Psalms?\+?/);
  await page.locator('[data-action=sharedMap]').click();
  await expect(page.locator('#panelTitle')).toContainText('Shared by');
  await page.goto('/?view=places');
  await ready(page);
  const results = await new AxeBuilder({ page }).include('#panel').analyze();
  expect(results.violations).toEqual([]);
});
