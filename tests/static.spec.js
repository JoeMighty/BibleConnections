// Book, verse and "How many" pages, built by scripts/static-pages.mjs before the tests run.
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('a verse page lists its strongest connections without any translation text', async ({ page }) => {
  await page.goto('/verse/john-3-16/');
  await expect(page.locator('h1')).toHaveText('John 3:16');
  await expect(page).toHaveTitle(/^John 3:16 cross references: \d+ connections/);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://bibleconnections.app/verse/john-3-16/');
  await expect(page.locator('.orig-text')).toHaveAttribute('lang', 'grc');
  expect(await page.locator('main .list').first().locator('li').count()).toBe(25);
  await expect(page.locator('main')).not.toContainText('loved the world');
  await expect(page.locator('main')).not.toContainText('so loved');
  await expect(page.locator('.actions a').first()).toHaveAttribute('href', '/?ref=John+3%3A16');
  await expect(page.locator('.actions a').nth(1)).toHaveAttribute('href', /bible\.com\/bible\/111\/JHN\.3\.16\.NIV/);
  expect(JSON.parse(await page.locator('script[type="application/ld+json"]').textContent())['@type']).toBe('BreadcrumbList');
});

test('book pages show the most connected books, verses and chapters', async ({ page }) => {
  await page.goto('/books/');
  await expect(page.locator('main .list li')).toHaveCount(66);
  await page.locator('main .list a', { hasText: 'Romans' }).click();
  await expect(page.locator('h1')).toHaveText('Romans');
  await expect(page.locator('.chapters li')).toHaveCount(16);
  await expect(page.locator('.chapters a').first()).toHaveAttribute('href', '/?ref=Romans+1');
  await page.locator('main .list').nth(1).locator('a').first().click();
  await expect(page).toHaveURL(/\/verse\/romans-\d+-\d+\/$/);
});

test('the How many page gives the full count and the testament split', async ({ page }) => {
  await page.goto('/cross-references/');
  await expect(page.locator('h1')).toHaveText('How many cross references are in the Bible?');
  await expect(page.locator('.lede')).toContainText('344,799');
  await expect(page.locator('main')).toContainText('Between the testaments');
  await page.getByRole('link', { name: 'See only those' }).click();
  await page.waitForSelector('body[data-ready=true]');
  await expect(page.locator('#fromSel')).toHaveValue('ot');
  await expect(page.locator('#toSel')).toHaveValue('nt');
});

for (const theme of ['dark', 'light']) {
  test(`the verse and book pages pass accessibility checks (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    for (const u of ['/verse/genesis-1-1/', '/books/psalms/', '/cross-references/']) {
      await page.goto(u);
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(r.violations.map(v => `${u}: ${v.id}`)).toEqual([]);
    }
  });
}

test('the testament filter shows only links within or across the testaments', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
  await page.goto('/?view=map');
  await page.waitForSelector('body[data-ready=true]');
  await expect(page.locator('#testamentSeg input[value=all]')).toBeChecked();
  await page.locator('#testamentSeg label', { hasText: 'Across' }).click();
  await expect(page).toHaveURL(/from=ot&to=nt/);
  await expect(page.locator('#fromSel')).toHaveValue('ot');
  await page.locator('#testamentSeg label', { hasText: 'New' }).click();
  await expect(page.locator('#toSel')).toHaveValue('nt');
  await expect(page.locator('#fromSel')).toHaveValue('nt');
  await page.goto('/?from=ot&to=ot');
  await page.waitForSelector('body[data-ready=true]');
  await expect(page.locator('#testamentSeg input[value=ot]')).toBeChecked();
});

test('a book shows its most connected books and verses, matching its book page', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
  await page.goto('/?ref=John');
  await page.waitForSelector('body[data-ready=true]');
  const glance = page.locator('.book-glance');
  await expect(glance.locator('.chip').first()).toContainText('Matthew');
  const total = (await glance.locator('.num').textContent()).trim();
  await expect(glance.locator('a[href="books/john/"]')).toBeVisible();
  await glance.locator('.chip', { hasText: 'John 1:14' }).click();
  await expect(page.locator('#panelTitle')).toHaveText('John 1:14');
  await page.goto('/books/john/');
  await expect(page.locator('.stat-n').first()).toHaveText(total);
});
