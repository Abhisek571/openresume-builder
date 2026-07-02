// Regenerates every docs/wiki screenshot against the current production
// build. Run `npm run build` first, then `node scripts/docs-screenshots.mjs`.
//
// Serves the build via `vite preview` and drives it in headless Edge
// (playwright-core's `msedge` channel — no browser download needed). The
// Electron preload bridge isn't there in a plain browser, so `window.api`
// is stubbed with no-ops, and localStorage is seeded with a realistic
// multi-profile sample resume so the shots show the app doing real work
// instead of an empty form.
//
// Output: docs/screenshot.png (hero) + docs/screenshots/*.png, 1440x900.
// Copy the results into the wiki clone by hand (or see the release notes
// checklist) — this script only writes into the repo.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const OUT = path.resolve('docs');
const OUT_SHOTS = path.join(OUT, 'screenshots');
mkdirSync(OUT_SHOTS, { recursive: true });

// ---- Sample data ----------------------------------------------------------
// One rich "master" resume plus two tailored profiles, so the profile
// switcher, snapshots table, and every section type all have content.

const T0 = new Date('2026-07-02T09:14:00').getTime();

const resume = {
  personal: {
    name: 'Jane Doe',
    title: 'Senior Software Engineer',
    email: 'jane.doe@example.com',
    phone: '+61 400 555 010',
    location: 'Melbourne, AU',
    website: 'janedoe.dev',
    summary:
      'Product-minded engineer with **8 years** building web and desktop apps. Comfortable owning a feature from design doc to release, with a bias for *simple, well-tested* solutions.',
  },
  sections: [
    {
      id: 'sec-experience',
      type: 'experience',
      title: 'Experience',
      items: [
        {
          id: 'exp-1',
          role: 'Senior Software Engineer',
          company: 'Acme Corp',
          location: 'Melbourne, AU',
          start: 'Mar 2022',
          end: 'Present',
          bullets: [
            'Led the migration to a **modular monorepo**, cutting CI build times by 40%.',
            'Designed the plugin API now used by **12 internal teams**.',
            '  Wrote the migration guide and ran three internal workshops.',
            'Mentored four junior engineers; two were promoted within a year.',
          ],
        },
        {
          id: 'exp-2',
          role: 'Software Engineer',
          company: 'Northwind Digital',
          location: 'Sydney, AU',
          start: 'Jan 2019',
          end: 'Feb 2022',
          bullets: [
            'Built a real-time analytics dashboard in *React* and *Node.js* used by 40k monthly users.',
            'Cut page-load time from 4.2s to **1.1s** through code-splitting and caching.',
          ],
        },
      ],
    },
    {
      id: 'sec-education',
      type: 'education',
      title: 'Education',
      items: [
        {
          id: 'edu-1',
          degree: 'BSc Computer Science',
          school: 'University of Melbourne',
          location: 'Melbourne, AU',
          start: '2015',
          end: '2018',
          bullets: ['First Class Honours; teaching assistant for Algorithms & Data Structures.'],
        },
      ],
    },
    {
      id: 'sec-skills',
      type: 'skills',
      title: 'Skills',
      items: [
        '**Languages:** JavaScript / TypeScript, Python, SQL',
        '**Frontend:** React, Vite, Electron',
        '**Backend:** Node.js, PostgreSQL, Redis',
        '**Tooling:** Git, GitHub Actions, Docker, Playwright',
      ],
    },
    {
      id: 'sec-projects',
      type: 'projects',
      title: 'Projects',
      items: [
        {
          id: 'proj-1',
          name: 'Trailhead',
          role: 'Creator & maintainer',
          link: 'github.com/janedoe/trailhead',
          start: 'Jun 2023',
          end: 'Present',
          bullets: ['Open-source hiking route planner — **1.2k stars** on GitHub.'],
        },
      ],
    },
    {
      id: 'sec-certifications',
      type: 'certifications',
      title: 'Certifications',
      items: [
        { id: 'cert-1', name: 'AWS Certified Solutions Architect — Associate', issuer: 'Amazon Web Services', date: '2024' },
      ],
    },
    {
      id: 'sec-languages',
      type: 'languages',
      title: 'Languages',
      items: [
        { id: 'lang-1', language: 'English', proficiency: 'Native' },
        { id: 'lang-2', language: 'German', proficiency: 'B2' },
        { id: 'lang-3', language: 'Hindi', proficiency: 'Conversational' },
      ],
    },
    {
      id: 'sec-links',
      type: 'links',
      title: 'Links',
      items: [
        { id: 'link-1', label: 'GitHub', url: 'github.com/janedoe' },
        { id: 'link-2', label: 'LinkedIn', url: 'linkedin.com/in/janedoe' },
        { id: 'link-3', label: 'Portfolio', url: 'janedoe.dev' },
      ],
    },
  ],
};

const profiles = {
  profiles: [
    { id: 'p-demo-1', name: 'Jane Doe — Master', createdAt: T0 - 86400000 * 30, updatedAt: T0 },
    { id: 'p-demo-2', name: 'Frontend — Acme application', createdAt: T0 - 86400000 * 7, updatedAt: T0 - 3600000 * 5 },
    { id: 'p-demo-3', name: 'Contract roles — short CV', createdAt: T0 - 86400000 * 2, updatedAt: T0 - 3600000 * 26 },
  ],
  activeProfileId: 'p-demo-1',
};

