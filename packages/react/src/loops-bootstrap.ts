// The head script of the loops' hold, in a module of its own so `useLoops` alone does not carry it, and so a Server Component (a root layout) can read it:
// it is a literal that nothing but the app's `<head>` reads. The key and the value are `basalt-loops` and `held`, as `loops.ts` has them.

/**
 * A line for the document's head, beside the theme's, so a stored hold applies before the first frame. The app inlines it
 * as a script in `<head>`: `<script dangerouslySetInnerHTML={{ __html: loopsBootstrap }} />`. Under a policy that forbids inline scripts, the
 * same line is a file, `@srasyndicate/basalt/head/loops.js`, for a plain `<script src>` in `<head>`; with a nonce, give the inline script the nonce.
 */
export const loopsBootstrap = `(function(){try{if(localStorage.getItem("basalt-loops")==="held")document.documentElement.setAttribute("data-loops","held")}catch(e){}})();`;
