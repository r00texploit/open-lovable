import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const screenshotDir = path.join(root, '.omc', 'screenshots');
await fs.mkdir(screenshotDir, { recursive: true });

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1440, height: 900 },
];

function dedupeLogs(logs) {
  const seen = new Map();
  for (const log of logs) {
    const key = `${log.type}|${log.text}`;
    if (seen.has(key)) {
      seen.get(key).count += 1;
    } else {
      seen.set(key, { ...log, count: 1 });
    }
  }
  return Array.from(seen.values());
}

async function verifyViewport(viewport) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();

  const rawLogs = [];
  const pageErrors = [];
  page.on('console', (msg) =>
    rawLogs.push({
      type: msg.type(),
      text: msg.text().slice(0, 400),
      url: msg.location()?.url,
    })
  );
  page.on('pageerror', (err) => pageErrors.push(err.message.slice(0, 400)));

  await page.goto(BASE, { waitUntil: 'load', timeout: 20000 });
  await page
    .waitForLoadState('networkidle', { timeout: 15000 })
    .catch(() => {});
  // Allow fonts / entrance animations to settle
  await page.waitForTimeout(1500);

  const screenshotPath = path.join(
    screenshotDir,
    `landing-${viewport.name}.png`
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const h1 = page.locator('h1').first();
  const h1Text = await h1.textContent().catch(() => null);
  const h1Visible = await h1.isVisible().catch(() => false);

  const nav = page.locator('nav').first();
  const navVisible = await nav.isVisible().catch(() => false);

  const footer = page.locator('footer').first();
  const footerVisible = await footer.isVisible().catch(() => false);

  const cta = page
    .locator('header a[href="/generation"], header button')
    .first();
  const ctaVisible = await cta.isVisible().catch(() => false);

  const bodyWidth = await page.evaluate(
    () => document.documentElement.scrollWidth
  );
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  const overflow = bodyWidth > viewportWidth + 2;

  const deduped = dedupeLogs(rawLogs);
  const consoleErrors = deduped.filter((l) => l.type === 'error');
  const consoleWarnings = deduped.filter((l) => l.type === 'warning');

  await browser.close();

  const passed =
    h1Visible &&
    footerVisible &&
    !overflow &&
    pageErrors.length === 0 &&
    consoleErrors.length === 0;

  return {
    name: viewport.name,
    width: viewport.width,
    height: viewport.height,
    screenshotPath,
    h1Text,
    h1Visible,
    navVisible,
    footerVisible,
    ctaVisible,
    overflow,
    bodyWidth,
    viewportWidth,
    consoleErrors,
    consoleWarnings,
    pageErrors,
    passed,
    totalLogEntries: rawLogs.length,
  };
}

const results = [];
for (const vp of viewports) {
  results.push(await verifyViewport(vp));
}

console.log(JSON.stringify(results, null, 2));
