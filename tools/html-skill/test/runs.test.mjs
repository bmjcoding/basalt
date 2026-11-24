// The skill's runs module and the terminal's stage additions (DECISIONS 316, 1.12): the module only when a page uses it; the art's .stage and a
// .run-stages list on one page, neither's rules reaching the other; a declared stage replay that is never a log; the budget; each mark, the list,
// the rail and the stage lines against React's computed styles at 1440 and 390 in both themes; the hold; forced colours.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { fixturePage, launch as launchReact, settle } from "../../../packages/react/test/support.mjs";
import { launch, openHtml, skillDir } from "./support.mjs";

let browser;
let reactBrowser;
before(async () => { browser = await launch(); reactBrowser = await launchReact(); });
after(async () => { await browser?.close(); await reactBrowser?.close(); });

const page = (body) => compose(`<title>Runs</title>${body}`, { fonts: false }).html;
const BASE = "*, ::before, ::after { box-sizing: border-box; } body { margin: 0; background: var(--basalt-surface-page); color: var(--basalt-text-primary); font: 400 14px / 20px var(--basalt-font-family-sans); }";
const reactPage = async (body, options) => { const r = await fixturePage(reactBrowser, body, { standards: true, ...options }); await r.page.addStyleTag({ content: BASE }); await settle(r.page); return r.page; };

const STATES = ["queued", "running", "success", "failed", "skipped", "canceled", "retrying"];
const WORDS = { queued: "Queued", running: "Running", success: "Passed", failed: "Failed", skipped: "Skipped", canceled: "Canceled", retrying: "Retrying" };

// The row exactly as the usage file writes it: the word beside the name. The fixtures take the page's width up to 640, so 390 is a phone's list.
const SKILL_LIST = `<div style="max-width: 640px; padding: 24px"><ol class="run-stages" aria-label="Stages">${STATES.map((s) => `<li class="run-stage" data-state="${s}"><span class="run-mark" data-state="${s}" aria-hidden="true"></span><span class="run-stage-name">Stage ${s}</span><span class="run-stage-word">${WORDS[s]}</span><span class="run-stage-meta">fact</span><span class="run-stage-time">1.2 s</span></li>`).join("")}</ol></div>`;
const REACT_LIST = `createRoot(document.getElementById("root")).render(<div style={{ maxWidth: 640, padding: 24 }}><B.StageList label="Stages" reserveDetail={false}>{${JSON.stringify(STATES)}.map((s) => <B.RunStage key={s} name={"Stage " + s} state={s} meta="fact" start={0} end={1200} />)}</B.StageList></div>);`;

const SKILL_RAIL = `<div style="width: 640px; padding: 24px"><ol class="run-rail" aria-label="Release">${["success", "failed", "retrying", "queued"].map((s, i) => `<li class="run-stage" data-state="${s}"><span class="run-mark" data-state="${s}" aria-hidden="true"></span><span class="run-stage-name">Node ${i}</span><span class="run-stage-word">${WORDS[s]}</span><span class="run-stage-time">2.1 s</span></li>`).join("")}</ol></div>`;

const STAGE_LINES = `<figure class="code terminal" data-stages data-replay data-interval="200"><figcaption>Deploy</figcaption><pre class="code-body" tabindex="0"><code>
<span data-kind="command">basalt deploy --prod</span>
<span data-kind="stage" data-state="done" data-time="0.7 s">Cloned main@4f2a1c0</span>
<span data-kind="stage" data-state="skipped">cache restore (no cache)</span>
<span data-kind="stage" data-state="failed" data-time="2.3 s">Build failed</span>
<span data-kind="stage" data-state="canceled">upload artifacts</span>
<span data-kind="stage" data-state="running">Promoting to production</span></code></pre></figure>`;

