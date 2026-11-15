// The third fix batch from the components audit (A1-02, -03, -05, -07, -10, -11; A2-04, -05; A1-01 is not in this batch). Each item
// either makes shipped behaviour faster without changing what is drawn, or restores behaviour the README states. The tests count work
// (files loaded, renders, style recalculations) rather than time it, so a loaded machine cannot fail them.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

import { bundleFixture, fixturePage, launch, pkg, settle } from "./support.mjs";

const React = createRequire(import.meta.url)("react");
const { renderToString, renderToStaticMarkup } = createRequire(import.meta.url)("react-dom/server");

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

describe("A1-07: importing the package in Node", () => {
  // Phosphor's barrel is 4,541 files. Each component imports its icons by path (`@phosphor-icons/react/dist/csr/<Name>`), so Node loads one
  // file per icon, and an app's own import of the same icon from the barrel still resolves to the same module.
  test("importing the package loads no more than a stated number of files, and none of Phosphor's barrel", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-node-import-"));
    try {
      const hooks = path.join(dir, "hooks.mjs");
      fs.writeFileSync(hooks, `import { registerHooks } from "node:module";\nconst seen = globalThis.__loaded = [];\nregisterHooks({ load(url, context, next) { if (url.startsWith("file:")) seen.push(url); return next(url, context); } });\n`);
      const entry = pathToFileURL(path.join(pkg, "dist", "index.js")).href;
      const out = execFileSync(process.execPath, ["--import", hooks, "--input-type=module", "-e", `await import(${JSON.stringify(entry)}); console.log(JSON.stringify(globalThis.__loaded));`], { cwd: pkg, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      const files = JSON.parse(out.trim().split("\n").at(-1));
      const phosphor = files.filter((f) => /\/@phosphor-icons\/react\//.test(f));
      assert.ok(!phosphor.some((f) => /\/dist\/index\.[a-z]+\.js$/.test(f)), "Phosphor's barrel is not loaded");
      // 24 icons, each with its definition file, plus the icon base and its context: about 50. 60 leaves room for one more icon.
      assert.ok(phosphor.length <= 60, `${phosphor.length} Phosphor files loaded`);
      // The base was 5,356 files. Base UI is 641 of what is left; the rest is the package, React and the icons.
      assert.ok(files.length <= 1000, `${files.length} files loaded`);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});

// ---- Counting renders --------------------------------------------------------------------------------------------------------
// React tells the DevTools hook about every commit. A host element whose props object is not the one it had before was rendered by
// its parent in that commit (a memoised component that bails out leaves its subtree's fibers, and so their props, as they were). The
// hook is installed before the fixture's script runs, so React finds it when it starts.
const HOOK = `(() => {
  const counts = window.__renders = { matching: [], watch: null };
  const matches = (fiber) => {
    const w = counts.watch;
    if (!w || fiber.tag !== 5) return false;
    if (w.type && fiber.type !== w.type) return false;
    return !w.className || (typeof fiber.memoizedProps?.className === "string" && fiber.memoizedProps.className.split(" ").includes(w.className));
  };
  const mounted = (fiber, found) => { for (let c = fiber; c; c = c.sibling) { if (matches(c)) found.push(c); if (c.child) mounted(c.child, found); } };
  const updated = (next, found) => {
    for (let c = next.child; c; c = c.sibling) {
      const p = c.alternate;
      if (!p) { if (matches(c)) found.push(c); if (c.child) mounted(c.child, found); continue; }
      if (matches(c) && c.memoizedProps !== p.memoizedProps) found.push(c);
      if (c.child !== p.child) updated(c, found);
    }
  };
  const hook = {
    supportsFiber: true, isDisabled: false, renderers: new Map(),
    inject(renderer) { const id = hook.renderers.size + 1; hook.renderers.set(id, renderer); return id; },
    onCommitFiberRoot(id, root) { const found = []; updated(root.current, found); counts.matching.push(found.length); },
    onPostCommitFiberRoot() {}, onCommitFiberUnmount() {}, checkDCE() {}, setStrictMode() {},
  };
  Object.defineProperty(window, "__REACT_DEVTOOLS_GLOBAL_HOOK__", { value: hook, configurable: true });
})();`;

/** A fixture page whose commits are counted (see `watch`). */
async function countingPage(body, { theme = "light", ...options } = {}) {
  const page = await browser.newPage(options);
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
  await page.setContent(`<html data-theme="${theme}"><head><style>${css}</style></head><body><div id="root"></div></body></html>`);
  await page.evaluate(HOOK); // before the fixture's script, which is where React starts
  await page.addScriptTag({ content: await bundleFixture(body) });
  return { page, errors };
}
/** From now on, count the host elements that match ({ type: "tr" } or { className: "basalt-filter-row" }) that each commit renders. */
const watch = (page, what) => page.evaluate((w) => { window.__renders.watch = w; window.__renders.matching = []; }, what);
/** The matching elements rendered in each commit since `watch`. */
const rendered = (page) => page.evaluate(() => window.__renders.matching.slice());
const total = (list) => list.reduce((sum, n) => sum + n, 0);

describe("A1-02: a table re-renders only the row that changed", () => {
  test("ticking one row of 200, in an app that keeps each row's props stable, renders one row", async () => {
    const { page } = await countingPage(`
      const ids = Array.from({ length: 200 }, (_, i) => i);
      const cache = new Map();
      // The app keeps each row's children the same until that row's own state changes.
      const cells = (i, on) => { const hit = cache.get(i); if (hit && hit.on === on) return hit.el; const el = <><B.TableRowHead>{"run " + i}</B.TableRowHead><B.TableCell>{"Build " + i}</B.TableCell><B.TableCell numeric>{i}</B.TableCell></>; cache.set(i, { on, el }); return el; };
      function App() {
        const [picked, setPicked] = React.useState(() => new Set());
        window.tick = (i) => flushSync(() => setPicked((s) => { const next = new Set(s); if (next.has(i)) next.delete(i); else next.add(i); return next; }));
        return (
          <B.TableContainer label="Runs"><B.Table columns={[{ width: 120 }, {}, { width: 100 }]} minWidth={400}>
            <B.TableBody>{ids.map((i) => <B.TableRow key={i} selected={picked.has(i)}>{cells(i, picked.has(i))}</B.TableRow>)}</B.TableBody>
          </B.Table></B.TableContainer>
        );
      }
      createRoot(document.getElementById("root")).render(<App />);`);
    try {
      await page.locator("tbody tr").nth(199).waitFor();
      await watch(page, { type: "tr" });
      await page.evaluate(() => window.tick(7));
      assert.equal(await page.locator("tbody tr").nth(7).getAttribute("aria-selected"), "true");
      assert.equal(total(await rendered(page)), 1, "one row rendered, not two hundred");
      await page.evaluate(() => window.tick(7));
      assert.equal(await page.locator("tbody tr").nth(7).getAttribute("data-selected"), null);
      assert.equal(total(await rendered(page)), 2, "and one more for the second tick");
    } finally { await page.close(); }
  });
});

describe("A1-03: the checklist's highlight renders the rows that changed", () => {
  test("crossing ten rows of a 200-option checklist renders at most the rows that changed", async () => {
    const { page } = await countingPage(`
      const options = Array.from({ length: 200 }, (_, i) => ({ value: "v" + i, label: "Option " + i }));
      createRoot(document.getElementById("root")).render(<B.MultiSelect label="Region" options={options} />);`);
    try {
      await page.getByRole("button", { name: /Region/ }).click();
      await page.getByRole("checkbox", { name: "Option 0", exact: true }).waitFor();
      await settle(page);
      await watch(page, { className: "basalt-filter-row" });
      const first = await page.getByRole("checkbox", { name: "Option 0", exact: true }).boundingBox();
      const pitch = (await page.getByRole("checkbox", { name: "Option 1", exact: true }).boundingBox()).y - first.y;
      await page.mouse.move(first.x + 20, first.y + 4);
      // Nine rows show whole: down eight rows and back up two is ten crossings.
      for (const row of [1, 2, 3, 4, 5, 6, 7, 8, 7, 6]) await page.mouse.move(first.x + 20, first.y + pitch * row + 4, { steps: 2 });
      const commits = await rendered(page);
      assert.equal(await page.locator("[data-highlighted]").count(), 1, "one row is lit");
      assert.ok(commits.some((n) => n > 0), "the highlight did render the rows it changed");
      // Entering a row lights it and un-lights the one before: at most two rows change in a commit, and about two per row crossed overall.
      assert.ok(Math.max(...commits) <= 2, `a commit rendered ${Math.max(...commits)} rows (${commits})`);
      assert.ok(total(commits) <= 2 * 10 + 2, `ten rows crossed rendered ${total(commits)} rows`);
    } finally { await page.close(); }
  });
});

describe("A2-04 and A2-05: MultiSelect", () => {
  const two = `[{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }]`;
  const seven = `Array.from({ length: 7 }, (_, i) => ({ value: "v" + i, label: "Option " + i }))`;
  for (const theme of ["light", "dark"]) {
    test(`a veto through the details leaves a chip as it was, and Clear is vetoed the same way (${theme})`, async () => {
      const { page } = await fixturePage(browser, `window.calls = []; createRoot(document.getElementById("root")).render(<B.MultiSelect label="Status" options={${two}} defaultValue={["b"]} onValueChange={(v, d) => { window.calls.push([d.reason, v]); d.cancel(); }} />);`, { theme });
      try {
        const alpha = page.getByRole("checkbox", { name: "Alpha" });
        await alpha.click();
        assert.equal(await alpha.getAttribute("aria-checked"), "false", "the vetoed tick did not apply");
        await page.getByRole("button", { name: "Clear", exact: true }).click();
        assert.equal(await page.getByRole("checkbox", { name: "Beta" }).getAttribute("aria-checked"), "true", "the vetoed Clear did not apply");
        assert.equal((await page.evaluate(() => window.calls)).length, 2, "the callback heard both");
      } finally { await page.close(); }
    });

    test(`an unvetoed change applies, in a chip and in a checklist (${theme})`, async () => {
      const { page } = await fixturePage(browser, `createRoot(document.getElementById("root")).render(<><B.MultiSelect label="Status" options={${two}} /><B.MultiSelect label="Host" options={${seven}} /></>);`, { theme });
      try {
        await page.getByRole("checkbox", { name: "Alpha" }).click();
        assert.equal(await page.getByRole("checkbox", { name: "Alpha" }).getAttribute("aria-checked"), "true");
        await page.getByRole("button", { name: /Host/ }).click();
        await page.getByRole("checkbox", { name: "Option 3" }).click();
        assert.equal(await page.getByRole("checkbox", { name: "Option 3" }).getAttribute("aria-checked"), "true");
      } finally { await page.close(); }
    });

    test(`a disabled filter cannot be changed, as chips or as a checklist (${theme})`, async () => {
      const { page } = await fixturePage(browser, `window.calls = 0; createRoot(document.getElementById("root")).render(<><B.MultiSelect label="Status" disabled defaultValue={["a"]} options={${two}} onValueChange={() => { window.calls += 1; }} /><B.MultiSelect label="Host" disabled toolbar defaultValue={["a"]} options={${two}} onValueChange={() => { window.calls += 1; }} /></>);`, { theme });
      try {
        const chips = page.locator(".basalt-filter").first();
        await chips.getByRole("button", { name: "Clear", exact: true }).click({ force: true });
        assert.equal(await chips.getByRole("checkbox", { name: "Alpha" }).getAttribute("aria-checked"), "true", "Clear did not clear");
        assert.equal(await chips.getByRole("button", { name: "Clear", exact: true }).getAttribute("aria-disabled"), "true");
        await chips.getByRole("checkbox", { name: "Beta" }).click({ force: true });
        assert.equal(await chips.getByRole("checkbox", { name: "Beta" }).getAttribute("aria-checked"), "false", "a chip did not change");
        assert.equal(await page.evaluate(() => window.calls), 0, "the callback was never called");
        assert.equal(await page.locator(".basalt-filter-trigger").isDisabled(), true, "the checklist's trigger is disabled");
      } finally { await page.close(); }
    });

    test(`a native form reset leaves a disabled filter's choices as they were, as chips and as a checklist (${theme})`, async () => {
      const { page } = await fixturePage(browser, `window.calls = 0; createRoot(document.getElementById("root")).render(<form id="f"><B.MultiSelect label="Status" disabled defaultValue={["a"]} options={${two}} onValueChange={() => { window.calls += 1; }} /><B.MultiSelect label="Host" disabled toolbar defaultValue={["a", "b"]} options={${two}} onValueChange={() => { window.calls += 1; }} /></form>);`, { theme });
      try {
        await page.evaluate(() => document.getElementById("f").reset());
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.equal(await page.getByRole("checkbox", { name: "Alpha" }).getAttribute("aria-checked"), "true", "the chip kept its choice");
        assert.match(await page.locator(".basalt-filter-trigger").innerText(), /Alpha \+1/, "the checklist kept both choices");
        assert.equal(await page.evaluate(() => window.calls), 0, "the callback was never called");
      } finally { await page.close(); }
    });

    test(`a checklist that is open when the filter becomes disabled cannot be changed (${theme})`, async () => {
      const { page } = await fixturePage(browser, `const root = createRoot(document.getElementById("root")); window.filter = (disabled) => flushSync(() => root.render(<B.MultiSelect label="Status" toolbar disabled={disabled} options={${two}} />)); window.filter(false);`, { theme });
      try {
        await page.getByRole("button", { name: "Status Any" }).click();
        await page.getByRole("checkbox", { name: "Alpha" }).waitFor();
        await page.evaluate(() => window.filter(true));
        const alpha = page.getByRole("checkbox", { name: "Alpha" });
        if (await alpha.count()) {
          await alpha.click({ force: true });
          assert.equal(await alpha.getAttribute("aria-checked"), "false");
          await page.getByRole("button", { name: "Clear", exact: true }).click({ force: true });
        }
        assert.equal(await page.locator(".basalt-filter-trigger").innerText().then((t) => /Any/.test(t)), true, "nothing was chosen");
      } finally { await page.close(); }
    });
  }
});

// ---- A page built from a tree, on the client or hydrated from the server ---------------------------------------------------------
let basalt;
const dist = () => pathToFileURL(path.join(pkg, "dist", "index.js")).href;

/**
 * A page holding `tree`, a function `(B, h) => element` written as plain JavaScript (h is createElement) so that the same text builds
 * the server's markup in Node and the browser's tree. `mode` is "client" (rendered into an empty page) or "hydrated" (renderToString in
 * Node, then hydrateRoot in the page, which keeps the server's inline styles as they were written).
 */
async function treePage(tree, { mode, theme = "light", viewport = { width: 900, height: 900 }, before = "", boot = null } = {}) {
  basalt ??= await import(dist());
  const html = mode === "hydrated" ? renderToString(new Function("B", "h", `return (${tree})(B, h)`)(basalt, React.createElement)) : "";
  const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
  const page = await browser.newPage({ viewport });
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.text()); });
  await page.setContent(`<html data-theme="${theme}"><head><style>${css}</style></head><body><div id="root">${html}</div></body></html>`);
  await page.addScriptTag({ content: await bundleFixture(`import { hydrateRoot } from "react-dom/client"; ${before}\n const tree = (${tree})(B, React.createElement); const host = document.getElementById("root"); ${boot ?? (mode === "hydrated" ? "hydrateRoot(host, tree);" : "createRoot(host).render(tree);")}`) });
  await nextFrames(page, 4);
  await settle(page);
  return { page, errors };
}

// ---- Style recalculations and layouts, counted by Chrome ----------------------------------------------------------------------
const work = async (page, action) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const read = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  const before = await read();
  await action();
  const after = await read();
  await cdp.detach();
  return { styles: after.RecalcStyleCount - before.RecalcStyleCount, layouts: after.LayoutCount - before.LayoutCount };
};
const nextFrames = (page, n = 3) => page.evaluate((count) => new Promise((resolve) => { const step = (left) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve()); step(count); }), n);

