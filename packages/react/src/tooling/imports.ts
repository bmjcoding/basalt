// Build tooling for an app that splits its bundle with esbuild (DECISIONS 265, batch B0): each import from the package's root goes straight to the module that holds it.
//
// Under `splitting`, esbuild puts a module in a chunk by which entry points reach it in the import graph, before tree shaking: every `export … from` in a barrel counts
// as a path. The package's root is a barrel of every module, so in an app whose first screen and lazy routes all import from "@srasyndicate/basalt", every module a
// route draws is reached from the first screen too, and lands in a chunk the first screen loads. Measured with esbuild 0.28 on a first screen that draws `AppShell`,
// `Nav` and a `Table`, with a lazy route that draws `Combobox`, `Select`, `Menu`, `Dialog` and a `Field`: 341 KB minified up front, Base UI's combobox, select and
// menu among it; with each import going to its own module, 160 KB and none of them. Nothing in Basalt's own modules joins them: it is the barrel.
//
// This plugin gives each file that imports from the root its own small barrel, holding only the names that file imports, each re-exported from the module that holds
// it. The app's imports do not change. It is experimental: esbuild only (Rollup and Vite were not measured), and it keeps to two rules.
//
//  - **It reads a file with esbuild's own parser, or not at all.** The file is first put through `esbuild.transform` (types and JSX gone, comments dropped, every
//    statement printed in one form), and only then are its imports from the root read, by their grammar. A file it cannot read that way, or one that names the root in
//    any other form (a namespace import, `export *`, a default import, a string it cannot place), keeps the whole root: a slower first screen, never a missing import.
//  - **It never rewrites a file that resolves another copy of Basalt.** Each import is resolved as esbuild would resolve it for that file; the small barrel is used
//    only when that resolves to the root beside this plugin. A dependency with its own nested copy of the package keeps its own.
//
//   import { basaltImportsEsbuild } from "@srasyndicate/basalt/imports";
//   await esbuild.build({ splitting: true, plugins: [basaltImportsEsbuild()] /* … */ });
//
// It is development tooling, like the Phosphor weights plugin: not exported from the root, and imported by no component. It changes which chunk code lands in, never
// what runs. A bundle without splitting gains nothing from it (tree shaking already drops what is not drawn).
//
// The types below are structural, so esbuild's plugin types fit without this package naming them.

/** What the plugin reads of a resolve request. */
export interface ImportsResolveArgs {
  path: string;
  importer: string;
  namespace: string;
  kind: string;
  resolveDir: string;
  pluginData?: unknown;
}

/** What the plugin reads of a load request. */
export interface ImportsLoadArgs {
  path: string;
}

/** What `build.resolve` returns, in the part the plugin reads. */
export interface ImportsResolveResult {
  path: string;
  errors: readonly unknown[];
}

/** The loaders the plugin transforms a file with. */
export type ImportsLoader = "js" | "jsx" | "ts" | "tsx";

/** The part of esbuild's `transform` the plugin uses. */
export type ImportsTransform = (source: string, options: { loader: ImportsLoader; format: "esm"; sourcefile?: string }) => Promise<{ code: string }>;

/** The part of esbuild's plugin API the plugin uses. */
export interface ImportsEsbuildBuild {
  initialOptions: { loader?: Record<string, string> };
  esbuild: { transform: ImportsTransform };
  resolve(path: string, options: { resolveDir: string; kind: string; importer?: string; pluginData?: unknown }): Promise<ImportsResolveResult>;
  onResolve(options: { filter: RegExp }, callback: (args: ImportsResolveArgs) => Promise<{ path: string; namespace: string } | undefined>): void;
  onLoad(options: { filter: RegExp; namespace: string }, callback: (args: ImportsLoadArgs) => Promise<{ contents: string; loader: "js"; resolveDir: string }>): void;
}

/** An esbuild plugin. */
export interface ImportsEsbuildPlugin {
  name: string;
  setup(build: ImportsEsbuildBuild): void;
}

const ROOT = "@srasyndicate/basalt";
const NAMESPACE = "basalt-imports";

/**
 * The names a module imports from the package's root, read from **esbuild's printed form** of it (`esbuild.transform` with `format: "esm"`: no types, no JSX, no
 * comments, double-quoted specifiers, one statement per line). Static `import { … } from` and `export { … } from` statements are read by their grammar; a bare
 * `import "…"`, a dynamic `import("…")` and a `require("…")` take nothing (the plugin leaves those to the real root). `null` means the whole root: a namespace import,
 * `export *`, a default import, or the root's name anywhere the grammar does not place it.
 */
export function rootImports(printed: string, root = ROOT): string[] | null {
  const specifier = JSON.stringify(root);
  const quoted = specifier.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  const names = new Set<string>();
  let placed = 0;
  // A statement starts a line (esbuild prints one per line, at the margin for top-level code). Its clause is braces with no braces inside.
  const statement = new RegExp(`^(import|export)\\s*(\\{[^{}]*\\})\\s*from\\s*${quoted};?$`, "gm");
  for (const match of printed.matchAll(statement)) {
    placed += 1;
    for (const raw of (match[2] ?? "").slice(1, -1).split(",")) {
      const item = raw.trim();
      if (!item) continue;
      const parts = item.split(/\s+as\s+/);
      const name = parts[0]?.trim() ?? "";
      if (!/^[A-Za-z_$][\w$]*$/.test(name) || name === "default") return null;
      names.add(name);
    }
  }
  placed += [...printed.matchAll(new RegExp(`^import\\s*${quoted};?$`, "gm"))].length;
  placed += [...printed.matchAll(new RegExp(`\\b(?:import|require)\\(\\s*${quoted}\\s*\\)`, "g"))].length;
  const mentions = printed.split(specifier).length - 1;
  return mentions === placed ? [...names] : null;
}

