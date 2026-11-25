// The build's rule for the specifiers in dist's declarations (build.mjs), a module of its own so its test runs the same code.
//
// tsc writes a declaration's specifiers as the source does, with no extension ("./glyph-set"), which a bundler's resolution finds and Node's does not: an
// app type-checked under `moduleResolution: "node16"` or `"nodenext"` cannot follow `export * from "./glyph-set"`, so it can't name a glyph (an unresolved
// named re-export only goes untyped). Only real module specifiers are rewritten: an `import` or `export` declaration's `from "…"`, a bare `import "…"`, and
// a type's `import("…")`. Comments are never touched (a doc comment's example stays as written), and neither is `/// <reference path>` (a file path, not a
// module; dist has none).

/**
 * The code's shape: a copy of `source` with every comment blanked to spaces and every string's contents blanked to "x" (quotes and newlines kept), so a
 * declaration's words are found only where they are code, and offsets into it are offsets into `source`, where a specifier is then read.
 */
function mask(source) {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];
    if (c === "/" && next === "/") {
      const end = source.indexOf("\n", i);
      const stop = end === -1 ? source.length : end;
      out += " ".repeat(stop - i);
      i = stop;
    } else if (c === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += source.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
    } else if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < source.length && source[j] !== c) j += source[j] === "\\" ? 2 : 1;
      const stop = Math.min(j, source.length);
      out += c + source.slice(i + 1, stop).replace(/[^\n]/g, "x") + (j < source.length ? c : "");
      i = j + 1;
    } else {
      out += c;
      i += 1;
    }
  }
  return out;
}

// Each pattern runs on the mask; group 2 is where a specifier's contents are, read from the source.
const SPECIFIERS = [
  // import … from "x", export … from "x" (the clause holds no quote and no semicolon)
  /\b(?:import|export)\b[^;"'`]*?\bfrom\s*(["'])([^"'\n]*)\1/dg,
  // import "x"
  /\bimport\s*(["'])([^"'\n]*)\1/dg,
  // import("x"), in a type
  /\bimport\s*\(\s*(["'])([^"'\n]*)\1\s*\)/dg,
];

/**
 * `source` with each relative module specifier replaced by `resolve(specifier)`; a specifier for which it returns `null` is left as written. `resolve` may
 * throw, to fail the build on a specifier that names nothing.
 */
export function rewriteSpecifiers(source, resolve) {
  const code = mask(source);
  const edits = new Map();
  for (const pattern of SPECIFIERS) {
    for (const match of code.matchAll(pattern)) {
      const [at, end] = match.indices[2];
      const name = source.slice(at, end);
      if (edits.has(at) || !/^\.{1,2}\//.test(name)) continue;
      const written = resolve(name);
      if (written !== null && written !== name) edits.set(at, { length: name.length, written });
    }
  }
  let out = source;
  for (const [at, edit] of [...edits].sort((a, b) => b[0] - a[0])) out = out.slice(0, at) + edit.written + out.slice(at + edit.length);
  return out;
}

/**
 * The resolver build.mjs uses for a declaration in `folder`: "./x" becomes "./x.js" where x.d.ts is beside it, and "./x/index.js" for a folder with an
 * index.d.ts; a name that is not a module of ours (an SVG read as text, one already written with ".js") is left; anything else throws.
 */
export function nodeSpecifier(fs, path, folder, file) {
  return (name) => {
    const target = path.resolve(folder, name);
    if (fs.existsSync(`${target}.d.ts`)) return `${name}.js`;
    if (fs.existsSync(path.join(target, "index.d.ts"))) return `${name.replace(/\/$/, "")}/index.js`;
    if (/[?#]/.test(name) || /\.[a-z0-9]+$/i.test(path.basename(name))) return null;
    throw new Error(`${file} names ${name}, which has no declaration in dist`);
  };
}
