// Shared steps that differ between desktop and phones (phones have Settings under Me, and search behind a button).
async function openSettings(page) {
  await page.click('#settingsTop');
}
async function showSearch(page) {
  if (await page.locator('#search').isVisible()) return;
  await page.click('#searchBtn');
}
async function openMore(page) {
  if (await page.locator('#describeBtn').isVisible()) return;
  await page.click('#moreTools');
}
// phones show "Start over" only when more than one thing is open; one item is cleared with its ✕
async function startOver(page) {
  if (await page.locator('#startOver').isVisible()) { await page.click('#startOver'); return; }
  await page.locator('.ctx-x').first().click();
}
// phones keep About under Me
async function openAbout(page) {
  if (await page.locator('#aboutBtn').isVisible()) { await page.click('#aboutBtn'); return; }
  await page.click('[data-nav=more]');
  await page.click('.me-row[data-action=openAbout]');
}
module.exports = { openSettings, showSearch, openMore, startOver, openAbout };
