// The palette's configuration and head script (cimip-gaps-3 T9, DECISIONS 403), in a module of its own with no React, so a server can build the head
// from it and a Server Component can call it. One configuration feeds the inline script, the metas the static file reads, the runtime and the controls.
// The keys are `localStorage["basalt-palette"]` (the saved choice; the default is nothing stored) and `sessionStorage["basalt-palette-url"]` (a palette
// a link opened, for this tab), as the HTML skill's head line has them; `placement-and-state.test.mjs` holds the two scripts to the skill's line.

import type { IconSet } from "./icon-set";

/** One palette an app offers: its id (the CSS's `data-palette`), the word the controls show, and in React an icon set. */
export interface PaletteOption {
  /** Lowercase letters, digits and hyphens, starting with a letter, 32 at most. `basalt` is Basalt's own look. */
  id: string;
  /** The word the controls show. Basalt ships no word for any palette, `basalt` included. */
  label: string;
  /** Icons that replace core glyphs and system marks while this palette is active (React only). */
  icons?: IconSet;
}

export interface PaletteConfigInput {
  palettes: readonly PaletteOption[];
  /** The palette with nothing saved and no link: the first listed when omitted. */
  default?: string;
  /** Whether `?palette=<id>` opens a palette for this tab. Default true. With false, neither the parameter nor a value an earlier load left is read. */
  url?: boolean;
}

export interface PaletteConfig {
  readonly palettes: readonly PaletteOption[];
  readonly ids: readonly string[];
  readonly default: string;
  readonly url: boolean;
}

const ID = /^[a-z][a-z0-9-]{0,31}$/;

/** Checks and freezes an app's palettes: throws on a bad id, a duplicate, a missing label or a default that is not listed. */
export function definePalettes(input: PaletteConfigInput): PaletteConfig {
  const palettes = input.palettes;
  if (!palettes.length) throw new Error("definePalettes: list at least one palette");
  const ids: string[] = [];
  for (const option of palettes) {
    if (typeof option.id !== "string" || !ID.test(option.id)) throw new Error(`definePalettes: the id ${JSON.stringify(option.id)} must match ${String(ID)}`);
    if (ids.includes(option.id)) throw new Error(`definePalettes: ${option.id} is listed twice`);
    if (typeof option.label !== "string" || !option.label.trim()) throw new Error(`definePalettes: ${option.id} needs a label (Basalt ships no word for a palette)`);
    ids.push(option.id);
  }
  const fallback = input.default ?? (ids[0] as string);
  if (!ids.includes(fallback)) throw new Error(`definePalettes: the default ${JSON.stringify(fallback)} is not listed`);
  return Object.freeze({ palettes: Object.freeze(palettes.map((option) => Object.freeze({ ...option }))), ids: Object.freeze(ids), default: fallback, url: input.url ?? true });
}

// The one source of the resolution, shared by the inline script and the static file: a valid `?palette=` (or a value the link left for this tab)
// when the URL policy is on, then a valid saved id, then the default. An id not listed is ignored and never written. Every storage call is guarded.
const RESOLVE =
  'function(i,d,u){var r=document.documentElement,p=null,s="default",k=function(v){return!!v&&i.indexOf(v)>=0};' +
  'if(u){try{p=new URLSearchParams(location.search).get("palette")}catch(e){}' +
  'if(k(p)){s="url";try{sessionStorage.setItem("basalt-palette-url",p)}catch(e){}}' +
  'else{p=null;try{p=sessionStorage.getItem("basalt-palette-url")}catch(e){}if(k(p))s="url";else p=null}}' +
  'if(!p){try{p=localStorage.getItem("basalt-palette")}catch(e){}if(k(p))s="stored";else p=null}' +
  'if(!p)p=d;r.setAttribute("data-palette",p);r.setAttribute("data-palette-source",s)}';

/**
 * The palette's head script, for the document's `<head>` after the theme's: it writes `data-palette` (always, `basalt` included) and
 * `data-palette-source` (`url`, `stored` or `default`) on `<html>` before the first frame. The app inlines it:
 * `<script dangerouslySetInnerHTML={{ __html: paletteBootstrap(config) }} />`. Under `script-src 'self'`, serve
 * `@srasyndicate/basalt/head/palette.js` instead, after the metas `paletteMetas(config)` returns.
 */
export function paletteBootstrap(config: PaletteConfig): string {
  return `(${RESOLVE})(${JSON.stringify(config.ids)},${JSON.stringify(config.default)},${config.url ? "true" : "false"});`;
}

/**
 * The three facts the static head file reads, as `<meta>` tags to write before it: the ids, the default and, only when the URL policy is off, `off`.
 * A server writes them from the config, never by hand.
 */
export function paletteMetas(config: PaletteConfig): readonly { name: string; content: string }[] {
  const metas = [
    { name: "basalt-palettes", content: config.ids.join(" ") },
    { name: "basalt-palette-default", content: config.default },
  ];
  if (!config.url) metas.push({ name: "basalt-palette-url", content: "off" });
  return metas;
}

/** The static head file (`dist/head/palette.js`): the same resolution, its ids, default and URL policy read from the metas before it. */
export const paletteHeadFile =
  '(function(){var m=function(n){var e=document.querySelector(\'meta[name="\'+n+\'"]\');return e?e.getAttribute("content")||"":""};' +
  'var i=m("basalt-palettes").split(/\\s+/).filter(Boolean);if(!i.length)return;var d=m("basalt-palette-default");if(i.indexOf(d)<0)d=i[0];' +
  `(${RESOLVE})(i,d,m("basalt-palette-url")!=="off")})();`;
