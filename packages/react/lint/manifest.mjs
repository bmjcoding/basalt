// Build time (packages/react/build.mjs): the consumer lint's view of this package, written to dist/lint-manifest.json. It reads the built entry's
// exports with oxc-parser (a Basalt dev dependency) and each component's declarations, so the lint itself never parses Basalt: what an app's check
// knows is fixed by the release it installed, with or without a parser of its own.
import fs from "node:fs";
import path from "node:path";

/** The props whose values a fix-it message prints. */
const VALUED = ["size", "controlSize", "variant", "tone"];

/**
 * The manifest of a built package: { components: { [name]: { props: string[], values: { [prop]: string[] } } } }.
 * @param {{ parseSync: Function }} oxc
 * @param {string} dist the package's dist directory
 */
export function buildManifest(oxc, dist) {
  /** export name → the module (path without extension) that defines it */
  const exports = new Map();
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file) || !fs.existsSync(file)) return;
    seen.add(file);
    const parsed = oxc.parseSync(file, fs.readFileSync(file, "utf8"), { sourceType: "module", lang: "js" });
    if (parsed.errors.length) throw new Error(`${file}: does not parse (${parsed.errors[0].message})`);
    for (const record of parsed.module.staticExports) for (const e of record.entries) {
      const from = e.moduleRequest ? path.resolve(path.dirname(file), e.moduleRequest.value) : file;
      if (e.exportName.kind === "Name") { if (!exports.has(e.exportName.name)) exports.set(e.exportName.name, from.replace(/\.js$/, "")); }
      else if (e.exportName.kind === "None" && e.moduleRequest) visit(from);
    }
  };
  visit(path.join(dist, "index.js"));
  const declarations = new Map();
  const declarationOf = (module) => {
    if (!declarations.has(module)) {
      const file = `${module}.d.ts`;
      declarations.set(module, fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "");
    }
    return declarations.get(module);
  };
  let all = null;
  const allDeclarations = () => {
    if (all === null) {
      for (const file of fs.readdirSync(dist)) if (file.endsWith(".d.ts")) declarationOf(path.join(dist, file.replace(/\.d\.ts$/, "")));
      all = [...declarations.values()].join("\n");
    }
    return all;
  };
  const components = {};
  for (const [name, module] of [...exports].sort(([a], [b]) => a.localeCompare(b))) {
    // A component is a PascalCase value export (constants are UPPER_CASE; hooks and helpers start lower case).
    if (!/^[A-Z][a-z]/.test(name)) continue;
    const own = ownProps(declarationOf(module), name);
    const values = {};
    for (const prop of VALUED) if (own.props.has(prop)) { const v = unionValues(own.text, prop, allDeclarations); if (v.length) values[prop] = v; }
    components[name] = { props: [...own.props].sort((a, b) => a.localeCompare(b)), values };
  }
  return { components };
}

/** A declaration file's top-level type declarations: name → its text. */
function topLevel(text) {
  const blocks = new Map();
  const heads = [...text.matchAll(/^(?:export )?(?:declare )?(type|interface|function|const|class) ([A-Za-z_$][\w$]*)/gm)];
  heads.forEach((m, i) => {
    if (m[1] !== "type" && m[1] !== "interface") return;
    blocks.set(m[2], text.slice(m.index, heads[i + 1]?.index ?? text.length));
  });
  return blocks;
}

/**
 * One component's own props, from its declaration: the names its signature destructures (`function Card({ className, children, ...props })`), and the
 * members of its props type and the local types that type is built from (`ButtonProps = BaseProps & ButtonToggle & {...}`). The text returned is
 * those types, where a prop's values are read.
 */
function ownProps(text, name) {
  const props = new Set();
  const signature = new RegExp(`^export declare (?:function ${name}\\s*(?:<[^>]*>)?\\(([^\\n]*)\\)|const ${name}:([^\\n]*))`, "m").exec(text);
  const blocks = topLevel(text);
  let typeText = "";
  if (signature) {
    const params = signature[1] ?? "";
    const destructured = /^\s*\{([^}]*)\}/.exec(params);
    if (destructured) for (const part of destructured[1].split(",")) { const n = /^\s*([A-Za-z_$][\w$]*)/.exec(part)?.[1]; if (n && !part.trim().startsWith("...")) props.add(n); }
    const seen = new Set();
    const pull = (source, depth) => {
      for (const ref of source.matchAll(/\b([A-Z][\w$]*)\b/g)) {
        const block = blocks.get(ref[1]);
        if (!block || seen.has(ref[1])) continue;
        seen.add(ref[1]);
        typeText += `${block}\n`;
        if (depth < 3) pull(block, depth + 1);
      }
    };
    pull(signature[2] ?? params.replace(/^\s*\{[^}]*\}/, ""), 0);
  } else typeText = text;
  for (const m of typeText.matchAll(/^\s+(?:readonly\s+)?([a-zA-Z_$][\w$]*)\??:/gm)) props.add(m[1]);
  return { props, text: typeText };
}

/** The string values a prop takes (`size?: ControlSize` with `type ControlSize = "xs" | "sm"`), as written in the declarations: every place the prop is declared, joined. */
function unionValues(text, prop, all) {
  const literals = (s) => [...s.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  const values = new Set();
  for (const m of text.matchAll(new RegExp(`^\\s+${prop}\\??:\\s*([^;\\n]+)`, "gm"))) {
    for (const v of literals(m[1])) values.add(v);
    for (const alias of m[1].matchAll(/\b([A-Z][\w$]*)\b/g)) {
      const def = new RegExp(`type ${alias[1]}\\s*=\\s*([^;]+);`).exec(text) ?? new RegExp(`type ${alias[1]}\\s*=\\s*([^;]+);`).exec(all());
      if (def) for (const v of literals(def[1])) values.add(v);
    }
  }
  return [...values];
}

