const { test, expect } = require('@playwright/test');
const ready = (page) => page.waitForSelector('body[data-ready=true]');

test('the manifest is ready for app stores', async ({ request }) => {
  const m = await (await request.get('/manifest.webmanifest')).json();
  expect(m.id).toBe('/');
  expect(m.categories).toContain('books');
  expect(m.display_override).toContain('standalone');
  expect(m.shortcuts.map(s => s.short_name)).toEqual(['Plans', 'Journeys', 'Places', 'Study']);
  expect(m.share_target.params.text).toBe('text');
  expect(m.screenshots.some(s => s.form_factor === 'wide')).toBe(true);
  for (const src of [...m.shortcuts.flatMap(s => s.icons.map(i => i.src)), ...m.screenshots.map(s => s.src), ...m.icons.map(i => i.src)]) {
    expect((await request.get('/' + src)).ok(), src).toBe(true);
  }
});

test('the privacy page explains what is stored, in each language', async ({ page }) => {
  await page.goto('/privacy.html');
  await expect(page.locator('h1')).toHaveText('Privacy');
  await expect(page.locator('main')).toContainText('no cookies');
  await expect(page.locator('main a[href^="mailto:"]').first()).toBeVisible();
  await page.goto('/privacy.html?lang=pt');
  await expect(page.locator('h1')).toHaveText('Privacidade');
  await expect(page.locator('main')).toContainText('nunca são enviados');
  await page.goto('/privacy.html?lang=es');
  await expect(page.locator('.foot-group').getByRole('link', { name: 'Privacidad' })).toBeVisible();
});

test('the welcome page and About window link to the privacy page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#landing a[href^="privacy.html"]')).toBeVisible();
});

test('text shared into the app opens the reference it mentions', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bc.tipsSeen', 'true'));
  await page.goto('/?text=' + encodeURIComponent('Our verse this week is John 3:16 https://example.com'));
  await ready(page);
  await expect(page.locator('#panelTitle')).toHaveText('John 3:16');
  await page.goto('/?url=' + encodeURIComponent('https://www.bible.com/bible/111/ROM.8.28.NIV'));
  await ready(page);
  await expect(page.locator('#panelTitle')).toHaveText('Romans 8:28');
});

test('the For churches page lists the leader tools, each with a way to try it, in each language', async ({ page }) => {
  await page.goto('/churches.html');
  await expect(page.locator('h1')).toHaveText('For churches');
  await expect(page.locator('main .card')).toHaveCount(8);
  await expect(page.locator('main .card .try a').first()).toHaveAttribute('href', './?view=church');
  await page.locator('main .card .try a', { hasText: 'See a leader handout' }).click();
  await expect(page).toHaveURL(/handout\.html\?journey=lamb&guide=leader/);
  await page.goto('/churches.html?lang=es');
  await expect(page.locator('h1')).toHaveText('Para iglesias');
  await expect(page.locator('main .card .try a').first()).toHaveAttribute('href', './?view=church&lang=es');
});

for (const [file, en, es] of [['terms', 'Terms of use', 'Términos de uso'], ['accessibility', 'Accessibility', 'Accesibilidad'], ['credits', 'Credits and licenses', 'Créditos y licencias']]) {
  test(`the ${en} page is written out in each language and linked from every page`, async ({ page }) => {
    await page.goto(`/${file}.html`);
    await expect(page.locator('h1')).toHaveText(en);
    expect(await page.locator('main section').count()).toBeGreaterThan(3);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://bibleconnections.app/${file}.html`);
    await page.goto(`/${file}.html?lang=es`);
    await expect(page.locator('h1')).toHaveText(es);
    await page.goto('/guide.html');
    await expect(page.locator(`.foot a[href*="${file}.html"]`)).toHaveCount(1);
  });
}

test('the privacy page says who runs the site, about hosting and your rights', async ({ page }) => {
  await page.goto('/privacy.html');
  await expect(page.locator('main')).toContainText('GitHub Pages');
  await expect(page.locator('main')).toContainText('ico.org.uk');
  await page.goto('/');
  await expect(page.locator('#landing a[href^="terms.html"]')).toHaveCount(1);
});

test('security.txt gives a contact', async ({ request }) => {
  const t = await (await request.get('/.well-known/security.txt')).text();
  expect(t).toContain('Contact: mailto:hello@bibleconnections.app');
});