describe("the module", () => {
  test("comes in only when a page uses it, with its budget held", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(skillDir, "..", "..", "..", "tools", "html-skill", "src", "modules.json"), "utf8"));
    assert.ok(!compose("<title>x</title><p>A deploy ran in stages.</p>", { fonts: false }).modules.includes("runs"));
    assert.ok(compose(`<title>x</title>${SKILL_LIST}`, { fonts: false }).modules.includes("runs"));
    assert.ok(compose('<title>x</title><span class="run-mark" data-state="queued"></span>', { fonts: false }).modules.includes("runs"));
    const parts = path.join(skillDir, "parts");
    const bytes = fs.statSync(path.join(parts, "runs.css")).size + fs.statSync(path.join(parts, "runs.js")).size;
    assert.ok(bytes <= manifest.modules.runs.budget, `runs is ${bytes} bytes against its budget of ${manifest.modules.runs.budget}`);
  });

  test("a page with the art's .stage and a .run-stages list gets both modules, and a row takes none of the art's rules", async () => {
    const body = `<section class="stage"><div class="stage-content">${SKILL_LIST}</div></section>${SKILL_LIST.replace("<div ", '<div id="alone" ')}`;
    const { modules } = compose(`<title>x</title>${body}`, { fonts: false });
    assert.ok(modules.includes("runs") && modules.includes("stage"), modules.join(", "));
    const { page: p, context } = await openHtml(browser, page(body), { scheme: "dark" });
    const r = await p.evaluate(() => {
      const inArt = getComputedStyle(document.querySelector(".stage .run-stage"));
      const alone = getComputedStyle(document.querySelector("#alone .run-stage"));
      const list = getComputedStyle(document.querySelector("#alone .run-stages"));
      return { same: ["marginTop", "paddingTop", "paddingBottom", "backgroundColor", "backgroundImage"].every((k) => inArt[k] === alone[k]), marginTop: list.marginTop, paddingTop: list.paddingTop, bg: list.backgroundImage };
    });
    assert.ok(r.same);
    assert.deepEqual([r.marginTop, r.paddingTop, r.bg], ["0px", "0px", "none"], "no pull-up, no headroom, no field");
    await context.close();
  });
});

describe("against React", () => {
  for (const scheme of ["dark", "light"]) {
    for (const width of [1440, 390]) {
      test(`the list's rows, marks, words and connector match React's (${scheme}, ${width})`, async () => {
        const { page: s, context } = await openHtml(browser, page(SKILL_LIST), { scheme, width });
        const r = await reactPage(REACT_LIST, { theme: scheme, viewport: { width, height: 900 } });
        const read = (p, row, mark, word) => p.evaluate(({ row, mark, word }) => [...document.querySelectorAll(row)].map((li) => {
          const m = li.querySelector(mark);
          const w = li.querySelector(word);
          const after = getComputedStyle(li, "::after");
          const name = li.querySelector(".basalt-run-stage-label, .run-stage-name").getBoundingClientRect();
          return { gap: w && w.getBoundingClientRect().width > 1 ? Math.round(w.getBoundingClientRect().left - name.right) : null, h: li.getBoundingClientRect().height, markW: m.getBoundingClientRect().width, markColor: getComputedStyle(m.querySelector(".basalt-run-mark-face") ?? m).color, word: w ? [getComputedStyle(w).color, getComputedStyle(w).fontWeight, w.getBoundingClientRect().width > 1] : null, connector: [after.content === "none" ? "none" : "line", after.borderInlineStartColor, after.top, after.bottom, after.left] };
        }), { row, mark, word });
        const react = await read(r, ".basalt-run-stages > .basalt-run-stage", ".basalt-run-mark", ".basalt-run-stage-line .basalt-run-stage-word, .basalt-visually-hidden");
        const skill = await read(s, ".run-stages > .run-stage", ".run-mark", ".run-stage-word");
        for (let i = 0; i < STATES.length; i += 1) {
          assert.equal(skill[i].h, react[i].h, `${STATES[i]}: row height`);
          if (STATES[i] !== "success") assert.equal(skill[i].gap, react[i].gap, `${STATES[i]}: the word's gap after the name`);
          assert.equal(skill[i].markW, react[i].markW, `${STATES[i]}: mark seat`);
          assert.equal(skill[i].markColor, react[i].markColor, `${STATES[i]}: mark ink`);
          assert.deepEqual(skill[i].connector, react[i].connector, `${STATES[i]}: connector`);
          if (STATES[i] !== "success") assert.deepEqual(skill[i].word, react[i].word, `${STATES[i]}: word`);
          else assert.equal(skill[i].word[2], false, "a passed stage's word is said, not drawn");
        }
        await context.close();
        await r.close();
      });
    }
  }

  test("the rail's status seat: the time, or the word in its ink and weight", async () => {
    const { page: s, context } = await openHtml(browser, page(SKILL_RAIL), { scheme: "dark" });
    const r = await s.evaluate(() => [...document.querySelectorAll(".run-rail > .run-stage")].map((li) => { const w = li.querySelector(".run-stage-word"); const t = li.querySelector(".run-stage-time"); return [li.dataset.state, w.getBoundingClientRect().width > 1 ? getComputedStyle(w).fontWeight : null, getComputedStyle(t).visibility]; }));
    assert.deepEqual(r, [["success", null, "visible"], ["failed", "500", "hidden"], ["retrying", "400", "hidden"], ["queued", null, "visible"]]);
    const fill = await s.evaluate(() => getComputedStyle(document.querySelector(".run-rail > .run-stage[data-state=success]"), "::after").transform);
    assert.equal(fill, "matrix(1, 0, 0, 1, 0, 0)", "a passed stage's link is full");
    await context.close();
  });
});

