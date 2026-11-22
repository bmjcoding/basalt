// Build tooling for an app that splits its bundle with esbuild (DECISIONS 265, batch B0): each import from the package's root goes straight to the module that holds it.
//
// Under `splitting`, esbuild puts a module in a chunk by which entry points reach it in the import graph, before tree shaking: every `export … from` in a barrel counts
// as a path. The package's root is a barrel of every module, so in an app whose first screen and lazy routes all import from "@srasyndicate/basalt", every module a
// route draws is reached from the first screen too, and lands in a chunk the first screen loads. Measured with esbuild 0.28 on a first screen that draws `AppShell`,
// `Nav` and a `Table`, with a lazy route that draws `Combobox`, `Select`, `Menu`, `Dialog` and a `Field`: 341 KB minified up front, Base UI's combobox, select and
// menu among it; with each import going to its own module, 160 KB and none of them. Nothing in Basalt's own modules joins them: it is the barrel.
//
// This plugin gives each file of the app that imports from the root its own small barrel, holding only the names that file imports, each re-exported from the module
// that holds it. The app's imports do not change. A file that imports the whole namespace (`import * as B`), re-exports everything (`export *`), or imports the root
// dynamically keeps the real root.
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
}

/** What the plugin reads of a load request. */
export interface ImportsLoadArgs {
  path: string;
}

/** The part of esbuild's plugin API the plugin uses. */
export interface ImportsEsbuildBuild {
  onResolve(options: { filter: RegExp }, callback: (args: ImportsResolveArgs) => { path: string; namespace: string } | undefined): void;
  onLoad(options: { filter: RegExp; namespace: string }, callback: (args: ImportsLoadArgs) => Promise<{ contents: string; loader: "js"; resolveDir: string }>): void;
}

/** An esbuild plugin. */
export interface ImportsEsbuildPlugin {
  name: string;
  setup(build: ImportsEsbuildBuild): void;
}

const ROOT = "@srasyndicate/basalt";
const NAMESPACE = "basalt-imports";

/** The names a file imports from the package's root, or `null` when it takes the whole root (a namespace import or `export *`). Type-only imports are left out. */
export function rootImports(source: string, root = ROOT): string[] | null {
  const quoted = root.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  const statement = new RegExp(`(?:^|[;}\\s])(import|export)\\s+(type\\s+)?([^;'"]*?)\\s*from\\s*["']${quoted}["']`, "g");
  const names = new Set<string>();
  for (const match of source.matchAll(statement)) {
    if (match[2]) continue;
    const clause = match[3] ?? "";
    if (/\*/.test(clause)) return null;
    const braces = /\{([^}]*)\}/.exec(clause);
    if (!braces) continue;
    for (const raw of (braces[1] ?? "").split(",")) {
      const item = raw.trim();
      if (!item || /^type\s/.test(item)) continue;
      const name = item.split(/\s+as\s+/)[0]?.trim();
      if (name) names.add(name);
    }
  }
  return [...names];
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

/** Node's file and URL helpers, by names the type checker is not asked about: this package declares no Node types. */
async function node(): Promise<{ readFile: ReadFile; fileURLToPath(url: URL): string; dirname(path: string): string }> {
  const fsName = "node:fs/promises";
  const urlName = "node:url";
  const pathName = "node:path";
  const [{ readFile }, { fileURLToPath }, { dirname }] = await Promise.all([import(fsName), import(urlName), import(pathName)]);
  return { readFile, fileURLToPath, dirname };
}

/**
 * The esbuild plugin: every static import from "@srasyndicate/basalt" in the app's own files is served by a barrel of the names that file imports, so a split bundle
 * loads up front only the modules its first screen imports. Pass it in `plugins`.
 */
export function basaltImportsEsbuild(): ImportsEsbuildPlugin {
  // The root beside this file (dist/tooling/imports.js, so dist/index.js), found once, on the first file that needs it.
  let root: Promise<{ dir: string; index: string; map: Map<string, { local: string; module: string }> }> | undefined;
  const loadRoot = () =>
    (root ??= node().then(({ fileURLToPath, dirname }) => {
      const index = fileURLToPath(new URL("../index.js", import.meta.url));
      return { dir: dirname(index), index, map: rootMap() };
    }));
  return {
    name: "basalt-imports",
    setup(build) {
      build.onResolve({ filter: /^@srasyndicate\/basalt$/ }, (args) => {
        if (args.kind !== "import-statement" || args.namespace !== "file" || !args.importer) return undefined;
        return { path: args.importer, namespace: NAMESPACE };
      });
      build.onLoad({ filter: /.*/, namespace: NAMESPACE }, async (args) => {
        const [{ dir, index, map }, { readFile }] = await Promise.all([loadRoot(), node()]);
        const names = rootImports(await readFile(args.path, "utf8"));
        const contents = names === null ? `export * from ${JSON.stringify(index)};\n` : smallBarrel(names, map);
        return { contents, loader: "js", resolveDir: dir };
      });
    },
  };
}
