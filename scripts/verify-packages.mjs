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
    for (const required of workspace.endsWith("react") ? ["dist/index.js", "dist/index.d.ts", "dist/styles.css", "dist/fonts.css", "dist/fonts/OFL.txt", "dist/fonts/Geist-Variable.woff2", "dist/fonts/GeistMono-Variable.woff2"] : ["dist/css/tokens.css", "dist/css/shadcn.css", "dist/js/tokens.js", "dist/js/tokens.d.ts", "dist/json/tokens.json"]) assert.ok(files.has(required), `${packed.name} is missing ${required}`);
  }
  const manifest = { name: "basalt-consumer-check", version: "0.0.0", private: true, type: "module", dependencies: { "@srasyndicate/basalt-tokens": `file:${archives[0]}`, "@srasyndicate/basalt": `file:${archives[1]}`, react: "19.1.10", "react-dom": "19.1.10", "@types/react": "19.3.0", "@types/react-dom": "19.3.0" } };
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
  fs.writeFileSync(path.join(consumer, "index.tsx"), `import { Form, Field, Input, Combobox, Slider, Button, Sheet, Text, type TableDensity } from '@srasyndicate/basalt';
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
const app = <Form<{name: string}> onFormSubmit={value => value.name.toUpperCase()}><Field label="Name"><Input /></Field><Combobox options={[{value:'one',label:'One'}]} /><Slider label="Range" defaultValue={[10,20]} onValueChange={value => value[0]} /><Button>Deploy</Button><Text>{colour}{size}{density}</Text>{icons}</Form>;
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
  fs.writeFileSync(path.join(consumer, "smoke.mjs"), `import assert from 'node:assert/strict'; import fs from 'node:fs'; import { createElement } from 'react'; import { renderToStaticMarkup } from 'react-dom/server'; import { Button, CodeBlock, Pagination, Avatar, preloadCodeLanguages } from '@srasyndicate/basalt'; import { tokens } from '@srasyndicate/basalt-tokens';
assert.ok(tokens.dark['text-primary'].hex); assert.match(renderToStaticMarkup(createElement(Button, null, 'Deploy')), /Deploy/); assert.doesNotMatch(renderToStaticMarkup(createElement(CodeBlock, {code:'const answer = 42;',language:'ts'})), /syntax-keyword/); await preloadCodeLanguages(['ts']); assert.match(renderToStaticMarkup(createElement(CodeBlock, {code:'const answer = 42;',language:'ts'})), /syntax-keyword/); for (const f of fs.readdirSync(new URL('.', import.meta.resolve('@srasyndicate/basalt')))) if (f.endsWith('.js')) assert.doesNotMatch(fs.readFileSync(new URL(f, import.meta.resolve('@srasyndicate/basalt')), 'utf8'), /^import[^;]*from\s*"shiki/m, f + ' imports Shiki statically'); const pages = renderToStaticMarkup(createElement(Pagination, {page:500000,pageCount:1000000})); assert.ok(pages.length < 10000); assert.match(renderToStaticMarkup(createElement(Avatar,{name:'Bailey Jones'})), /BJ/); for (const name of ['styles.css','components.css','fonts.css']) assert.ok(fs.statSync(import.meta.resolve('@srasyndicate/basalt/'+name).replace('file://','')).size > 0); assert.match(fs.readFileSync(new URL(import.meta.resolve('@srasyndicate/basalt')), 'utf8'), /^"use client"/);
console.log('Packed consumer: runtime, server rendering, exact token types, exports, fonts and RSC boundary pass.');`);
  process.stdout.write(run(process.execPath, ["smoke.mjs"], consumer));
  console.log(`Installable archives: ${out}`);
} catch (error) {
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  throw new Error("Packed consumer verification failed; see the compiler or installer output above.");
} finally {
  fs.rmSync(consumer, { recursive: true, force: true });
}
