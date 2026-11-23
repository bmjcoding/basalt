// RunTimeline and RunStep (DECISIONS 316, 1.3 and 1.8): keep's default and false; the words drawn and said in a full step and a tail row; the tail;
// each depth's ink against the tokens on levels 1 to 3 in both themes; hover and focus; open as the full form; the toggle, its line and its target;
// what a roll may move; a tall arrival; the follow rule by wheel and keys and the hold for a control; only rows in the window animated; the 48 limit;
// one edge for the meta; the end, mounted finished; the modes; no scrollbar with classic scrollbars. Chromium, built package, real stylesheet.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { chromium } from "playwright";

import { fixturePage, freezeAnimations, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
let classic;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); await classic?.close(); });

// The app's steps, as data: the page renders them and exposes `set` (replace) and `add` (append), `open`.
const APP = ({ width = 760, props = "", level = 1, below = true } = {}) => `
import { FlagIcon } from "@phosphor-icons/react/dist/csr/Flag";
const T0 = Date.now() - 20000;
const step = (s) => <B.RunStep key={s.id} state={s.state} mark={s.state ? undefined : FlagIcon} word={s.word} meta={s.meta} start={s.state && !s.noTime ? (s.start ?? T0) : undefined} end={s.state && !s.noTime && s.state !== "running" && s.state !== "queued" && s.state !== "retrying" ? T0 + (s.ms ?? 1500) : undefined}
  detail={s.detail ? <code>{s.detail}</code> : undefined} action={s.action ? <B.Button size="sm" variant="primary" onClick={() => new Promise((r) => { window.approve = r; })}>Approve</B.Button> : undefined}>{s.text}{s.tall ? <><br />{s.tall}</> : null}</B.RunStep>;
function Nest({ level, children }) { return level <= 1 ? <B.Card style={{ padding: 16 }}>{children}</B.Card> : <B.Card style={{ padding: 16 }}><Nest level={level - 1}>{children}</Nest></B.Card>; }
function App() {
  const [steps, setSteps] = React.useState(window.INITIAL ?? []);
  React.useEffect(() => { window.set = setSteps; window.add = (s) => setSteps((all) => [...all, s]); window.patch = (id, p) => setSteps((all) => all.map((x) => (x.id === id ? { ...x, ...p } : x))); }, []);
  return <div style={{ padding: 24, width: ${width}, boxSizing: "border-box" }}>
    <Nest level={${level}}><B.RunTimeline label="Agent steps" ${props}>{steps.map(step)}</B.RunTimeline></Nest>
    ${below ? '<p id="after">After the timeline</p>' : ""}
  </div>;
}
createRoot(document.getElementById("root")).render(<App />);`;

const done = (i, extra = {}) => ({ id: `s${i}`, state: "success", text: `Read file ${i}`, meta: `${i} lines`, ...extra });
const open = async (body, { initial, width = 1024, height = 900, b = browser, ...options } = {}) => {
  const { page, errors } = await fixturePage(b, (initial ? `window.INITIAL = ${JSON.stringify(initial)};\n` : "") + body, { theme: "dark", standards: true, viewport: { width, height }, ...options });
  await settle(page);
  page.errors = errors;
  return page;
};
const rows = (page) => page.evaluate(() => [...document.querySelectorAll(".basalt-run-step")].map((li) => ({ tail: li.hasAttribute("data-tail"), depth: li.dataset.depth ?? null, state: li.dataset.state ?? null, word: li.querySelector(".basalt-run-step-word")?.textContent ?? null, hidden: li.querySelector(".basalt-run-step-sentence > .basalt-visually-hidden")?.textContent ?? null })));
const frames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

