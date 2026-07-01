import { describe, it, expect } from 'vitest';
import { createHistory, record, undo, redo, HISTORY_LIMIT } from './history.js';

describe('createHistory', () => {
  it('starts with the given present and empty stacks', () => {
    const h = createHistory('a');
    expect(h).toEqual({ past: [], present: 'a', future: [] });
  });
});

describe('record', () => {
  it('pushes the old present onto past', () => {
    const h = record(createHistory('a'), 'b');
    expect(h).toEqual({ past: ['a'], present: 'b', future: [] });
  });

  it('returns the same history when the value is unchanged', () => {
    const h = createHistory('a');
    expect(record(h, 'a')).toBe(h);
  });

  it('clears the future so a new edit invalidates redo', () => {
    let h = record(createHistory('a'), 'b');
    h = undo(h);
    expect(h.future).toEqual(['b']);
    h = record(h, 'c');
    expect(h).toEqual({ past: ['a'], present: 'c', future: [] });
  });

  it('merges into the previous step when coalescing', () => {
    let h = record(createHistory('a'), 'b');
    h = record(h, 'c', { coalesce: true });
    expect(h).toEqual({ past: ['a'], present: 'c', future: [] });
    // one undo rewinds the whole burst
    expect(undo(h).present).toBe('a');
  });

  it('coalescing with an empty past keeps it empty', () => {
    const h = record(createHistory('a'), 'b', { coalesce: true });
    expect(h).toEqual({ past: [], present: 'b', future: [] });
    expect(undo(h)).toBe(h);
  });

  it('drops the oldest entries beyond the limit', () => {
    let h = createHistory(0);
    for (let i = 1; i <= HISTORY_LIMIT + 10; i++) h = record(h, i);
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    expect(h.past[0]).toBe(10);
    expect(h.present).toBe(HISTORY_LIMIT + 10);
  });
});

describe('undo/redo', () => {
  it('undo moves present into future and pops past', () => {
    const h = undo(record(createHistory('a'), 'b'));
    expect(h).toEqual({ past: [], present: 'a', future: ['b'] });
  });

  it('redo reverses an undo', () => {
    const h = redo(undo(record(createHistory('a'), 'b')));
    expect(h).toEqual({ past: ['a'], present: 'b', future: [] });
  });

  it('undo with no past is a no-op', () => {
    const h = createHistory('a');
    expect(undo(h)).toBe(h);
  });

  it('redo with no future is a no-op', () => {
    const h = createHistory('a');
    expect(redo(h)).toBe(h);
  });

  it('walks multiple steps back and forward in order', () => {
    let h = createHistory('a');
    h = record(h, 'b');
    h = record(h, 'c');
    h = undo(h);
    expect(h.present).toBe('b');
    h = undo(h);
    expect(h.present).toBe('a');
    h = redo(h);
    expect(h.present).toBe('b');
    h = redo(h);
    expect(h.present).toBe('c');
  });
});
