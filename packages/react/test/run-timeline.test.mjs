// RunTimeline and RunStep (DECISIONS 316, 1.3 and 1.8): keep's default and false; the words drawn and said in a full step and a tail row; the tail;
// each depth's ink against the tokens on levels 1 to 3 in both themes; hover and focus; open as the full form; the toggle, its line and its target;
// what a roll may move; a tall arrival; the follow rule by wheel and keys and the hold for a control; only rows in the window animated; the 48 limit;
// one edge for the meta; the end, mounted finished; the modes; no scrollbar with classic scrollbars. Chromium, built package, real stylesheet.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { chromium, webkit } from "playwright";

import { fixturePage, freezeAnimations, launch, pixels, settle } from "./support.mjs";

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

  test("from 640 no dot is drawn before a step's time: the time's seat starts space-3 after the result, 0px on every row whatever its figures; under 640 the dot stays, and the comma is said at both (DECISIONS 326, 67-7)", async () => {
    const initial = [done(1, { ms: 800 }), done(2, { ms: 12400 }), { id: "r", state: "success", text: "Risk", meta: "Medium risk", ms: 61000 }];
    const measure = (page) => page.evaluate(() => [...document.querySelectorAll(".basalt-run-step-meta")].map((meta) => {
      const result = meta.querySelector(".basalt-run-step-result");
      const range = document.createRange();
      range.selectNodeContents(result);
      const dot = meta.querySelector(".basalt-run-step-dot");
      return { gap: meta.querySelector(".basalt-run-timer").getBoundingClientRect().left - range.getBoundingClientRect().right, dot: getComputedStyle(dot, "::before").content, said: dot.textContent };
    }));
    const wide = await open(APP({ props: "keep={false}", width: 1000 }), { initial, width: 1440 });
    for (const row of await measure(wide)) assert.deepEqual([row.gap, row.dot, row.said], [12, "none", ", "], "from 640");
    const narrow = await open(APP({ props: "keep={false}", width: 390 }), { initial, width: 390 });
    for (const row of await measure(narrow)) assert.ok(row.dot !== "none" && row.said === ", ", `under 640 the dot stays: ${JSON.stringify(row)}`);
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
      // The tail's steps 2 to 5 are below 4.5:1 on purpose (the one named exception, foundations' Principles): only those rows' text is exempt from
      // color-contrast, node by node; every other node on the closed timeline, the toggle and the newest tail row included, is held to it.
      const run = () => page.evaluate(async () => {
        const result = await globalThis.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } });
        const exempt = (target) => { const el = document.querySelector(target.join(" ")); return Boolean(el?.closest(".basalt-run-step[data-tail]:not([data-depth='1'])")); };
        return result.violations.map((x) => ({ id: x.id, nodes: x.nodes.filter((n) => !(x.id === "color-contrast" && exempt(n.target))).map((n) => n.target.join(" ")) })).filter((x) => x.nodes.length).map((x) => `${x.id}: ${x.nodes.join(" | ")}`);
      });
      assert.deepEqual(await run(), []);
      // A closed toggle drawn too faint fails: the exemption is the tail's rows and nothing else.
      await page.addStyleTag({ content: ".basalt-run-steps-toggle, .basalt-run-steps-toggle * { color: var(--basalt-border-divider) !important; }" });
      const faint = await run();
      assert.ok(faint.some((v) => v.startsWith("color-contrast:")), `a faint toggle is caught: ${JSON.stringify(faint)}`);
      await page.evaluate(() => document.querySelectorAll("style")[document.querySelectorAll("style").length - 1].remove());
      await page.locator(".basalt-run-steps-toggle").click();
      await settle(page);
      assert.deepEqual(await run(), []);
    });
  }
});

// ---- The council's code review (Astra) and pixel review (Fable) of e5893f80: each blocking finding held by a test.

describe("following the end through a played run", () => {
  for (const width of [1440, 390]) {
    test(`consecutive arrivals, each roll left to finish in real time, keep the newest step whole at the window's end (${width})`, async () => {
      const page = await open(APP({ width: width === 390 ? 342 : 760 }), { initial: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => done(i)), width });
      const short = () => page.evaluate(() => { const w = document.querySelector(".basalt-run-steps-window"); const last = [...document.querySelectorAll(".basalt-run-step")].at(-1).getBoundingClientRect(); return Math.round(last.bottom - w.getBoundingClientRect().bottom); });
      for (const i of [11, 12, 13, 14]) {
        await page.evaluate((i) => window.add({ id: "n" + i, state: "success", text: "Read file " + i, meta: i + " lines" }), i);
        await page.waitForTimeout(450);
        await settle(page);
        assert.ok((await short()) <= 0, `after step ${i} the last step is ${await short()}px below the window`);
      }
    });
  }

  test("a reader's scroll in the same task as an arrival is kept: the window is not pulled back to the end", async () => {
    const page = await open(APP(), { initial: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => done(i)) });
    const top = await page.evaluate(() => { const w = document.querySelector(".basalt-run-steps-window"); w.scrollTop = 0; window.add({ id: "n", state: "success", text: "Arrived", meta: "1 line" }); return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(w.scrollTop)))); });
    assert.equal(top, 0);
  });
});