for (const theme of ["light", "dark"]) {
  describe(`A1-05: spinners join the shared clock without a recalculation each (${theme})`, () => {
    const body = `
      const root = createRoot(document.getElementById("root"));
      // The same keys every time: showing more appends spinners to the ones already there.
      window.show = (n) => flushSync(() => root.render(<div>{Array.from({ length: n }, (_, i) => <B.Spinner key={"b" + i} variant="braille" label={"Working " + i} />)}<B.Spinner key="ring" variant="ring" /></div>));
      function Hold() { const loops = B.useLoops(); window.loops = loops; return null; }
      window.hold = () => flushSync(() => root.render(<><Hold /><div id="late" /></>));`;

    test("a commit of 100 braille spinners forces no style recalculation of its own, and every spinner is on the clock", async () => {
      const { page } = await fixturePage(browser, body, { theme });
      try {
        // Counted until three frames have passed, so that the recalculation the frame itself needs is in the number.
        const cost = await work(page, async () => { await page.evaluate(() => window.show(100)); await nextFrames(page); });
        // Before: one forced recalculation per spinner (102 in the audit). Now the commit's spinners join together: one read of style.
        assert.ok(cost.styles <= 8, `${cost.styles} style recalculations for one commit of 100 spinners`);
        const starts = await page.evaluate(() => document.getAnimations().filter((a) => a.animationName?.startsWith("basalt-")).map((a) => a.startTime));
        assert.ok(starts.length >= 100, `${starts.length} spinner animations`);
        assert.deepEqual([...new Set(starts)], [0], "every spinner animation starts at the timeline's origin");
      } finally { await page.close(); }
    });

    test("a spinner mounted later, with others already running, ticks in phase with them, and the earlier ones are the same elements on the same clock", async () => {
      const { page } = await fixturePage(browser, body, { theme });
      try {
        await page.evaluate(() => window.show(3));
        await nextFrames(page);
        await page.evaluate(() => {
          window.firstElements = [...document.querySelectorAll(".basalt-spinner")];
          window.firstAnimations = window.firstElements.flatMap((el) => el.getAnimations({ subtree: true }));
        });
        await page.waitForTimeout(333); // so that a spinner mounted now would be out of phase if it were not joined to the clock
        await page.evaluate(() => window.show(4)); // the same three keys and the ring, and one more
        await nextFrames(page);
        const read = await page.evaluate(() => {
          const now = document.querySelectorAll(".basalt-spinner");
          const period = (a) => a.effect.getComputedTiming().duration;
          const offset = (a) => Math.abs((Number(a.currentTime) % period(a)) - (Number(document.timeline.currentTime) % period(a)));
          const sameElements = window.firstElements.every((el) => document.body.contains(el) && [...now].includes(el));
          const animationsNow = window.firstElements.flatMap((el) => el.getAnimations({ subtree: true }));
          const all = document.getAnimations().filter((a) => a.animationName?.startsWith("basalt-"));
          return {
            elements: now.length, sameElements,
            sameAnimations: animationsNow.length === window.firstAnimations.length && animationsNow.every((a, i) => a === window.firstAnimations[i]),
            firstStarts: [...new Set(window.firstAnimations.map((a) => a.startTime))],
            all: all.map((a) => ({ start: a.startTime, offset: offset(a) })),
          };
        });
        assert.equal(read.elements, 5, "three braille spinners and the ring, and the one added");
        assert.equal(read.sameElements, true, "the earlier spinners are the same elements");
        assert.equal(read.sameAnimations, true, "and carry the same animations");
        assert.deepEqual(read.firstStarts, [0]);
        assert.ok(read.all.length >= 4 * 6 + 1, `${read.all.length} spinner animations`);
        for (const a of read.all) assert.ok(a.start === 0 && a.offset < 1, JSON.stringify(a));
      } finally { await page.close(); }
    });

    test("releasing the root hold puts a spinner mounted while it was held on the clock", async () => {
      const { page } = await fixturePage(browser, `
        const root = createRoot(document.getElementById("root"));
        function App() { const loops = B.useLoops(); window.loops = loops; return <B.Spinner variant="braille" label="Working" />; }
        window.mount = () => flushSync(() => root.render(<App />));
        document.documentElement.setAttribute("data-loops", "held");`, { theme });
      try {
        await page.evaluate(() => window.mount());
        await nextFrames(page);
        assert.equal(await page.evaluate(() => document.getAnimations().filter((a) => a.animationName?.startsWith("basalt-")).length), 0, "held: nothing runs");
        await page.waitForTimeout(250);
        await page.evaluate(() => window.loops.setHeld(false));
        const starts = await page.evaluate(() => document.getAnimations().filter((a) => a.animationName?.startsWith("basalt-")).map((a) => a.startTime));
        assert.ok(starts.length > 0, "running again");
        assert.deepEqual([...new Set(starts)], [0]);
      } finally { await page.close(); }
    });
  });
}

