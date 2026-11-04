const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://127.0.0.1:8000/dashboard/index.html', { waitUntil: 'networkidle' });

  const search = page.locator('#policy-search');
  const inputState = await search.evaluate((el) => ({
    disabled: el.disabled,
    readOnly: el.readOnly,
    pointerEvents: getComputedStyle(el).pointerEvents,
    zIndex: getComputedStyle(el).zIndex
  }));
  console.log('inputState=' + JSON.stringify(inputState));

  await search.fill('youtube.com');
  await page.waitForTimeout(200);
  console.log('rowsAfterSearch=' + JSON.stringify(await page.locator('#policy-table tr').allTextContents()));

  await page.locator('[data-policy-filter="inactive"]').click();
  await page.waitForTimeout(200);
  console.log('rowsInactive=' + JSON.stringify(await page.locator('#policy-table tr').allTextContents()));

  await page.locator('[data-policy-filter="active"]').click();
  await page.waitForTimeout(200);
  console.log('rowsActive=' + JSON.stringify(await page.locator('#policy-table tr').allTextContents()));

  await browser.close();
})();
