const { test, expect } = require('@playwright/test');
const fs = require('fs');
const zlib = require('zlib');

// a stored zip (no compression): read each file's bytes by walking the local headers
function unzip(buf) {
  const files = {};
  let p = 0;
  while (buf.readUInt32LE(p) === 0x04034b50) {
    const size = buf.readUInt32LE(p + 18), nameLen = buf.readUInt16LE(p + 26), extra = buf.readUInt16LE(p + 28);
    const name = buf.slice(p + 30, p + 30 + nameLen).toString();
    files[name] = buf.slice(p + 30 + nameLen + extra, p + 30 + nameLen + extra + size).toString();
    p += 30 + nameLen + extra + size;
  }
  return files;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('bc.tipsSeen', 'true');
    localStorage.setItem('bc.collections', JSON.stringify([{ name: 'Advent sermon', items: [
      { label: 'John 3:16', url: '?ref=John+3%3A16' },
      { label: 'Romans 8:28 and Genesis 50:20', url: '?c=Rom.8.28~Gen.50.20' },
    ] }]));
    localStorage.setItem('bc.notes', JSON.stringify({ 'John.3.16': { text: 'Start with God\'s love', updated: 1 } }));
  });
});

test('a collection exports as a Word document with references, links and notes, and no Bible text', async ({ page }) => {
  await page.goto('/?view=collections');
  await page.waitForSelector('body[data-ready=true]');
  await page.locator('#panel button, #panel a', { hasText: 'Advent sermon' }).first().click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('[data-action=exportCollection][data-format=docx]').click()]);
  expect(dl.suggestedFilename()).toBe('advent-sermon.docx');
  const files = unzip(fs.readFileSync(await dl.path()));
  expect(Object.keys(files)).toEqual(expect.arrayContaining(['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/_rels/document.xml.rels']));
  const doc = files['word/document.xml'];
  expect(doc).toContain('Advent sermon');
  expect(doc).toContain('Romans 8:28 and Genesis 50:20');
  expect(doc).toContain('Start with God&apos;s love'.replace('&apos;', "'"));
  expect(doc).toContain('Strongest connections');
  expect(files['word/_rels/document.xml.rels']).toContain('https://www.bible.com/bible/111/JHN.3.16.NIV');
  // no Bible translation text: a well-known phrase from John 3:16 must not appear
  expect(doc).not.toMatch(/only begotten|one and only Son/i);
});

test('a collection exports as Markdown', async ({ page }) => {
  await page.goto('/?view=collections');
  await page.waitForSelector('body[data-ready=true]');
  await page.locator('#panel button, #panel a', { hasText: 'Advent sermon' }).first().click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('[data-action=exportCollection][data-format=md]').click()]);
  expect(dl.suggestedFilename()).toBe('advent-sermon.md');
  const md = fs.readFileSync(await dl.path(), 'utf8');
  expect(md.startsWith('# Advent sermon')).toBe(true);
  expect(md).toContain('## John 3:16');
  expect(md).toContain('](https://www.bible.com/bible/111/JHN.3.16.NIV)');
  expect(md).toContain("> Start with God's love");
});

test('the open data page lists every file, links the zip and states the license', async ({ page, request }) => {
  await page.goto('/data.html');
  await expect(page.locator('h1')).toHaveText('Open data');
  expect(await page.locator('main .list a[href^="open-data/"]').count()).toBeGreaterThanOrEqual(10);
  await expect(page.locator('main a[href="open-data/bible-connections-open-data.zip"]')).toBeVisible();
  await expect(page.locator('main code')).toHaveText('Bible Connections (bibleconnections.app), CC BY 4.0');
  const zip = await request.get('/open-data/bible-connections-open-data.zip');
  expect(zip.ok()).toBe(true);
  expect((await zip.body()).readUInt32LE(0)).toBe(0x04034b50);
  const notes = await (await request.get('/open-data/notes.json')).json();
  expect(notes.length).toBeGreaterThan(300);
  expect(notes[0]).toEqual(expect.objectContaining({ from: expect.any(String), to: expect.any(String), note: expect.any(String) }));
  await page.goto('/guide.html');
  await expect(page.locator('.foot a[href*="data.html"]')).toHaveCount(1);
});
