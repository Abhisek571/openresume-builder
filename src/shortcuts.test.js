import { describe, expect, it } from 'vitest';
import { appShortcut, formattingShortcut, hasPrimaryModifier } from './shortcuts.js';

describe('appShortcut', () => {
  it('centralizes app commands without hijacking editing or browser controls', () => {
    const event = (key, more = {}) => ({ key, ctrlKey: true, ...more });
    expect(appShortcut(event('s'))).toBe('save');
    expect(appShortcut(event('s', { shiftKey: true }))).toBe('snapshot');
    expect(appShortcut(event('o'))).toBe('open');
    expect(appShortcut(event('p'))).toBe('print');
    expect(appShortcut(event('/'))).toBe('help');
    expect(appShortcut(event('z'), true)).toBeNull();
    expect(appShortcut(event('z'))).toBe('undo');
    expect(appShortcut(event('z', { shiftKey: true }))).toBe('redo');
    expect(appShortcut(event('y'))).toBe('redo');
    expect(appShortcut(event('s', { isComposing: true }))).toBeNull();
    expect(appShortcut(event('s', { altKey: true }))).toBeNull();
    expect(appShortcut(event('r'))).toBeNull();
  });
});

describe('formattingShortcut', () => {
  it('maps Ctrl/Cmd+B and Ctrl/Cmd+I without Alt to text-format actions', () => {
    expect(formattingShortcut({ key: 'b', ctrlKey: true, metaKey: false, altKey: false })).toBe('bold');
    expect(formattingShortcut({ key: 'B', ctrlKey: false, metaKey: true, altKey: false })).toBe('bold');
    expect(formattingShortcut({ key: 'i', ctrlKey: true, metaKey: false, altKey: false })).toBe('italic');
    expect(formattingShortcut({ key: 'I', ctrlKey: false, metaKey: true, altKey: false })).toBe('italic');
  });

  it('does not claim formatting shortcuts without the primary modifier or with Alt/Shift', () => {
    expect(formattingShortcut({ key: 'b', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false })).toBeNull();
    expect(formattingShortcut({ key: 'i', ctrlKey: true, metaKey: false, altKey: true, shiftKey: false })).toBeNull();
    expect(formattingShortcut({ key: 'b', ctrlKey: true, metaKey: false, altKey: false, shiftKey: true })).toBeNull();
  });
});

describe('hasPrimaryModifier', () => {
  it('accepts Ctrl or Cmd but rejects Alt combinations', () => {
    expect(hasPrimaryModifier({ ctrlKey: true, metaKey: false, altKey: false })).toBe(true);
    expect(hasPrimaryModifier({ ctrlKey: false, metaKey: true, altKey: false })).toBe(true);
    expect(hasPrimaryModifier({ ctrlKey: true, metaKey: false, altKey: true })).toBe(false);
  });
});
