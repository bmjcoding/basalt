// `basalt-lint` (DECISIONS 404): the opt-in check an app built on Basalt runs in its own lint. It reads the app's source and stylesheets and reports
// restyled Basalt components, raw design values and, as advice, a competing primitive. docs/consumer-lint.md is the guide.
//
//   basalt-lint [paths or globs...] [--config basalt-lint.config.json] [--format text|json] [--no-css] [--quiet] [--max-warnings <n>]
//
// The API is `basaltLint(options)` from `@srasyndicate/basalt/lint`, which returns the findings and the files it read.
import fs from "node:fs";
import path from "node:path";

import { HOOKS } from "./appearance.mjs";
import { loadModule } from "./resolve.mjs";
import { lintSource, SOURCE_RULES } from "./source.mjs";
import { lintStyles } from "./styles.mjs";
import { loadVocabulary } from "./vocabulary.mjs";

const SOURCE_EXT = /\.(?:[mc]?[jt]sx?)$/;
const STYLE_EXT = /\.css$/;
const DEFAULT_EXCLUDE = ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**", "**/coverage/**", "**/*.d.ts", "**/*.min.css"];
export const RULES = [...SOURCE_RULES, "basalt/disable"];

/**
 * Runs the lint.
 * @param {{ cwd?: string, include?: string[], exclude?: string[], sources?: string[], hooks?: string[], rules?: Record<string, "error" | "warn" | "off">, css?: boolean, basaltRoot?: string }} [options]
 * @returns {Promise<{ files: string[], findings: { file: string, rule: string, severity: "error" | "warning", line: number, column: number, message: string }[] }>}
 */
export async function basaltLint(options = {}) {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const files = listFiles(cwd, options.include?.length ? options.include : ["."], [...DEFAULT_EXCLUDE, ...(options.exclude ?? [])]);
  const oxc = await loadModule("oxc-parser", cwd);
  const vocabulary = loadVocabulary(oxc, options.basaltRoot);
  const hooks = [...(options.hooks ?? [])];
  const styleFiles = options.css === false ? [] : files.filter((f) => STYLE_EXT.test(f));
  let styles = { findings: new Map(), classes: new Map(), mentioned: new Set() };
  if (styleFiles.length) {
    const stylelint = await loadModule("stylelint", cwd);
    styles = await lintStyles(styleFiles, { stylelint, vocabulary, hooks, cwd });
  }
  const context = { oxc, vocabulary, sources: new Set(["@srasyndicate/basalt", ...(options.sources ?? [])]), classes: styles.classes, hooks: new Set([...HOOKS, ...vocabulary.hooks, ...hooks]), mentioned: styles.mentioned };
  const findings = [];
  for (const [file, list] of styles.findings) for (const f of list) findings.push({ file: path.relative(cwd, file), ...f });
  for (const file of files.filter((f) => SOURCE_EXT.test(f))) {
    for (const f of lintSource(path.relative(cwd, file), fs.readFileSync(file, "utf8"), context)) findings.push({ file: path.relative(cwd, file), ...f });
  }
  const levels = options.rules ?? {};
  const out = [];
  for (const f of findings) {
    const level = levels[f.rule];
    if (level === "off") continue;
    out.push(level === "warn" ? { ...f, severity: "warning" } : level === "error" ? { ...f, severity: "error" } : f);
  }
  out.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column);
  return { files: files.map((f) => path.relative(cwd, f)), findings: out };
}

/** The files the patterns name: a file, a directory (everything in it the lint reads) or a glob, less what `exclude` names. */
function listFiles(cwd, patterns, exclude) {
  const out = new Set();
  const excluded = (rel) => exclude.some((g) => path.matchesGlob(rel, g) || path.matchesGlob(`./${rel}`, g));
  const readable = (f) => SOURCE_EXT.test(f) || STYLE_EXT.test(f);
  for (const pattern of patterns) {
    const abs = path.resolve(cwd, pattern);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) { out.add(abs); continue; }
    const glob = fs.existsSync(abs) && fs.statSync(abs).isDirectory() ? path.join(path.relative(cwd, abs) || ".", "**/*") : pattern;
    for (const rel of fs.globSync(glob, { cwd, exclude: (p) => excluded(typeof p === "string" ? p : path.relative(cwd, path.join(p.parentPath ?? "", p.name))) })) {
      const absolute = path.resolve(cwd, rel);
      if (readable(absolute) && !excluded(path.relative(cwd, absolute)) && fs.statSync(absolute).isFile()) out.add(absolute);
    }
  }
  return [...out].sort((a, b) => a.localeCompare(b));
}

