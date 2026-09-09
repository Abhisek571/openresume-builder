// Browser editing shortcuts share one primary modifier: Ctrl on Windows/Linux
// and Cmd on macOS. Alt combinations are intentionally left to the browser/OS.
export function hasPrimaryModifier({ ctrlKey, metaKey, altKey }) {
  return (ctrlKey || metaKey) && !altKey;
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
