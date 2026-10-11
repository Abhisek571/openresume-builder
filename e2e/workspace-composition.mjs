import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1586, height: 992 }, colorScheme: 'dark' });
mkdirSync('artifacts/quiet-workspace', { recursive: true });
try {
  await page.goto('http://127.0.0.1:5173');
  await page.locator('.workspace-home').waitFor();
  await page.screenshot({ path: 'artifacts/quiet-workspace/composition-before.png' });
  assert.equal(await page.locator('.workspace-sidebar .brand').count(), 1, 'Brand belongs in sidebar, not document toolbar');
  const pane = await page.locator('.preview-pane').boundingBox();
  const paper = await page.locator('.preview-pane .paged-pages > .resume-sheet').first().boundingBox();
  assert.ok(Math.abs(paper.x + paper.width / 2 - pane.x - pane.width / 2) < 3, 'Paper centered on preview canvas');
  await page.locator('.workspace-home').click();
  const frame = await page.locator('.library-document').first().boundingBox();
  const thumb = await page.locator('.library-thumb-inner .resume-sheet').first().boundingBox();
  assert.ok(thumb.height <= frame.height + 2, 'Thumbnail contains the complete page');
  assert.ok(Math.abs(thumb.x + thumb.width / 2 - frame.x - frame.width / 2) < 2, 'Thumbnail centered');
  await page.screenshot({ path: 'artifacts/quiet-workspace/library-fixed.png' });
  await page.locator('.resume-library-card').first().click();
  await page.screenshot({ path: 'artifacts/quiet-workspace/content-fixed.png' });
  console.log('PASS: sidebar branding, centered preview, full centered thumbnail');
} finally { await browser.close(); }
