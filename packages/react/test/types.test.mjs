// The public declarations are Basalt's own (no Base UI, Phosphor, cmdk, Radix or Shiki type reaches an app),
// and they still accept what the primitives underneath support. test/fixtures/capabilities.tsx lists those
// options, with the few things that must stay refused as `@ts-expect-error`; it is compiled here against dist
// and again, as an installed package, by scripts/verify-packages.mjs.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { pkg } from "./support.mjs";

const tsc = path.join(path.dirname(createRequire(import.meta.url).resolve("typescript/package.json")), "bin", "tsc");
const fixture = path.join(pkg, "test", "fixtures", "capabilities.tsx");

function compile(extra = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-capabilities-"));
  try {
    fs.writeFileSync(path.join(dir, "tsconfig.json"), JSON.stringify({
      compilerOptions: {
        strict: true, noEmit: true, jsx: "react-jsx", module: "esnext", moduleResolution: "bundler", target: "es2022", lib: ["ES2022", "DOM", "DOM.Iterable"],
        // Declarations are checked too: a bad one in dist would show up here, not only in a consumer's `skipLibCheck: false`.
        skipLibCheck: false, types: [],
        paths: { "@srasyndicate/basalt": [path.join(pkg, "dist", "index.d.ts")] },
      },
      files: [fixture],
    }));
    return spawnSync(process.execPath, [tsc, "-p", dir, ...extra], { encoding: "utf8", timeout: 120_000 });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("the options the primitives support are still accepted, and what must stay refused still is", () => {
  const result = compile();
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("no third-party declaration is reachable from the components' types", () => {
  const files = compile(["--listFilesOnly"]).stdout.split("\n").filter(Boolean);
  const foreign = files.filter((file) => /node_modules\/(@base-ui|@phosphor-icons|cmdk|@radix-ui|shiki)\//.test(file));
  assert.deepEqual(foreign, []);
  assert.ok(files.some((file) => file.endsWith("dist/index.d.ts")), "the fixture reads Basalt's declarations");
});
