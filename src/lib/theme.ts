// ---------------------------------------------------------------------------
// Single source of truth for light/dark theme. The applied theme is the `dark`
// class on <html> (set pre-paint by the inline script in app/layout.tsx) and is
// mirrored to localStorage. Both the sidebar toggle and the Settings > Theme
// radios read/write through here, and a custom event keeps them live-synced
// within the same tab (localStorage 'storage' events don't fire same-tab).
// ---------------------------------------------------------------------------

export const THEME_KEY = "edgeflo_theme";
export const THEME_EVENT = "edgeflo-themechange";

export type Theme = "light" | "dark";

/** The currently applied theme (derives from the DOM, falling back to storage). */
export function getTheme(): Theme {
  if (typeof document !== "undefined") {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** Apply a theme everywhere: <html> class, storage, and notify listeners. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}
