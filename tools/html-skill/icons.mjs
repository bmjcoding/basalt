// The skill's icon data, generated at build time from @phosphor-icons/react (already a dependency of
// packages/react, so nothing new ships). tools/html-skill/src/icons.json is the list of names; this reads each one's
// Bold and Regular paths from the package's definition files and fails the build for a name Phosphor doesn't have.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

function findPackage(name) {
  for (let dir = here; dir !== path.dirname(dir); dir = path.dirname(dir)) {
    const candidate = path.join(dir, "node_modules", name);
    if (fs.existsSync(path.join(candidate, "package.json"))) return candidate;
  }
  throw new Error(`html-skill: can't find ${name}; run npm install`);
}

/** The `d` of every path of one weight in a Phosphor definition file (a React file; it is read as text, never run). */
function weightPaths(source, weight, name) {
  const start = source.indexOf(`"${weight}",`);
  if (start === -1) throw new Error(`html-skill: Phosphor's ${name} has no ${weight} weight`);
  const end = source.indexOf("\n  ]", start);
  const paths = [...source.slice(start, end).matchAll(/\bd: "([^"]+)"/g)].map((m) => m[1]);
  if (!paths.length) throw new Error(`html-skill: no paths found for Phosphor's ${name} ${weight}`);
  return paths;
}

/** { Name: [boldPaths, regularPaths] } for a list of Phosphor names. Throws for a name that is not in Phosphor. */
export function iconData(names, defsDir = path.join(findPackage("@phosphor-icons/react"), "dist", "defs")) {
  if (!Array.isArray(names) || names.some((n) => typeof n !== "string")) throw new Error("html-skill: icons.json must be an array of Phosphor icon names");
  const data = {};
  for (const name of names) {
    if (!/^[A-Za-z0-9]+$/.test(name)) throw new Error(`html-skill: "${name}" is not a Phosphor icon name`);
    const file = path.join(defsDir, `${name}.es.js`);
    if (!fs.existsSync(file)) throw new Error(`html-skill: "${name}" in icons.json is not a Phosphor icon`);
    const source = fs.readFileSync(file, "utf8");
    data[name] = [weightPaths(source, "bold", name), weightPaths(source, "regular", name)];
  }
  return data;
}
