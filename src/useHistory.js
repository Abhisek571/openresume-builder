import { useCallback, useRef, useState } from 'react';
import { createHistory, record, undo as undoHistory, redo as redoHistory } from './history.js';

// Edits landing within this window merge into the previous undo step, so
// Ctrl+Z rewinds a typing burst instead of one keystroke at a time.
const COALESCE_MS = 600;

// Drop-in replacement for useState that keeps an undo/redo history. `set`
// accepts both the direct and functional forms, same as a useState setter.
export default function useHistory(initialValue) {
  const [history, setHistory] = useState(() =>
    createHistory(typeof initialValue === 'function' ? initialValue() : initialValue)
  );
  const lastEditAt = useRef(0);

  const set = useCallback((updater) => {
    const now = Date.now();
    const coalesce = now - lastEditAt.current < COALESCE_MS;
    lastEditAt.current = now;
    setHistory((h) =>
      record(h, typeof updater === 'function' ? updater(h.present) : updater, { coalesce })
    );
  }, []);

  const undo = useCallback(() => {
    lastEditAt.current = 0; // the first edit after an undo always starts a fresh step
    setHistory(undoHistory);
  }, []);

  const redo = useCallback(() => {
    lastEditAt.current = 0;
    setHistory(redoHistory);
  }, []);

  return {
    value: history.present,
    set,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