describe("stage lines", () => {
  test("a declared stage replay is never a log, and each line's mark, word and time are drawn", async () => {
    const { page: s, context } = await openHtml(browser, page(STAGE_LINES), { scheme: "dark" });
    const pre = s.locator(".terminal pre");
    await s.getByRole("button", { name: /Play/ }).click();
    for (let i = 0; i < 10; i += 1) {
      assert.notEqual(await pre.getAttribute("role"), "log");
      await s.waitForTimeout(80);
    }
    await s.waitForFunction(() => document.querySelectorAll(".terminal-line").length === 6);
    const lines = await s.evaluate(() => [...document.querySelectorAll(".terminal-line[data-kind=stage]")].map((l) => [l.dataset.state, l.querySelector("[role=img]")?.getAttribute("aria-label") ?? null, l.querySelector(".terminal-word")?.textContent ?? null, l.querySelector(".terminal-duration")?.textContent ?? null]));
    assert.deepEqual(lines, [["done", "Done", null, "0.7 s"], ["skipped", null, "Skipped ", null], ["failed", "Failed", null, "2.3 s"], ["canceled", null, "Canceled ", null], ["running", "Running", null, null]]);
    assert.equal(await s.evaluate(() => getComputedStyle(document.querySelector(".terminal pre")).scrollbarWidth), "none", "no scrollbar on a replay's window");
    await context.close();
  });

  test("the stage lines match React's inks", async () => {
    const { page: s, context } = await openHtml(browser, page(STAGE_LINES.replace(" data-replay", "")), { scheme: "light" });
    const r = await reactPage(`createRoot(document.getElementById("root")).render(<B.Terminal title="Deploy" stages lines={[{ kind: "command", text: "basalt deploy --prod" }, { kind: "stage", state: "done", text: "Cloned main@4f2a1c0", start: 0, end: 700 }, { kind: "stage", state: "skipped", text: "cache restore (no cache)" }, { kind: "stage", state: "failed", text: "Build failed", start: 0, end: 2300 }, { kind: "stage", state: "canceled", text: "upload artifacts" }]} />);`, { theme: "light", viewport: { width: 1024, height: 700 } });
    const read = (p, line, text, mark) => p.evaluate(({ line, text, mark }) => [...document.querySelectorAll(line)].map((l) => [l.dataset.state, getComputedStyle(l.querySelector(text)).color, getComputedStyle(l.querySelector(mark)).color]), { line, text, mark });
    const react = await read(r, ".basalt-code-line[data-kind=stage]", ".basalt-code-text", ".basalt-terminal-mark");
    const skill = await read(s, ".terminal-line[data-kind=stage]:not([data-state=running])", ".terminal-text", ".terminal-mark");
    assert.deepEqual(skill, react);
    await context.close();
    await r.close();
  });
});

describe("modes", () => {
  test("the hold stops the ring and the queued breath; forced colours leave the queued mark still and the marks in currentColor", async () => {
    const { page: s, context } = await openHtml(browser, page(SKILL_LIST), { scheme: "dark" });
    const running = () => s.evaluate(() => document.getAnimations().filter((a) => a.effect?.target?.closest?.(".run-mark") && a.playState === "running").length);
    assert.ok((await running()) >= 3);
    await s.evaluate(() => document.documentElement.setAttribute("data-loops", "held"));
    await s.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    assert.equal(await running(), 0);
    await s.emulateMedia({ forcedColors: "active" });
    await s.evaluate(() => document.documentElement.removeAttribute("data-loops"));
    const queued = await s.evaluate(() => getComputedStyle(document.querySelector(".run-mark[data-state=queued]")).animationName);
    assert.equal(queued, "none");
    await context.close();
  });
});

// ---- The council's code review (Astra 8, 9, 10) and pixel review (Fable 5, 14) of e5893f80

