const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://localhost:8000/dashboard/login.html", { waitUntil: "networkidle" });
  await page.fill("#login-email", "example@company.com");
  await page.fill("#login-password", "demo-password");
  await page.click("#login-form button[type=\"submit\"]");
  await page.waitForTimeout(1200);
  const count = await page.locator("[data-ticket-message-id]").count();
  console.log("buttons:" + count);
  if (count > 0) {
    const first = page.locator("[data-ticket-message-id]").first();
    await first.click();
    await page.waitForTimeout(500);
    const modalClass = await page.locator("#ticket-message-modal").getAttribute("class");
    console.log("ticketModalClass:" + modalClass);
  }
  await browser.close();
})();