describe("keep", () => {
  test("left out it is 3: the oldest finished steps past the newest three roll", async () => {
    const page = await open(APP(), { initial: [1, 2, 3, 4, 5].map((i) => done(i)) });
    assert.deepEqual((await rows(page)).map((r) => r.tail), [true, true, false, false, false]);
    assert.equal(await page.getByRole("button", { name: "Show 2 earlier steps" }).count(), 1);
  });

  test("keep={false} is the whole record: no window, no floor, no toggle", async () => {
    const page = await open(APP({ props: "keep={false}" }), { initial: [1, 2, 3, 4, 5].map((i) => done(i)) });
    assert.deepEqual((await rows(page)).map((r) => r.tail), [false, false, false, false, false]);
    assert.equal(await page.locator(".basalt-run-steps-window, .basalt-run-steps-toggle-line").count(), 0);
  });
});

describe("words and the tail", () => {
  test("a full step draws queued, failed, skipped, canceled and retrying, and says running and passed; a tail row draws failed, skipped and canceled", async () => {
    const STATES = ["success", "failed", "skipped", "canceled", "success", "queued", "running", "retrying"];
    const initial = STATES.map((state, i) => ({ id: `s${i}`, state, text: `Step ${i}`, meta: "r" }));
    const page = await open(APP({ props: "keep={false}" }), { initial });
    const full = await rows(page);
    assert.deepEqual(full.map((r) => [r.state, r.word, r.hidden]), [
      ["success", null, "Passed: "], ["failed", "Failed", null], ["skipped", "Skipped", null], ["canceled", "Canceled", null],
      ["success", null, "Passed: "], ["queued", "Queued", null], ["running", null, "Running: "], ["retrying", "Retrying", null],
    ]);
    const page2 = await open(APP({ props: "keep={1}" }), { initial: initial.slice(0, 5) });
    const tail = (await rows(page2)).filter((r) => r.tail);
    assert.deepEqual(tail.map((r) => [r.state, r.word, r.hidden]), [["success", null, "Passed: "], ["failed", "Failed", null], ["skipped", "Skipped", null], ["canceled", "Canceled", null]]);
  });

  test("the tail is the oldest finished steps, unbroken, and stops at one unfinished", async () => {
    const initial = [done(1), done(2), { id: "w", state: "queued", word: "Waiting for approval", text: "Roll back" }, done(3), done(4), done(5), done(6)];
    const page = await open(APP(), { initial });
    assert.deepEqual((await rows(page)).map((r) => r.tail), [true, true, false, false, false, false, false]);
  });

  test("everything a tail row says stays in the accessibility tree; only its detail is hidden", async () => {
    const initial = [{ ...done(1), detail: "kubectl rollout undo" }, done(2), done(3), done(4)];
    const page = await open(APP(), { initial });
    const tree = await page.locator(".basalt-run-steps").ariaSnapshot();
    assert.match(tree, /Passed: Read file 1/);
    assert.match(tree, /1 lines/);
    assert.match(tree, /\d+\.\d s/);
    assert.ok(!tree.includes("kubectl"), "the tail's detail is hidden");
    assert.equal(await page.locator(".basalt-run-step[data-tail] .basalt-run-step-detail[hidden]").count(), 1);
  });
});

