// The head script of the theme, in a module of its own so `useTheme` alone does not carry it: it is a literal that nothing but the app's `<head>` reads. The key and the query
// are `basalt-theme` and `(prefers-color-scheme: dark)`, as `theme.ts` has them; `placement-and-state.test.mjs` holds this script to the HTML skill's head snippet, character for character.

/**
 * A script for the document's head, so the theme applies before the first frame: the stored choice if there is one, else the
 * system's, written to `data-theme` exactly as the HTML skill's head snippet does. It also writes `data-theme-choice` (`light`,
 * `dark` or `system`: what the person chose), which the theme choice's own CSS draws its chosen word from, so the right word is
 * chosen in the first frame, before any script and before React hydrates (DECISIONS 146 B). The app inlines it:
 * `<script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />`. Under a policy that forbids inline scripts, the same line is a file,
 * `@srasyndicate/basalt/head/theme.js`, for a plain `<script src>` in `<head>`; with a nonce, give the inline script the nonce.
 *
 * It also tints the browser's chrome (DECISIONS 420): it keeps one `<meta name="theme-color" data-basalt-theme-color="live" property="basalt-live">` of its own
 * first in `<head>` (the `property` keeps React 19 from claiming it as one of `themeColorMeta`'s tags when it hydrates),
 * its `content` the page colour of the theme it wrote (`#000000` in dark, `#fafafa` in light). An app's own `theme-color` (a tag without
 * `data-basalt-theme-color`) wins: with one in `<head>` it writes none, so an app's own `theme-color` goes above the head script to hold from the first frame.
 */
export const themeBootstrap = '(function(){var t,c,r=document.documentElement;try{t=localStorage.getItem("basalt-theme")}catch(e){}c=t==="light"||t==="dark"?t:"system";if(c==="system")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";r.setAttribute("data-theme",t);r.setAttribute("data-theme-choice",c);var h=document.head,m;if(h&&!h.querySelector("meta[name=theme-color]:not([data-basalt-theme-color])")){m=h.querySelector("meta[data-basalt-theme-color=live]");if(!m){m=document.createElement("meta");m.name="theme-color";m.setAttribute("data-basalt-theme-color","live");m.setAttribute("property","basalt-live");h.insertBefore(m,h.querySelector("meta[name=theme-color]"))}m.content=t==="dark"?"#000000":"#fafafa"}})();';

/** One of the two `theme-color` tags in `themeColorMeta`. */
export interface ThemeColorMeta {
  readonly name: "theme-color";
  readonly media: "(prefers-color-scheme: light)" | "(prefers-color-scheme: dark)";
  readonly content: string;
  readonly "data-basalt-theme-color": "";
}

/**
 * The browser chrome's colour without script (DECISIONS 420): two `theme-color` tags scoped by `prefers-color-scheme`, the page ground of each theme
 * (`surface-page`: `#fafafa` in light, `#000000` in dark), for a page before or without script and a System choice before any script runs. Optional:
 * render it in `<head>`, before or after the head script, `{themeColorMeta.map((m) => <meta key={m.media} {...m} />)}`. No script ever writes these tags (the
 * head script's own live tag goes first and follows the theme shown), so hydration always finds the nodes it rendered. An app that brings its own
 * `theme-color` renders no Basalt pair: leave this out, and Basalt then writes no tag of its own.
 */
// Frozen, with the calls marked pure, so the module still does nothing at import and a bundler drops it when nothing reads it.
export const themeColorMeta: readonly [ThemeColorMeta, ThemeColorMeta] = /* @__PURE__ */ Object.freeze([
  /* @__PURE__ */ Object.freeze({ name: "theme-color", media: "(prefers-color-scheme: light)", content: "#fafafa", "data-basalt-theme-color": "" } as const),
  /* @__PURE__ */ Object.freeze({ name: "theme-color", media: "(prefers-color-scheme: dark)", content: "#000000", "data-basalt-theme-color": "" } as const),
] as const);
