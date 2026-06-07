import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 4000 }
  });
  
  // Desktop screenshot
  const page = await context.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // Wait for animations
  
  // Full page screenshot
  await page.screenshot({ 
    path: 'screenshots/landing-full.png',
    fullPage: true 
  });
  
  // Hero section screenshot
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ 
    path: 'screenshots/landing-hero.png'
  });
  
  // Mobile screenshot
  const mobilePage = await context.newPage();
  await mobilePage.setViewportSize({ width: 390, height: 3000 });
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ 
    path: 'screenshots/landing-mobile.png',
    fullPage: true 
  });
  
  await browser.close();
  console.log('Screenshots captured successfully!');
})();
