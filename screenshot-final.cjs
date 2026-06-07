const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const outputDir = '/tmp/screenshots-final';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Users/halim/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  });
  
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  
  const pg = await context.newPage();
  
  try {
    console.log('Screenshotting homepage...');
    await pg.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
    await pg.waitForTimeout(2000);
    
    await pg.screenshot({ 
      path: '/tmp/screenshots-final/homepage-desktop.png',
      fullPage: true 
    });
    console.log('✓ Saved: homepage-desktop.png');
    
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
  
  await context.close();
  await browser.close();
})();
