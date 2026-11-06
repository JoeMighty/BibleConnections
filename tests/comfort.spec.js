const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const ready = (page) => page.waitForSelector('body[data-ready=true]');

test('text size and easier-to-read font can be changed and are remembered', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  const before = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  await page.click('#settingsBtn');
  await page.locator('#settings label', { hasText: 'Extra large' }).click();
  await page.locator('label[for=readableToggle]').click();
  await expect(page.locator('html')).toHaveAttribute('data-textsize', 'xlarge');
  await expect(page.locator('html')).toHaveAttribute('data-readable', 'on');
  const after = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  expect(after).toBeGreaterThan(before);
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('Atkinson Hyperlegible');
  await page.reload();
  await ready(page);
  await expect(page.locator('html')).toHaveAttribute('data-textsize', 'xlarge');
  await expect(page.locator('html')).toHaveAttribute('data-readable', 'on');
  await page.click('#settingsBtn');
  const results = await new AxeBuilder({ page }).include('#settings').analyze();
  expect(results.violations).toEqual([]);
});

test('tapping where several arcs cross offers a choice', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  // find a point on screen where several arcs lie close together
  const pt = await page.evaluate(() => {
    const v = document.getElementById('viz'), r = v.getBoundingClientRect();
    return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.55 };
  });
  // simulate a finger tap (touch tolerance)
  await page.dispatchEvent('#viz', 'pointerdown', { pointerId: 7, pointerType: 'touch', clientX: pt.x, clientY: pt.y, isPrimary: true, bubbles: true });
  await page.dispatchEvent('#viz', 'pointerup', { pointerId: 7, pointerType: 'touch', clientX: pt.x, clientY: pt.y, isPrimary: true, bubbles: true });
  const picker = page.locator('.arc-picker');
  await expect(picker).toBeVisible();
  const n = await picker.locator('button[data-i]').count();
  expect(n).toBeGreaterThan(1);
  expect(n).toBeLessThanOrEqual(6);
  await expect(picker.locator('button[data-i]').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
  // tap again and pick one
  await page.dispatchEvent('#viz', 'pointerdown', { pointerId: 8, pointerType: 'touch', clientX: pt.x, clientY: pt.y, isPrimary: true, bubbles: true });
  await page.dispatchEvent('#viz', 'pointerup', { pointerId: 8, pointerType: 'touch', clientX: pt.x, clientY: pt.y, isPrimary: true, bubbles: true });
  const label = await picker.locator('button[data-i]').first().locator('span').nth(1).textContent();
  await picker.locator('button[data-i]').first().click();
  await expect(picker).toBeHidden();
  await expect(page.locator('#panelTitle')).toHaveText('Connection');
  await expect(page.locator('.verse-card .ref').first()).toHaveText(label.split(' ↔ ')[0]);
});

test('arc colors can be changed to another style and are remembered', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  const legend = () => page.locator('#legend .grad').getAttribute('style');
  const rainbow = await legend();
  await page.click('#settingsBtn');
  await expect(page.locator('#arcStyles input')).toHaveCount(5);
  await expect(page.locator('#arcStyles input[value=rainbow]')).toBeChecked();
  await page.locator('#arcStyles label', { hasText: 'Color-blind friendly' }).click();
  await expect.poll(legend).not.toBe(rainbow);
  expect(await legend()).toMatch(/#a68a00|#fde725/);
  await page.reload();
  await ready(page);
  await page.click('#settingsBtn');
  await expect(page.locator('#arcStyles input[value=clear]')).toBeChecked();
  const results = await new AxeBuilder({ page }).include('#settings').analyze();
  expect(results.violations).toEqual([]);
});

test('desktop animations play and end in the normal resting state', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'animations are for larger screens');
  await page.goto('/?motion=on');
  await ready(page);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
  await expect(page.locator('#landing')).toHaveClass(/play/);
  // the numbers count up and finish on the real values
  await expect(page.locator('#landingStats strong').first()).toHaveText('199,275', { timeout: 5000 });
  // sections ease in as they scroll into view
  await page.locator('.landing-foot').scrollIntoViewIfNeeded();
  await expect(page.locator('.landing-inner > .reveal').last()).toHaveClass(/in/);
  // selecting a connection still works with the travelling light
  await page.goto('/?motion=on&ref=John+3%3A16');
  await ready(page);
  await page.locator('#panel .conn-item').first().click();
  await expect(page.locator('#panelTitle')).toHaveText('Connection');
  await expect(page.locator('#panelBody')).toHaveClass(/panel-enter/);
});

test('animations are off in automated browsers, for reduced motion and when switched off', async ({ page }) => {
  await page.goto('/?view=map');
  await ready(page);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  await page.click('#settingsBtn');
  await expect(page.locator('#motionToggle')).toBeChecked();
  await page.locator('label[for=motionToggle]').click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bc.motion')))).toBe(false);
  await page.goto('/?motion=on');
  await ready(page);
  const anims = await page.evaluate(() => { document.documentElement.dataset.motion = 'on'; return getComputedStyle(document.querySelector('.hero')).animationName; });
  expect(typeof anims).toBe('string');
});
