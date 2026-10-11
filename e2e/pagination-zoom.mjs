import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import process from 'node:process';
const executablePath = [process.env.BROWSER_EXECUTABLE_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', chromium.executablePath()].find(p => p && existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
try {
  await page.goto(process.env.BROWSER_E2E_URL || 'http://127.0.0.1:5173');
  const fixture = { personal: { name: 'Zoom regression', summary: 'A long résumé fixture.' }, sections: [{ id: 'long', type: 'experience', title: 'Experience', items: [{ id: 'one', company: 'Company 0', role: 'Engineer', start: '2020', end: '2024', bullets: Array.from({ length: 15 }, (_, i) => `Tall bullet ${i}: ` + 'Built accessible reliable software and verified results with users. '.repeat(8)) }] }] };
  await page.getByLabel('Native resume file', { exact: true }).setInputFiles({ name: 'fixture.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  await page.getByRole('button', { name: 'Expand preview', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.final-preview-pane .paged-pages h1')?.textContent === 'Zoom regression');
  const geometry = () => page.locator('.preview-panel .paged-pages').evaluate(root => [...root.children].map(sheet => { const s = getComputedStyle(sheet); return { content: sheet.querySelector('.page-content').offsetHeight, capacity: sheet.clientHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom), count: sheet.querySelectorAll('li').length }; }));
  const before = await geometry();
  console.log('fit', await page.locator('.zoom-value').innerText(), JSON.stringify(before));
  // Probe the same DOM without fractional zoom to isolate rendering from pagination.
  await page.locator('.preview-panel .paged-pages').evaluate(el => el.style.zoom = '1');
  console.log('unscaled', JSON.stringify(await geometry()));
  await page.locator('.preview-panel .paged-pages').evaluate(el => el.style.zoom = '');
  assert.ok(before.every(p => p.content <= p.capacity + 1), 'Fractional zoom must not overflow page boundaries');
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    const after = await geometry();
    assert.deepEqual(after, before, 'Zoom must change visual size, not document layout');
  }
  console.log('PASS: fractional preview zoom preserves page geometry');
} finally { await browser.close(); }
