# Development

## Prerequisites

Install Node.js 20.19 or newer (use an active LTS release). This project uses npm and the committed `package-lock.json`.

```bash
node -v
npm -v
npm install
```

## Browser development

```bash
npm run dev
```

Vite serves the browser app at the stable development origin `http://127.0.0.1:5173`. The React editor keeps resume profiles, snapshots, and theme settings in browser `localStorage`; changing the host or port uses a different storage origin.

## Production build and server

```bash
npm run build
npm run server
```

The built-in Node server serves `dist/` at `http://127.0.0.1:4173`, falls back to `index.html` for browser routes, and exposes:

- `GET /api/health`
- `GET /api/version`

`npm start` builds and starts the same production server in one command. Set `HOST` or `PORT` to override the listener when self-hosting; use a stable origin if users need existing browser-local data to remain reachable.

The server does not receive or store resume content. Editing, profiles, snapshots, imports, and exports remain local to the browser.

## Checks

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

The browser smoke suite uses `playwright-core` with an installed Chrome, Edge, or Chromium browser. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when automatic discovery cannot find one. Set `BROWSER_E2E_URL` to test an already-running deployment instead of the default Vite origin.

## Browser file and PDF behavior

- Import JSON uses the visible `Import JSON` button and validates before replacing the active resume.
- JSON, TXT, and DOCX exports download directly in the browser.
- `Print / PDF` opens the browser print dialog; choose the browser's Save as PDF destination.
- System/Light/Dark follows browser media preferences and keeps the resume sheet paper-white.

## Project structure

```text
server/
  app.js                 Static server and health/version handlers
  index.js               Production entry point
src/
  api/client.js          Focused same-origin API client
  browser/               File, download, print, and system-theme adapters
  App.jsx                Layout, toolbar, profiles, snapshots, and browser flows
  Editor.jsx             Section-based resume editor
  Preview.jsx            Paper-white resume preview and templates
  profiles.js            Browser-local profile/snapshot persistence
  exportModel.js         Shared semantic export model
e2e/
  browser-smoke.mjs      Real-browser parity and responsive smoke suite
```

## Versioning

`package.json` uses strict semver. Use `formatVersion()` from `src/version.js` for user-facing versions; do not hand-format version strings in components.

Beta 3 replaces the Electron runtime rather than redesigning the product. Keep the current resume schema, rich-text markers, storage keys, templates, and semantic export behavior stable.

## Adding server-backed features later

API credentials must stay on the server and must never be exposed through Vite environment variables or client bundles. Add server endpoints only when a feature requires them; resume editing and persistence should not move server-side by default.
