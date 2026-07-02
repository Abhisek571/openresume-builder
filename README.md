# OpenResume Builder

A free, open-source, cross-platform resume builder built with **Electron + React + Vite**.

![OpenResume Builder screenshot](docs/screenshot.png)

## Features

- **Multiple resume profiles** — keep a master resume plus tailored copies per application; New / Duplicate / Rename / Delete from a toolbar dropdown, with per-profile autosave, snapshots, and undo history
- **Export to PDF, Word (.docx), and plain text (.txt)** — bold/italic become real Word formatting, bullet/numbering styles become real Word numbering, links become clickable hyperlinks; plain text is the most ATS-safe format
- **Dark mode** — three-way System / Light / Dark, applied before first paint (no white flash); the resume preview stays paper-white, because it represents the printed page
- **Customizable resume sections** — Experience, Education, Skills, Projects, Certifications, Languages, Links, and free-form Custom sections; add, remove, rename, and reorder whole sections, and reorder individual entries within a section
- **Three templates** — Classic, Modern, and Resumatic (serif, bold header), switchable from a live-thumbnail template gallery
- **Template / Details / Final Preview workspace** — pick a template visually, edit in the section-based form, then check a clean chrome-free preview before exporting
- **WYSIWYG bold/italic** — Experience descriptions, Custom Section, and Skills render real bold/italic as you type, no visible `**`/`*` markup; combinable into bold+italic, with a Word/LibreOffice-style bullet & numbering picker (•, ○, ▪, –, 1., a., A., i., I.), an intro-sentence-before-the-list option, and Word-style list editing (Ctrl+]/Ctrl+[ to indent, Enter continues the list)
- **Undo/redo** — Ctrl+Z / Ctrl+Y plus ↶/↷ toolbar buttons; rapid edits coalesce so undo rewinds a typing burst, not a keystroke
- **Month/year date picker** — click a Start/End field (Experience, Education, Projects) for a year navigator and month grid, with a "Present" quick-pick and future dates blocked automatically
- **Autocomplete & autocorrect** — suggestion dropdowns for Title, Role, Skill, Degree, and Language-proficiency fields, plus real spellcheck with right-click correction suggestions
- **Snapshot backups** — take a named, timestamped snapshot at any point, then browse/restore/rename/delete from a table, with a confirmation warning before restoring
- **Autosave status indicator** — "Saving…" / "All changes saved" in the toolbar
- **Save / Open as JSON** — via the native File menu (Ctrl+O / Ctrl+Shift+S) — keep multiple resume files and reopen them anytime
- **Automatic update check** — checks GitHub Releases on launch, plus a manual "Check for Updates" button in Settings
- **Tested** — Vitest unit tests plus a Playwright e2e suite driving the real Electron app; the full suite gates every push and every release build

## Screenshots

| Resume profiles | Dark mode |
|---|---|
| ![Resume profiles](docs/screenshots/profiles.png) | ![Dark mode](docs/screenshots/dark-mode.png) |

| Template gallery | Export formats |
|---|---|
| ![Template gallery](docs/screenshots/template-gallery.png) | ![Export dropdown](docs/screenshots/export.png) |

| Text formatting & sub-bullets | Named snapshots |
|---|---|
| ![Format toolbar](docs/screenshots/formatting.png) | ![Snapshots](docs/screenshots/snapshots.png) |

More in the [wiki Screenshots page](https://github.com/Abhisek571/openresume-builder/wiki/Screenshots).

## Download

Get the latest build from the [Releases page](https://github.com/Abhisek571/openresume-builder/releases/latest):

- **Windows** — installer (`Setup.exe`) or portable (`.exe`)
- **macOS** — `.dmg` for Apple Silicon or Intel (built via CI, currently untested on real Mac hardware)
- **Linux** — `.AppImage` (built via CI, verified on a real Linux kernel via WSL2/WSLg) — see the [wiki's Linux install/run instructions](https://github.com/Abhisek571/openresume-builder/wiki/Installation#linux) for `chmod +x`, FUSE troubleshooting, and desktop integration

These are unsigned builds, so Windows SmartScreen / macOS Gatekeeper will warn about an unidentified developer the first time you run one.

## Roadmap

See [TODO.md](TODO.md) for planned work (page-break handling in PDF export, JSON Resume import/export, backup/restore, AI integration).

## Contributing / running from source

See [DEVELOPMENT.md](DEVELOPMENT.md) for setup, running in dev mode, testing, and building installers yourself.

## License

MIT — free to use, modify, and distribute.
