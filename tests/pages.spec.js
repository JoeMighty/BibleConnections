const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('the welcome page footer links to How to use and the Roadmap', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('body[data-ready=true]');
  const foot = page.locator('.landing-foot');
  await expect(foot.getByRole('link', { name: 'How to use' })).toHaveAttribute('href', 'guide.html');
  await expect(foot.getByRole('link', { name: 'Roadmap' })).toHaveAttribute('href', 'roadmap.html');
  await foot.getByRole('link', { name: 'Roadmap' }).click();
  await expect(page.locator('h1')).toHaveText('Roadmap');
});

for (const theme of ['light', 'dark']) {
  test(`How to use and Roadmap pages are accessible (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    for (const u of ['/guide.html', '/roadmap.html', '/privacy.html', '/terms.html', '/accessibility.html', '/credits.html', '/churches.html']) {
      await page.goto(u);
      await expect(page.locator('main h1')).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, u).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}

test('every Try it link in the guide opens something on the site', async ({ page }) => {
  await page.goto('/guide.html');
  const links = await page.locator('.try a').evaluateAll(as => as.map(a => a.getAttribute('href')));
  expect(links.length).toBeGreaterThan(10);
  for (const href of links) {
    await page.goto('/' + href.replace(/^\.\//, ''));
    if (href.includes('handout.html')) { await expect(page.locator('#handout h1'), href).not.toHaveText(''); continue; }
    await page.waitForSelector('body[data-ready=true]');
    await expect(page.locator('#landing'), href).toBeHidden();
    await expect(page.locator('#panelTitle'), href).not.toHaveText('');
    await expect(page.locator('#searchError'), href).toHaveText('');
  }
});

test('the roadmap shows shipped work grayed out, plus work in progress and planned', async ({ page }) => {
  await page.goto('/roadmap.html');
  await expect(page.locator('#progress')).toHaveText('In progress');
  await expect(page.locator('section[aria-labelledby=progress] .group li').first()).toContainText(/Portuguese|Pastoral review/);
  // the newest shipped group is either work not yet released or the latest release in the changelog
  const latest = require('fs').readFileSync('CHANGELOG.md', 'utf8').match(/^## \[(\d+\.\d+\.\d+)\]/m)[1];
  await expect(page.locator('.release h3').first()).toHaveText(new RegExp(`^(Live now|${latest.replace(/\./g, '\\.')})$`));
  // shipped rows are grayed out compared with planned ones, and each status is named for screen readers
  const shipped = await page.locator('.group.done li').first().evaluate(e => getComputedStyle(e).color);
  const planned = await page.locator('section[aria-labelledby=planned] .group h3').first().evaluate(e => getComputedStyle(e).color);
  expect(shipped).not.toBe(planned);
  await expect(page.locator('.group.done li .sr-only').first()).toHaveText('Shipped:');
});

test('the pages follow the reader\'s text size, font and contrast settings', async ({ page }) => {
  await page.goto('/roadmap.html');
  await page.evaluate(() => { localStorage.setItem('bc.textsize', '"xlarge"'); localStorage.setItem('bc.readable', 'true'); localStorage.setItem('bc.contrast', 'true'); });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-textsize', 'xlarge');
  await expect(page.locator('html')).toHaveAttribute('data-readable', 'on');
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'more');
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize))).toBe(22);
});

test('the pages follow the site language', async ({ page }) => {
  await page.goto('/guide.html?lang=es');
  await expect(page.locator('h1')).toHaveText('Cómo usar Bible Connections');
  await expect(page.locator('.try a').first()).toHaveAttribute('href', /lang=es/);
  await page.goto('/roadmap.html?lang=es');
  await expect(page.locator('h1')).toHaveText('Hoja de ruta');
});

test('jumping to a section keeps its title below the sticky header', async ({ page }) => {
  for (const w of [1280, 390]) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.goto('/guide.html');
    await page.locator('.toc a').nth(1).click();
    await page.waitForTimeout(600);
    const header = await page.locator('.top').boundingBox();
    const id = (await page.locator('.toc a').nth(1).getAttribute('href')).slice(1);
    const title = await page.locator(`h2[id="${id}"]`).boundingBox();
    expect(title.y).toBeGreaterThanOrEqual(header.y + header.height);
  }
  // opening a link straight to a section works too
  await page.goto('/guide.html#study-a-passage');
  await page.waitForTimeout(600);
  const header = await page.locator('.top').boundingBox();
  const title = await page.locator('h2#study-a-passage').boundingBox();
  expect(title.y).toBeGreaterThanOrEqual(header.y + header.height);
  expect(title.y).toBeLessThan(400);
});

test('every page outside the map has the same five sections, search and a grouped footer', async ({ page, isMobile }) => {
  for (const u of ['/guide.html', '/privacy.html', '/books/john/', '/verse/john-3-16/', '/cross-references/']) {
    await page.goto(u);
    const nav = page.locator('header.top nav.sections a');
    await expect(nav).toHaveText(['Explore', 'Journeys', 'Study', 'Library', 'More']);
    await expect(page.locator('.foot .foot-group h2')).toHaveText(['Help', 'Explore', 'About']);
    if (isMobile) {
      // a tab bar at the bottom, like the app
      const box = await page.locator('header.top nav.sections').boundingBox();
      expect(box.y + box.height).toBeGreaterThan(page.viewportSize().height - 4);
    }
  }
  await page.goto('/books/john/');
  await expect(page.locator('nav.sections a[aria-current=page]')).toHaveText('Explore');
  await page.locator('nav.sections a', { hasText: 'Journeys' }).click();
  await page.waitForSelector('body[data-ready=true]');
  await expect(page.locator('#panelTitle')).toHaveText('Guided journeys');
  // search from any page opens the search box in the app
  await page.goto('/guide.html');
  await page.locator('.top-search').click();
  await page.waitForSelector('body[data-ready=true]');
  await expect(page.locator('#search')).toBeFocused();
  // the language links keep you on the same page
  await page.goto('/privacy.html');
  await page.locator('.foot-lang a', { hasText: 'Português' }).click();
  await expect(page.locator('h1')).toHaveText('Privacidade');
});
