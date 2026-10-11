import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage();
mkdirSync('artifacts/history-viewport', { recursive: true });
try {
  await page.goto(process.env.BROWSER_E2E_URL || 'http://127.0.0.1:5173');
  await page.getByRole('button', { name: /^History/ }).click();
  for (const [width, height] of [[1440, 900], [1024, 600], [390, 600], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);
    const panel = page.locator('.snapshots-popover');
    const box = await panel.boundingBox();
    await page.screenshot({ path: `artifacts/history-viewport/${width}-${height}.png` });
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height,
      `History must fit ${width}x${height}: ${JSON.stringify(box)}`);
    // Simulate a long history without modifying persisted user data.
    await panel.evaluate(el => {
      const long = document.createElement('div'); long.dataset.overflowProbe = ''; long.style.height = '1200px'; el.append(long);
    });
    await page.waitForTimeout(50);
    const overflow = await panel.evaluate(el => {
      const rect = el.getBoundingClientRect(); el.scrollTop = el.scrollHeight;
      return { bottom: rect.bottom, scrollable: el.scrollTop > 0 };
    });
    assert.ok(overflow.bottom <= height && overflow.scrollable, 'Long history scrolls inside viewport');
    await panel.locator('[data-overflow-probe]').evaluate(el => el.remove());
  }
  await page.locator('.snapshots-popover .popover-close').click();
  assert.equal(await page.locator('.snapshots-popover').count(), 0);
  console.log('PASS: History stays on screen on resize; long history scrolls; close works');
} finally { await browser.close(); }
