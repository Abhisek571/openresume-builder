import { resolveTheme } from '../theme.js';

export const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';

export function applyTheme(root, setting, prefersDark) {
  if (!root?.setAttribute) throw new TypeError('A document root is required to apply the theme.');
  const theme = resolveTheme(setting, prefersDark);
  root.setAttribute('data-theme', theme);
  return theme;
}

// Applies the current value immediately and returns an unsubscribe function.
// Explicit light/dark settings do not retain an unnecessary media listener.
export function subscribeToSystemTheme(setting, onTheme, matchMedia = globalThis.window?.matchMedia?.bind(globalThis.window)) {
  if (typeof onTheme !== 'function') throw new TypeError('A theme callback is required.');
  if (typeof matchMedia !== 'function') {
    onTheme(resolveTheme(setting, false));
    return () => {};
  }

  const mediaQuery = matchMedia(SYSTEM_THEME_QUERY);
  const notify = () => onTheme(resolveTheme(setting, mediaQuery.matches));
  notify();

  if (setting !== 'system') return () => {};

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', notify);
    return () => mediaQuery.removeEventListener('change', notify);
  }

  // Safari versions before MediaQueryList inherited EventTarget use these.
  mediaQuery.addListener?.(notify);
  return () => mediaQuery.removeListener?.(notify);
}

export function applyThemeSetting(setting, options = {}) {
  const root = options.root ?? globalThis.document?.documentElement;
  return subscribeToSystemTheme(
    setting,
    (theme) => {
      if (!root?.setAttribute) throw new TypeError('A document root is required to apply the theme.');
      root.setAttribute('data-theme', theme);
    },
    options.matchMedia,
  );
}
