// Browser end-to-end smoke test for the browser-first runtime.
// This intentionally uses playwright-core directly, matching the legacy
// desktop smoke harness without adding the Playwright test runner.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-core';

const APP_URL = process.env.BROWSER_E2E_URL || 'http://127.0.0.1:5173/';
const results = [];

function check(name, condition, detail) {
  results.push({ name, pass: Boolean(condition), detail });
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}${detail ? ` (${detail})` : ''}`);
}

function firstExisting(paths) {
  return paths.filter(Boolean).find((candidate) => existsSync(candidate));
}

function findBrowserExecutable() {
  const configured = firstExisting([
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.BROWSER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    process.env.EDGE_PATH,
  ]);
  if (configured) return configured;

  const candidates = [];
  if (process.platform === 'win32') {
    const programFiles = process.env.ProgramFiles;
    const programFilesX86 = process.env['ProgramFiles(x86)'];
    const localAppData = process.env.LOCALAPPDATA;
    candidates.push(
      programFiles && path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      programFilesX86 && path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      localAppData && path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      programFiles && path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      programFilesX86 && path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      localAppData && path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    );
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    );
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/microsoft-edge',
      '/usr/bin/microsoft-edge-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    );
  }

  const installed = firstExisting(candidates);
  if (installed) return installed;

  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  throw new Error(
    'No local Chrome, Edge, or Chromium executable found. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.',
  );
}

async function waitForServer(url, attempts = 60) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Vite did not become ready at ${url}: ${lastError?.message || 'unknown error'}`);
}

async function startVite() {
  const alreadyUp = await fetch(APP_URL).then((response) => response.ok).catch(() => false);
  if (alreadyUp) return null;

  const appUrl = new URL(APP_URL);
  const host = appUrl.hostname;
  const port = appUrl.port || (appUrl.protocol === 'https:' ? '443' : '80');
  const viteCli = path.resolve('node_modules', 'vite', 'bin', 'vite.js');
  const vite = spawn(
    process.execPath,
    [viteCli, '--host', host, '--port', port, '--strictPort'],
    { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development' }, stdio: 'ignore' },
  );
  await waitForServer(APP_URL);
  return vite;
}

async function openExport(page) {
  await page.getByRole('button', { name: 'Export ▾', exact: true }).click();
}

async function downloadFromExport(page, label) {
  await openExport(page);
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.getByRole('button', { name: label, exact: true }).click(),
  ]);
  const failure = await download.failure();
  check(`${label} download completes`, failure === null, failure || download.suggestedFilename());
  return {
    bytes: await readFile(await download.path()),
    filename: download.suggestedFilename(),
  };
}

async function selectText(page, selector, textToSelect, collapseAtEnd = false) {
  await page.locator(selector).evaluate((root, args) => {
    const line = root.querySelector(args.last ? '.rb-line:last-child' : '.rb-line');
    const range = document.createRange();
    if (args.text && line?.firstChild?.nodeType === Node.TEXT_NODE) {
      const start = line.firstChild.textContent.indexOf(args.text);
      if (start >= 0) {
        range.setStart(line.firstChild, start);
        range.setEnd(line.firstChild, start + args.text.length);
      } else {
        range.selectNodeContents(line);
      }
    } else {
      range.selectNodeContents(line);
      if (args.collapseAtEnd) range.collapse(false);
    }
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }, { text: textToSelect, collapseAtEnd, last: collapseAtEnd });
}

async function checkResponsiveLayout(page, name, width, height) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(150);
  const geometry = await page.evaluate(() => {
    const visible = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    return {
      innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      toolbar: visible('.toolbar'),
      workspace: visible('.workspace'),
      detailsSurface: visible('.editor-pane') || visible('.preview-pane'),
    };
  });
  check(`${name} layout has no page-level horizontal overflow`, geometry.documentWidth <= geometry.innerWidth + 1,
    `${geometry.documentWidth}px document / ${geometry.innerWidth}px viewport`);
  check(`${name} layout keeps the app usable`, geometry.toolbar && geometry.workspace && geometry.detailsSurface,
    JSON.stringify(geometry));
}

