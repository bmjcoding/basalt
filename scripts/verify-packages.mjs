// Build first. Test the packed artifacts in a fresh consumer outside the monorepo, so missing
// exports, declarations, assets and accidental reliance on workspace resolution are caught.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(repo, ".review", "packages");
fs.mkdirSync(out, { recursive: true });
const consumer = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-consumer-"));
const run = (cmd, args, cwd = repo) => execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

try {
  const archives = [];
  const packedPackages = [];
  for (const workspace of ["packages/tokens", "packages/react"]) {
    const [packed] = JSON.parse(run("npm", ["pack", "--workspace", workspace, "--pack-destination", out, "--json"]));
    archives.push(path.join(out, packed.filename));
    packedPackages.push({ packed, manifest: JSON.parse(fs.readFileSync(path.join(repo, workspace, "package.json"), "utf8")) });
    const files = new Set(packed.files.map((file) => file.path));
    for (const required of workspace.endsWith("react") ? ["dist/index.js", "dist/index.d.ts", "dist/testing/headroom.js", "dist/testing/headroom.d.ts", "dist/tooling/phosphor.js", "dist/tooling/phosphor.d.ts", "dist/tooling/imports.js", "dist/tooling/imports.d.ts", "dist/head/theme.js", "dist/head/loops.js", "dist/styles.css", "dist/fonts.css", "dist/fonts/OFL.txt", "dist/fonts/Geist-Variable.woff2", "dist/fonts/GeistMono-Variable.woff2"] : ["dist/css/tokens.css", "dist/css/accents.css", "dist/css/shadcn.css", "dist/js/tokens.js", "dist/js/tokens.d.ts", "dist/js/breakpoints.js", "dist/js/durations.js", "dist/js/durations.d.ts", "dist/json/tokens.json"]) assert.ok(files.has(required), `${packed.name} is missing ${required}`);
  }
  // Next.js is in the lockfile (geist's peer), so the server-component check below installs the version the repository already resolves, offline.
  const nextVersion = JSON.parse(fs.readFileSync(path.join(repo, "package-lock.json"), "utf8")).packages["node_modules/next"].version;
  const manifest = { name: "basalt-consumer-check", version: "0.0.0", private: true, type: "module", dependencies: { "@srasyndicate/basalt-tokens": `file:${archives[0]}`, "@srasyndicate/basalt": `file:${archives[1]}`, next: nextVersion, react: "19.1.10", "react-dom": "19.1.10", "@types/react": "19.3.0", "@types/react-dom": "19.3.0" } };
  fs.writeFileSync(path.join(consumer, "package.json"), JSON.stringify(manifest));
  // Reuse the exact tested dependency resolution and cached tarballs, not workspace links or
  // mutable registry metadata. The installed Basalt packages themselves come from their .tgz.
  const sourceLock = JSON.parse(fs.readFileSync(path.join(repo, "package-lock.json"), "utf8"));
  const packages = Object.fromEntries(Object.entries(sourceLock.packages).filter(([name]) => name.startsWith("node_modules/")));
  packages[""] = { name: manifest.name, version: manifest.version, dependencies: manifest.dependencies };
  for (let index = 0; index < packedPackages.length; index++) {
    const { packed, manifest: pkg } = packedPackages[index];
    packages[`node_modules/${pkg.name}`] = { version: pkg.version, resolved: `file:${archives[index]}`, integrity: packed.integrity, dependencies: pkg.dependencies, peerDependencies: pkg.peerDependencies };
  }
  fs.writeFileSync(path.join(consumer, "package-lock.json"), JSON.stringify({ name: manifest.name, version: manifest.version, lockfileVersion: 3, requires: true, packages }));
  run("npm", ["ci", "--offline", "--ignore-scripts", "--no-audit", "--no-fund"], consumer);
  fs.writeFileSync(path.join(consumer, "index.tsx"), `import { Form, Field, Input, Combobox, Slider, Button, Sheet, Text, MorphIcon, CloseGlyph, Stage, PairedArt, FramedArt, type TableDensity } from '@srasyndicate/basalt';
import { checkHeadroom, type HeadroomResult } from '@srasyndicate/basalt/testing';
import { BASALT_PHOSPHOR_WEIGHTS, phosphorWeightsEsbuild, phosphorWeightsRollup, type PhosphorWeight } from '@srasyndicate/basalt/phosphor';
import { PlayIcon } from '@phosphor-icons/react';
import { tokens } from '@srasyndicate/basalt-tokens';
// An icon is structural: Phosphor's components fit it, and so does any component that draws an SVG.
const Mark = ({ size }: { size?: number | string }) => <svg width={size} height={size} />;
const icons = <><Button icon={PlayIcon}>Run</Button><Button icon={Mark}>Mark</Button></>;
const colour: string = tokens.dark['text-primary'].hex;
const size: string = tokens.primitives['size-control-md'].css;
// @ts-expect-error semantic token names are checked
tokens.light['missing-token'];
const density: TableDensity = 'compact';
// A glyph is passed by reference; the by-name prop is gone.
const morph = <MorphIcon glyph={CloseGlyph} />;
// A stage declares its headroom passed; framed art always has an alt (empty when decorative); the headroom check is a test helper.
const stage = <Stage headroom art={<PairedArt dark="/night.webp" light="/day.webp" />}><FramedArt src="/photo.webp" alt="" aspect="wide" caption="A caption" credit="A credit" /></Stage>;
const check: Promise<HeadroomResult> = checkHeadroom({ newContext: async () => { throw new Error('no browser here'); } }, { load: async () => {} });
// The opt-in Phosphor weights plugin is build tooling with its own types; the weight list is required.
const weights: readonly PhosphorWeight[] = [...BASALT_PHOSPHOR_WEIGHTS, 'regular'];
const plugins = [phosphorWeightsEsbuild({ weights }), phosphorWeightsRollup({ weights })];
// @ts-expect-error the weights are required
phosphorWeightsEsbuild({});
// @ts-expect-error a weight is one of Phosphor's six
phosphorWeightsRollup({ weights: ['black'] });
// @ts-expect-error the aspect is one of the four tokens
const odd = <FramedArt src="/photo.webp" alt="" aspect="tall" />;
// @ts-expect-error MorphIcon takes the glyph by reference, not a name
const byName = <MorphIcon name="close" />;
const app = <Form<{name: string}> onFormSubmit={value => value.name.toUpperCase()}><Field label="Name"><Input /></Field><Combobox options={[{value:'one',label:'One'}]} /><Slider label="Range" defaultValue={[10,20]} onValueChange={value => value[0]} /><Button>Deploy</Button><Text>{colour}{size}{density}</Text>{icons}{morph}{byName}{stage}{odd}</Form>;
`);
  // What the wrappers still accept (finalFocus, actionsRef, null and numeric selections, ...), compiled as an installed
  // package: the same file packages/react/test/types.test.mjs checks against dist.
  fs.copyFileSync(path.join(repo, "packages", "react", "test", "fixtures", "capabilities.tsx"), path.join(consumer, "capabilities.tsx"));
  fs.writeFileSync(path.join(consumer, "tsconfig.json"), JSON.stringify({ compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "Bundler", jsx: "react-jsx", strict: true, noEmit: true, skipLibCheck: false, lib: ["ES2022", "DOM", "DOM.Iterable"] }, include: ["index.tsx", "capabilities.tsx"] }));
  run(path.join(repo, "node_modules", ".bin", "tsc"), ["-p", consumer], consumer);
  // ...and that those wider declarations still name nothing from a dependency.
  const wide = run(path.join(repo, "node_modules", ".bin", "tsc"), ["-p", consumer, "--listFilesOnly"], consumer).trim().split("\n");
  const wideForeign = wide.filter((file) => /node_modules\/(@base-ui|cmdk|@radix-ui|shiki)\//.test(file));
  assert.deepEqual(wideForeign, [], `the package's declarations compile ${wideForeign.length} dependency declaration files`);
  // Declarations are Basalt's own: an app that imports one Button compiles React's types and
  // Basalt's, and nothing from Base UI, Phosphor, cmdk, Radix or Shiki (about 3,700 files once).
  fs.writeFileSync(path.join(consumer, "button-only.tsx"), `import { Button } from '@srasyndicate/basalt';\nexport const app = <Button>Deploy</Button>;\n`);
  fs.writeFileSync(path.join(consumer, "tsconfig.button.json"), JSON.stringify({ compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "Bundler", jsx: "react-jsx", strict: true, noEmit: true, lib: ["ES2022", "DOM", "DOM.Iterable"] }, files: ["button-only.tsx"] }));
  const loaded = run(path.join(repo, "node_modules", ".bin", "tsc"), ["-p", path.join(consumer, "tsconfig.button.json"), "--listFilesOnly"], consumer).trim().split("\n");
  const foreign = loaded.filter((file) => /node_modules\/(@base-ui|@phosphor-icons|cmdk|@radix-ui|shiki)\//.test(file));
  assert.deepEqual(foreign, [], `a Button-only consumer compiles ${foreign.length} third-party declaration files`);
  assert.ok(loaded.length < 400, `a Button-only consumer compiles ${loaded.length} files`);
  fs.writeFileSync(path.join(consumer, "smoke.mjs"), `import assert from 'node:assert/strict'; import fs from 'node:fs'; import { createElement } from 'react'; import { renderToStaticMarkup } from 'react-dom/server'; import { Button, CodeBlock, Pagination, Avatar, MorphIcon, CloseGlyph, preloadCodeLanguages } from '@srasyndicate/basalt'; import { tokens, accents } from '@srasyndicate/basalt-tokens';
assert.ok(tokens.dark['text-primary'].hex); assert.equal(accents.cobalt.dark.hex, '#77a2fc'); assert.equal(accents.cobalt.light.oklch, 'oklch(0.47 0.17 264)'); assert.match(renderToStaticMarkup(createElement(Button, null, 'Deploy')), /Deploy/); assert.doesNotMatch(renderToStaticMarkup(createElement(CodeBlock, {code:'const answer = 42;',language:'ts'})), /syntax-keyword/); await preloadCodeLanguages(['ts']); assert.match(renderToStaticMarkup(createElement(CodeBlock, {code:'const answer = 42;',language:'ts'})), /syntax-keyword/); for (const f of fs.readdirSync(new URL('.', import.meta.resolve('@srasyndicate/basalt')))) if (f.endsWith('.js')) assert.doesNotMatch(fs.readFileSync(new URL(f, import.meta.resolve('@srasyndicate/basalt')), 'utf8'), /^import[^;]*from\s*"shiki/m, f + ' imports Shiki statically'); const pages = renderToStaticMarkup(createElement(Pagination, {page:500000,pageCount:1000000})); assert.ok(pages.length < 10000); assert.match(renderToStaticMarkup(createElement(Avatar,{name:'Bailey Jones'})), /BJ/); assert.match(renderToStaticMarkup(createElement(MorphIcon,{glyph:CloseGlyph})), /data-icon="close"/); for (const name of ['styles.css','components.css','fonts.css']) assert.ok(fs.statSync(import.meta.resolve('@srasyndicate/basalt/'+name).replace('file://','')).size > 0); const read = (f) => fs.readFileSync(new URL(f, import.meta.resolve('@srasyndicate/basalt')), 'utf8'); assert.doesNotMatch(read('index.js'), /^"use client"/, 'the entry is a barrel: a Server Component imports plain values from it'); assert.match(read('button.js'), /^"use client"/); assert.match(read('menu.js'), /^"use client"/); assert.doesNotMatch(read('time-format.js'), /^"use client"/); const testing = await import('@srasyndicate/basalt/testing'); assert.equal(typeof testing.checkHeadroom, 'function'); assert.equal(typeof testing.measureHeadroom, 'function'); assert.equal('checkHeadroom' in await import('@srasyndicate/basalt'), false, 'the headroom helper is not in the root export');
const phosphor = await import('@srasyndicate/basalt/phosphor'); assert.deepEqual(phosphor.BASALT_PHOSPHOR_WEIGHTS, ['bold', 'fill']); assert.throws(() => phosphor.phosphorWeightsEsbuild({}), /weights/); assert.equal(phosphor.phosphorWeightsRollup({ weights: ['bold'] }).transform('x', '/a/b.js'), null);
console.log('Packed consumer: runtime, server rendering, exact token types, exports, fonts and RSC boundary pass.');`);
  process.stdout.write(run(process.execPath, ["smoke.mjs"], consumer));
  // A React Server Component, built by Next.js (A5-18): what the package holds that is neither a component nor a hook must be callable on the server. Each
  // page is static, so a call that throws ("Attempted to call formatStamp() from the server but formatStamp is on the client") fails the build, and a constant
  // that arrives as a client reference (CONFIRM_MS / 1000 is NaN, with no error) shows in the page's HTML. The components still come through as components.
  // The real path: the temporary folder is behind a symlink on macOS, and Turbopack's root must be the folder it finds, not a link to it.
  const root = fs.realpathSync(consumer);
  const rsc = path.join(root, "rsc");
  fs.mkdirSync(path.join(rsc, "app"), { recursive: true });
  fs.writeFileSync(path.join(rsc, "next.config.mjs"), `export default { turbopack: { root: ${JSON.stringify(root)} }, outputFileTracingRoot: ${JSON.stringify(root)}, typescript: { ignoreBuildErrors: true }, devIndicators: false };\n`);
  fs.writeFileSync(path.join(rsc, "app", "layout.jsx"), `import { themeBootstrap, loopsBootstrap } from "@srasyndicate/basalt";
export default function RootLayout({ children }) {
  return <html lang="en"><head><script id="theme" dangerouslySetInnerHTML={{ __html: themeBootstrap }} /><script id="loops" dangerouslySetInnerHTML={{ __html: loopsBootstrap }} /></head><body>{children}</body></html>;
}
`);
  fs.writeFileSync(path.join(rsc, "app", "page.jsx"), `import { Button, CodeBlock, CONFIRM_MS, COPIED_MS, STATUS_MESSAGE_MS, REFLOW_BOUND, AMBIENT_MAX, LOOPS_TOGGLE_NAME, ambient, ambientTiming, formatAge, formatClock, formatCountdown, formatDay, formatStamp, formatStatTime, shareOf, trailingMean, entranceStep, travelLeg, TRAVEL_MIN_LEG, preloadCodeLanguages } from "@srasyndicate/basalt";
export default async function Page() {
  await preloadCodeLanguages(["ts"]);
  const at = new Date(0);
  return (
    <main>
      <p id="confirm">Held for {CONFIRM_MS / 1000} seconds, copied for {COPIED_MS / 1000}, status for {STATUS_MESSAGE_MS / 1000}</p>
      <p id="numbers">{REFLOW_BOUND} {AMBIENT_MAX} {TRAVEL_MIN_LEG} {LOOPS_TOGGLE_NAME}</p>
      <p id="stamp">{formatStamp(at, { timeZone: "UTC" }).dateTime} {formatClock(at, { timeZone: "UTC" }).dateTime} {formatDay(at, { timeZone: "UTC", now: at }).dateTime} {formatStatTime(at, { timeZone: "UTC", now: at }).dateTime} {formatCountdown(60000, 0).text} {formatAge(0, 3600000)}</p>
      <p id="plain">{shareOf([1, 1]).join("+")} {trailingMean([1, 2, 3, 4], { window: 3, min: 3 }).join(",")} {entranceStep(5, 20, 100)} {travelLeg(100)} {ambientTiming(0).period.toFixed(2)} {ambient(0)?.["data-ambient"] === "" ? "marked" : "unmarked"}</p>
      <Button>Deploy</Button>
      <CodeBlock code="const answer = 42;" language="ts" />
    </main>
  );
}
`);
  run("env", ["NEXT_TELEMETRY_DISABLED=1", path.join(root, "node_modules", ".bin", "next"), "build"], rsc);
  // React writes a comment between two adjacent text nodes; the words are what is compared.
  const html = fs.readFileSync(path.join(rsc, ".next", "server", "app", "index.html"), "utf8").replaceAll("<!-- -->", "");
  for (const expected of ["Held for 1.5 seconds, copied for 1.5, status for 5", "48 24 100 Pause animations", "1970-01-01T00:00:00 1970-01-01T00:00 1970-01-01 1970-01-01T00:00 00:01:00 60 minutes ago", "50+50 ,,2,3 20 300 1.09 marked", "Deploy"]) assert.ok(html.includes(expected), `a Server Component's page lacks "${expected}"`);
  assert.doesNotMatch(html, /NaN|from the server but/, "a Server Component read a client reference as a value");
  assert.ok(html.includes("basalt-loops") && html.includes("basalt-theme"), "the head scripts did not reach the document's head");
  console.log(`Installable archives: ${out}`);
} catch (error) {
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  throw new Error("Packed consumer verification failed; see the compiler or installer output above.");
} finally {
  fs.rmSync(consumer, { recursive: true, force: true });
}
