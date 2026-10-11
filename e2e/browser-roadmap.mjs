// Extended browser checks share the existing browser harness and its temporary context.
export async function checkRoadmap(page, check, downloadFromExport) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Content', exact: true }).click();
  await page.getByRole('button', { name: 'Job Match', exact: true }).click();
  await page.getByLabel('Job description', { exact: true }).fill('JavaScript, PostgreSQL and Kubernetes required.');
  await page.waitForFunction(() => document.querySelector('.match-summary')?.textContent.includes('recognized keywords found'));
  check('Job Match extracts terms locally', await page.locator('.job-match').innerText().then((text) => text.includes('kubernetes')));
  await page.getByRole('button', { name: 'Content', exact: true }).click();
  await page.locator('.job-match').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Job Match', exact: true }).click();
  await page.locator('.job-match').waitFor({ state: 'visible' });
  check('Job Match retains description when closed and reopened', await page.getByLabel('Job description', { exact: true }).inputValue() === 'JavaScript, PostgreSQL and Kubernetes required.');
  await page.getByRole('button', { name: 'Content', exact: true }).click();
  await page.keyboard.press('Control+/');
  check('shortcut dispatcher opens a modal cheatsheet', await page.getByRole('dialog').isVisible());
  await page.keyboard.press('Escape');
  check('Escape closes the cheatsheet', !await page.getByRole('dialog').isVisible());

  const countProfiles = () => page.evaluate(() => JSON.parse(localStorage.getItem('resume-builder:profiles')).profiles.length);
  const originalCount = await countProfiles();
  const imported = { basics: { name: 'Portable Test', summary: 'Developed JavaScript software.' }, skills: [{ name: 'Tools', keywords: ['PostgreSQL'] }], awards: [{ title: 'Preserved Award' }] };
  await page.getByLabel('JSON Resume file', { exact: true }).setInputFiles({ name: 'portable.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
  await page.waitForFunction(() => document.querySelector('.status')?.textContent.includes('Imported as new profile'));
  check('JSON Resume import adds a profile instead of replacing one', await countProfiles() === originalCount + 1);
  check('unmapped JSON Resume fields are preserved visibly', await page.locator('.preview-pane').innerText().then((text) => text.includes('Preserved Award')));
  const portable = await downloadFromExport(page, 'JSON Resume 1.0 (.json)');
  check('JSON Resume export downloads the active profile', JSON.parse(portable.bytes.toString()).basics.name === 'Portable Test');
  await page.locator('.document-actions > summary').click();
  await page.getByRole('button', { name: 'Save snapshot', exact: true }).click();
  await page.locator('.document-actions > summary').click();
  await page.locator('.icon-btn[title="Settings"]').click();
  const backupEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Back up all profiles', exact: true }).click();
  const backupDownload = await backupEvent;
  const { readFile } = await import('node:fs/promises');
  const backupBytes = await readFile(await backupDownload.path());
  const backup = JSON.parse(backupBytes.toString());
  check('full backup includes profiles and snapshots', backup.entries['resume-builder:profiles'] && Object.entries(backup.entries).some(([key, value]) => key.startsWith('resume-builder:snapshots:') && JSON.parse(value).length));
  await page.locator('.icon-btn[title="Settings"]').click();
  await page.getByRole('button', { name: 'Job Match', exact: true }).click();
  await page.getByLabel('Job description', { exact: true }).fill('JavaScript PostgreSQL Kubernetes');
  await page.waitForFunction(() => document.querySelector('.match-summary')?.textContent.includes('2 of 3'));
  check('Job Match responds to imported résumé content', await page.locator('.match-summary').innerText().then((text) => text.includes('2 of 3')));
  await page.getByRole('button', { name: 'Content', exact: true }).click();
  await page.getByPlaceholder('Summary', { exact: true }).fill('Developed JavaScript software with Kubernetes.');
  await page.getByRole('button', { name: 'Job Match', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.match-summary')?.textContent.includes('3 of 3'));
  check('Job Match updates immediately while editing', await page.locator('.match-summary').innerText().then((text) => text.includes('3 of 3')));
  await page.getByRole('button', { name: 'Content', exact: true }).click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByLabel('Backup file', { exact: true }).setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: backupBytes });
  await page.waitForTimeout(100);
  check('cancelled backup restore preserves the edited résumé', await page.getByPlaceholder('Summary', { exact: true }).inputValue() === 'Developed JavaScript software with Kubernetes.');
  // Explicitly approve this isolated test restore; cancellation is tested separately.
  page.once('dialog', (dialog) => dialog.accept());
  const rescueEvent = page.waitForEvent('download');
  await page.getByLabel('Backup file', { exact: true }).setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: backupBytes });
  await rescueEvent;
  await page.waitForFunction(() => document.querySelector('.status')?.textContent.startsWith('Restored '));
  check('restore creates a durable rescue copy', await page.evaluate(() => !!localStorage.getItem('resume-builder:restore-rescue')));
  await page.reload();
  check('restored profiles survive reload', await countProfiles() === originalCount + 1);
  check('restored active résumé survives reload', await page.locator('.preview-pane h1').first().textContent() === 'Portable Test');

  const long = { personal: { name: 'Pagination Test', summary: 'A long résumé fixture.' }, sections: [{ id: 'long', type: 'experience', title: 'Experience', items: Array.from({ length: 16 }, (_, i) => ({ id: `entry-${i}`, company: `Company ${i}`, role: 'Engineer', start: '2020', end: '2024', bullets: Array.from({ length: 4 }, (_, j) => `Unique bullet ${i}-${j}: Designed and maintained reliable accessible software for users and tested the complete delivery process.`) })) }] };
  await page.getByLabel('Native resume file', { exact: true }).setInputFiles({ name: 'long.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(long)) });
  await page.waitForFunction(() => document.querySelector('.preview-pane h1')?.textContent === 'Pagination Test');
  check('long résumé has discrete preview pages', await page.locator('.preview-pane .paged-pages > .resume-sheet').count() > 1);
  const pageContent = await page.locator('.preview-pane .paged-pages').innerText();
  check('paginated preview retains every bullet once', long.sections[0].items.every((item) => item.bullets.every((bullet) => pageContent.split(bullet).length === 2)));
  check('no stranded section headings or overflowing normal entries', await page.locator('.preview-pane .paged-pages').evaluate((root) => [...root.querySelectorAll('.resume-sheet')].every((sheet) => {
    const content = sheet.querySelector('.page-content');
    const style = getComputedStyle(sheet);
    return content.offsetHeight <= sheet.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) + 1
      && [...content.querySelectorAll('section')].every((section) => !section.querySelector('h3') || section.children.length > 1);
  })));
  const previewCount = await page.locator('.preview-pane .paged-pages > .resume-sheet').count();

  await page.emulateMedia({ media: 'print' });
  const printCount = await page.locator('.print-resume .paged-pages > .resume-sheet').count();
  check('print uses the same number of pages as preview', printCount === previewCount, `preview=${previewCount}, print=${printCount}`);
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  check('multi-page PDF is generated by Chromium', pdf.subarray(0, 4).toString() === '%PDF' && pdf.length > 1000);
  const { writeFile } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  await writeFile(join(tmpdir(), 'openresume-roadmap.pdf'), pdf);
  await page.emulateMedia({ media: 'screen' });

  const fixtures = {
    'one-page': { ...long, sections: [{ ...long.sections[0], items: long.sections[0].items.slice(0, 1) }] },
    'spill': { ...long, sections: [{ ...long.sections[0], items: long.sections[0].items.slice(0, 6) }] },
    'tall-entry': { ...long, sections: [{ ...long.sections[0], items: [{ ...long.sections[0].items[0], bullets: Array.from({ length: 15 }, (_, i) => `Tall bullet ${i}: ` + 'Built accessible reliable software and verified results with users. '.repeat(8)) }] }] },
    'heading-boundary': { ...long, sections: [{ id: 'skills', type: 'skills', title: 'Skills', items: Array.from({ length: 30 }, (_, i) => `Skill ${i}`) }, { ...long.sections[0], items: long.sections[0].items.slice(0, 1) }] },
  };
  for (const template of ['Classic', 'Modern', 'Resumatic']) {
    await page.getByRole('button', { name: 'Design', exact: true }).click();
    await page.locator('.template-card').filter({ has: page.locator('.template-label', { hasText: template }) }).click();
    await page.getByRole('button', { name: 'Expand preview', exact: true }).click();
    for (const [name, fixture] of Object.entries(fixtures)) {
      const uniqueName = `${template} ${name}`;
      const data = { ...fixture, personal: { ...fixture.personal, name: uniqueName } };
      await page.getByLabel('Native resume file', { exact: true }).setInputFiles({ name: 'fixture.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
      await page.waitForFunction((name) => document.querySelector('.final-preview-pane .paged-pages h1')?.textContent === name, uniqueName);
      const root = page.locator('.final-preview-pane .paged-pages');
      const text = await root.innerText();
      const expected = data.sections.flatMap((s) => s.items.flatMap((i) => typeof i === 'string' ? [i] : i.bullets || []));
      const geometry = await root.evaluate((root) => [...root.children].every((sheet) => {
        const style = getComputedStyle(sheet);
        return sheet.querySelector('.page-content').offsetHeight <= sheet.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) + 1
          && [...sheet.querySelectorAll('section')].every((s) => !s.querySelector('h3') || s.children.length > 1);
      }));
      const count = await root.locator(':scope > .resume-sheet').count();
      await page.emulateMedia({ media: 'print' });
      const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
      await page.emulateMedia({ media: 'screen' });
      const pdfPages = (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
      check(`${uniqueName}: complete content, safe boundaries, matching PDF pages`, geometry && expected.every((part) => text.includes(part.trim())) && count === pdfPages && (name === 'one-page' ? count === 1 : count > 1), `preview=${count}, PDF=${pdfPages}`);
      await writeFile(join(tmpdir(), `openresume-${template}-${name}.pdf`), pdf);
    }
  }
  await page.waitForFunction(() => document.querySelector('.save-status')?.textContent === 'Saved on this device');
  await page.evaluate(() => {
    window.__originalStorageWrite = Storage.prototype.setItem;
    Storage.prototype.setItem = function () { throw new DOMException('Quota exceeded', 'QuotaExceededError'); };
  });
  try {
    await page.keyboard.press('Control+s');
    check('save shortcut reports storage failure without crashing', await page.locator('.status').innerText().then((text) => text.includes('Command failed:')));
  } finally {
    await page.evaluate(() => { Storage.prototype.setItem = window.__originalStorageWrite; delete window.__originalStorageWrite; });
  }
  await page.keyboard.press('Control+s');
  await page.screenshot({ path: join(tmpdir(), 'openresume-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(tmpdir(), 'openresume-mobile.png') });
}
