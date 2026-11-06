import type { HighlighterCore, LanguageRegistration, ThemeRegistration } from "shiki/core";

/** A run of code text and its colour. Public signatures avoid Shiki's types, so an app's
 *  type-check never has to compile Shiki's declarations. */
export interface CodeToken { content: string; offset: number; color?: string }

// CSS variables let one token stream follow the theme, including nested theme overrides.
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

type Grammar = { default: LanguageRegistration[] };

// Each grammar is its own dynamic import, so an app downloads only the languages it shows,
// and nothing at all until a CodeBlock with a language renders. Grammars are bundled with
// the app (no CDN or network fetch); the keys are the language names Shiki registers.
const grammars: Record<string, () => Promise<Grammar>> = {
  shellscript: () => import("shiki/langs/bash.mjs"),
  css: () => import("shiki/langs/css.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  javascript: () => import("shiki/langs/javascript.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  jsx: () => import("shiki/langs/jsx.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  swift: () => import("shiki/langs/swift.mjs"),
  tsx: () => import("shiki/langs/tsx.mjs"),
  typescript: () => import("shiki/langs/typescript.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
};

const aliases: Record<string, string> = {
  bash: "shellscript", sh: "shellscript", shell: "shellscript", zsh: "shellscript",
  js: "javascript", cjs: "javascript", mjs: "javascript",
  ts: "typescript", cts: "typescript", mts: "typescript",
  py: "python", yml: "yaml",
};

const MAX_LENGTH = 100_000;

/** The grammar a language name or alias resolves to, or undefined when none is bundled. */
function resolve(language?: string): string | undefined {
  const name = language?.trim().toLowerCase();
  if (!name) return undefined;
  const key = (Object.hasOwn(aliases, name) ? aliases[name] : undefined) ?? name;
  return Object.hasOwn(grammars, key) ? key : undefined;
}

let highlighter: HighlighterCore | undefined;
let core: Promise<HighlighterCore> | undefined;
const loading = new Map<string, Promise<boolean>>();

function createCore() {
  core ??= Promise.all([import("shiki/core"), import("shiki/engine/javascript")]).then(([shiki, engine]) => {
    highlighter = shiki.createHighlighterCoreSync({ themes: [theme], langs: [], engine: engine.createJavaScriptRegexEngine() });
    return highlighter;
  });
  return core;
}

/** Whether a language can be highlighted, and whether it can be right now without loading. */
export function codeLanguageStatus(language?: string): "plain" | "ready" | "loading" {
  const key = resolve(language);
  if (!key) return "plain";
  return highlighter?.getLoadedLanguages().includes(key) ? "ready" : "loading";
}

/**
 * Loads Shiki and the grammars for these languages. CodeBlock calls it on its own; await it
 * before server rendering to send highlighted HTML in the first response.
 */
export function preloadCodeLanguages(languages: readonly string[]): Promise<void> {
  return Promise.all(languages.map(loadCodeLanguage)).then(() => undefined);
}

/** Resolves true when the language is ready to highlight, false when it stays plain text. */
export function loadCodeLanguage(language: string): Promise<boolean> {
  const key = resolve(language);
  const grammar = key ? grammars[key] : undefined;
  if (!key || !grammar) return Promise.resolve(false);
  let pending = loading.get(key);
  if (!pending) {
    pending = Promise.all([createCore(), grammar()])
      .then(([h, module]) => { h.loadLanguageSync(module.default); return true; })
      // Highlighting is supplementary: a grammar that fails to load leaves the code plain.
      .catch(() => false);
    loading.set(key, pending);
  }
  return pending;
}

/**
 * Tokens for code in an already loaded language, or null: unknown languages, plain text,
 * logs over 100,000 UTF-16 code units, and languages still loading all render as plain text.
 */
export function highlightCode(code: string, language?: string): CodeToken[] | null {
  const key = resolve(language);
  if (!key || !highlighter || code.length > MAX_LENGTH || codeLanguageStatus(key) !== "ready") return null;
  try {
    return highlighter.codeToTokensBase(code, { lang: key, theme: "basalt" }).flat();
  } catch {
    // An unsupported engine feature or grammar must never hide the code.
    return null;
  }
}
