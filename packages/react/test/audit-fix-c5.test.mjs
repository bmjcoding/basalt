// audit-fix-c5: the tooling. Renders do not depend on what is plugged in (overlay scrollbars forced), and the check runs every step and says which failed.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { launch } from "./support.mjs";

const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const script = (name) => pathToFileURL(path.join(repo, "scripts", name)).href;

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

describe("overlay scrollbars, whatever the machine's setting", () => {
  test("the launch options force them, and keep the options they were given", async () => {
    const { launchOptions, OVERLAY_SCROLLBARS, FULL_RASTER } = await import(script("chromium-launch.mjs"));
    assert.deepEqual(launchOptions().args, [OVERLAY_SCROLLBARS, FULL_RASTER]);
    assert.deepEqual(launchOptions({ args: ["--a"], headless: true }), { args: [OVERLAY_SCROLLBARS, FULL_RASTER, "--a"], headless: true });
  });

  test("a scrolling page with `scrollbar-gutter: stable` has the whole window to draw in, so a docked laptop draws what an undocked one does", async () => {
    // With classic scrollbars (a mouse connected, or "Show scroll bars: Always") the root's gutter would take 15px and clientWidth would be 785.
    const page = await browser.newPage({ viewport: { width: 800, height: 400 } });
    await page.setContent(`<html style="scrollbar-gutter: stable"><body style="margin: 0"><div style="height: 2000px">x</div></body></html>`);
    assert.deepEqual(await page.evaluate(() => [innerWidth, document.documentElement.clientWidth]), [800, 800]);
    await page.close();
  });
});

describe("the steps of a check all run, and the summary names the ones that failed", () => {
  test("failingFiles reads the spec reporter's failing-tests block and the TAP reporter's top-level failures, each file once", async () => {
    const { failingFiles } = await import(script("run-steps.mjs"));
    const spec = "✖ failing tests:\n\ntest at tools/html-skill/test/parity-12.test.mjs:245:3\n✖ the marker (12ms)\n\ntest at tools/html-skill/test/parity-12.test.mjs:260:3\n✖ another (3ms)\n\ntest at test/support.test.mjs:1:1\n";
    assert.deepEqual(failingFiles(spec), ["tools/html-skill/test/parity-12.test.mjs", "test/support.test.mjs"]);
    assert.deepEqual(failingFiles("ok 1 - a.test.mjs\nnot ok 2 - b.test.mjs\n  ---\nnot ok 3 - c.test.mjs\n"), ["b.test.mjs", "c.test.mjs"]);
    assert.deepEqual(failingFiles("\u001B[31m✖ failing tests:\u001B[0m\ntest at x.test.mjs:1:1\n"), ["x.test.mjs"], "colour codes are ignored");
    assert.deepEqual(failingFiles("everything passed"), []);
  });

  test("a failing step does not stop the ones after it; the run fails at the end, and the summary says which failed first, with its files", () => {
    const code = `import { runSteps } from ${JSON.stringify(script("run-steps.mjs"))};
      await runSteps([{ command: "echo first" }, { label: "tests", command: "printf 'test at a/b.test.mjs:1:1\\\\n'; exit 3" }, { command: "echo third" }, { label: "later", command: "exit 1" }], { title: "demo" });`;
    const run = spawnSync(process.execPath, ["--input-type=module", "-e", code], { encoding: "utf8" });
    assert.equal(run.status, 1, "the process fails");
    assert.match(run.stdout, /third/, "the step after the failure ran");
    assert.match(run.stdout, /demo: 2 of 4 steps passed, 2 failed/);
    assert.match(run.stdout, /✔ passed {2}echo first/);
    assert.match(run.stdout, /✖ FAILED {2}tests \(\d+s, exit 3\), failed first\n\s+failing files: a\/b\.test\.mjs/);
    assert.match(run.stdout, /✖ FAILED {2}later \(\d+s, exit 1\)\n/);
    assert.doesNotMatch(run.stdout, /later \(\d+s, exit 1\), failed first/, "only the first failure is marked");
  });

  test("a run in which every step passes exits 0", () => {
    const code = `import { runSteps } from ${JSON.stringify(script("run-steps.mjs"))}; await runSteps([{ command: "true" }, { command: "true" }]);`;
    assert.equal(spawnSync(process.execPath, ["--input-type=module", "-e", code], { encoding: "utf8" }).status, 0);
  });

  test("npm test, npm run check and npm run lint are the runner's lists, in the order ci.yml runs them", async () => {
    const pkg = JSON.parse((await import("node:fs")).readFileSync(path.join(repo, "package.json"), "utf8"));
    assert.equal(pkg.scripts.test, "node scripts/test-all.mjs");
    assert.equal(pkg.scripts.check, "node scripts/check.mjs");
    assert.equal(pkg.scripts.lint, "node scripts/lint.mjs");
    const { CHECK } = await import(script("check.mjs"));
    assert.deepEqual(CHECK, ["npm run lint", "npm test", "npm run artifact", "npm run typecheck:review", "npm run test:packages"]);
    const { SUITES } = await import(script("test-all.mjs"));
    assert.deepEqual(SUITES.map((s) => s.label), ["tokens", "react", "html skill", "brand", "sites"]);
    const { WEB } = await import(script("ci-local.mjs"));
    assert.deepEqual(CHECK, WEB.slice(0, 5), "ci:local runs the same steps, then the generated-Swift check");
  });
});
