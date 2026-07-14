import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const pages = [
  { path: '/', name: 'Home' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/auth/signin', name: 'AuthSignin' },
];

for (const { path, name } of pages) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(800);
  const header = await page.locator('header').first();
  const box = await header.boundingBox();
  await header.screenshot({ path: `/tmp/header-${name.toLowerCase()}.png` });
  const logo = await page.locator('header a img, header a svg').first();
  const logoBox = await logo.boundingBox();
  console.log(name, { headerHeight: box ? Math.round(box.height) : null, logoSize: logoBox ? `${Math.round(logoBox.width)}x${Math.round(logoBox.height)}` : null });
}
await browser.close();
