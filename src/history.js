// Undo/redo history as a plain { past, present, future } value. Pure
// functions so the mechanics are unit-testable without React; useHistory.js
// wraps these in a hook for App.jsx.

export const HISTORY_LIMIT = 100;

export function createHistory(present) {
  return { past: [], present, future: [] };
}

// coalesce: merge this edit into the previous undo step instead of starting
// a new one — used for rapid bursts (typing) so undo rewinds the burst, not
// one keystroke. Any edit clears the redo (future) stack.
export function record(history, next, { coalesce = false, limit = HISTORY_LIMIT } = {}) {
  if (next === history.present) return history;
  const past = coalesce ? history.past : [...history.past, history.present].slice(-limit);
  return { past, present: next, future: [] };
}

export function undo(history) {
  if (history.past.length === 0) return history;
  return {
    past: history.past.slice(0, -1),
    present: history.past[history.past.length - 1],
    future: [history.present, ...history.future],
  };
}

export function redo(history) {
  if (history.future.length === 0) return history;
  return {
    past: [...history.past, history.present],
    present: history.future[0],
    future: history.future.slice(1),
  };
}