describe("the review's findings", () => {
  test("the rail takes the usage's own row (the word beside the name) and draws the word in the status seat; five nodes are rows under 480px", async () => {
    const row = (s, i) => `<li class="run-stage" data-state="${s}"><span class="run-mark" data-state="${s}" aria-hidden="true"></span><span class="run-stage-name">Node ${i}</span><span class="run-stage-word">${WORDS[s]}</span><span class="run-stage-meta">fact</span><span class="run-stage-time">2.1 s</span></li>`;
    const four = `<ol class="run-rail" aria-label="Four">${["success", "failed", "retrying", "queued"].map(row).join("")}</ol>`;
    const five = `<ol class="run-rail" aria-label="Five">${["success", "success", "running", "queued", "queued"].map(row).join("")}</ol>`;
    for (const width of [1440, 390]) {
      const { page: s, context } = await openHtml(browser, page(`<div style="padding: 24px">${four}<div style="height: 24px"></div>${five}</div>`), { scheme: "dark", width });
      const r = await s.evaluate(() => {
        const [a, b] = document.querySelectorAll(".run-rail");
        const failed = a.children[1];
        const word = failed.querySelector(".run-stage-word").getBoundingClientRect();
        const name = failed.querySelector(".run-stage-name").getBoundingClientRect();
        const time = a.children[0].querySelector(".run-stage-time").getBoundingClientRect();
        return { wordUnderName: word.top >= name.bottom, wordWithTime: Math.abs(word.top - time.top) < 1, fiveTops: [...b.children].map((li) => Math.round(li.getBoundingClientRect().top)) };
      });
      assert.ok(r.wordUnderName && r.wordWithTime, `${width}: the word stands in the time's seat (${JSON.stringify(r)})`);
      const rows = r.fiveTops.every((t, i) => i === 0 || t > r.fiveTops[i - 1]);
      assert.equal(rows, width === 390, `${width}: five nodes ${width === 390 ? "are rows" : "are one line"} (${r.fiveTops})`);
      await context.close();
    }
  });

  test("every stage line is 20px, a done or skipped line's core glyph included, and code in a row is plain Geist Mono at the row's size", async () => {
    const body = `${STAGE_LINES.replace(" data-replay", "")}<ol class="run-steps" aria-label="Steps"><li class="run-step" data-state="success"><span class="run-mark" data-state="success" aria-hidden="true"></span><span class="run-step-sentence">Read <code>deploy.yaml</code></span><span class="run-step-meta">84 lines · <span class="run-step-time">0.7 s</span></span></li></ol>`;
    const { page: s, context } = await openHtml(browser, page(body), { scheme: "dark" });
    const r = await s.evaluate(() => ({
      lines: [...document.querySelectorAll(".terminal-line")].map((l) => l.getBoundingClientRect().height),
      code: (() => { const c = getComputedStyle(document.querySelector(".run-step code")); return [c.backgroundColor, c.paddingLeft, c.fontSize, c.fontFamily.includes("Mono")]; })(),
      time: getComputedStyle(document.querySelector(".run-step-time")).fontFamily.includes("Mono"),
    }));
    assert.ok(r.lines.every((h) => h === 20), r.lines.join(", "));
    assert.deepEqual(r.code, ["rgba(0, 0, 0, 0)", "0px", "13px", true]);
    assert.ok(r.time, "a step's time is in Geist Mono");
    await context.close();
  });

  test("a runs-only page takes the reader's stored hold before its first frame", async () => {
    const html = page(SKILL_LIST);
    assert.ok(compose(`<title>x</title>${SKILL_LIST}`, { fonts: false }).modules.includes("loops"));
    const context = await browser.newContext();
    await context.addInitScript(() => { try { localStorage.setItem("basalt-loops", "held"); } catch { /* none */ } });
    await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: html }));
    const p = await context.newPage();
    await p.goto("https://basalt.test/");
    const r = await p.evaluate(() => ({ attr: document.documentElement.getAttribute("data-loops"), running: document.getAnimations().filter((a) => a.effect?.target?.closest?.(".run-mark") && a.playState === "running").length }));
    assert.deepEqual(r, { attr: "held", running: 0 });
    await context.close();
  });

  test("a declared replay ending on a failed stage finishes Failed, and a drawn word hides the mark from assistive technology", async () => {
    const body = `<figure class="code terminal" data-stages data-replay data-interval="40"><figcaption>Deploy</figcaption><pre class="code-body" tabindex="0"><code>
<span data-kind="command">basalt deploy</span>
<span data-kind="stage" data-state="failed" data-word="Failed" data-time="0.9 s">Tests</span></code></pre></figure>`;
    const { page: s, context } = await openHtml(browser, page(body), { scheme: "dark" });
    await s.getByRole("button", { name: /Play/ }).click();
    await s.waitForFunction(() => document.querySelector(".terminal-state")?.getAttribute("data-state") === "failed", null, { timeout: 4000 });
    const tree = await s.locator(".terminal pre").ariaSnapshot();
    assert.equal((tree.match(/Failed/g) ?? []).length, 1, tree);
    await context.close();
  });
});
