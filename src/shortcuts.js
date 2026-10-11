// Browser editing shortcuts share one primary modifier: Ctrl on Windows/Linux
// and Cmd on macOS. Alt combinations are intentionally left to the browser/OS.
export function hasPrimaryModifier({ ctrlKey, metaKey, altKey }) {
  return (ctrlKey || metaKey) && !altKey;
}

export const APP_SHORTCUTS = [
  { action: 'save', key: 's', label: 'Ctrl/Cmd+S', description: 'Save active profile now' },
  { action: 'snapshot', key: 's', shift: true, label: 'Ctrl/Cmd+Shift+S', description: 'Make a snapshot' },
  { action: 'open', key: 'o', label: 'Ctrl/Cmd+O', description: 'Import native résumé JSON' },
  { action: 'print', key: 'p', label: 'Ctrl/Cmd+P', description: 'Print / save PDF' },
  { action: 'help', key: '/', label: 'Ctrl/Cmd+/', description: 'Keyboard shortcuts' },
  { action: 'undo', key: 'z', label: 'Ctrl/Cmd+Z', description: 'Undo (native editing inside text fields)' },
  { action: 'redo', key: 'z', shift: true, label: 'Ctrl/Cmd+Shift+Z', description: 'Redo (outside text fields)' },
  { action: 'redo', key: 'y', label: 'Ctrl/Cmd+Y', description: 'Redo (outside text fields)' },
];

export function appShortcut(event, editing = false) {
  if (!hasPrimaryModifier(event) || event.isComposing || event.defaultPrevented || event.repeat) return null;
  const shortcut = APP_SHORTCUTS.find((s) => s.key === event.key.toLowerCase() && !!s.shift === !!event.shiftKey);
  if (!shortcut || (editing && ['undo', 'redo'].includes(shortcut.action))) return null;
  return shortcut.action;
}

// Return an editor formatting action only for universal browser shortcuts.
// Callers still decide whether the event target is an intended editable field.
export function formattingShortcut(event) {
  if (!hasPrimaryModifier(event) || event.shiftKey) return null;
  const key = event.key.toLowerCase();
  if (key === 'b') return 'bold';
  if (key === 'i') return 'italic';
  return null;
}
