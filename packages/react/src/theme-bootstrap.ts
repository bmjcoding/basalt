// The head script of the theme, in a module of its own so `useTheme` alone does not carry it: it is a literal that nothing but the app's `<head>` reads. The key and the query
// are `basalt-theme` and `(prefers-color-scheme: dark)`, as `theme.ts` has them; `placement-and-state.test.mjs` holds this script to the HTML skill's head snippet, character for character.

/**
 * A script for the document's head, so the theme applies before the first frame: the stored choice if there is one, else the
 * system's, written to `data-theme` exactly as the HTML skill's head snippet does. It also writes `data-theme-choice` (`light`,
 * `dark` or `system`: what the person chose), which the theme choice's own CSS draws its chosen word from, so the right word is
 * chosen in the first frame, before any script and before React hydrates (DECISIONS 146 B). The app inlines it:
 * `<script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />`.
 */
export const themeBootstrap = '(function(){var t,c,r=document.documentElement;try{t=localStorage.getItem("basalt-theme")}catch(e){}c=t==="light"||t==="dark"?t:"system";if(c==="system")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";r.setAttribute("data-theme",t);r.setAttribute("data-theme-choice",c);})();';
