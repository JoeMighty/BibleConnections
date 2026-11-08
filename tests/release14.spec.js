const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const ready = (page) => page.waitForSelector('body[data-ready=true]');

test('a weak link can be reported on GitHub, or hidden and shown again on this device', async ({ page }) => {
  await page.goto('/?c=Gen.1.1_John.1.1');
  await ready(page);
  const report = page.locator('.weak-row a');
  await expect(report).toHaveAttribute('href', /issues\/new\?template=weak_link\.yml.*from=Gen\.1\.1&to=John\.1\.1/);
  const before = await page.locator('#count').textContent();
  await page.locator('[data-action=hideLink]').click();
  await expect(page.locator('#panel')).toContainText('You hid this link on this device.');
  await expect(page.locator('#count')).not.toHaveText(before);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bc.hiddenLinks')))).toEqual([['Gen.1.1', 'John.1.1']]);
  await page.locator('[data-action=unhideLink]').click();
  await expect(page.locator('.weak-row a')).toBeVisible();
  // Settings lists hidden links and can show them all again
  await page.locator('[data-action=hideLink]').click();
  await page.locator('#settingsBtn').click();
  await expect(page.locator('#hiddenStatus')).toHaveText('You have hidden 1 link on this device.');
  await page.locator('#unhideAll').click();
  await expect(page.locator('#hiddenStatus')).toHaveText('You have not hidden any links.');
});

test('reviewed weak links are hidden for everyone', async ({ page }) => {
  await page.route('**/content/weak-links.json', r => r.fulfill({ json: { hidden: [['Gen.1.1', 'John.1.1', 'test']] } }));
  await page.goto('/?c=Gen.1.1_John.1.1');
  await ready(page);
  await expect(page.locator('#panel')).toContainText('hidden from the map after readers reported it as weak');
});

test('the church page builder makes a shareable, embeddable sermon series page', async ({ page }) => {
  await page.goto('/?view=church&today=2026-11-08');
  await ready(page);
  await expect(page.locator('#panelTitle')).toHaveText('Church page');
  await page.fill('#chName', 'Grace Community Church');
  await page.fill('#chSeries', 'The Story of Rescue');
  await page.fill('#chR0', 'Genesis 3:15');
  await page.fill('#chT0', 'The first promise');
  await page.fill('#chR1', 'Exodus 12');
  await page.fill('#chR2', 'Nothing 99');
  await page.locator('#churchForm button[type=submit]').click();
  await expect(page.locator('#chR2')).toHaveAttribute('aria-invalid', 'true');
  await page.fill('#chR2', 'Isaiah 53:1-6');
  await page.locator('#churchForm button[type=submit]').click();
  const link = await page.inputValue('#chLink');
  expect(link).toMatch(/church\.html\?d=/);
  await expect(page.locator('#chEmbed')).toHaveValue(/<iframe src=".*church\.html\?d=.*&embed=1"/);
  let results = await new AxeBuilder({ page }).include('#panel').analyze();
  expect(results.violations).toEqual([]);
  // the draft is kept on this device
  await page.reload();
  await ready(page);
  await expect(page.locator('#chSeries')).toHaveValue('The Story of Rescue');
  await page.goto(link.replace(/^https?:\/\/[^/]+/, '') + '&today=2026-11-16');
  await expect(page.locator('h1')).toHaveText('The Story of Rescue');
  await expect(page.locator('.kicker')).toHaveText('Grace Community Church');
  await expect(page.locator('.now h2')).toHaveText('Exodus 12');
  await expect(page.locator('.now .label')).toContainText('This week');
  await expect(page.locator('.now a').first()).toHaveAttribute('href', /bible\.com\/bible\/111\/EXO\.12\.1\.NIV/);
  await expect(page.locator('ol.weeks li')).toHaveCount(3);
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('the church page works in Portuguese and explains a broken link', async ({ page }) => {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await page.goto('/church.html?lang=pt&today=2026-11-01&d=' + enc({ n: 'Igreja', s: 'Série', w: [['2026-11-08', 'John.3.1', 'John.3.16', '']] }));
  await expect(page.locator('.now .label')).toContainText('Em breve');
  await expect(page.locator('.now h2')).toHaveText('João 3:1-16');
  await page.goto('/church.html?d=broken');
  await expect(page.locator('main')).toContainText('could not be opened');
});
