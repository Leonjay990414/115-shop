const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const screenshotDir = path.join(__dirname, 'test_screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--disable-web-security', '--allow-file-access-from-files']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });

  // --- 1. 測試 index/index.html ---
  console.log('Testing index/index.html...');
  const page1 = await context.newPage();
  page1.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page1.on('pageerror', err => console.log('PAGE ERROR STACK:', err.stack));

  const indexPath = 'file:///' + path.resolve(__dirname, 'index', 'index.html').replace(/\\/g, '/');
  await page1.goto(indexPath, { waitUntil: 'domcontentloaded' });
  await page1.waitForTimeout(1000);

  // A. 首頁初始截圖
  await page1.screenshot({ path: path.join(screenshotDir, '01_index_initial.png') });
  console.log('Saved 01_index_initial.png');

  // B. 點擊商品卡片本體（圖框/空白處）-> 應彈出商品規格視窗 (#specModalOverlay)
  const firstCard = page1.locator('.product-card').first();
  await firstCard.scrollIntoViewIfNeeded();
  await firstCard.waitFor({ state: 'visible', timeout: 5000 });
  
  // 點擊卡片內的圖框
  const cardImgBox = firstCard.locator('.product-image-box');
  await cardImgBox.click();
  await page1.locator('#specModalOverlay').waitFor({ state: 'visible', timeout: 3000 });
  await page1.waitForTimeout(600);
  await page1.screenshot({ path: path.join(screenshotDir, '02_index_spec_modal.png') });
  console.log('Saved 02_index_spec_modal.png (Spec modal triggered by card click)');

  // 關閉規格彈窗
  const closeSpecBtn = page1.locator('#closeSpecModalBtn');
  if (await closeSpecBtn.isVisible()) {
    await closeSpecBtn.click();
    await page1.locator('#specModalOverlay').waitFor({ state: 'hidden', timeout: 3000 });
    await page1.waitForTimeout(500);
  }

  // C. 點擊「客製選購」按鈕 -> 應彈出客製表單視窗 (#customizeModalOverlay)
  const custBtn = firstCard.locator('.product-action-btn');
  await custBtn.scrollIntoViewIfNeeded();
  await custBtn.click();
  await page1.locator('#customizeModalOverlay').waitFor({ state: 'visible', timeout: 3000 });
  await page1.waitForTimeout(600);
  await page1.screenshot({ path: path.join(screenshotDir, '03_index_cust_modal.png') });
  console.log('Saved 03_index_cust_modal.png (Customize modal triggered by button click)');

  await page1.close();

  // --- 2. 測試 index/shop.html ---
  console.log('Testing index/shop.html...');
  const page2 = await context.newPage();
  const shopPath = 'file:///' + path.resolve(__dirname, 'index', 'shop.html').replace(/\\/g, '/');
  await page2.goto(shopPath, { waitUntil: 'domcontentloaded' });
  await page2.waitForTimeout(1000);

  // A. 商城初始截圖
  await page2.screenshot({ path: path.join(screenshotDir, '04_shop_initial.png') });
  console.log('Saved 04_shop_initial.png');

  // B. 點擊商品卡片圖框 -> 規格視窗
  const shopFirstCard = page2.locator('.product-card').first();
  await shopFirstCard.waitFor({ state: 'visible', timeout: 5000 });
  await shopFirstCard.locator('.product-image-box').click();
  await page2.waitForTimeout(800);
  await page2.screenshot({ path: path.join(screenshotDir, '05_shop_spec_modal.png') });
  console.log('Saved 05_shop_spec_modal.png');

  // 點擊規格彈窗內的「前往客製訂購」按鈕
  const specGoToCustBtn = page2.locator('#specGoToCustBtn');
  if (await specGoToCustBtn.isVisible()) {
    await specGoToCustBtn.click();
    await page2.waitForTimeout(800);
    await page2.screenshot({ path: path.join(screenshotDir, '06_shop_spec_to_cust.png') });
    console.log('Saved 06_shop_spec_to_cust.png');
  }

  // 關閉客製彈窗
  const closeCustBtn = page2.locator('#closeCustomizeBtn');
  if (await closeCustBtn.isVisible()) {
    await closeCustBtn.click();
    await page2.waitForTimeout(500);
  }

  // C. 直接點擊「客製選購」按鈕
  await shopFirstCard.locator('.product-action-btn').click();
  await page2.waitForTimeout(800);
  await page2.screenshot({ path: path.join(screenshotDir, '07_shop_direct_cust_modal.png') });
  console.log('Saved 07_shop_direct_cust_modal.png');

  await page2.close();
  await browser.close();
  console.log('All tests completed successfully!');
}

run().catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
