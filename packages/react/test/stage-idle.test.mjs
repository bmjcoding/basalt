// The idle state, "Not started" (cimip-gaps-3 T1): a stage the sequence has not reached. Its mark is Phosphor Bold CircleDashed in tertiary and never
// animates; its word is drawn in a list and a full step, said and not drawn on a rail, and it never rolls into a timeline's tail. Every
// Record<StageState, …> in the package has the eighth key. Chromium, built package, real stylesheet; the source checks are Node only.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { fixturePage, launch, pkg, settle } from "./support.mjs";

const { STAGE_WORDS } = await import(pathToFileURL(path.join(pkg, "dist", "run-format.js")).href);

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] }, resultTypes: ["violations"] });
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
};

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

describe("the eighth state, in the source", () => {
  test("STAGE_WORDS.idle is \"Not started\", and every Record<StageState, …> in the package has eight keys", () => {
    assert.equal(STAGE_WORDS.idle, "Not started");
    assert.equal(Object.keys(STAGE_WORDS).length, 8);
    const states = ["idle", "queued", "running", "success", "failed", "skipped", "canceled", "retrying"];
    const src = path.join(pkg, "src");
    let found = 0;
    for (const file of fs.readdirSync(src).filter((f) => /\.tsx?$/.test(f))) {
      const text = fs.readFileSync(path.join(src, file), "utf8");
      // A Record<StageState, …> literal, or a nested one inside Record<…, Record<StageState, …>>: each `{ … }` that names a state as a key.
      for (const m of text.matchAll(/Record<(?:"list" \| "rail", Record<)?StageState, [^>]+>{1,2}\s*=\s*\{([\s\S]*?)\};/g)) {
        for (const object of m[1].match(/\{[^{}]*\}/g) ?? [`{${m[1]}}`]) {
          const keys = [...object.matchAll(/(\w+):/g)].map((k) => k[1]).filter((k) => states.includes(k));
          if (!keys.length) continue;
          found += 1;
          assert.deepEqual([...keys].sort(), [...states].sort(), `${file}: ${object.slice(0, 80)}`);
        }
      }
    }
    assert.ok(found >= 6, `the records were found (${found})`);
  });
});

const IDLE = `
function App() {
  return <main style={{ padding: 24, display: "grid", gap: 24, width: 640, fontSize: 13 }}>
    <h1 style={{ margin: 0, fontSize: 18 }}>Runs not yet reached</h1>
    <B.StageList label="Build stages">
      <B.RunStage name="Fetch" state="success" start={0} end={1_400} />
      <B.RunStage name="Compile" state="running" start={Date.now() - 4_000} />
      <B.RunStage name="Package" state="idle" />
      <B.RunStage name="Ship" state="idle" />
    </B.StageList>
    <B.StageRail label="Kitchen stages">
      <B.RunStage name="Prep" state="success" start={0} end={60_000} />
      <B.RunStage name="Cook" state="queued" />
      <B.RunStage name="Plate" state="idle" />
    </B.StageRail>
    <B.RunTimeline label="Survey steps" keep={1}>
      <B.RunStep state="success" start={0} end={1_000}>Read the brief</B.RunStep>
      <B.RunStep state="idle">Count the birds</B.RunStep>
      <B.RunStep state="success" start={0} end={1_000}>Write it up</B.RunStep>
    </B.RunTimeline>
    <span id="badge"><B.StageBadge state="idle" states={["idle", "queued", "success"]} /></span>
  </main>;
}
createRoot(document.getElementById("root")).render(<App />);`;

const tokenColor = (page, name) => page.evaluate((n) => { const p = document.createElement("span"); p.style.color = `var(${n})`; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; }, name);

