const { chromium } = require('playwright');

const sections = [
  { name: 'hero', selector: '#hero', url: 'http://localhost:3000' },
  { name: 'features', selector: '#features', url: 'http://localhost:3000' },
  { name: 'how-it-works', selector: '#how-it-works', url: 'http://localhost:3000' },
  { name: 'pricing', selector: '#pricing', url: 'http://localhost:3000' },
  { name: 'faq', selector: 'section:has(h2:has-text("FAQ"))', fallback: true, url: 'http://localhost:3000' },
  { name: 'cta', selector: 'section:has(h2:has-text("Ready"))', fallback: true, url: 'http://localhost:3000' },
  { name: 'footer', selector: 'footer', url: 'http://localhost:3000' },
];

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('Navigating to page...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const fs = require('fs');
  const dir = './screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  // Full page screenshot first
  console.log('Capturing: full-page');
  await page.screenshot({ path: `${dir}/full-page.png`, fullPage: true });
  console.log('✓ full-page.png');

  // Hero section
  console.log('Capturing: hero');
  try {
    const hero = await page.locator('section').first();
    await hero.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await hero.screenshot({ path: `${dir}/hero.png` });
    console.log('✓ hero.png');
  } catch (e) {
    console.log('✗ hero failed:', e.message);
  }

  // Features section
  console.log('Capturing: features');
  try {
    const features = await page.locator('#features');
    await features.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await features.screenshot({ path: `${dir}/features.png` });
    console.log('✓ features.png');
  } catch (e) {
    console.log('✗ features failed:', e.message);
  }

  // How it works section
  console.log('Capturing: how-it-works');
  try {
    const hiw = await page.locator('#how-it-works');
    await hiw.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await hiw.screenshot({ path: `${dir}/how-it-works.png` });
    console.log('✓ how-it-works.png');
  } catch (e) {
    console.log('✗ how-it-works failed:', e.message);
  }

  // Pricing section
  console.log('Capturing: pricing');
  try {
    const pricing = await page.locator('#pricing');
    await pricing.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await pricing.screenshot({ path: `${dir}/pricing.png` });
    console.log('✓ pricing.png');
  } catch (e) {
    console.log('✗ pricing failed:', e.message);
  }

  // FAQ section
  console.log('Capturing: faq');
  try {
    const headings = await page.locator('h2').all();
    for (const heading of headings) {
      const text = await heading.textContent();
      if (text?.toLowerCase().includes('faq')) {
        const faq = await heading.locator('xpath=ancestor::section').first();
        await faq.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await faq.screenshot({ path: `${dir}/faq.png` });
        console.log('✓ faq.png');
        break;
      }
    }
  } catch (e) {
    console.log('✗ faq failed:', e.message);
  }

  // CTA section
  console.log('Capturing: cta');
  try {
    const headings = await page.locator('h2').all();
    for (const heading of headings) {
      const text = await heading.textContent();
      if (text?.toLowerCase().includes('ready')) {
        const cta = await heading.locator('xpath=ancestor::section').first();
        await cta.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await cta.screenshot({ path: `${dir}/cta.png` });
        console.log('✓ cta.png');
        break;
      }
    }
  } catch (e) {
    console.log('✗ cta failed:', e.message);
  }

  // Footer
  console.log('Capturing: footer');
  try {
    const footer = await page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await footer.screenshot({ path: `${dir}/footer.png` });
    console.log('✓ footer.png');
  } catch (e) {
    console.log('✗ footer failed:', e.message);
  }

  // Mobile viewport (375x812)
  console.log('\nCapturing mobile viewport...');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${dir}/mobile-full-page.png`, fullPage: true });
  console.log('✓ mobile-full-page.png');

  await browser.close();
  console.log('\nAll screenshots saved to ./screenshots/');
}

captureScreenshots().catch(console.error);