const USAGE = `Usage: basalt-lint [paths or globs...] [options]

Checks an app built on Basalt: restyled Basalt components, raw colours, lengths and times, and (as advice) competing primitives.

Options:
  --config <file>     A JSON config (default: basalt-lint.config.json in the current directory, when there is one)
  --format text|json  How findings print (default: text)
  --no-css            Skip stylesheets (then Stylelint is not needed)
  --quiet             Print errors only
  --max-warnings <n>  Fail when there are more than n warnings (default: warnings never fail)
  -h, --help          Show this help

Rules: basalt/no-restyle, basalt/raw-value, basalt/class-on-component (advice), basalt/primitive (advice), basalt/disable;
in CSS, Stylelint's design-value rules (color-no-hex, unit-disallowed-list, ...) and basalt/no-restyle.
An exception is a comment on the line before, with a reason:
  // basalt-lint-disable-next-line basalt/no-restyle -- the reason
  /* basalt-lint-disable-next-line color-no-hex -- the reason */
See docs/consumer-lint.md.`;

/** The command line: returns the exit code (0 clean, 1 findings that fail, 2 a usage or setup error). */
export async function main(argv, io = { out: (s) => process.stdout.write(s), err: (s) => process.stderr.write(s) }) {
  const args = { paths: [], format: "text", css: undefined, quiet: false, maxWarnings: -1, config: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") { io.out(`${USAGE}\n`); return 0; }
    else if (a === "--config") args.config = argv[++i];
    else if (a === "--format") args.format = argv[++i];
    else if (a === "--no-css") args.css = false;
    else if (a === "--quiet") args.quiet = true;
    else if (a === "--max-warnings") args.maxWarnings = Number(argv[++i]);
    else if (a.startsWith("--")) { io.err(`basalt-lint: unknown option ${a}\n\n${USAGE}\n`); return 2; }
    else args.paths.push(a);
  }
  if (!["text", "json"].includes(args.format) || Number.isNaN(args.maxWarnings)) { io.err(`${USAGE}\n`); return 2; }
  let config = {};
  const configFile = args.config ?? (fs.existsSync("basalt-lint.config.json") ? "basalt-lint.config.json" : null);
  try {
    if (configFile) config = JSON.parse(fs.readFileSync(configFile, "utf8"));
    for (const [rule, level] of Object.entries(config.rules ?? {})) {
      if (!["error", "warn", "off"].includes(level)) throw new Error(`${configFile}: rule ${rule} is "${level}"; a rule is "error", "warn" or "off"`);
    }
  } catch (error) {
    io.err(`basalt-lint: ${error.message}\n`);
    return 2;
  }
  let result;
  try {
    result = await basaltLint({ ...config, include: args.paths.length ? args.paths : config.include, css: args.css ?? config.css });
  } catch (error) {
    io.err(`${error.message}\n`);
    return 2;
  }
  const shown = args.quiet ? result.findings.filter((f) => f.severity === "error") : result.findings;
  const errors = result.findings.filter((f) => f.severity === "error").length;
  const warnings = result.findings.length - errors;
  if (args.format === "json") io.out(`${JSON.stringify(shown, null, 2)}\n`);
  else {
    let last = "";
    for (const f of shown) {
      if (f.file !== last) { io.out(`\n${f.file}\n`); last = f.file; }
      io.out(`  ${f.line}:${f.column}  ${f.severity === "error" ? "error  " : "advice "}  ${f.rule}  ${f.message}\n`);
    }
    const files = new Set(result.findings.map((f) => f.file)).size;
    io.out(`\nbasalt-lint: ${errors} error${errors === 1 ? "" : "s"}, ${warnings} advisor${warnings === 1 ? "y" : "ies"} in ${files} of ${result.files.length} files\n`);
  }
  return errors > 0 || (args.maxWarnings >= 0 && warnings > args.maxWarnings) ? 1 : 0;
}
