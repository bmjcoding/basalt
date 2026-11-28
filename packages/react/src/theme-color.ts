// The browser chrome's colour (DECISIONS 420): the one tag Basalt's script owns, `<meta name="theme-color" data-basalt-theme-color="live">`, kept first in
// `<head>` so it outranks the static pair (`themeColorMeta`, markup no script touches), its `content` the page colour of the theme the root shows. The head
// script makes it before first paint; this keeps it in step after. Internal: theme.ts calls it after every theme write, and a palette store in this package
// imports it. Nothing runs at import.
//
// The colour pair is state on the tag itself, not an argument: `data-light` and `data-dark` (hex), each falling back to Basalt's ground. A palette that
// changes `surface-page` sets those two and syncs, so every later write (an OS change, another tab, the app's own `data-theme`) keeps the palette's ground.
// The defaults are `surface-page` in each theme; a test holds them to tokens.json.

declare const process: { env: { NODE_ENV?: string } };

const LIGHT = "#fafafa";
const DARK = "#000000";
const ANY = 'meta[name="theme-color"]';
const APP = 'meta[name="theme-color"]:not([data-basalt-theme-color])';
const LIVE = 'meta[data-basalt-theme-color="live"]';

let warned = false;

/** The theme the root shows: `data-theme` if it is light or dark, else a `.dark` or `.light` class on the root, else the system's scheme. */
function shown(root: HTMLElement): "light" | "dark" {
  const theme = root.getAttribute("data-theme");
  if (theme === "light" || theme === "dark") return theme;
  if (root.classList.contains("dark")) return "dark";
  if (root.classList.contains("light")) return "light";
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Creates or updates the live tag for the theme shown, first among the `theme-color` tags in `<head>`. With an app's own `theme-color` in `<head>` it writes
 * none, and removes its own if one is there: the app's tag owns the chrome. Does nothing on the server.
 */
export function syncThemeColor(): void {
  if (typeof document === "undefined") return;
  const head = document.head;
  if (!head) return;
  let live = head.querySelector<HTMLMetaElement>(LIVE);
  if (head.querySelector(APP)) {
    live?.remove();
    return;
  }
  if (!live) {
    live = document.createElement("meta");
    live.name = "theme-color";
    live.setAttribute("data-basalt-theme-color", "live");
    // A property React 19's matcher reads: it claims a server-rendered hoistable <meta> by content, name, property, http-equiv and charset, so without
    // it the live tag (first, the same name and, in one theme, the same content) could be taken for one of the pair. The browser ignores it.
    live.setAttribute("property", "basalt-live");
  }
  // The first matching tag in tree order wins, so the live tag goes before the first (the pair, wherever the app rendered it).
  const first = head.querySelector(ANY);
  if (first !== live) head.insertBefore(live, first && first.parentNode === head ? first : null);
  const colour = shown(document.documentElement) === "dark" ? live.getAttribute("data-dark") || DARK : live.getAttribute("data-light") || LIGHT;
  if (live.content !== colour) live.content = colour;
}

/**
 * In development, once: an app's own `theme-color` beside Basalt's pair. The pair is markup no script may touch, so with the app's tag after it the pair's
 * matching tag would win over the app's colour. An app with its own `theme-color` renders no Basalt pair.
 */
export function checkThemeColorOwners(): void {
  if (process.env.NODE_ENV === "production" || warned || typeof document === "undefined" || !document.head) return;
  if (document.head.querySelector(APP) && document.head.querySelector('meta[data-basalt-theme-color=""]')) {
    warned = true;
    console.warn("Basalt: a page with its own theme-color renders no themeColorMeta.");
  }
}
