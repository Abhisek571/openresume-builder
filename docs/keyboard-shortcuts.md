# Keyboard shortcuts

These are the browser app's app-specific shortcuts. Use **Ctrl** on Windows and Linux, or **Cmd** on macOS. The app deliberately does not claim Alt or Shift-modified formatting shortcuts, so browser and operating-system shortcuts continue to work.

| Shortcut | Where it works | Action |
|---|---|---|
| Ctrl/Cmd+B | Selected text in Summary or a rich text field | Toggle bold |
| Ctrl/Cmd+I | Selected text in Summary or a rich text field | Toggle italic |
| Ctrl/Cmd+S | Editor/workspace | Save active profile now |
| Ctrl/Cmd+Shift+S | Editor/workspace | Make a snapshot |
| Ctrl/Cmd+O | Editor/workspace | Import native résumé JSON |
| Ctrl/Cmd+P | Editor/workspace | Print / Save as PDF |
| Ctrl/Cmd+/ | Editor/workspace | Open the keyboard-shortcut dialog |
| Escape | Shortcut dialog | Close and return focus |
| Ctrl/Cmd+Z | Outside text fields | Undo the latest résumé edit |
| Ctrl/Cmd+Y | Outside text fields | Redo the latest résumé edit |
| Ctrl/Cmd+Shift+Z | Outside text fields | Redo the latest résumé edit |
| Ctrl/Cmd+] | Multi-line bullet fields | Indent the current line as a sub-bullet |
| Ctrl/Cmd+[ | Multi-line bullet fields | Outdent the current sub-bullet |
| Enter | Multi-line bullet fields | Start a new bullet; nested bullets continue at their indent level |
| Backspace at a nested bullet's text start | Multi-line bullet fields | Outdent one level |
| Tab / Shift+Tab | Bullet fields | Move to the next / previous form control; these keys do not indent |
| Shift+Enter | Bullet fields | Intentional no-op; use Enter to create a bullet |

Undo/redo inside text inputs and contenteditable fields retains native browser editing behavior. App commands ignore IME composition, repeated keydown events, Alt combinations and events already handled by the editor. Settings → Keyboard shortcuts exposes the same command list as the dispatcher.

The bullet/numbering style picker and the **¶** list/paragraph toggle are toolbar controls only. They intentionally have no keyboard shortcut, avoiding collisions with browser and platform commands.

In Summary, bold and italic require a selection (or an existing marked span at the caret) and never insert placeholder content. Rich text fields retain the browser's native caret behavior: applying a mark at a collapsed caret changes the formatting for subsequent typing without adding placeholder text.