describe("the tail's ink", () => {
  const initial = [{ ...done(1), state: "failed", text: "Searched logs" }, done(2), { ...done(3), state: "failed", text: "Queried" }, done(4), { ...done(5), state: "failed" }, done(6), done(7), done(8)];
  for (const theme of ["dark", "light"]) {
    for (const level of [1, 2, 3]) {
      test(`each depth's computed ink matches its token, neutral and failed (${theme}, level ${level})`, async () => {
        const page = await open(APP({ level }), { initial, theme });
        const r = await page.evaluate(() => {
          const probe = (css) => { const p = document.createElement("span"); p.style.cssText = css; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; };
          const tokens = { tertiary: probe("color: var(--basalt-text-tertiary)"), secondary: probe("color: var(--basalt-text-secondary)"), danger: probe("color: var(--basalt-status-danger)"), danger88: probe("color: color-mix(in srgb, var(--basalt-status-danger) 88%, transparent)") };
          const opacity = (name) => Number(getComputedStyle(document.documentElement).getPropertyValue(name));
          return {
            tokens, steps: [2, 3, 4, 5].map((n) => opacity(`--basalt-opacity-recede-${n}`)),
            rows: [...document.querySelectorAll(".basalt-run-step[data-tail]")].map((li) => { const line = li.querySelector(".basalt-run-step-line"); return { depth: li.dataset.depth, failed: li.dataset.state === "failed", color: getComputedStyle(li.querySelector(".basalt-run-step-sentence")).color, word: li.querySelector(".basalt-run-step-word") ? getComputedStyle(li.querySelector(".basalt-run-step-word")).color : null, opacity: Number(getComputedStyle(line).opacity) }; }),
          };
        });
        assert.equal(r.rows.length, 5);
        for (const row of r.rows) {
          const d = Number(row.depth);
          if (d === 1) {
            assert.equal(row.color, r.tokens.tertiary, "depth 1: tertiary, whole");
            assert.equal(row.opacity, 1);
            if (row.failed) assert.equal(row.word, r.tokens.danger88, "a failed first step: danger at 0.88");
          } else {
            assert.equal(row.color, r.tokens.secondary, `depth ${d}: secondary`);
            assert.equal(row.opacity, r.steps[Math.min(d, 5) - 2], `depth ${d}: opacity-recede-${d}`);
            if (row.failed) assert.equal(row.word, r.tokens.danger, `depth ${d}: danger, at the step's opacity`);
          }
        }
      });
    }
  }

  test("hover and focus lift every tail row to the first step", async () => {
    const page = await open(APP(), { initial });
    const opacities = () => page.evaluate(() => [...document.querySelectorAll(".basalt-run-step[data-tail] .basalt-run-step-line")].map((l) => Number(getComputedStyle(l).opacity)));
    assert.ok((await opacities()).some((o) => o < 1));
    await page.locator(".basalt-run-steps-window").hover();
    await settle(page);
    assert.ok((await opacities()).every((o) => o === 1), "hover");
    await page.mouse.move(0, 0);
    await page.locator(".basalt-run-steps-window").focus();
    await settle(page);
    assert.ok((await opacities()).every((o) => o === 1), "focus");
  });
});

describe("open and the toggle", () => {
  const initial = [{ ...done(1), detail: "kubectl rollout undo" }, { ...done(2), state: "failed" }, done(3), done(4), done(5), done(6), done(7), done(8)];
  test("the toggle's words, its count and the failure, aria-expanded; open is the full form and the tree is the same but for the detail", async () => {
    const page = await open(APP(), { initial });
    const toggle = page.getByRole("button", { name: "Show 5 earlier steps, 1 failed" });
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    const closed = await page.locator(".basalt-run-steps").ariaSnapshot();
    await toggle.click();
    await settle(page);
    const hide = page.getByRole("button", { name: "Hide earlier steps" });
    assert.equal(await hide.getAttribute("aria-expanded"), "true");
    assert.ok(await hide.evaluate((el) => el === document.activeElement), "focus stays on the toggle");
    const r = await page.evaluate(() => [...document.querySelectorAll(".basalt-run-step")].map((li) => ({ tail: li.hasAttribute("data-tail"), size: getComputedStyle(li.querySelector(".basalt-run-step-line")).fontSize, opacity: getComputedStyle(li.querySelector(".basalt-run-step-line")).opacity, connector: getComputedStyle(li, "::after").content })));
    assert.ok(r.every((x) => !x.tail && x.size === r.at(-1).size && x.opacity === "1"), "every step a full row");
    assert.ok(r.slice(0, -1).every((x) => x.connector !== "none"), "with its connector");
    const opened = await page.locator(".basalt-run-steps").ariaSnapshot();
    assert.equal(opened.replace(/\n.*kubectl rollout undo.*/, ""), closed, "the same tree, but for the detail");
    assert.ok(opened.includes("kubectl rollout undo"));
    const win = await page.evaluate(() => { const w = document.querySelector(".basalt-run-steps-window"); return w.scrollHeight - w.clientHeight; });
    assert.equal(win, 0, "no window");
  });

  test("the toggle's line is held from the first frame: the first roll moves nothing below it", async () => {
    const page = await open(APP(), { initial: [done(1), done(2), done(3)] });
    const line = await page.evaluate(() => document.querySelector(".basalt-run-steps-toggle-line").getBoundingClientRect().height);
    assert.equal(line, 28);
    const at = () => page.evaluate(() => [document.querySelector(".basalt-run-steps-window").getBoundingClientRect().top, document.querySelector("#after").getBoundingClientRect().top]);
    const before = await at();
    await page.evaluate(() => window.add({ id: "s4", state: "success", text: "Read file 4", meta: "4 lines" }));
    await settle(page);
    assert.equal(await page.getByRole("button", { name: "Show 1 earlier step" }).count(), 1);
    assert.deepEqual(await at(), before);
  });

  for (const state of ["closed", "open"]) {
    test(`on touch the toggle's target is 44px by hit test, stacked above the window (${state})`, async () => {
      const page = await open(APP({ width: 390 }), { initial, width: 390, hasTouch: true, isMobile: true });
      if (state === "open") { await page.locator(".basalt-run-steps-toggle").click(); await settle(page); }
      const r = await page.evaluate(() => {
        const b = document.querySelector(".basalt-run-steps-toggle");
        const box = b.getBoundingClientRect();
        const x = box.left + Math.min(box.width / 2, 20);
        let hits = 0;
        for (let y = Math.floor(box.top + box.height / 2 - 30); y <= box.bottom + 30; y += 1) if (b.contains(document.elementFromPoint(x, y))) hits += 1;
        return hits;
      });
      assert.ok(r >= 44, `${r}px hit the toggle`);
    });
  }
});

