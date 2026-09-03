import { describe, expect, it, vi } from 'vitest';
import {
  SYSTEM_THEME_QUERY,
  applyTheme,
  applyThemeSetting,
  subscribeToSystemTheme,
} from './systemTheme.js';

function mediaHarness({ matches = false, legacy = false } = {}) {
  let listener;
  const mediaQuery = { matches };
  if (legacy) {
    mediaQuery.addListener = vi.fn((callback) => { listener = callback; });
    mediaQuery.removeListener = vi.fn();
  } else {
    mediaQuery.addEventListener = vi.fn((_event, callback) => { listener = callback; });
    mediaQuery.removeEventListener = vi.fn();
  }
  const matchMedia = vi.fn(() => mediaQuery);
  return { mediaQuery, matchMedia, change(value) { mediaQuery.matches = value; listener?.(); } };
}

describe('applyTheme', () => {
  it('resolves and applies the concrete theme', () => {
    const root = { setAttribute: vi.fn() };
    expect(applyTheme(root, 'system', true)).toBe('dark');
    expect(root.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });

  it('requires a document root', () => {
    expect(() => applyTheme(null, 'light', false)).toThrow(TypeError);
  });
});

describe('subscribeToSystemTheme', () => {
  it('applies immediately, tracks system changes, and unsubscribes', () => {
    const media = mediaHarness();
    const onTheme = vi.fn();
    const unsubscribe = subscribeToSystemTheme('system', onTheme, media.matchMedia);

    expect(media.matchMedia).toHaveBeenCalledWith(SYSTEM_THEME_QUERY);
    expect(onTheme).toHaveBeenLastCalledWith('light');
    media.change(true);
    expect(onTheme).toHaveBeenLastCalledWith('dark');
    unsubscribe();
    expect(media.mediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('does not subscribe when light or dark is explicitly selected', () => {
    const media = mediaHarness({ matches: true });
    const onTheme = vi.fn();
    subscribeToSystemTheme('light', onTheme, media.matchMedia)();
    expect(onTheme).toHaveBeenCalledWith('light');
    expect(media.mediaQuery.addEventListener).not.toHaveBeenCalled();
  });

  it('supports legacy Safari MediaQueryList listeners', () => {
    const media = mediaHarness({ legacy: true });
    const unsubscribe = subscribeToSystemTheme('system', vi.fn(), media.matchMedia);
    expect(media.mediaQuery.addListener).toHaveBeenCalledOnce();
    unsubscribe();
    expect(media.mediaQuery.removeListener).toHaveBeenCalledOnce();
  });

  it('falls back to light when matchMedia is unavailable', () => {
    const onTheme = vi.fn();
    expect(() => subscribeToSystemTheme('system', onTheme, null)()).not.toThrow();
    expect(onTheme).toHaveBeenCalledWith('light');
  });
});

describe('applyThemeSetting', () => {
  it('wires subscription results to the document root', () => {
    const media = mediaHarness({ matches: true });
    const root = { setAttribute: vi.fn() };
    const unsubscribe = applyThemeSetting('system', { root, matchMedia: media.matchMedia });
    expect(root.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    unsubscribe();
  });
});
