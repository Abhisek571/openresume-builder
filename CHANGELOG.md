# Changelog

## 1.0.0

- Renamed project to **OpenResume Builder**.
- Fixed Electron main process to run as CommonJS, avoiding a Node/Electron ESM interop bug with the `electron` built-in module.
- Added a launcher script that clears `ELECTRON_RUN_AS_NODE` so the app runs correctly from Electron-based terminals (e.g. VS Code).
- Added autosave: resume data now persists to `localStorage` on every edit and reloads automatically on launch.
- Pushed to GitHub.

## 0.5

- Initial scaffold: Electron + React + Vite app with editor/preview panes, JSON save/load, PDF export, and a stubbed AI hook.
