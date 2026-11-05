const { test, expect } = require('@playwright/test');
const fs = require('fs');
const ready = (page) => page.waitForSelector('body[data-ready=true]');

test('everything can be backed up to one file and restored', async ({ page }, info) => {
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  await page.fill('#verseNote', 'Backed up note');
  await expect(page.locator('#noteStatus')).toHaveText('Saved on this device.');
  await page.evaluate(() => { localStorage.setItem('bc.textsize', JSON.stringify('large')); localStorage.setItem('bc.plans', JSON.stringify({ story: { done: [1, 2] } })); });
  await page.click('#settingsBtn');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#backupBtn')]);
  expect(dl.suggestedFilename()).toMatch(/^bible-connections-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const file = info.outputPath('backup.json');
  await dl.saveAs(file);
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(backup.type).toBe('backup');
  expect(backup.data.notes['John.3.16'].text).toBe('Backed up note');
  expect(backup.data.textsize).toBe('large');
  // a fresh device: clear everything, then restore
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?view=map');
  await ready(page);
  await page.click('#settingsBtn');
  // restoring reloads the page so every setting takes effect
  await Promise.all([page.waitForEvent('load'), page.setInputFiles('#restoreFile', file)]);
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  await expect(page.locator('#verseNote')).toHaveValue('Backed up note');
  await expect(page.locator('html')).toHaveAttribute('data-textsize', 'large');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bc.plans')).story.done)).toEqual([1, 2]);
});

test('a file that is not a backup is refused', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await page.click('#settingsBtn');
  await page.setInputFiles('#restoreFile', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  await expect(page.locator('#backupStatus')).toHaveText('That file could not be read. Choose a backup made by Bible Connections.');
});

test('everything can be saved for offline use', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/?view=map');
  await ready(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await ready(page);
  await page.click('#settingsBtn');
  await page.click('#offlineBtn');
  await expect(page.locator('#offlineStatus')).toHaveText('Everything is saved for offline use on this device.', { timeout: 90000 });
  const cached = await page.evaluate(async () => { const keys = await caches.keys(); const c = await caches.open(keys[0]); return (await c.keys()).map(r => new URL(r.url).pathname); });
  expect(cached.some(p => p.endsWith('/data/text/42.json'))).toBe(true);
  expect(cached.some(p => /\/data\/lex\/G00\.json$/.test(p))).toBe(true);
});

test('a verse study can be shared as an image', async ({ page }) => {
  await page.goto('/?ref=John+3%3A16');
  await ready(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Share as image' }).click()]);
  expect(dl.suggestedFilename()).toBe('John-3-16-study.png');
});
