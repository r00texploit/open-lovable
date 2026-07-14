import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const pages = [
  { path: '/', name: 'Home', expected: 'logo-dark' },
  { path: '/pricing', name: 'Pricing', expected: 'logo-light' },
  { path: '/auth/signin', name: 'AuthSignin', expected: 'logo-light' },
];

for (const { path, name, expected } of pages) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(800);
  const header = await page.locator('header').first();
  const box = await header.boundingBox();
  await header.screenshot({ path: `/tmp/header-${name.toLowerCase()}.png` });
  const img = await page.locator('header a img[alt="Noeron"]').first();
  const src = await img.getAttribute('src');
  console.log(name, { headerHeight: box ? Math.round(box.height) : null, src: src ? src.split('/').pop() : null, expected });
}
await browser.close();
