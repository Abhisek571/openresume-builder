# TODO / Roadmap

## UI
- [ ] Improve overall visual design (spacing, typography, colors)
- [ ] Add more resume templates beyond Classic/Modern
- [ ] Dark mode
- [ ] Drag-and-drop reordering of experience/education entries
- [ ] Visual "saved" indicator for autosave

## Functionality
- [ ] Increase functionality: add sections for projects, certifications, languages, links
- [ ] Multiple saved resumes / profile switching (not just single autosave slot)
- [ ] Export to DOCX and plain text, not just PDF
- [ ] Spell-check / grammar check on text fields
- [ ] Undo/redo for edits

## AI Integration
- [ ] Implement the AI integration feature (currently stubbed in `src/ai.js`)
- [ ] AI-assisted bullet point rewriting ("Improve with AI" button)
- [ ] AI-generated resume summary from job title/experience
- [ ] ATS keyword matching against a pasted job description

## Platforms
- [ ] Build and test the macOS .dmg on an actual Mac (or via GitHub Actions macOS runner)
- [ ] Portable Windows .exe build alongside the NSIS installer
- [ ] Android app via Capacitor (wraps the existing React/Vite build; Electron file I/O needs swapping for Capacitor Filesystem/Share plugins)

## Other
- [ ] Automated tests (component tests for Editor/Preview, at minimum)
- [ ] CI workflow on GitHub Actions (build + lint on push)
- [ ] Internationalization (i18n) for multi-language resumes