async function main() {
  const vite = await startVite();
  const executablePath = findBrowserExecutable();
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--disable-gpu'],
  });
  const context = await browser.newContext({
    acceptDownloads: true,
    colorScheme: 'light',
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    window.__browserSmokePrintCalls = 0;
    window.print = () => { window.__browserSmokePrintCalls += 1; };
  });

  try {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(APP_URL, { waitUntil: 'load', timeout: 60000 });

    await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('resume-builder:')) localStorage.removeItem(key);
      }
    });
    await page.reload({ waitUntil: 'load', timeout: 60000 });
    await page.locator('.nav-pane').waitFor({ state: 'visible' });

    check('browser app loaded at the stable origin', page.url().startsWith(APP_URL), page.url());
    check('nav pane rendered', await page.locator('.nav-pane').count() > 0);

    const importButton = page.getByRole('button', { name: 'Import JSON', exact: true });
    await openExport(page);
    for (const label of ['JSON (.json)', 'Plain text (.txt)', 'Word (.docx)', 'Print / PDF']) {
      check(`${label} action is visible`, await page.getByRole('button', { name: label, exact: true }).isVisible());
    }
    check('Import JSON action is visible', await importButton.isVisible());
    await page.getByRole('button', { name: 'Export ▾', exact: true }).click();

    // Personal details and history.
    const nameInput = page.locator('.editor input[placeholder="Name"]');
    await nameInput.fill('Marcus Bennett');
    await page.waitForTimeout(200);
    check('personal name edit reflects in live preview',
      await page.locator('.preview-pane h1').textContent() === 'Marcus Bennett');

    await page.waitForTimeout(700);
    await nameInput.fill('Marcus T. Bennett');
    await page.keyboard.press('Control+Z');
    await page.waitForTimeout(200);
    check('Ctrl+Z reverts the last name edit',
      await page.locator('.preview-pane h1').textContent() === 'Marcus Bennett');
    await page.keyboard.press('Control+Y');
    await page.waitForTimeout(200);
    check('Ctrl+Y restores the undone edit',
      await page.locator('.preview-pane h1').textContent() === 'Marcus T. Bennett');
    await page.waitForTimeout(700);
    await nameInput.fill('Marcus Bennett');

    // Rich text, line creation, indentation, and paragraph promotion.
    await page.locator('.nav-pane button.nav-item', { hasText: 'Experience' }).click();
    const richField = page.locator('.editor .rich-bullet-field');
    check('experience bullets field is a contenteditable div', await richField.evaluate((el) => el.tagName === 'DIV'));
    await selectText(page, '.editor .rich-bullet-field', 'migration');
    await page.locator('.format-toolbar button[title="Bold selected text"]').click();
    await page.waitForTimeout(150);
    check('bold via toolbar leaves no visible asterisks', !(await richField.textContent()).includes('*'));
    const experienceHtml = await page.locator('.preview-pane .r-entry ul li:first-child, .preview-pane .r-entry .r-bullet-intro')
      .first().innerHTML().catch(() => '');
    check('bold survives into the preview as real <strong>', experienceHtml.includes('<strong>migration</strong>'), experienceHtml);

    await selectText(page, '.editor .rich-bullet-field', null, true);
    const beforeNoSelection = await richField.textContent();
    await page.locator('.format-toolbar button[title="Bold selected text"]').click();
    check('bold with no selection does not insert placeholder text',
      beforeNoSelection === await richField.textContent());

    await selectText(page, '.editor .rich-bullet-field', null, true);
    const linesBefore = await richField.locator('.rb-line').count();
    await page.keyboard.press('Enter');
    await page.keyboard.type('Automated the release pipeline, cutting deploy time from 30 to 5 minutes.');
    const linesAfter = await richField.locator('.rb-line').count();
    check('Enter creates a new bullet line', linesAfter === linesBefore + 1, `${linesBefore} -> ${linesAfter}`);
    await page.keyboard.press('Control+]');
    const indented = await richField.locator('.rb-line:last-child').evaluate((el) =>
      el.firstChild?.nodeType === Node.TEXT_NODE ? el.firstChild.textContent : '');
    check('Ctrl+] indents the current line with 2 leading spaces', indented.startsWith('  '), JSON.stringify(indented));

    await selectText(page, '.editor .rich-bullet-field');
    const paragraphButton = page.locator('.format-toolbar button[title="Move the highlighted line(s) into or out of the bulleted list"]');
    check('paragraph button is enabled for the rich field', !(await paragraphButton.isDisabled()));
    await paragraphButton.click();
    check('paragraph promotion renders a plain intro in the preview',
      await page.locator('.preview-pane .r-entry .r-bullet-intro').count() > 0);

    // Skills add/edit/format/delete.
    await page.locator('.nav-pane button.nav-item', { hasText: 'Skills' }).click();
    const skillRowsBefore = await page.locator('.skill-row').count();
    await page.getByRole('button', { name: '+ Add Skill', exact: true }).click();
    check('+ Add Skill appends a new row', await page.locator('.skill-row').count() === skillRowsBefore + 1);
    const newSkillField = page.locator('.rich-skill-field').last();
    await newSkillField.click();
    await page.keyboard.type('Docker');
    check('typed skill appears as a stacked preview line',
      (await page.locator('.preview-pane .r-skill-line').allTextContents()).includes('Docker'));
    check('skills preview has no legacy chip pills', await page.locator('.preview-pane .r-chip').count() === 0);
    await newSkillField.locator('.rb-line').evaluate((line) => {
      const range = document.createRange();
      range.selectNodeContents(line);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
    await page.locator('.format-toolbar button[title="Bold selected text"]').click();
    check('bold on a skill row leaves no visible asterisks', !(await newSkillField.textContent()).includes('*'));
    await page.locator('.skill-row .danger').last().click();
    check('delete removes the added skill row', await page.locator('.skill-row').count() === skillRowsBefore);

    // Custom section single/multiple line behavior and rich-field undo.
    await page.locator('.nav-pane select.nav-add').selectOption('custom');
    const customField = page.locator('.editor .rich-bullet-field');
    await customField.click();
    await page.keyboard.type('Speaker at JSConf Australia 2023');
    check('a single custom line renders without a list marker',
      await page.locator('.preview-pane .resume-sheet > section:last-child li').count() === 0);
    await page.keyboard.press('Enter');
    await page.keyboard.type('Maintainer of three open-source npm packages');
    check('two custom lines render as a list',
      await page.locator('.preview-pane .resume-sheet > section:last-child li').count() === 2);
    await page.waitForTimeout(700);
    await page.keyboard.type('X');
    await page.keyboard.press('Control+Z');
    await page.waitForTimeout(150);
    check('Ctrl+Z in a focused rich field reverts the visible edit',
      await customField.textContent() === 'Speaker at JSConf Australia 2023Maintainer of three open-source npm packages');

    // Languages and links.
    await page.locator('.nav-pane select.nav-add').selectOption('languages');
    await page.locator('.editor input[placeholder="Language"]').fill('English');
    await page.locator('.editor input[placeholder="Proficiency"]').fill('Native');
    check('languages render inline',
      await page.locator('.preview-pane .r-languages').textContent() === 'English (Native)');
    await page.locator('.nav-pane select.nav-add').selectOption('links');
    await page.locator('.editor input[placeholder^="Label"]').fill('GitHub');
    await page.locator('.editor input[placeholder^="URL"]').fill('github.com/you');
    const previewLink = page.locator('.preview-pane .r-links a');
    check('link shows its label in the preview', await previewLink.textContent() === 'GitHub');
    check('bare URL gets an https:// scheme', await previewLink.getAttribute('href') === 'https://github.com/you');

    // Profiles and per-profile history.
    const profileCountBefore = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('resume-builder:profiles')).profiles.length);
    await page.locator('.profile-switch-btn').evaluate((element) => element.click());
    await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
    await page.waitForTimeout(450);
    const countAfterDuplicate = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('resume-builder:profiles')).profiles.length);
    check('Duplicate adds a profile', countAfterDuplicate === profileCountBefore + 1,
      `${profileCountBefore} -> ${countAfterDuplicate}`);
    check('Duplicate switches to the copy', (await page.locator('.profile-switch-btn').textContent()).includes('Copy of'));
    await page.locator('.profile-switch-btn').evaluate((element) => element.click());
    await page.locator('.profile-item:not(.active)').click();
    check('switching profiles clears the undo stack',
      await page.locator('.icon-btn[title="Undo (Ctrl+Z)"]').isDisabled());
    if (!(await page.locator('.profile-switch-btn').textContent()).includes('Copy of')) {
      await page.locator('.profile-switch-btn').evaluate((element) => element.click());
      await page.locator('.profile-item', { hasText: 'Copy of' }).click();
    }
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('.profile-switch-btn').evaluate((element) => element.click());
    await page.locator('.profile-actions button.danger', { hasText: 'Delete' }).click();
    await page.waitForTimeout(300);
    const countAfterDelete = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('resume-builder:profiles')).profiles.length);
    check('Delete restores the original profile count', countAfterDelete === profileCountBefore);

    // Persistence across refresh.
    await page.locator('.nav-pane button.nav-item', { hasText: 'Personal' }).click();
    await nameInput.fill('Persistent Browser User');
    await page.waitForTimeout(550);
    await page.reload({ waitUntil: 'load' });
    check('resume edits survive a browser refresh',
      await page.locator('.preview-pane h1').textContent() === 'Persistent Browser User');

    // Browser downloads: validate filenames and representative file contents.
    const jsonDownload = await downloadFromExport(page, 'JSON (.json)');
    check('JSON export uses a .json filename', jsonDownload.filename.toLowerCase().endsWith('.json'), jsonDownload.filename);
    const exportedResume = JSON.parse(jsonDownload.bytes.toString('utf8'));
    check('JSON download contains the active resume', exportedResume.personal?.name === 'Persistent Browser User');

    const txtDownload = await downloadFromExport(page, 'Plain text (.txt)');
    check('TXT export uses a .txt filename', txtDownload.filename.toLowerCase().endsWith('.txt'), txtDownload.filename);
    check('TXT download contains the resume name', txtDownload.bytes.toString('utf8').includes('Persistent Browser User'));

    const docxDownload = await downloadFromExport(page, 'Word (.docx)');
    check('DOCX export uses a .docx filename', docxDownload.filename.toLowerCase().endsWith('.docx'), docxDownload.filename);
    check('DOCX download is a non-empty ZIP document',
      docxDownload.bytes.length > 100 && docxDownload.bytes.subarray(0, 2).toString() === 'PK',
      `${docxDownload.bytes.length} bytes`);

    // Import via the browser file input, using the app's own exported format.
    exportedResume.personal.name = 'Imported Browser User';
    await page.locator('.resume-file-input').setInputFiles({
      name: 'browser-smoke-import.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(exportedResume)),
    });
    await page.waitForTimeout(250);
    check('JSON import replaces the active resume',
      await page.locator('.preview-pane h1').textContent() === 'Imported Browser User');

    // Print uses the normal browser workflow; the init-script spy avoids a native dialog.
    await openExport(page);
    await page.getByRole('button', { name: 'Print / PDF', exact: true }).click();
    check('Print / PDF triggers window.print',
      await page.evaluate(() => window.__browserSmokePrintCalls) === 1);

    await page.getByRole('button', { name: 'Template', exact: true }).click();
    await page.emulateMedia({ media: 'print' });
    check('printing from Template view renders only the selected resume',
      await page.locator('.resume-sheet:visible').count() === 1
        && await page.locator('.print-resume .resume-sheet:visible').count() === 1);
    await page.emulateMedia({ media: 'screen' });
    await page.getByRole('button', { name: 'Details', exact: true }).click();

    // Explicit dark and System theme behavior, persistence, and paper output.
    await page.locator('.icon-btn[title="Settings"]').click();
    await page.getByRole('button', { name: 'Dark', exact: true }).click();
    check('selecting Dark applies the dark theme',
      await page.locator('html').getAttribute('data-theme') === 'dark');
    check('dark preference persists to localStorage',
      await page.evaluate(() => localStorage.getItem('resume-builder:theme')) === 'dark');
    check('resume sheet stays paper-white in dark mode',
      await page.locator('.preview-pane .resume-sheet').evaluate((el) => getComputedStyle(el).backgroundColor) === 'rgb(255, 255, 255)');
    check('editor pane uses its dark surface in dark mode',
      await page.locator('.editor-pane').evaluate((el) => getComputedStyle(el).backgroundColor) === 'rgb(13, 17, 23)');
    await page.reload({ waitUntil: 'load' });
    check('dark mode survives refresh', await page.locator('html').getAttribute('data-theme') === 'dark');

    await page.emulateMedia({ colorScheme: 'dark' });
    await page.locator('.icon-btn[title="Settings"]').click();
    await page.getByRole('button', { name: 'System', exact: true }).click();
    check('System theme follows a dark browser preference',
      await page.locator('html').getAttribute('data-theme') === 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(100);
    check('System theme reacts to a light browser preference',
      await page.locator('html').getAttribute('data-theme') === 'light');
    await page.locator('.icon-btn[title="Settings"]').click();

    // Desktop/tablet/mobile viewport smoke. Each size must retain usable app
    // surfaces without creating page-level horizontal scrolling.
    await checkResponsiveLayout(page, 'desktop', 1440, 1000);
    await checkResponsiveLayout(page, 'tablet', 900, 900);
    await checkResponsiveLayout(page, 'mobile', 390, 844);
    await page.getByRole('button', { name: 'Final Preview', exact: true }).click();
    check('mobile Final Preview remains reachable', await page.locator('.final-preview-pane .resume-sheet').isVisible());
    await page.getByRole('button', { name: 'Details', exact: true }).click();
    check('mobile Details remains reachable', await page.locator('.editor-pane').isVisible());

    check('no uncaught page errors during the browser run', pageErrors.length === 0, pageErrors.join('; '));
  } finally {
    await context.close();
    await browser.close();
    if (vite) vite.kill();
  }

  const failed = results.filter((result) => !result.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) {
    console.log('Failed:', failed.map((result) => result.name).join(', '));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Browser E2E smoke test crashed:', error);
  process.exitCode = 1;
});
