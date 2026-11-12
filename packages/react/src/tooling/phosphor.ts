// Build tooling that cuts the weights an app does not draw out of Phosphor's icons (DECISIONS 90, item E2).
//
// Every `@phosphor-icons/react` icon ships thin, light, regular, bold, fill and duotone paths in one Map, so an app that draws
// Warning pays 3.2 KB for it and about two thirds of that is weights nobody draws. Basalt draws Bold, and Fill on a selected glyph
// marked `fillSafe`. This plugin trims every Phosphor icon in an app's whole graph, Basalt's own and the app's, to the weights the
// app keeps. It is opt-in: Basalt's `dist` still imports `@phosphor-icons/react` as it always did, so an app that does not use the
// plugin shares one copy of each icon between Basalt and its own imports, and pays for all six weights as it did before.
//
// This is development tooling, like the headroom check. It is not exported from the package's root and nothing in the components
// imports it, so an app's runtime bundle never contains it: an app imports it from `@srasyndicate/basalt/phosphor`, in its
// build configuration.
//
//   // esbuild
//   import { BASALT_PHOSPHOR_WEIGHTS, phosphorWeightsEsbuild } from "@srasyndicate/basalt/phosphor";
//   await esbuild.build({ plugins: [phosphorWeightsEsbuild({ weights: BASALT_PHOSPHOR_WEIGHTS })], /* … */ });
//
//   // Vite / Rollup (Vite's dev dependency optimiser is esbuild: pass the esbuild plugin there as well,
//   // in optimizeDeps.esbuildOptions.plugins, and exclude nothing)
//   import { BASALT_PHOSPHOR_WEIGHTS, phosphorWeightsRollup } from "@srasyndicate/basalt/phosphor";
//   export default { plugins: [phosphorWeightsRollup({ weights: BASALT_PHOSPHOR_WEIGHTS })] };
//
// The weight list is required. An app that draws a weight of its own adds it: `[...BASALT_PHOSPHOR_WEIGHTS, "regular"]`. **A
// weight that is trimmed and then drawn draws nothing**: the icon renders an empty `svg`, as Phosphor does for a weight it lacks.
//
// The paths come from the installed package, as text, never redrawn. The transform fails the build, loudly, on a definition file
// whose layout it does not know and on a weight an icon does not have, so a Phosphor update never ships a wrong icon.
//
// The types below are structural, so esbuild's and Rollup's plugin types fit without this package naming either.

/** One of Phosphor's six weights. */
export type PhosphorWeight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";

/**
 * The weights Basalt itself draws: Bold (the long tail at 16, 20 and 24) and Fill (a selected glyph marked `fillSafe`). An app adds
 * the weights it draws itself to these.
 */
export const BASALT_PHOSPHOR_WEIGHTS: readonly PhosphorWeight[] = ["bold", "fill"];

export interface PhosphorWeightsOptions {
  /** The weights to keep, at least one. Every other weight is cut from every Phosphor icon the plugin sees. */
  weights: readonly PhosphorWeight[];
}

declare const __PHOSPHOR_NOTICE__: string;

const ALL: readonly PhosphorWeight[] = ["thin", "light", "regular", "bold", "fill", "duotone"];

/**
 * Phosphor's MIT notice as a legal comment (`/*!`), which a bundler keeps. The text is identical wherever it is emitted (here, and
 * in Basalt's lazy command panel, which inlines four icons), so a bundler that deduplicates legal comments keeps one copy.
 */
const NOTICE = `/*! ${__PHOSPHOR_NOTICE__}\n*/\n`;

/** The weights, checked: required, known and not empty. */
function checkWeights(weights: readonly string[] | undefined): readonly PhosphorWeight[] {
  if (!Array.isArray(weights) || weights.length === 0) {
    throw new Error('phosphor weights: pass { weights } with at least one weight, e.g. { weights: BASALT_PHOSPHOR_WEIGHTS }; a weight that is trimmed and then drawn draws nothing');
  }
  const unknown = weights.filter((weight) => !(ALL as readonly string[]).includes(weight));
  if (unknown.length) throw new Error(`phosphor weights: unknown weight ${unknown.map((w) => JSON.stringify(w)).join(", ")}; Phosphor's are ${ALL.join(", ")}`);
  return weights as readonly PhosphorWeight[];
}

/**
 * The core transform: Phosphor's definition source for one icon (`dist/defs/<Name>.es.js`) and the weights to keep, and the
 * trimmed source. The weights table becomes `{ get }`: each kept weight's element tree is built the first time it is asked for
 * and reused after, as Phosphor's Map reuses its own, and nothing is built when the module loads.
 *
 * Throws for a file whose layout it does not know, and for a kept weight the icon does not have.
 */