describe("the floor", () => {
  test("an early tall step grows the window once; later one-line steps move nothing below it", async () => {
    const page = await open(APP(), { initial: [] });
    const at = () => page.evaluate(() => [document.querySelector(".basalt-run-steps-window").getBoundingClientRect().height, document.querySelector("#after").getBoundingClientRect().top]);
    const [floor, after0] = await at();
    assert.equal(floor, 152);
    await page.evaluate(() => window.add({ id: "tall", state: "success", text: "Ran the migration", tall: "and wrote 3 tables, with a long second line", meta: "3 tables" }));
    await settle(page);
    const [grown, after1] = await at();
    assert.equal(grown, floor + 18, "the tall step's extra line, once");
    for (const i of [2, 3, 4, 5]) {
      await page.evaluate((i) => window.add({ id: "x" + i, state: "success", text: "Read " + i, meta: "1 line" }), i);
      await settle(page);
      assert.deepEqual(await at(), [grown, after1], `step ${i} moved nothing`);
    }
    assert.equal(after1 - after0, 18);
  });

  test("the floor's row count is the larger of keep and minRows", async () => {
    const low = await open(APP({ props: "keep={3} minRows={1}" }), { initial: [] });
    assert.equal(await low.evaluate(() => document.querySelector(".basalt-run-steps-window").getBoundingClientRect().height), 152);
    const high = await open(APP({ props: "keep={3} minRows={5}" }), { initial: [] });
    assert.equal(await high.evaluate(() => document.querySelector(".basalt-run-steps-window").getBoundingClientRect().height), 5 * 34 + 50);
  });
});

describe("print, the hold and the marks", () => {
  test("printed, the timeline is the whole record in full form: no 12% row, the connector, the detail and the result, at 390 too", async () => {
    for (const width of [1024, 390]) {
      const initial = [{ ...done(1), detail: "kubectl rollout undo" }, { ...done(2), state: "failed" }, done(3), done(4), done(5), done(6), done(7), done(8)];
      const page = await open(APP({ width: width === 390 ? 342 : 760 }), { initial, width });
      await page.emulateMedia({ media: "print" });
      const r = await page.evaluate(() => [...document.querySelectorAll(".basalt-run-step")].map((li) => { const line = li.querySelector(".basalt-run-step-line"); const result = li.querySelector(".basalt-run-step-result"); return { opacity: getComputedStyle(line).opacity, size: getComputedStyle(line).fontSize, connector: getComputedStyle(li, "::after").content, result: result ? result.getBoundingClientRect().width > 1 : null, detail: li.querySelector(".basalt-run-step-detail") ? getComputedStyle(li.querySelector(".basalt-run-step-detail")).display : null, white: getComputedStyle(li.querySelector(".basalt-run-step-sentence")).whiteSpace }; }));
      assert.ok(r.every((x) => x.opacity === "1" && x.size === r.at(-1).size && x.white !== "nowrap"), `${width}: ${JSON.stringify(r.slice(0, 3))}`);
      assert.ok(r.slice(0, -1).every((x) => x.connector !== "none"), "every connector");
      assert.ok(r.every((x) => x.result !== false), "every result is drawn");
      assert.equal(r[0].detail, "flex", "the oldest step's detail prints");
    }
  });

  test("the hold takes away a roll in flight at once, and release plays no settled mark's entry again", async () => {
    const page = await open(APP(), { initial: [1, 2, 3, 4, 5, 6].map((i) => done(i)) });
    const clock = await freezeAnimations(page);
    await page.evaluate(() => { window.add({ id: "n", state: "running", text: "Querying", start: Date.now() }); });
    await clock.advance(16);
    const moving = () => page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running" && a.effect.getKeyframes().some((k) => k.transform)).length);
    assert.ok((await moving()) > 0, "a roll is in flight");
    await page.evaluate(() => document.documentElement.setAttribute("data-loops", "held"));
    await clock.advance(16);
    assert.equal(await moving(), 0, "held: nothing moves");
    await clock.thaw();
    await page.evaluate(() => window.patch("n", { state: "success" }));
    await settle(page);
    await page.evaluate(() => document.documentElement.removeAttribute("data-loops"));
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const faces = await page.evaluate(() => [...document.querySelectorAll(".basalt-run-mark-face")].map((f) => [f.hasAttribute("data-entering"), Number(getComputedStyle(f).opacity)]));
    assert.ok(faces.every(([entering, opacity]) => !entering && opacity === 1), `released: ${JSON.stringify(faces)}`);
  });
});