describe("what moves", () => {
  test("a roll moves nothing outside the window: the window, the sibling after it and a focused Approve, 0px", async () => {
    const initial = [done(1), done(2), { id: "ap", state: "queued", word: "Waiting for approval", text: "Roll back payments-api", detail: "kubectl rollout undo", action: true }];
    const page = await open(APP(), { initial });
    const approve = page.getByRole("button", { name: "Approve" });
    await approve.focus();
    const at = () => page.evaluate(() => ({ win: document.querySelector(".basalt-run-steps-window").getBoundingClientRect().toJSON(), after: document.querySelector("#after").getBoundingClientRect().top, approve: [...document.querySelectorAll("button")].find((b) => b.textContent === "Approve").getBoundingClientRect().top }));
    const before = await at();
    const clock = await freezeAnimations(page);
    await page.evaluate(() => window.add({ id: "s9", state: "running", text: "Querying latency", start: Date.now() }));
    for (let t = 0; t <= 250; t += 25) { await clock.advance(25); const now = await at(); assert.deepEqual([now.win, now.after], [before.win, before.after], `${t}ms`); assert.equal(now.approve, before.approve, `Approve at ${t}ms`); }
    await clock.thaw();
  });

  test("a tall arrival grows the window once, by its extra height, and it never shrinks back", async () => {
    const page = await open(APP(), { initial: [done(1), done(2), done(3)] });
    const h = () => page.evaluate(() => document.querySelector(".basalt-run-steps-window").getBoundingClientRect().height);
    const floor = await h();
    assert.equal(floor, 3 * 34 + 50, "keep rows of 34 and two and a half tail rows");
    await page.evaluate(() => window.add({ id: "tall", state: "success", text: "Ran the migration", tall: "and wrote 3 tables", meta: "3 tables" }));
    await settle(page);
    const grown = await h();
    assert.equal(grown, floor + 18, "one extra line");
    for (const i of [5, 6, 7, 8]) { await page.evaluate((i) => window.add({ id: "x" + i, state: "success", text: "Read " + i, meta: "1 line" }), i); await settle(page); }
    assert.equal(await h(), grown, "never back");
  });

  test("the follow rule: at seven steps scrolled to the top, an eighth leaves it there; at the end it follows; the keys scroll it", async () => {
    const page = await open(APP(), { initial: [1, 2, 3, 4, 5, 6, 7].map((i) => done(i)) });
    const win = page.locator(".basalt-run-steps-window");
    const top = () => win.evaluate((el) => el.scrollTop);
    await win.hover();
    await page.mouse.wheel(0, -500);
    await page.waitForFunction(() => document.querySelector(".basalt-run-steps-window").scrollTop === 0);
    await page.evaluate(() => window.add({ id: "s8", state: "success", text: "Read file 8", meta: "8 lines" }));
    await settle(page);
    assert.equal(await top(), 0, "the reader's scroll is kept");
    await win.focus();
    await page.keyboard.press("End");
    await page.waitForTimeout(300);
    assert.ok(await win.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight <= 2), "End reaches the end");
    await page.evaluate(() => window.add({ id: "s9", state: "success", text: "Read file 9", meta: "9 lines" }));
    await settle(page);
    assert.ok(await win.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight <= 2), "at the end, it follows");
    await page.keyboard.press("Home");
    await page.waitForTimeout(300);
    assert.equal(await top(), 0, "Home");
  });

  test("a hovered or focused control holds the window: steps that arrive then land below the fold, and it follows again when the reader leaves", async () => {
    const initial = [done(1), done(2), done(3), done(4), { id: "ap", state: "queued", word: "Waiting for approval", text: "Roll back", detail: "kubectl rollout undo", action: true }];
    const page = await open(APP(), { initial });
    const approve = page.getByRole("button", { name: "Approve" });
    await approve.hover();
    const y = await approve.evaluate((el) => el.getBoundingClientRect().top);
    await page.evaluate(() => window.add({ id: "n1", state: "running", text: "Querying", start: Date.now() }));
    await settle(page);
    assert.equal(await approve.evaluate((el) => el.getBoundingClientRect().top), y, "Approve never moves under the pointer");
    await page.mouse.move(0, 0);
    await settle(page);
    assert.ok(await page.locator(".basalt-run-steps-window").evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight <= 2), "it follows again");
  });

  test("focus goes to the step's sentence when Approve leaves, never to the body", async () => {
    const page = await open(APP(), { initial: [done(1), { id: "ap", state: "queued", word: "Waiting for approval", text: "Roll back", detail: "kubectl rollout undo", action: true }] });
    await page.getByRole("button", { name: "Approve" }).focus();
    await page.keyboard.press("Enter");
    await page.evaluate(() => { window.approve(); window.patch("ap", { state: "success", word: "Approved by you", action: false }); });
    await settle(page);
    assert.equal(await page.evaluate(() => document.activeElement.className), "basalt-run-step-sentence");
  });

  test("only rows the window shows are animated, and an arrival fades", async () => {
    const page = await open(APP(), { initial: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => done(i)) });
    const clock = await freezeAnimations(page);
    await page.evaluate(() => window.add({ id: "n", state: "success", text: "Read file 11", meta: "11 lines" }));
    await clock.advance(16);
    const r = await page.evaluate(() => {
      const box = document.querySelector(".basalt-run-steps-window").getBoundingClientRect();
      return [...document.querySelectorAll(".basalt-run-step")].map((li) => ({ id: li.textContent.slice(0, 18), inside: li.getBoundingClientRect().bottom > box.top && li.getBoundingClientRect().top < box.bottom, moving: li.getAnimations().some((a) => a.effect.getKeyframes().some((k) => k.transform)), fading: li.getAnimations().some((a) => a.effect.getKeyframes().some((k) => k.opacity !== undefined)) }));
    });
    assert.ok(r.some((x) => x.moving), "the roll moves rows");
    assert.ok(r.filter((x) => x.moving).every((x) => x.inside), "and only inside the window");
    assert.ok(r.at(-1).fading, "the arrival fades");
    await clock.thaw();
  });

  test("the 48 limit: a roll of 48 counted rows animates, one of 49 lands at once, against Reflow's own constant", async () => {
    // The rows that move or arrive inside the window's box, counted as Reflow counts them (the window records its count). Larger `keep`, more rows.
    const seen = new Map();
    for (const keep of [42, 43, 44, 45, 46]) {
      const initial = Array.from({ length: keep + 3 }, (_, i) => done(i));
      const page = await open(APP({ props: `keep={${keep}}`, below: false }), { initial, height: 2400 });
      const clock = await freezeAnimations(page);
      await page.evaluate(() => window.add({ id: "n", state: "success", text: "Arrived", meta: "1 line" }));
      await clock.advance(16);
      const r = await page.evaluate(() => {
        const win = document.querySelector(".basalt-run-steps-window");
        const lis = [...document.querySelectorAll(".basalt-run-step")];
        const moving = lis.filter((li) => li.getAnimations().some((a) => a.effect.getKeyframes().some((k) => k.transform))).length;
        const others = document.getAnimations().filter((a) => a.effect.target !== lis.at(-1) && a.effect.getComputedTiming().iterations !== Infinity && !a.effect.getKeyframes().some((k) => k.transform)).length;
        return { counted: Number(win.dataset.rollCount), moving, others, landing: win.hasAttribute("data-landing") };
      });
      seen.set(r.counted, r);
      if (r.counted <= 48) assert.ok(r.moving > 0 && !r.landing, `keep ${keep}: ${JSON.stringify(r)}`);
      else assert.deepEqual([r.moving, r.landing, r.others], [0, true, 0], `keep ${keep}: lands at once, no colour transition, no animation but the arrival's fade (${JSON.stringify(r)})`);
      await clock.thaw();
      await page.close();
    }
    assert.ok(seen.has(48) && seen.has(49), `the runs counted ${[...seen.keys()].join(", ")}: 48 and 49 were both tried`);
  });
});

