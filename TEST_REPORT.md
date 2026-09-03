# Test Report

Updated for the Beta 3 browser migration on 2026-09-03.

## How to run

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

## Unit and integration tests — 215 passing

Nineteen Vitest files cover the resume schema and legacy normalization, profiles and migration safety, history, rich text and editing helpers, themes, contact fields, semantic TXT/DOCX exports, browser downloads/import/printing/system-theme adapters, the frontend API client, and the production server.

The server tests run against real ephemeral Node HTTP listeners and verify health/version responses, static MIME types, HEAD handling, SPA fallback, invalid paths, unsupported methods, and package-authoritative version metadata.

## Browser E2E — 62 passing checks

`e2e/browser-smoke.mjs` launches an installed Chrome, Edge, or Chromium browser against the stable development origin, or against `BROWSER_E2E_URL` when supplied.

Coverage includes:

- live editing, preview updates, rich formatting, list indentation/toggling, and undo/redo;
- profiles, profile-isolated history, persistence after refresh, sections, languages, and links;
- visible JSON/TXT/DOCX/Print actions, real downloaded file contents, validated JSON import, and the print trigger;
- explicit and System theme behavior with a paper-white resume sheet;
- usable desktop, tablet, and mobile layouts with no page-level horizontal overflow.

The same complete 62-check flow passes at both the default Vite origin and the
production Node server at `http://127.0.0.1:4173`.

## Runtime and visual checks

- `GET /api/health` returned `{ "ok": true }`.
- `GET /api/version` returned the package name and version.
- An extensionless production route returned the SPA with HTTP 200.
- The browser screenshot workflow regenerated and was inspected for Details, Final Preview, templates, profiles, snapshots, export, Settings, light/dark themes, and mobile Details/Preview.

## Known limitations

- Automated browser coverage uses Chromium-family engines available on the test host. Firefox and Safari print output still require platform-specific manual compatibility checks.
- The browser E2E verifies that `window.print()` is invoked; native print dialogs and the user's chosen PDF destination cannot be automated reliably.
- There is no pixel-diff visual regression threshold. Screenshots provide a repeatable manual visual review instead.