describe("focus and touch", () => {
  test("an action removed as JSX leaves it (false or null) sends focus to the step's sentence, never to the body", async () => {
    for (const gone of ["false", "null"]) {
      const body = `function App() { const [on, setOn] = React.useState(true); React.useEffect(() => { window.off = () => setOn(false); }, []);
        return <div style={{ padding: 24, width: 760 }}><B.RunTimeline label="Steps" keep={false}><B.RunStep state="queued" word="Waiting for approval" detail={on ? <code>kubectl rollout undo</code> : ${gone}} action={on && <B.Button size="sm">Approve</B.Button>}>Roll back</B.RunStep></B.RunTimeline></div>; }
        createRoot(document.getElementById("root")).render(<App />);`;
      const page = await open(body);
      await page.getByRole("button", { name: "Approve" }).focus();
      await page.evaluate(() => window.off());
      await settle(page);
      assert.equal(await page.evaluate(() => document.activeElement.className), "basalt-run-step-sentence", gone);
      assert.equal(await page.locator(".basalt-run-step-detail").count(), 0, `${gone}: nothing is left open`);
    }
  });

  for (const state of ["closed", "open"]) {
    test(`on touch the toggle keeps its 44px target inside a list item too (${state})`, async () => {
      const initial = [1, 2, 3, 4, 5].map((i) => done(i));
      const body = APP({ width: 342 }).replace("<Nest level={1}>", '<ul style={{ listStyle: "none", margin: 0, padding: 0 }}><li><Nest level={1}>').replace("</B.RunTimeline></Nest>", "</B.RunTimeline></Nest></li></ul>");
      const page = await open(body, { initial, width: 390, hasTouch: true, isMobile: true });
      if (state === "open") { await page.locator(".basalt-run-steps-toggle").click(); await settle(page); }
      const hits = await page.evaluate(() => {
        const b = document.querySelector(".basalt-run-steps-toggle");
        const box = b.getBoundingClientRect();
        const x = box.left + Math.min(box.width / 2, 20);
        let n = 0;
        for (let y = Math.floor(box.top + box.height / 2 - 30); y <= box.bottom + 30; y += 1) if (b.contains(document.elementFromPoint(x, y))) n += 1;
        return n;
      });
      assert.ok(hits >= 44, `${hits}px hit the toggle`);
      assert.equal(await page.evaluate(() => !!document.querySelector("li .basalt-run-steps-toggle")), true, "nested in a list item");
    });
  }
});

describe("the toggle's chevron", () => {
  test("morphs from down to up through ControlIcon (not a swap at once)", async () => {
    const page = await open(APP(), { initial: [1, 2, 3, 4, 5].map((i) => done(i)) });
    await page.waitForTimeout(300);
    await page.locator(".basalt-run-steps-toggle").click();
    const seen = await page.evaluate(() => new Promise((resolve) => { const frames = []; const step = (n) => { const svg = document.querySelector(".basalt-run-steps-toggle svg"); frames.push(svg.innerHTML); if (n < 12) requestAnimationFrame(() => step(n + 1)); else resolve(new Set(frames).size); }; step(0); }));
    assert.ok(seen > 2, `${seen} drawings over 12 frames: a morph passes through between`);
  });
});

