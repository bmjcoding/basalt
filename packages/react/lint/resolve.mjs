// The lint's two tools (oxc-parser for source, Stylelint for stylesheets) are the app's dev dependencies, never Basalt's runtime ones: each is found
// from the app's own directory first (where it installed them), then from beside this package (a hoisted install, and Basalt's own repository).
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** The resolved file of a package, or null. */
export function resolvePackage(name, from = process.cwd()) {
  for (const dir of [from, here]) {
    try {
      return createRequire(path.join(dir, "noop.js")).resolve(name);
    } catch {
      // Try the next place.
    }
  }
  return null;
}

/** Imports a package the app installs, or throws with what to install. */
export async function loadModule(name, from = process.cwd()) {
  const file = resolvePackage(name, from);
  if (!file) throw Object.assign(new Error(`basalt-lint needs ${name}: install it as a dev dependency (npm install --save-dev ${name})`), { code: "BASALT_LINT_MISSING" });
  const loaded = await import(pathToFileURL(file).href);
  // A CommonJS package (Stylelint's `require` entry) arrives as `default`; an ES module's named exports are the module itself.
  return loaded.default ?? loaded;
}