for (const theme of ["light", "dark"]) {
  describe(`A1-10: TextMorph lays out once per change (${theme})`, () => {
    test("changing a 20-character label forces one layout, not one per character", async () => {
      const { page } = await fixturePage(browser, `
        const root = createRoot(document.getElementById("root"));
        window.set = (text) => flushSync(() => root.render(<B.TextMorph text={text} />));
        window.set("Build 1,204 passed ok");`, { theme });
      try {
        await nextFrames(page, 12); // the font-readiness probe has finished
        await settle(page);
        const cost = await work(page, () => page.evaluate(() => window.set("Build 1,205 failed ok")));
        // Before: a layout for each character of the new text and of the old (about 42). Now the two are measured in one pass.
        assert.ok(cost.layouts <= 3, `${cost.layouts} layouts for one change`);
        await nextFrames(page, 4);
        await settle(page);
        assert.equal(await page.locator(".basalt-text-morph [aria-live]").innerText(), "Build 1,205 failed ok");
      } finally { await page.close(); }
    });

    test("the widths it measures are the widths of each character alone", async () => {
      const { page } = await fixturePage(browser, `createRoot(document.getElementById("root")).render(<B.TextMorph text="AVAV fi 1.0" />);`, { theme });
      try {
        await nextFrames(page, 12);
        await settle(page);
        const measured = await page.evaluate(() => [...document.querySelectorAll(".basalt-text-morph-glyph")].map((g) => +g.getBoundingClientRect().width.toFixed(2)));
        const alone = await page.evaluate(() => {
          const host = document.querySelector(".basalt-text-morph");
          const style = getComputedStyle(host);
          return [..."AVAV fi 1.0"].map((character) => {
            const probe = document.createElement("span");
            probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${style.font};letter-spacing:${style.letterSpacing};font-feature-settings:${style.fontFeatureSettings}`;
            probe.textContent = character;
            host.appendChild(probe);
            const width = +probe.getBoundingClientRect().width.toFixed(2);
            probe.remove();
            return width;
          });
        });
        assert.equal(measured.length, alone.length);
        // The glyphs are positioned by the widths the measure returned, so the total the host takes is their sum.
        const host = await page.evaluate(() => +document.querySelector(".basalt-text-morph").getBoundingClientRect().width.toFixed(2));
        assert.ok(Math.abs(host - alone.reduce((sum, w) => sum + w, 0)) < 0.5, `the label is ${host} wide, its characters alone sum to ${alone.reduce((sum, w) => sum + w, 0)}`);
      } finally { await page.close(); }
    });
  });
}

for (const theme of ["light", "dark"]) {
  describe(`A1-11: a long code block is coloured after its plain text paints (${theme})`, () => {
    const body = `
      const root = createRoot(document.getElementById("root"));
      const source = (lines) => Array.from({ length: lines }, (_, i) => "export function make" + i + "(value: number): string { return \\"item\\" + value; }").join("\\n");
      window.size = (code) => code.length;
      window.big = source(1250);
      window.small = source(20);
      window.show = (code) => flushSync(() => root.render(<B.CodeBlock language="typescript" code={code} title="routes.ts" />));
      window.show(window.small);`;

    test("a block over 10,000 characters is plain when it mounts, then coloured, with its text exactly as given", async () => {
      const { page } = await fixturePage(browser, body, { theme });
      try {
        // The grammar is loaded by the small block: wait for its colour.
        await page.waitForFunction(() => document.querySelectorAll(".basalt-code-pre code span[style]").length > 0, null, { timeout: 15000 });
        const length = await page.evaluate(() => window.big.length);
        assert.ok(length > 10_000 && length < 100_000, `${length} characters`);
        // Mounted and read in one call, straight after flushSync: a frame and the highlighting timer cannot run between them.
        const first = await page.evaluate(() => { window.show(window.big); return { spans: document.querySelectorAll(".basalt-code-pre code span").length, text: document.querySelector(".basalt-code-pre").textContent, big: window.big }; });
        assert.equal(first.spans, 0, "plain text first: no token span in the commit that mounted it");
        assert.equal(first.text, first.big);
        await page.waitForFunction(() => document.querySelectorAll(".basalt-code-pre span[style]").length > 1000, null, { timeout: 15000 });
        const done = await page.evaluate(() => ({ text: document.querySelector(".basalt-code-pre").textContent, colours: new Set([...document.querySelectorAll(".basalt-code-pre span[style]")].map((s) => s.style.color)).size }));
        assert.equal(done.text, await page.evaluate(() => window.big), "the text is untouched by the colour");
        assert.ok(done.colours >= 3, `${done.colours} colours`);
      } finally { await page.close(); }
    });

    test("a block of 10,000 characters or fewer is coloured in the render that mounts it, as before", async () => {
      const { page } = await fixturePage(browser, body, { theme });
      try {
        await page.waitForFunction(() => document.querySelectorAll(".basalt-code-pre code span[style]").length > 0, null, { timeout: 15000 });
        const spans = await page.evaluate(() => { window.show("// a\\n" + window.small); return document.querySelectorAll(".basalt-code-pre span[style]").length; });
        assert.ok(spans > 20, "coloured at once");
      } finally { await page.close(); }
    });

    test("a block that changes while it waits is coloured for the code it now holds", async () => {
      const { page } = await fixturePage(browser, body, { theme });
      try {
        await page.waitForFunction(() => document.querySelectorAll(".basalt-code-pre code span[style]").length > 0, null, { timeout: 15000 });
        await page.evaluate(() => { window.show(window.big); window.show(window.big.replace("make0", "renamed0")); });
        await page.waitForFunction(() => document.querySelectorAll(".basalt-code-pre span[style]").length > 1000, null, { timeout: 15000 });
        assert.match(await page.locator(".basalt-code-pre").textContent(), /renamed0/);
        assert.doesNotMatch(await page.locator(".basalt-code-pre").textContent(), /make0\(/);
      } finally { await page.close(); }
    });
  });
}

// ---- A1-11, where no effect runs ---------------------------------------------------------------------------------------------------
// A language preloaded for the server colours every block up to the 100,000-character cap in static markup and server output, as it always
// did, and the page that hydrates it keeps those spans from its first frame. Only in a browser's own render is a block over 10,000
// characters coloured after its plain text has painted.
const sampleCode = (n) => {
  let out = "";
  for (let i = 0; out.length < n; i += 1) out += `${i ? "\n" : ""}export function make${i}(value: number): string { return "item" + value; }`;
  return out.slice(0, n);
};
const spans = (html) => (html.match(/<span style="color:/g) ?? []).length;
const blockTree = (code) => `(B, h) => h(B.CodeBlock, { language: "typescript", title: "routes.ts", code: ${JSON.stringify(code)} })`;
const blockHtml = async (code, render) => {
  basalt ??= await import(dist());
  await basalt.preloadCodeLanguages(["typescript"]);
  return render(React.createElement(basalt.CodeBlock, { language: "typescript", code }));
};
const SIZES = [10_000, 10_001, 100_000];

describe("A1-11: a preloaded language still colours static and server output", () => {
  for (const size of SIZES) {
    test(`${size.toLocaleString("en-US")} characters: coloured in renderToStaticMarkup and renderToString, with the text as given`, async () => {
      const code = sampleCode(size);
      for (const render of [renderToStaticMarkup, renderToString]) {
        const html = await blockHtml(code, render);
        assert.ok(spans(html) > size / 5, `${spans(html)} coloured spans at ${size} characters`);
        const text = html.replace(/<[^>]*>/g, "").replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&gt;", ">").replaceAll("&lt;", "<").replaceAll("&amp;", "&");
        assert.ok(text.includes(code.slice(0, 200)) && text.includes(code.slice(-200)), "the text is in the markup");
      }
    });
  }

  test("over the cap (100,001 characters) a block stays plain, as it always did", async () => {
    assert.equal(spans(await blockHtml(sampleCode(100_001), renderToStaticMarkup)), 0);
  });

  for (const size of SIZES) {
    test(`${size.toLocaleString("en-US")} characters: server output, hydrated, ends with the server's spans, never shows plain text, and warns of nothing`, async () => {
      const code = sampleCode(size);
      const { page, errors } = await treePage(blockTree(code), {
        mode: "hydrated",
        boot: `(async () => {
          await B.preloadCodeLanguages(["typescript"]);
          const count = () => host.querySelectorAll("span[style]").length;
          window.serverCount = count();
          window.lowest = window.serverCount;
          new MutationObserver(() => { window.lowest = Math.min(window.lowest, count()); }).observe(host, { subtree: true, childList: true, characterData: true, attributes: true });
          const sample = () => { window.lowest = Math.min(window.lowest, count()); requestAnimationFrame(sample); };
          sample();
          hydrateRoot(host, tree);
          window.booted = true;
        })();`,
      });
      try {
        await page.waitForFunction(() => window.booted === true);
        await nextFrames(page, 30);
        const read = await page.evaluate(() => ({ server: window.serverCount, now: document.querySelectorAll("#root span[style]").length, lowest: window.lowest, text: document.querySelector(".basalt-code-pre").textContent }));
        assert.ok(read.server > size / 5, `the server sent ${read.server} coloured spans`);
        assert.equal(read.now, read.server, "the hydrated page holds the spans the server sent");
        assert.equal(read.lowest, read.server, "no frame and no mutation had fewer coloured spans");
        assert.equal(read.text, code);
        assert.deepEqual(errors, [], "no hydration warning");
      } finally { await page.close(); }
    });
  }

  for (const size of SIZES) {
    test(`${size.toLocaleString("en-US")} characters: a browser's own render, with the language preloaded, ends with the same spans (plain first above 10,000)`, async () => {
      const code = sampleCode(size);
      const expected = spans(await blockHtml(code, renderToStaticMarkup));
      const { page, errors } = await treePage(blockTree(code), {
        mode: "client",
        boot: `(async () => {
          await B.preloadCodeLanguages(["typescript"]);
          const root = createRoot(host);
          flushSync(() => root.render(tree));
          window.firstCommit = host.querySelectorAll("span[style]").length;
          window.booted = true;
        })();`,
      });
      try {
        await page.waitForFunction(() => window.booted === true);
        const first = await page.evaluate(() => window.firstCommit);
        if (size > 10_000) assert.equal(first, 0, "plain text in the commit that mounted it");
        else assert.equal(first, expected, "coloured in the commit that mounted it");
        await page.waitForFunction((n) => document.querySelectorAll("#root span[style]").length === n, expected, { timeout: 20_000 });
        assert.equal(await page.locator(".basalt-code-pre").textContent(), code);
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });
  }
});