describe("one edge and the end", () => {
  test("from 640 the last glyph of every row's meta, timed or not, is within 0.5px of the row's end edge; a step with a state holds its seat before it has a time", async () => {
    const initial = [done(1), { id: "f", text: "Connection pool exhausted", word: "Finding", meta: "High confidence" }, done(2), { id: "w", state: "queued", word: "Queued", text: "Re-run", noTime: true }];
    const page = await open(APP({ props: "keep={false}", width: 1000 }), { initial, width: 1440 });
    const r = await page.evaluate(() => [...document.querySelectorAll(".basalt-run-step-line")].map((line) => {
      const meta = line.querySelector(".basalt-run-step-meta");
      const range = document.createRange();
      const last = [...meta.querySelectorAll("[data-on], .basalt-run-step-result")].filter((e) => !e.closest("[aria-hidden=true]") && e.textContent.trim()).at(-1);
      if (!last) return { gap: null, seat: meta.querySelector(".basalt-run-timer")?.getBoundingClientRect().width ?? 0, end: line.getBoundingClientRect().right - meta.getBoundingClientRect().right };
      range.selectNodeContents(last);
      return { gap: line.getBoundingClientRect().right - range.getBoundingClientRect().right };
    }));
    for (const row of r.slice(0, 3)) assert.ok(Math.abs(row.gap) <= 0.5, JSON.stringify(r));
    assert.ok(r[3].seat > 30 && r[3].end === 0, "a queued step holds its time's seat from its arrival");
  });

  for (const width of [390, 1440]) {
    for (const theme of ["dark", "light"]) {
      test(`mounted already finished, the last step's meta is whole inside the window, and still whole after a result lands (${width}, ${theme})`, async () => {
        const initial = [...[1, 2, 3, 4, 5, 6, 7].map((i) => done(i, { text: `Queried p99 latency across the payments service, window ${i}` })), { id: "last", state: "success", text: "Queried p99 latency, last 10 min", meta: "p99 240 ms" }];
        const page = await open(APP({ width: width - 0 }), { initial, width, theme });
        await page.evaluate(() => document.fonts.ready);
        await settle(page);
        const gap = () => page.evaluate(() => { const w = document.querySelector(".basalt-run-steps-window").getBoundingClientRect(); const m = [...document.querySelectorAll(".basalt-run-step-meta")].at(-1).getBoundingClientRect(); return w.bottom - m.bottom; });
        assert.ok((await gap()) >= 0, `the last meta is ${-(await gap())}px below the window's edge`);
        await page.evaluate(() => window.patch("last", { meta: "p99 240 ms, back under the 300 ms objective for the payments service" }));
        await settle(page);
        assert.ok((await gap()) >= 0, `after the result landed: ${-(await gap())}px below`);
      });
    }
  }
});