describe("idle in each part", () => {
  for (const theme of ["dark", "light"]) {
    for (const [mode, options] of [["full motion", {}], ["reduced motion", { reducedMotion: "reduce" }], ["more contrast", { contrast: "more" }], ["forced colours", { forcedColors: "active" }]]) {
      test(`${theme}, ${mode}: the glyph, the ink, the word drawn or said, nothing animating, never rolled`, async () => {
        const { page, errors } = await fixturePage(browser, IDLE, { viewport: { width: 800, height: 900 }, theme, ...options });
        await settle(page);
        const r = await page.evaluate(() => {
          const listRow = document.querySelector(".basalt-run-stages .basalt-run-stage[data-state=idle]");
          const railNode = document.querySelector(".basalt-run-rail .basalt-run-stage[data-state=idle]");
          const step = document.querySelector(".basalt-run-step[data-state=idle]");
          const visible = (el) => el && getComputedStyle(el).position !== "absolute" && el.getBoundingClientRect().width > 1;
          return {
            listWord: listRow.querySelector(".basalt-run-stage-word")?.textContent ?? null,
            listWordColor: getComputedStyle(listRow.querySelector(".basalt-run-stage-word")).color,
            listName: getComputedStyle(listRow.querySelector(".basalt-run-stage-label")).color,
            railWordDrawn: [...railNode.querySelectorAll(".basalt-run-stage-status .basalt-run-stage-word")].some((w) => w.closest("[data-on]") && visible(w)),
            railSaid: railNode.querySelector(".basalt-run-stage-name .basalt-visually-hidden")?.textContent.trim() ?? null,
            railLinkFilled: railNode.previousElementSibling.querySelector(".basalt-run-stage-link").hasAttribute("data-filled"),
            stepWord: step.querySelector(".basalt-run-step-word")?.textContent ?? null,
            stepWordWeight: getComputedStyle(step.querySelector(".basalt-run-step-word")).fontWeight,
            stepSentence: getComputedStyle(step.querySelector(".basalt-run-step-sentence")).color,
            stepTail: step.hasAttribute("data-tail"),
            markColor: getComputedStyle(document.querySelector(".basalt-run-mark-face[data-state=idle]")).color,
            running: [...document.querySelectorAll(".basalt-run-mark[data-state=idle]")].reduce((n, m) => n + m.getAnimations({ subtree: true }).length, 0),
            badge: [document.querySelector("#badge .basalt-run-badge-face .basalt-badge").dataset.status, document.querySelector("#badge .basalt-run-badge-face .basalt-badge").textContent],
          };
        });
        assert.equal(r.listWord, "Not started", "a list draws the word");
        assert.equal(r.railWordDrawn, false, "a rail does not draw it");
        assert.equal(r.railSaid, "Not started", "a rail says it after the name");
        assert.equal(r.railLinkFilled, false, "the link before it is empty");
        assert.equal(r.stepWord, "Not started", "a full step draws it");
        assert.equal(r.stepWordWeight, "400");
        assert.equal(r.stepTail, false, "an idle step never rolls, and nothing after it does");
        assert.equal(r.running, 0, "the idle mark never animates");
        assert.deepEqual(r.badge, ["neutral", "Not started"], "the badge: the neutral dot, the word always drawn");
        if (!options.forcedColors) {
          const tertiary = await tokenColor(page, "--basalt-text-tertiary");
          const secondary = await tokenColor(page, "--basalt-text-secondary");
          assert.equal(r.markColor, tertiary, "the mark in tertiary (secondary under more contrast, by the alias)");
          assert.equal(r.listWordColor, tertiary);
          assert.equal(r.listName, secondary);
          assert.equal(r.stepSentence, secondary, "not the current step: the sentence stays secondary");
        }
        assert.deepEqual(errors, []);
        await page.close();
      });
    }
  }

  test("axe finds nothing in the idle parts, in both themes", async () => {
    for (const theme of ["dark", "light"]) {
      const { page } = await fixturePage(browser, IDLE, { viewport: { width: 800, height: 900 }, theme });
      await settle(page);
      assert.deepEqual(await axe(page), [], theme);
      await page.close();
    }
  });
});