// ---- The top edge (DECISIONS 337): the window's top edge fades the one finished tail row at depth 2 or deeper that it cuts through its words, over
// the part that shows (`data-cut` and `--_cut` on that row, a mask in its own box). Tests 1 to 9 of the revised decision.
describe("the top edge", () => {
  // The shipped agent run (INC-0042): at its end the failed step is the cut row at depth 3; `passed` swaps it with the deploys step, so a passed
  // step is cut and the failure is whole at depth 2 under it.
  const SHIPPED = (cut = "failed") => {
    const logs = { id: "logs", state: "failed", text: 'Searched logs for "pool timeout"', meta: "Timed out after 10 s" };
    const deploys = { id: "deploys", state: "success", text: "Listed deploys of payments-api", meta: "4f2a1c0 at 14:02", ms: 800 };
    return [
      { id: "read", state: "success", text: "Read deploy/payments-api.yaml", meta: "84 lines", ms: 700 },
      { id: "p99", state: "success", text: "Queried p99 latency · payments-api · 2 h", meta: "p99 1.8 s since 14:05", ms: 1400 },
      ...(cut === "failed" ? [logs, deploys] : [deploys, logs]),
      { id: "finding", word: "Finding", text: "Connection pool exhausted after deploy 4f2a1c0", meta: "High confidence" },
      { id: "approve", state: "success", word: "Approved by Priya Shah", text: "Roll back payments-api to 4f29e0b", meta: "Medium risk", ms: 2600, detail: "kubectl rollout undo deployment/payments-api -n payments" },
      { id: "rollback", state: "success", text: "Ran kubectl rollout undo deployment/payments-api", meta: "Rolled back to 4f29e0b", ms: 2200 },
      { id: "check", state: "success", text: "Queried p99 latency · last 10 min", meta: "p99 240 ms", ms: 1100 },
    ];
  };
  const POST = { id: "post", state: "running", text: "Posting the summary to #inc-0042" };
  // Five tail rows (depths 5 to 1, 100px), then a running step and four full rows after it, so the window can be scrolled anywhere in the tail
  // and onto the running row: [5 tail rows][running][4 full rows], the window's floor three rows and two and a half tail rows.
  const DEEP = [1, 2, 3, 4, 5].map((i) => done(i)).concat([{ id: "r", state: "running", text: "Querying latency" }], [7, 8, 9, 10].map((i) => done(i)));
  const SIZES = [[1440, 1000], [390, 390]];

  // What the edge has written and what paints: every row with data-cut (its --_cut and its visible height under the window's top edge), and every
  // element on the page whose computed mask is not none.
  const edgeState = (page) => page.evaluate(() => {
    const win = document.querySelector(".basalt-run-steps-window");
    const top = win?.getBoundingClientRect().top ?? 0;
    const rows = [...document.querySelectorAll(".basalt-run-step")];
    return {
      cut: rows.filter((li) => li.hasAttribute("data-cut")).map((li) => ({ i: rows.indexOf(li), cut: li.style.getPropertyValue("--_cut"), visible: Math.round((li.getBoundingClientRect().bottom - top) * 100) / 100, depth: li.dataset.depth ?? null, state: li.dataset.state ?? null })),
      masked: [...document.querySelectorAll("*")].filter((el) => { const m = getComputedStyle(el).maskImage; return m && m !== "none"; }).map((el) => (el.classList.contains("basalt-run-step") ? rows.indexOf(el) : el.className || el.tagName)),
    };
  });
  // The window scrolled by the reader, then the frame after it (the edge runs in the scroll callback).
  const scrollTo = async (page, y) => { await page.evaluate((y) => { document.querySelector(".basalt-run-steps-window").scrollTop = y; }, y); await frames(page); };
  // Today's edge on the same page: no mask on the timeline's box, its window or anything in it, so a stale mask on the window (the decision as first
  // written) would show as a difference too. A picture taken with this on is today's, pixel for pixel.
  const TODAY = ".basalt-run-steps-box, .basalt-run-steps-box * { mask-image: none !important; }";
  const shot = (page, clip) => pixels(page, clip);
  const winClip = (page) => page.evaluate(() => { const r = document.querySelector(".basalt-run-steps-window").getBoundingClientRect(); const x = Math.floor(r.left); const y = Math.floor(r.top); return { x, y, width: Math.ceil(r.right) - x, height: Math.ceil(r.bottom) - y }; });
  // The hold stills the running ring and hides its running time, so two pictures of the same frame can be compared.
  const hold = async (page) => { await page.evaluate(() => document.documentElement.setAttribute("data-loops", "held")); await frames(page); };
  const withToday = async (page, fn) => { const tag = await page.addStyleTag({ content: TODAY }); try { return await fn(); } finally { await tag.evaluate((el) => el.remove()); await frames(page); } };

  // 1.
  for (const [vw, w] of SIZES) {
    for (const theme of ["dark", "light"]) {
      for (const cut of ["failed", "passed"]) {
        test(`1. at the shipped run's end the cut row has data-cut and --_cut is its visible height, 10px, and nothing else is masked (${vw}, ${theme}, ${cut} cut)`, async () => {
          const page = await open(APP({ width: w }), { initial: SHIPPED(cut), width: vw, theme });
          const s = await edgeState(page);
          assert.equal(s.cut.length, 1, JSON.stringify(s));
          assert.deepEqual(s.cut[0], { i: 2, cut: "10px", visible: 10, depth: "3", state: cut === "failed" ? "failed" : "success" });
          assert.deepEqual(s.masked, [2], "only the cut row is masked");
          const mask = await page.evaluate(() => getComputedStyle(document.querySelector(".basalt-run-step[data-cut]")).maskImage);
          assert.match(mask, /linear-gradient\(to top, .+, (transparent|rgba\(0, 0, 0, 0\)) 10px\)/);
        });
      }
    }
  }

  for (const [mode, options] of [["more contrast", { contrast: "more" }], ["forced colours", { forcedColors: "active" }], ["print", { print: true }]]) {
    test(`1. no mask ${mode === "print" ? "in print" : `under ${mode}`}: the top edge is a plain cut`, async () => {
      const { print, ...media } = options;
      const page = await open(APP({ width: 1000 }), { initial: SHIPPED(), width: 1440, ...media });
      if (print) { await page.emulateMedia({ media: "print" }); await frames(page); }
      assert.deepEqual((await edgeState(page)).masked, []);
    });
  }

  test("1. no mask with the tail open, and no data-cut left behind", async () => {
    const page = await open(APP({ width: 1000 }), { initial: SHIPPED(), width: 1440 });
    assert.equal((await edgeState(page)).cut.length, 1);
    await page.locator(".basalt-run-steps-toggle").click();
    await settle(page);
    assert.deepEqual(await edgeState(page), { cut: [], masked: [] });
    await page.locator(".basalt-run-steps-toggle").click();
    await settle(page);
    assert.equal((await edgeState(page)).cut.length, 1, "closed again, the cut row has its fade");
  });

  // 2.
  for (const theme of ["dark", "light"]) {
    test(`2. a running step scrolled 13px above the edge: no data-cut, and its ink is today's (${theme})`, async () => {
      const page = await open(APP(), { initial: DEEP, theme });
      await hold(page);
      const runningTop = await page.evaluate(() => document.querySelector(".basalt-run-step[data-state=running]").offsetTop - document.querySelector(".basalt-run-steps").offsetTop);
      await scrollTo(page, runningTop + 13);
      assert.equal(await page.evaluate(() => { const w = document.querySelector(".basalt-run-steps-window"); return Math.round(w.getBoundingClientRect().top - document.querySelector(".basalt-run-step[data-state=running]").getBoundingClientRect().top); }), 13, "the running row is 13px above the edge");
      assert.deepEqual(await edgeState(page), { cut: [], masked: [] });
      const ink = () => page.evaluate(() => { const li = document.querySelector(".basalt-run-step[data-state=running]"); const s = getComputedStyle(li.querySelector(".basalt-run-step-sentence")); return [s.color, getComputedStyle(li).maskImage, getComputedStyle(li.querySelector(".basalt-run-step-line")).opacity]; });
      const clip = await winClip(page);
      const now = await shot(page, clip);
      const today = await withToday(page, () => shot(page, clip));
      assert.deepEqual(now, today, "the window paints today's pixels");
      const [color, mask, opacity] = await ink();
      assert.equal(mask, "none");
      assert.equal(opacity, "1");
      assert.equal(color, await page.evaluate(() => { const p = document.createElement("span"); p.style.color = "var(--basalt-text-primary)"; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; }));
    });
  }

  // 3.
  test("3. a depth-1 tail row at the edge, or an edge that crosses only a row's padding, has no data-cut", async () => {
    const page = await open(APP(), { initial: DEEP });
    // Rows: depth 5 at 0, 4 at 20, 3 at 40, 2 at 60, 1 at 80 (20px each; space-0-5 is 2px).
    await scrollTo(page, 90);
    assert.deepEqual((await edgeState(page)).cut, [], "depth 1 cut through its words");
    for (const y of [41, 42, 58, 59]) { await scrollTo(page, y); assert.deepEqual((await edgeState(page)).cut, [], `${y}: the edge crosses only the padding`); }
    for (const [y, cut] of [[43, "17px"], [50, "10px"], [57, "3px"]]) { await scrollTo(page, y); assert.deepEqual((await edgeState(page)).cut.map((c) => [c.i, c.cut]), [[2, cut]], `${y}`); }
  });

  test("3. a data-cut written by hand on a running row, a full row or a depth-1 row computes to mask none: the selector is the guard", async () => {
    const page = await open(APP(), { initial: DEEP });
    const masks = await page.evaluate(() => {
      const pick = { running: document.querySelector(".basalt-run-step[data-state=running]"), full: document.querySelector(".basalt-run-step:not([data-tail]):not([data-state=running])"), "depth 1": document.querySelector(".basalt-run-step[data-depth='1']") };
      return Object.fromEntries(Object.entries(pick).map(([k, li]) => { li.setAttribute("data-cut", ""); li.style.setProperty("--_cut", "10px"); return [k, getComputedStyle(li).maskImage]; }));
    });
    assert.deepEqual(masks, { running: "none", full: "none", "depth 1": "none" });
  });

  // 4.
  for (const engine of ["chromium", "webkit"]) {
    for (const theme of ["dark", "light"]) {
      test(`4. the window's +2 ring is its own outline, today's top and side pixels, with the cut row masked; there is no frame (${engine}, ${theme})`, async (t) => {
        let b = browser;
        if (engine === "webkit") { try { b = await webkit.launch(); } catch { t.skip("WebKit is not installed"); return; } }
        try {
          const page = await open(APP({ width: 1000 }), { initial: SHIPPED(), width: 1440, theme, b });
          assert.equal(await page.locator(".basalt-run-steps-frame").count(), 0);
          await page.locator(".basalt-run-steps-toggle").focus();
          await page.keyboard.press("Tab");
          await settle(page);
          const r = await page.evaluate(() => { const w = document.querySelector(".basalt-run-steps-window"); const s = getComputedStyle(w); return { fv: w.matches(":focus-visible"), outline: s.outlineStyle, width: s.outlineWidth, offset: s.outlineOffset, mask: s.maskImage, cut: !!document.querySelector(".basalt-run-step[data-cut]") }; });
          assert.deepEqual(r, { fv: true, outline: "solid", width: "2px", offset: "2px", mask: "none", cut: true });
          // The ring's band: 4px outside the window on the top and the start side.
          const box = await winClip(page);
          const top = { x: box.x + 8, y: box.y - 4, width: box.width - 16, height: 4 };
          const side = { x: box.x - 4, y: box.y + 8, width: 4, height: box.height - 16 };
          const now = [await shot(page, top), await shot(page, side)];
          const today = await withToday(page, async () => [await shot(page, top), await shot(page, side)]);
          assert.deepEqual(now, today);
          // And the ring is drawn: the middle of the top band's ring row (offset 2, width 2: the band's first two CSS rows; this samples its second, 3px above the window) is the focus colour.
          const focus = await page.evaluate(() => { const p = document.createElement("span"); p.style.color = "var(--basalt-border-focus)"; document.body.append(p); const c = getComputedStyle(p).color.match(/[\d.]+/g).slice(0, 3).map(Number); p.remove(); return c; });
          const dpr = await page.evaluate(() => devicePixelRatio);
          const ring = now[0][Math.floor(dpr) * Math.round(top.width * dpr) + Math.round((top.width * dpr) / 2)];
          assert.ok(ring.every((c, i) => Math.abs(c - focus[i]) <= 3), `the ring pixel ${ring} is the focus colour ${focus}`);
        } finally { if (b !== browser) await b.close(); }
      });
    }
  }

  // 5. Both landings at 1440, where no full row wraps (the decision's fixtures: the finding lands with the failed row cut at depth 3, 10px; the
  // approval and its detail land with a passed row cut at depth 5, 4px). The landing is read in the task that ends the roll: a MutationObserver's
  // callback runs straight after the handler that takes data-rolling away, before any scroll callback could repair a missing update.
  for (const [name, initial, expected] of [["the finding rolls", SHIPPED().slice(0, 7), { cut: "10px", depth: "3", state: "failed" }], ["the approval with its detail rolls", SHIPPED(), { cut: "4px", depth: "5", state: "success" }]]) {
    test(`5. ${name}: the card's bottom moves 0px, no row is masked while it rolls, and on the landing frame the new cut row has its --_cut`, async () => {
      const page = await open(APP({ width: 1000 }), { initial, width: 1440 });
      const bottom = () => page.evaluate(() => document.querySelector("#after").getBoundingClientRect().top);
      const was = await bottom();
      const clock = await freezeAnimations(page);
      await page.evaluate(() => {
        const win = document.querySelector(".basalt-run-steps-window");
        let seen = false;
        window.__landed = new Promise((resolve) => {
          const observer = new MutationObserver(() => {
            if (win.hasAttribute("data-rolling")) { seen = true; return; }
            if (!seen) return;
            observer.disconnect();
            const top = win.getBoundingClientRect().top;
            resolve([...document.querySelectorAll(".basalt-run-step")].filter((li) => li.hasAttribute("data-cut")).map((li) => ({ cut: li.style.getPropertyValue("--_cut"), visible: Math.round((li.getBoundingClientRect().bottom - top) * 100) / 100, depth: li.dataset.depth, state: li.dataset.state, mask: getComputedStyle(li).maskImage })));
          });
          observer.observe(win, { attributes: true, attributeFilter: ["data-rolling"] });
        });
      });
      await page.evaluate((s) => window.add(s), POST);
      let rolled = false;
      for (let t = 0; t < 400; t += 25) {
        await clock.advance(25);
        const rolling = await page.evaluate(() => document.querySelector(".basalt-run-steps-window").hasAttribute("data-rolling"));
        if (rolling) { rolled = true; assert.deepEqual((await edgeState(page)).masked, [], `${t}ms: nothing is masked mid-roll`); }
        assert.equal(await bottom(), was, `${t}ms: the card's bottom`);
      }
      assert.ok(rolled, "the change rolled");
      const landed = await page.evaluate(() => window.__landed);
      assert.equal(landed.length, 1, `one marked row on the landing: ${JSON.stringify(landed)}`);
      const [row] = landed;
      assert.deepEqual({ cut: row.cut, depth: row.depth, state: row.state }, expected);
      assert.ok(Math.abs(Number.parseFloat(row.cut) - row.visible) < 0.5, `the band is the row's visible height: ${JSON.stringify(row)}`);
      assert.match(row.mask, new RegExp(`linear-gradient\\(to top, .+ ${row.cut}\\)`), "its mask paints on the landing");
      await clock.thaw();
      await settle(page);
      assert.equal(await bottom(), was);
    });
  }

  test("5. under reduced motion the roll lands at once and the band is set on the same frame", async () => {
    const page = await open(APP({ width: 1000 }), { initial: SHIPPED().slice(0, 7), width: 1440, reducedMotion: "reduce" });
    // Read in the commit itself (a MutationObserver's callback runs after React's layout effects and before any frame is painted).
    const s = await page.evaluate((s) => new Promise((r) => {
      const observer = new MutationObserver(() => { observer.disconnect(); r([...document.querySelectorAll(".basalt-run-step")].filter((li) => li.hasAttribute("data-cut")).map((li) => li.style.getPropertyValue("--_cut"))); });
      observer.observe(document.querySelector(".basalt-run-steps"), { childList: true });
      window.add(s);
    }), POST);
    assert.equal(s.length, 1, "a cut row on the landing commit");
    const settled = await edgeState(page);
    assert.deepEqual(s, settled.cut.map((c) => c.cut));
  });

  // 6.
  test("6. focus inside the cut row clears its data-cut; leaving brings it back", async () => {
    const page = await open(APP({ width: 1000 }), { initial: SHIPPED(), width: 1440 });
    assert.equal((await edgeState(page)).cut.length, 1);
    await page.evaluate(() => document.querySelector(".basalt-run-step[data-cut] .basalt-run-step-sentence").focus({ preventScroll: true }));
    await frames(page);
    assert.deepEqual(await edgeState(page), { cut: [], masked: [] });
    await page.evaluate(() => document.activeElement.blur());
    await frames(page);
    assert.equal((await edgeState(page)).cut.length, 1);
  });

  // 7.
  test("7. the window is the same node when the counter first rolls, when keep changes and when the tail opens and closes; its scrollTop and the focus inside it survive", async () => {
    const page = await open(APP({ props: "keep={window.KEEP ?? 3}" }), { initial: [1, 2, 3].map((i) => done(i)) });
    await page.evaluate(() => { window.__win = document.querySelector(".basalt-run-steps-window"); document.querySelector(".basalt-run-step-sentence").focus(); window.__focus = document.activeElement; });
    const same = () => page.evaluate(() => ({ node: document.querySelector(".basalt-run-steps-window") === window.__win, focus: document.activeElement === window.__focus, atEnd: (() => { const w = window.__win; return w.scrollHeight - w.scrollTop - w.clientHeight <= 2; })() }));
    // The counter first rolls: two steps arrive and the oldest goes into the tail (the toggle's words appear).
    await page.evaluate(() => { window.add({ id: "s4", state: "success", text: "Read file 4", meta: "4 lines" }); window.add({ id: "s5", state: "success", text: "Read file 5", meta: "5 lines" }); });
    await settle(page);
    assert.equal(await page.locator(".basalt-run-steps-toggle").count(), 1);
    assert.deepEqual(await same(), { node: true, focus: true, atEnd: true }, "the counter rolled");
    for (const i of [6, 7, 8]) await page.evaluate((i) => window.add({ id: `s${i}`, state: "success", text: `Read file ${i}`, meta: `${i} lines` }), i);
    await settle(page);
    await page.evaluate(() => { window.__win.scrollTop = 7; });
    await frames(page);
    const top = () => page.evaluate(() => window.__win.scrollTop);
    assert.equal(await top(), 7, "the reader's scroll took");
    for (const keep of [2, 3]) {
      await page.evaluate((keep) => { window.KEEP = keep; window.set((all) => [...all]); }, keep);
      await settle(page);
      assert.deepEqual({ ...(await same()), atEnd: undefined }, { node: true, focus: true, atEnd: undefined }, `keep changed to ${keep}`);
      assert.equal(await top(), 7, `its scrollTop is kept at keep ${keep}`);
    }
    for (const click of [1, 2]) { await page.locator(".basalt-run-steps-toggle").click(); await settle(page); assert.equal((await same()).node, true, `toggle ${click}`); }
    // keep={false} is the whole record with no window (the shipped rule, above): the window goes, and comes back clean, at its end, with a toggle.
    await page.evaluate(() => { window.KEEP = false; window.set((all) => [...all]); });
    await settle(page);
    assert.equal(await page.locator(".basalt-run-steps-window, .basalt-run-steps-toggle-line").count(), 0, "keep={false}: no window");
    await page.evaluate(() => { window.KEEP = 3; window.set((all) => [...all]); });
    await settle(page);
    assert.deepEqual(await page.evaluate(() => { const w = document.querySelector(".basalt-run-steps-window"); return [!!w, w.scrollHeight - w.scrollTop - w.clientHeight <= 2, !!document.querySelector(".basalt-run-steps-toggle"), document.querySelectorAll(".basalt-run-step[data-cut]").length <= 1]; }), [true, true, true, true], "back to keep 3");
    assert.deepEqual(page.errors, []);
  });

  // 8.
  test("8. with 17px of a 20px tail row showing, --_cut is 17px and the row below is pixel-identical to today's", async () => {
    const page = await open(APP(), { initial: DEEP });
    await hold(page);
    await scrollTo(page, 43);
    const s = await edgeState(page);
    assert.deepEqual(s.cut.map((c) => [c.i, c.cut, c.visible]), [[2, "17px", 17]]);
    const clip = await page.evaluate(() => { const r = document.querySelectorAll(".basalt-run-step")[3].getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
    const now = await shot(page, clip);
    const today = await withToday(page, () => shot(page, clip));
    assert.deepEqual(now, today);
  });

  // 9.
  for (const [vw, w] of SIZES) {
    for (const theme of ["dark", "light"]) {
      test(`9. a frame painted mid-scroll before the edge runs matches today's outside the marked row: the running row, then a whole failure, arriving at the edge (${vw}, ${theme})`, async () => {
        // R: the running row arrives 3px past the edge. F: the jump lands at the end, a passed row cut and the failure whole under it.
        for (const [name, initial, to] of [["the running row", DEEP, "running"], ["a whole failure", SHIPPED("passed"), "end"]]) {
          const page = await open(APP({ width: w }), { initial, width: vw, theme });
          await hold(page);
          await scrollTo(page, 3);
          assert.deepEqual((await edgeState(page)).cut.map((c) => [c.i, c.cut]), [[0, "17px"]], `${name}: the first row is marked at 3px`);
          // Stop the edge (no scroll callback reaches the window), jump by a Page Down's length or to the end, and paint.
          const box = await page.evaluate((to) => {
            window.__stop = (e) => e.stopImmediatePropagation();
            document.addEventListener("scroll", window.__stop, true);
            const win = document.querySelector(".basalt-run-steps-window");
            const list = win.firstElementChild;
            win.scrollTop = to === "running" ? document.querySelector(".basalt-run-step[data-state=running]").offsetTop - list.offsetTop + 3 : win.scrollHeight;
            window.__marked = document.querySelector(".basalt-run-step[data-cut]");
            const r = window.__marked.getBoundingClientRect();
            const w = win.getBoundingClientRect();
            const running = document.querySelector(".basalt-run-step[data-state=running]");
            return { top: r.top, bottom: r.bottom, arriving: running ? Math.round(w.top - running.getBoundingClientRect().top) : null, atEnd: win.scrollHeight - win.scrollTop - win.clientHeight <= 1 };
          }, to);
          if (to === "running") assert.equal(box.arriving, 3, `${name}: the running row is 3px past the edge`);
          else assert.equal(box.atEnd, true, `${name}: the jump landed at the end`);
          await frames(page);
          const clip = await winClip(page);
          const stale = await shot(page, clip);
          const today = await withToday(page, () => shot(page, clip));
          const dpr = await page.evaluate(() => devicePixelRatio);
          const width = Math.round(clip.width * dpr);
          assert.equal(stale.length % width, 0);
          const rowOf = (n) => clip.y + Math.floor(n / width) / dpr;
          const differs = stale.map((p, n) => (p.join() === today[n].join() ? null : rowOf(n))).filter((y) => y !== null && !(y >= box.top && y < box.bottom));
          assert.deepEqual(differs, [], `${name}: no pixel differs outside the marked row`);
          assert.deepEqual(await page.evaluate(() => [window.__marked.hasAttribute("data-cut"), document.querySelectorAll(".basalt-run-step[data-cut]").length, window.__marked === document.querySelectorAll(".basalt-run-step")[0]]), [true, 1, true], `${name}: the first row stayed marked through both pictures (the edge did not run)`);
          await page.evaluate(() => { document.removeEventListener("scroll", window.__stop, true); document.querySelector(".basalt-run-steps-window").dispatchEvent(new Event("scroll")); });
          await frames(page);
          const settled = await edgeState(page);
          assert.ok(settled.cut.every((c) => c.depth !== "1" && c.state !== "running"), JSON.stringify(settled));
          if (to === "end") assert.deepEqual(settled.cut.map((c) => [c.i, c.cut]), [[2, "10px"]], "settled, the new cut row");
          await page.close();
        }
      });
    }
  }
});