/** The loader for a file, by the build's own loader for its extension or the usual one; `null` for a file the plugin does not read. */
export function loaderFor(file: string, configured: Record<string, string> = {}): ImportsLoader | null {
  const extension = /\.[^./\\]+$/.exec(file)?.[0] ?? "";
  const named = configured[extension] ?? ({ ".js": "js", ".mjs": "js", ".cjs": "js", ".jsx": "jsx", ".ts": "ts", ".mts": "ts", ".cts": "ts", ".tsx": "tsx" } as Record<string, string>)[extension];
  return named === "js" || named === "jsx" || named === "ts" || named === "tsx" ? named : null;
}

/** A file's names from the root, through esbuild's parser: `null` (the whole root) when it cannot be read. */
export async function readRootImports(source: string, file: string, transform: ImportsTransform, configured?: Record<string, string>): Promise<string[] | null> {
  const loader = loaderFor(file, configured);
  if (!loader) return null;
  try {
    return rootImports((await transform(source, { loader, format: "esm", sourcefile: file })).code);
  } catch {
    return null;
  }
}

/**
 * Written by the build from the barrel's source, as JSON text (an object would become a shared chunk under splitting): each name the root exports at run time, as
 * `[module, name in that module]` (`["./button.js", "Button"]`).
 */
declare const __BASALT_ROOT_MAP__: string;

/** The root's map: each name the root exports at run time, the module that holds it (relative to `dist`), and the name it has there. */
export function rootMap(): Map<string, { local: string; module: string }> {
  return new Map(Object.entries(JSON.parse(__BASALT_ROOT_MAP__) as Record<string, [string, string]>).map(([name, [module, local]]) => [name, { local, module }]));
}

/** The small barrel for one file: its names, each from the module that holds it. Names the root does not export at run time (types) are left to the type checker. */
export function smallBarrel(names: readonly string[], map: Map<string, { local: string; module: string }>): string {
  const byModule = new Map<string, string[]>();
  for (const name of names) {
    const entry = map.get(name);
    if (!entry) continue;
    const list = byModule.get(entry.module) ?? [];
    list.push(entry.local === name ? name : `${entry.local} as ${name}`);
    byModule.set(entry.module, list);
  }
  return [...byModule].map(([module, list]) => `export { ${list.join(", ")} } from "${module}";`).join("\n") + "\n";
}

type ReadFile = (path: string, encoding: "utf8") => Promise<string>;

/** Node's file, path and URL helpers, by names the type checker is not asked about: this package declares no Node types. */
async function node(): Promise<{ readFile: ReadFile; realpath(path: string): Promise<string>; fileURLToPath(url: URL): string; dirname(path: string): string }> {
  const fsName = "node:fs/promises";
  const urlName = "node:url";
  const pathName = "node:path";
  const [{ readFile, realpath }, { fileURLToPath }, { dirname }] = await Promise.all([import(fsName), import(urlName), import(pathName)]);
  return { readFile, realpath, fileURLToPath, dirname };
}

/** The marker on the plugin's own resolve, so its `onResolve` lets that one through to esbuild. */
const OWN = { basaltImports: "own-resolve" };

/**
 * The esbuild plugin: every static import from "@srasyndicate/basalt" that resolves to the root beside this plugin is served by a barrel of the names its file imports,
 * so a split bundle loads up front only the modules its first screen imports. Pass it in `plugins`.
 */
export function basaltImportsEsbuild(): ImportsEsbuildPlugin {
  // The root beside this file (dist/tooling/imports.js, so dist/index.js), found once, on the first file that needs it.
  let root: Promise<{ dir: string; index: string; real: string; map: Map<string, { local: string; module: string }> }> | undefined;
  const loadRoot = () =>
    (root ??= node().then(async ({ fileURLToPath, dirname, realpath }) => {
      const index = fileURLToPath(new URL("../index.js", import.meta.url));
      return { dir: dirname(index), index, real: await realpath(index), map: rootMap() };
    }));
  return {
    name: "basalt-imports",
    setup(build) {
      build.onResolve({ filter: /^@srasyndicate\/basalt$/ }, async (args) => {
        if (args.pluginData === OWN || args.kind !== "import-statement" || args.namespace !== "file" || !args.importer) return undefined;
        // Where this file's own import of the root goes: only the copy this plugin serves is rewritten.
        const [mine, { realpath }] = await Promise.all([loadRoot(), node()]);
        const resolved = await build.resolve(ROOT, { resolveDir: args.resolveDir, kind: args.kind, importer: args.importer, pluginData: OWN });
        if (resolved.errors.length || !resolved.path) return undefined;
        const real = await realpath(resolved.path).catch(() => resolved.path);
        return real === mine.real ? { path: args.importer, namespace: NAMESPACE } : undefined;
      });
      build.onLoad({ filter: /.*/, namespace: NAMESPACE }, async (args) => {
        const [{ dir, index, map }, { readFile }] = await Promise.all([loadRoot(), node()]);
        const names = await readRootImports(await readFile(args.path, "utf8"), args.path, (source, options) => build.esbuild.transform(source, options), build.initialOptions.loader);
        const contents = names === null ? `export * from ${JSON.stringify(index)};\n` : smallBarrel(names, map);
        return { contents, loader: "js", resolveDir: dir };
      });
    },
  };
}