export function trimPhosphorWeights(source: string, weights: readonly PhosphorWeight[], name = "an icon"): string {
  const keep = checkWeights(weights);
  const head = source.match(/^import \* as (\w+) from "react";\nconst (\w+) = \/\* @__PURE__ \*\/ new Map\(\[\n/);
  const tail = source.match(/\n\]\);\nexport \{\n {2}\w+ as default\n\};\n?$/);
  if (!head || !tail) throw new Error(`phosphor weights: ${name}'s definition file has a layout this transform does not know`);
  const body = source.slice(head[0].length - 1, source.length - tail[0].length);
  const entry = /\n {2}\[\n {4}"(\w+)",\n([\s\S]*?)\n {2}\](?=,?\n|$)/g;
  const entries = new Map<string, string>();
  for (const match of body.matchAll(entry)) entries.set(match[1] ?? "", match[2] ?? "");
  // The entries must be the whole table: anything else in it (a spread, a later entry in another shape) would be dropped unseen.
  if (body.replace(entry, "").replace(/[\s,]/g, "") !== "") {
    throw new Error(`phosphor weights: ${name}'s definition file has a layout this transform does not know`);
  }
  if (entries.size !== ALL.length || ALL.some((weight) => !entries.has(weight))) {
    throw new Error(`phosphor weights: ${name} has weights [${[...entries.keys()]}], expected ${ALL}`);
  }
  for (const weight of keep) if (!entries.has(weight)) throw new Error(`phosphor weights: ${name} has no ${weight} weight`);
  const table = head[2] ?? "table";
  // In the order given, once each. An unknown weight gives undefined, as the Map did.
  const lookup = [...new Set(keep)].map((weight) => `weight === "${weight}" ? ${table}.${weight} || (${table}.${weight} = ${(entries.get(weight) ?? "").trim()}) : `).join("");
  return `${NOTICE}import * as ${head[1]} from "react";\nconst ${table} = {\n  get: (weight) => ${lookup}void 0\n};\nexport {\n  ${table} as default\n};\n`;
}

/** A Phosphor definition file: `…/@phosphor-icons/react/dist/defs/<Name>.es.js`, with or without a query. */
const DEFS = /[\\/]@phosphor-icons[\\/]react[\\/]dist[\\/]defs[\\/]([^\\/?]+)\.es\.js(?:\?.*)?$/;

/** The part of esbuild's plugin API the plugin uses. */
export interface PhosphorEsbuildBuild {
  onLoad(options: { filter: RegExp }, callback: (args: { path: string }) => Promise<{ contents: string; loader: "js" } | undefined>): void;
}

/** An esbuild plugin. */
export interface PhosphorEsbuildPlugin {
  name: string;
  setup(build: PhosphorEsbuildBuild): void;
}

/**
 * The esbuild plugin: trims every Phosphor icon in the build to `weights`, wherever it is imported from (Basalt's `dist`, or the
 * app). Pass it in `plugins`; for Vite's dev optimiser, in `optimizeDeps.esbuildOptions.plugins`.
 */
export function phosphorWeightsEsbuild({ weights }: PhosphorWeightsOptions): PhosphorEsbuildPlugin {
  const keep = checkWeights(weights);
  return {
    name: "basalt-phosphor-weights",
    setup(build) {
      build.onLoad({ filter: /[\\/]@phosphor-icons[\\/]react[\\/]dist[\\/]defs[\\/][^\\/]+\.es\.js$/ }, async (args) => {
        const match = DEFS.exec(args.path);
        if (!match) return undefined;
        // Node's fs, by a name the type checker is not asked about: this package declares no Node types.
        const specifier = "node:fs/promises";
        const { readFile } = (await import(specifier)) as { readFile(path: string, encoding: "utf8"): Promise<string> };
        return { contents: trimPhosphorWeights(await readFile(args.path, "utf8"), keep, match[1]), loader: "js" };
      });
    },
  };
}

/** A Rollup plugin; Vite takes it as it is. */
export interface PhosphorRollupPlugin {
  name: string;
  transform(code: string, id: string): { code: string; map: null } | null;
}

/** The Rollup (and Vite) plugin: the same transform, in the `transform` hook. */
export function phosphorWeightsRollup({ weights }: PhosphorWeightsOptions): PhosphorRollupPlugin {
  const keep = checkWeights(weights);
  return {
    name: "basalt-phosphor-weights",
    transform(code, id) {
      const match = DEFS.exec(id);
      return match ? { code: trimPhosphorWeights(code, keep, match[1]), map: null } : null;
    },
  };
}