const snapshots = [
  { id: T0 - 60000, name: 'Before tailoring for Acme', label: new Date(T0 - 60000).toLocaleString(), data: resume },
  { id: T0 - 86400000, name: 'Added Trailhead project', label: new Date(T0 - 86400000).toLocaleString(), data: resume },
  { id: T0 - 86400000 * 3, name: '', label: new Date(T0 - 86400000 * 3).toLocaleString(), data: resume },
];

const seed = {
  'resume-builder:profiles': JSON.stringify(profiles),
  'resume-builder:profile:p-demo-1': JSON.stringify(resume),
  'resume-builder:profile:p-demo-2': JSON.stringify(resume),
  'resume-builder:profile:p-demo-3': JSON.stringify(resume),
  'resume-builder:snapshots:p-demo-1': JSON.stringify(snapshots),
  'resume-builder:snapshots:p-demo-2': JSON.stringify([]),
  'resume-builder:snapshots:p-demo-3': JSON.stringify([]),
  'resume-builder:theme': 'light',
};

// ---- Runner ----------------------------------------------------------------

const PORT = 4173;
const URL_BASE = `http://localhost:${PORT}/`;

async function up() {
  return fetch(URL_BASE).then(() => true).catch(() => false);
}

async function main() {
  let server = null;
  if (!(await up())) {
    server = spawn('npx', ['vite', 'preview', '--port', String(PORT)], {
      cwd: process.cwd(),
      shell: true,
      stdio: 'ignore',
    });
    for (let i = 0; i < 40 && !(await up()); i++) await new Promise((r) => setTimeout(r, 300));
  }
  if (!(await up())) throw new Error('vite preview did not come up — did you run `npm run build`?');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await context.addInitScript(([seedData]) => {
    // Electron preload bridge is absent in a plain browser — stub it.
    window.api = {
      onMenuOpen: () => {},
      onMenuSaveAs: () => {},
      setTheme: () => {},
      loadResume: async () => ({ ok: false }),
      saveResume: async () => ({ ok: false }),
      exportPDF: async () => ({ ok: false }),
      exportDocx: async () => ({ ok: false }),
      exportText: async () => ({ ok: false }),
      checkForUpdates: async () => ({ ok: true, hasUpdate: false, version: '0.0.0' }),
    };
    for (const [k, v] of Object.entries(seedData)) localStorage.setItem(k, v);
  }, [seed]);

  const page = await context.newPage();
  const shot = async (file) => {
    await page.waitForTimeout(400);
    await page.screenshot({ path: file.includes('/') || file.includes('\\') ? file : path.join(OUT_SHOTS, file) });
    console.log('captured', file);
  };

  await page.goto(URL_BASE);
  await page.waitForSelector('.nav-pane', { timeout: 30000 });
  await page.waitForTimeout(1000);

  // 1. Hero — Details tab, Personal section (whole workspace at a glance).
  await shot(path.join(OUT, 'screenshot.png'));

  // 2. Details — Experience section with rich bullets.
  await page.click('.nav-pane button.nav-item:has-text("Experience")');
  await shot('details.png');

  // 3. Formatting — focus a rich field and open the bullet/numbering picker.
  await page.click('.editor .rich-bullet-field');
  await page.click('.format-toolbar button[title="Bullet or numbering style, for the focused list field"]');
  await shot('formatting.png');
  await page.keyboard.press('Escape');
  await page.click('.editor-pane', { position: { x: 10, y: 10 } });

  // 4. Template gallery.
  await page.click('.tabs button:has-text("Template")');
  await shot('template-gallery.png');

  // 5. Final preview.
  await page.click('.tabs button:has-text("Final Preview")');
  await shot('final-preview.png');

  // Back to Details for the popover shots.
  await page.click('.tabs button:has-text("Details")');
  await page.waitForTimeout(300);

  // 6. Snapshots popover.
  await page.click('button:has-text("Snapshot Restore")');
  await shot('snapshots.png');
  await page.click('.snapshots-popover .popover-close');

  // 7. Profiles popover.
  await page.$eval('.profile-switch-btn', (el) => el.click());
  await shot('profiles.png');
  await page.click('.profiles-popover .popover-close');

  // 8. Export popover.
  await page.click('button:has-text("Export ▾")');
  await shot('export.png');
  await page.click('.export-popover .popover-close');

  // 9. Settings popover (Appearance toggle + version + update check).
  await page.click('.icon-btn[title="Settings"]');
  await shot('settings.png');

  // 10. Dark mode — flip to Dark, close settings, show Experience editing.
  await page.click('.theme-toggle button:has-text("Dark")');
  await page.click('.icon-btn[title="Settings"]');
  await page.click('.nav-pane button.nav-item:has-text("Experience")');
  await shot('dark-mode.png');

  await browser.close();
  if (server) server.kill();
  console.log('done.');
}

main().catch((err) => {
  console.error('screenshot run failed:', err);
  process.exit(1);
});
