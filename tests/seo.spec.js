const { test, expect } = require('@playwright/test');

test('llms.txt describes the site and says no Bible text is hosted', async ({ request }) => {
  const r = await request.get('/llms.txt');
  expect(r.ok()).toBe(true);
  const t = await r.text();
  expect(t.startsWith('# Bible Connections')).toBe(true);
  expect(t).toContain('does not host any Bible translation text');
});

test('the sitemap lists every page in each language with its language versions', async ({ request }) => {
  const x = await (await request.get('/sitemap.xml')).text();
  expect(x).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  expect(x).toContain('<loc>https://bibleconnections.app/privacy.html?lang=pt</loc>');
  expect(x).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  // every translated page lists its language versions; the book, verse and topic pages are English only
  const urls = x.split('<url>').slice(1);
  for (const u of urls.filter(u => !/\/(books|verse|cross-references|topics|people|places)\//.test(u))) expect(u).toContain('hreflang="x-default"');
  expect(x).toContain('<loc>https://bibleconnections.app/verse/john-3-16/</loc>');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Sitemap: https://bibleconnections.app/sitemap.xml');
});

test('the guide, roadmap and privacy pages have a canonical address and link previews', async ({ request }) => {
  for (const f of ['guide.html', 'roadmap.html', 'privacy.html']) {
    const h = await (await request.get('/' + f)).text();
    expect(h, f).toContain(`<link rel="canonical" href="https://bibleconnections.app/${f}">`);
    expect(h, f).toContain('property="og:image"');
    expect(h, f).toContain('hreflang="pt"');
  }
});

test('the page not found screen links back to the map, in the site language', async ({ page }) => {
  await page.goto('/404.html');
  await expect(page.locator('h1')).toHaveText('Page not found');
  await expect(page.locator('main a[href="/"]')).toBeVisible();
  await page.goto('/404.html?lang=es');
  await expect(page.locator('h1')).toHaveText('Página no encontrada');
});