describe("modes", () => {
  const initial = [{ ...done(1), state: "failed" }, done(2), done(3), done(4), done(5), done(6), done(7)];
  for (const [mode, options] of [["more contrast", { contrast: "more" }], ["forced colours", { forcedColors: "active" }]]) {
    test(`no tail recedes under ${mode}: every tail row at the first step, and a failed one full danger`, async () => {
      const page = await open(APP(), { initial, ...options });
      const r = await page.evaluate(() => ({ op: [...document.querySelectorAll(".basalt-run-step[data-tail] .basalt-run-step-line")].map((l) => getComputedStyle(l).opacity), word: getComputedStyle(document.querySelector(".basalt-run-step[data-tail][data-state=failed] .basalt-run-step-word")).color, danger: (() => { const p = document.createElement("span"); p.style.color = "var(--basalt-status-danger)"; document.body.append(p); return getComputedStyle(p).color; })() }));
      assert.ok(r.op.every((o) => o === "1"), r.op.join());
      if (mode === "more contrast") assert.equal(r.word, r.danger);
    });
  }

  for (const [mode, prep] of [["reduced motion", { reducedMotion: "reduce" }], ["the hold", null]]) {
    test(`under ${mode} a roll lands at once`, async () => {
      const page = await open(APP(), { initial: [1, 2, 3, 4, 5, 6].map((i) => done(i)), ...(prep ?? {}) });
      if (!prep) { await page.evaluate(() => document.documentElement.setAttribute("data-loops", "held")); await frames(page); }
      const clock = await freezeAnimations(page);
      await page.evaluate(() => window.add({ id: "n", state: "success", text: "Arrived", meta: "1 line" }));
      await clock.advance(16);
      const moving = await page.evaluate(() => document.getAnimations().filter((a) => a.effect.getKeyframes().some((k) => k.transform)).length);
      assert.equal(moving, 0);
      await clock.thaw();
    });
  }

  test("with classic scrollbars the window draws no bar", async () => {
    classic ??= await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] });
    const page = await open(APP(), { initial: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => done(i)), b: classic });
    const r = await page.evaluate(() => { const w = document.querySelector(".basalt-run-steps-window"); return [w.offsetWidth - w.clientWidth, w.scrollHeight > w.clientHeight, getComputedStyle(w).scrollbarWidth, w.getAttribute("tabindex"), w.getAttribute("role")]; });
    assert.deepEqual(r, [0, true, "none", "0", "region"]);
  });

  for (const theme of ["light", "dark"]) {
    test(`axe: no WCAG 2.2 AA violations, closed and open (${theme})`, async () => {
      const page = await open(APP(), { initial: [{ ...done(1), state: "failed" }, done(2), done(3), done(4), done(5), { id: "ap", state: "queued", word: "Waiting for approval", text: "Roll back", detail: "kubectl rollout undo", action: true }], theme });
      await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
      await page.addScriptTag({ content: axeSource });
      // The tail's steps 2 to 5 are below 4.5:1 on purpose (the one named exception, foundations' Principles), so color-contrast is checked open.
      const run = () => page.evaluate(async () => (await globalThis.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } })).violations.map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join(" ")).join(" | ")}`));
      const closed = (await run()).filter((v) => !v.startsWith("color-contrast:"));
      assert.deepEqual(closed, []);
      await page.locator(".basalt-run-steps-toggle").click();
      await settle(page);
      assert.deepEqual(await run(), []);
    });
  }
});
