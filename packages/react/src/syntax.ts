import { createHighlighterCoreSync, type HighlighterCore, type ThemeRegistration } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import bash from "shiki/langs/bash.mjs";
import css from "shiki/langs/css.mjs";
import html from "shiki/langs/html.mjs";
import javascript from "shiki/langs/javascript.mjs";
import json from "shiki/langs/json.mjs";
import jsx from "shiki/langs/jsx.mjs";
import python from "shiki/langs/python.mjs";
import sql from "shiki/langs/sql.mjs";
import swift from "shiki/langs/swift.mjs";
import tsx from "shiki/langs/tsx.mjs";
import typescript from "shiki/langs/typescript.mjs";
import yaml from "shiki/langs/yaml.mjs";

// CSS variables let one token stream follow the theme, including nested theme overrides.
// Grammars and the JS engine are bundled locally: no CDN, WASM fetch or async colour flash.
const theme: ThemeRegistration = {
  name: "basalt",
  fg: "var(--basalt-text-primary)",
  bg: "var(--basalt-surface-sunken)",
  settings: [
    { scope: ["keyword", "storage"], settings: { foreground: "var(--basalt-syntax-keyword)" } },
    // Operators and punctuation are structure, not vocabulary: they stay neutral.
    { scope: ["keyword.operator", "punctuation", "meta.brace"], settings: { foreground: "var(--basalt-text-secondary)" } },
    // Four hues, as in most editor themes: types share the function colour, tags the keyword colour.
    { scope: ["entity.name.function", "support.function", "entity.name.type", "entity.name.class", "support.type", "support.class"], settings: { foreground: "var(--basalt-syntax-function)" } },
    { scope: ["entity.name.tag"], settings: { foreground: "var(--basalt-syntax-keyword)" } },
    { scope: ["constant", "variable.language"], settings: { foreground: "var(--basalt-syntax-constant)" } },
    { scope: ["string"], settings: { foreground: "var(--basalt-syntax-string)" } },
    { scope: ["comment"], settings: { foreground: "var(--basalt-syntax-comment)" } },
  ],
};

// Everything is built on first use, never at module scope: the package ships as one file, and a
// top-level call would make every consumer bundle the grammars even if it never renders code.
let grammars: typeof bash[] | undefined;
let supported: Set<string> | undefined;
let highlighter: HighlighterCore | undefined;

/** Unknown languages, plain text and large logs remain readable without running a grammar. */
export function highlightCode(code: string, language?: string) {
  const lang = language?.trim().toLowerCase();
  if (!lang || code.length > 100_000) return null;
  grammars ??= [bash, css, html, javascript, json, jsx, python, sql, swift, tsx, typescript, yaml];
  supported ??= new Set(grammars.flatMap((bundle) => bundle.flatMap((l) => [l.name, ...(l.aliases ?? [])])));
  if (!supported.has(lang)) return null;
  try {
    highlighter ??= createHighlighterCoreSync({
      themes: [theme],
      langs: grammars,
      engine: createJavaScriptRegexEngine(),
    });
    return highlighter.codeToTokensBase(code, { lang, theme: "basalt" }).flat();
  } catch {
    // Highlighting is supplementary; an unsupported engine/grammar must never hide the code.
    return null;
  }
}
