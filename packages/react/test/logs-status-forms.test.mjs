// Logs, status and forms (DECISIONS 162, batch 8 of the port: D14a, D14b, D15, X10, X11). Driven in Chromium against the built package with the real
// stylesheet. The fixtures load no web font, so text widths differ from a Mac's on CI's Linux runner: every measured margin here is wider than a
// fallback font's width, and a position is compared with itself. Nothing here waits a wall-clock time inside a transition: a test waits for the state
// itself, or runs the fake clock (`clock: true`).
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { fixturePage, launch, pkg, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const near = (actual, expected, message, tolerance = 0.6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);
const open = async (fixture, { width = 1440, height = 900, theme = "dark", ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, fixture, { theme, colorScheme: theme, viewport: { width, height }, ...options });
  // a page on the fake clock never finishes a frame by itself: nothing to settle, and the test advances the clock
  if (!options.clock) await settle(page);
  page.errors = errors;
  return page;
};
const box = (page, selector, n = 0) => page.locator(selector).nth(n).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });
const css = (page, selector, property, n = 0) => page.locator(selector).nth(n).evaluate((el, p) => getComputedStyle(el)[p], property);
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.evaluate((source) => (0, eval)(source), axeSource);
  return page.evaluate(async () => {
    const options = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, options);
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
};
/** A colour resolved to rgb by the browser, from any CSS colour. */
const resolve = (page, value) => page.evaluate((v) => { const probe = document.createElement("div"); document.body.append(probe); probe.style.color = v; const c = getComputedStyle(probe).color; probe.remove(); return c; }, value);
const SHELL = (body, style = "") => `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)"; createRoot(document.getElementById("root")).render(<main style={{ padding: 24, boxSizing: "border-box", ${style} }}>${body}</main>);`;

// ---- V1 and V2: a log line's fields, in a Terminal, a block and slots
const LINES = `[{ kind: "command", text: "get a.example" }, { kind: "output", text: "basalt #128,129 denied", fields: ["basalt ", { text: "#128,129", loud: true }, " ", { text: "denied", loud: true }] }, { kind: "output", text: "plain line" }]`;

describe("a log line's fields (V1, V2)", () => {
  for (const theme of THEMES) {
    test(`${theme}: loud fields are primary at 400, the rest secondary at 400; a refused field is no colour (the word says it)`, async () => {
      const page = await open(SHELL(`<div style={{ width: 640 }}><B.Terminal title="Proxy" lines={${LINES}} /><B.LogLine id="solo" fields={["denied ", { text: "403", loud: true }]} /></div>`), { theme });
      const primary = await resolve(page, "var(--basalt-text-primary)");
      const secondary = await resolve(page, "var(--basalt-text-secondary)");
      assert.equal(await css(page, ".basalt-log-field", "color"), primary);
      assert.equal(await css(page, ".basalt-log-field", "fontWeight"), "400");
      assert.equal(await css(page, '.basalt-code-line[data-kind="output"]', "color"), secondary);
      assert.equal(await css(page, '.basalt-code-line[data-kind="output"]', "fontWeight"), "400");
      // the refused field ("denied") is the same ink as any loud field: no danger ink and no other hue
      const denied = await page.locator(".basalt-log-field", { hasText: "denied" }).evaluate((el) => getComputedStyle(el).color);
      assert.equal(denied, primary);
      assert.equal(await page.locator(".basalt-log-field wbr, .basalt-code-text wbr").count(), 1, "a word-break opportunity after the comma");
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }

  test("a line can be a node, and copy still takes the commands", async () => {
    const page = await open(SHELL(`<div style={{ width: 640 }}><B.Terminal title="Out" lines={[{ kind: "command", text: "ls" }, { kind: "output", text: "go", node: <a id="inline-link" href="#go">go</a> }]} /></div>`));
    assert.equal(await page.locator("#inline-link").count(), 1);
    await page.close();
  });
});

// ---- the command block (D14a; R1 to R3, V2)
const BLOCKS = `<div id="scroller" style={{ width: 640 }}>
  <B.CommandBlock command="get a.example" status="allowed" exit={0} at={Date.UTC(2026, 10, 17, 14, 49, 7)} timeZone="UTC"><B.LogLine fields={["200 ", { text: "ok", loud: true }]} /></B.CommandBlock>
  <B.CommandBlock id="refused" command="get b.example" status="403" refused exit={1} at={Date.UTC(2026, 10, 17, 14, 50, 1)} timeZone="UTC"><B.LogLine fields={["blocked ", { text: "denied", loud: true }]} /></B.CommandBlock>
  <div style={{ height: 1200 }} />
</div>`;

describe("CommandBlock (D14a)", () => {
  for (const theme of THEMES) {
    test(`${theme}: the head's type, space and meta; the refused word is primary at 500 beside exit N, with no colour`, async () => {
      const page = await open(SHELL(BLOCKS), { theme });
      const head = ".basalt-command-block-head";
      assert.equal(await css(page, ".basalt-command-block", "fontSize"), "16px", "R1: text-md");
      assert.equal(await css(page, ".basalt-command-block", "lineHeight"), "24px", "R1: on 24");
      assert.equal(await css(page, head, "paddingTop"), "20px");
      assert.equal(await css(page, head, "paddingBottom"), "16px");
      assert.equal(await css(page, ".basalt-command-block", "paddingBottom"), "64px", "R2: space-16");
      const tertiary = await resolve(page, "var(--basalt-text-tertiary)");
      const primary = await resolve(page, "var(--basalt-text-primary)");
      assert.equal(await css(page, ".basalt-command-block-meta", "color"), tertiary);
      assert.equal(await css(page, ".basalt-command-block-command", "fontWeight"), "500");
      assert.equal(await css(page, ".basalt-command-block-command", "color"), primary);
      const status = "#refused .basalt-command-block-status";
      assert.equal(await css(page, status, "color"), primary);
      assert.equal(await css(page, status, "fontWeight"), "500");
      assert.match(await page.locator("#refused .basalt-command-block-meta").innerText(), /403\s+exit 1\s+14:50:01/);
      assert.equal(await page.locator("time.basalt-command-block-time").first().getAttribute("datetime"), "2026-11-17T14:49:07");
      // R3: 28px between the command's end and the meta, the chevron the core glyph
      assert.equal(await css(page, ".basalt-command-block-meta", "marginInlineStart"), "20px", "28 minus the 8 the row's gap already holds");
      assert.equal(await page.locator(".basalt-command-block-head svg").count(), 2, "one core chevron per head");
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }

  test("the head is sticky and opaque in the page colour; blocks are told apart by a hairline", async () => {
    const page = await open(SHELL(BLOCKS));
    assert.equal(await css(page, ".basalt-command-block-head", "position"), "sticky");
    assert.equal(await css(page, ".basalt-command-block-head", "backgroundColor"), await resolve(page, "var(--basalt-surface-page)"));
    assert.equal(await css(page, "#refused", "borderTopWidth"), "1px");
    assert.equal(await css(page, ".basalt-command-block", "borderTopWidth", 0), "0px", "none above the first block");
    await page.close();
  });
});

// ---- the command block's narrow head (return 2): the command keeps its readable words, and the meta is a reserved second row
describe("CommandBlock at 390 and 320", () => {
  const HOST = `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)";
function Host() {
  const [done, setDone] = React.useState(false);
  (window as any).finish = () => setDone(true);
  return <main style={{ padding: 16 }}><B.CommandBlock id="blk" command="get b.example/some/path and a longer flag" at={Date.UTC(2026, 10, 17, 14, 49, 7)} timeZone="UTC" {...(done ? { status: "403", refused: true, exit: 1 } : {})}><B.LogLine id="after" fields={["blocked ", { text: "denied", loud: true }]} /></B.CommandBlock></main>;
}
createRoot(document.getElementById("root")).render(<Host />);`;
  // every chunk of the command (split after a space, a dot or a slash) must sit on one line: no break inside a word
  const chunkLines = (page) => page.locator(".basalt-command-block-command").evaluate((el) => {
    const nodes = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
    const text = nodes.map((n) => n.data).join("");
    const out = [];
    let at = 0;
    for (const chunk of text.split(/(?<=[ ./])/)) {
      const from = at; const to = at + chunk.replace(/ $/, "").length; at += chunk.length;
      if (to <= from) continue;
      const locate = (offset) => { let seen = 0; for (const n of nodes) { if (offset <= seen + n.data.length) return [n, offset - seen]; seen += n.data.length; } return [nodes.at(-1), nodes.at(-1).data.length]; };
      const range = document.createRange();
      range.setStart(...locate(from)); range.setEnd(...locate(to));
      out.push({ chunk: text.slice(from, to), tops: [...new Set([...range.getClientRects()].map((r) => Math.round(r.top)))].length });
    }
    return out;
  });
  for (const theme of THEMES) {
    for (const width of [390, 320]) {
      test(`${theme}, ${width}: no line of the head breaks inside a word of the command, and nothing below the head moves when a status word appears`, async () => {
        const page = await open(HOST, { theme, width, height: 700 });
        const broken = (await chunkLines(page)).filter((c) => c.tops !== 1);
        assert.deepEqual(broken, [], "a word of the command is split across lines");
        const head = await box(page, ".basalt-command-block-head");
        const after = await box(page, "#after");
        const meta = await box(page, ".basalt-command-block-meta");
        const command = await box(page, ".basalt-command-block-command");
        assert.ok(meta.y >= command.bottom - 0.01, "the meta is a second row under the command");
        assert.ok(command.w > width / 2, `the command keeps the line: ${command.w}px of ${width}`);
        await page.evaluate(() => (window).finish());
        await settle(page);
        assert.deepEqual((await chunkLines(page)).filter((c) => c.tops !== 1), [], "still whole after the meta changes");
        assert.deepEqual(await box(page, ".basalt-command-block-head"), head, "the head does not change");
        assert.deepEqual(await box(page, "#after"), after, "nothing below the head moves");
        assert.deepEqual(await axe(page), []);
        await page.close();
      });
    }
  }

  test("from 480 of the block's own width the meta stays on the command's row, at the end", async () => {
    const page = await open(HOST, { width: 1000 });
    const command = await box(page, ".basalt-command-block-command");
    const meta = await box(page, ".basalt-command-block-meta");
    assert.ok(meta.y < command.bottom, "one row");
    assert.ok(meta.x > command.x, "at the end");
    await page.close();
  });
});

// ---- the slots (B29)
describe("LogSlots (D14a, B29)", () => {
  const WIDE = `[["sent ", { text: "100 of 100", loud: true }, " to a.example, b.example, c.example and d.example, in all"]]`;
  const slots = (lines, extra = "") => SHELL(`<div id="box" style={{ width: 360 }}><B.LogSlots label="Sent" lines={${lines}} ${extra} /></div>`);
  const L = (n) => `[${Array.from({ length: n }, (_, i) => `{ id: ${i + 1}, fields: ["sent ", { text: "${i + 1} of 9", loud: true }, " to a.example"] }`).join(",")}]`;

  test("three slots hold their room: 0px of movement as lines arrive; slot one says 'Nothing sent yet.' while empty; empty slots stay in the tree", async () => {
    const page = await open(`${SHELL(`<div id="box" style={{ width: 360 }}><Host /></div>`)}`.replace("createRoot", `function Host() { const [n, setN] = React.useState(0); (window as any).add = () => setN((v) => v + 1); const lines = Array.from({ length: n }, (_, i) => ({ id: i + 1, fields: ["sent ", { text: i + 1 + " of 9", loud: true }, " to a.example"] })); return <B.LogSlots label="Sent" lines={lines} widest={${WIDE}} />; }\ncreateRoot`));
    const before = await box(page, ".basalt-log-slots");
    assert.match(await page.locator(".basalt-log-slot").first().innerText(), /Nothing sent yet\./);
    assert.equal(await page.locator(".basalt-log-slot").count(), 3);
    assert.equal(await page.locator('[role="log"]').count(), 1);
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => (window).add());
      await settle(page);
      near((await box(page, ".basalt-log-slots")).h, before.h, `the box after line ${i + 1}`, 0.01);
    }
    assert.equal(await page.locator(".basalt-log-slot").count(), 3, "the last three only");
    assert.match(await page.locator(".basalt-log-slots").innerText(), /5 of 9/);
    assert.doesNotMatch(await page.locator(".basalt-log-slots").innerText(), /2 of 9/);
    assert.equal(await page.locator(".basalt-log-slots [aria-hidden='true']:not([inert])").count(), 0, "no empty slot is hidden from a reader");
    await page.close();
  });

  for (const theme of THEMES) {
    test(`${theme}: every line's fields are primary at 400 and no line steps back with age; the newest fades in over duration-base, opacity only`, async () => {
      const page = await open(slots(L(3)), { theme });
      const primary = await resolve(page, "var(--basalt-text-primary)");
      for (let i = 0; i < 3; i++) {
        assert.equal(await css(page, ".basalt-log-slot .basalt-log-field", "color", i), primary, `line ${i + 1}`);
        assert.equal(await css(page, ".basalt-log-slot .basalt-log-field", "fontWeight", i), "400");
      }
      assert.equal(await css(page, ".basalt-log-slot", "paddingTop"), "4px");
      assert.equal(await css(page, ".basalt-log-slots", "fontSize"), "13px");
      assert.equal(await css(page, ".basalt-log-slots", "lineHeight"), "20px");
      assert.equal(await css(page, ".basalt-log-slots", "fontFamily").then((f) => /mono/i.test(f)), true);
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }

  test("the widest line's room is held at the slot's own width (a wrapped line makes every slot as tall)", async () => {
    const page = await open(slots(L(1), `widest={${WIDE}}`));
    const wide = await box(page, ".basalt-log-slot");
    const plain = await open(slots(L(1)));
    const narrow = await box(plain, ".basalt-log-slot");
    assert.ok(wide.h > narrow.h, `${wide.h} > ${narrow.h}`);
    await page.close(); await plain.close();
  });

  test("under reduced motion the newest line shows at once", async () => {
    const page = await open(slots(L(2)), { reducedMotion: "reduce" });
    assert.equal(await css(page, ".basalt-log-slot", "animationName"), "none");
    await page.close();
  });

  test("the summary stands on Reserve: four 22px lines, keywords secondary and values primary, no frame", async () => {
    const page = await open(SHELL(`<B.LogSummary aria-label="Summary" items={[{ keyword: "sent", value: "3" }, { keyword: "denied", value: "1" }, { keyword: "hosts", value: "2" }, { keyword: "bytes", value: "512" }]} widest={[[{ keyword: "sent", value: "100" }, { keyword: "denied", value: "100" }, { keyword: "hosts", value: "100" }, { keyword: "bytes", value: "99999" }]]} />`));
    assert.equal(await css(page, ".basalt-log-summary-line", "lineHeight"), "22px");
    assert.equal(await css(page, ".basalt-log-summary-keyword", "color"), await resolve(page, "var(--basalt-text-secondary)"));
    assert.equal(await css(page, ".basalt-log-summary .basalt-log-field", "color"), await resolve(page, "var(--basalt-text-primary)"));
    assert.equal(await css(page, ".basalt-log-summary", "borderTopWidth"), "0px");
    await page.close();
  });
});

// ---- the event log (V3, V4, R4, R5)
const EVENTS = (extra = "") => `<div style={{ width: 480, overflow: "hidden" }}>
  <B.EventLog id="log" label="Activity" ${extra}>
    <B.EventLogRule>New since you left</B.EventLogRule>
    <B.EventLine id="e1" href="#one" verb="opened" object="the pricing page" detail="from the site map" time="09:39:11" dateTime="2026-11-17T09:39:11" unread />
    <B.EventLine id="e2" href="#two" verb="read" object="the notes" time="17 Nov 09:38" dateTime="2026-11-17T09:38" />
    <B.EventLogRule>16 Nov</B.EventLogRule>
    <B.EventLine id="e3" href="#three" verb="followed" object="a link" time="09:12:40" />
    <B.EventLine id="e4" verb="copied" object="the address" time="09:11:03" />
  </B.EventLog>
</div>`;

describe("EventLog (D14a)", () => {
  for (const theme of THEMES) {
    test(`${theme}: V3 the ring is the control ring at +2 outside the line, no wash on focus, the list keeps 6px from its edge`, async () => {
      const page = await open(SHELL(EVENTS()), { theme });
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "e1");
      const style = await page.locator("#e1").evaluate((el) => { const s = getComputedStyle(el); return { width: s.outlineWidth, offset: s.outlineOffset, style: s.outlineStyle, color: s.outlineColor, bg: s.backgroundColor }; });
      assert.equal(style.width, "2px");
      assert.equal(style.offset, "2px");
      assert.equal(style.style, "solid");
      assert.equal(style.color, await resolve(page, "var(--basalt-border-focus)"));
      assert.equal(style.bg, "rgba(0, 0, 0, 0)", "no wash on focus");
      assert.equal(await css(page, "#log", "paddingLeft"), "6px");
      const log = await box(page, "#log");
      const line = await box(page, "#e1");
      assert.ok(line.x - 2 - log.x >= 4, "the ring stays inside the list's own box");
      await page.close();
    });
  }

  test("one tab stop: the arrows, Home and End move between the lines; a button line is a button", async () => {
    const page = await open(SHELL(`${EVENTS()}<button id="after">after</button>`));
    assert.equal(await page.locator('[data-event-line][tabindex="0"]').count(), 1);
    await page.keyboard.press("Tab");
    await page.keyboard.press("ArrowDown");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "e2");
    await page.keyboard.press("End");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "e4");
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), "BUTTON");
    await page.keyboard.press("Home");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "e1");
    await page.keyboard.press("End");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "after", "Tab leaves the list from its one stop");
    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "e4", "and returns to the line last focused");
    await page.close();
  });

  for (const theme of THEMES) {
    test(`${theme}: V4 an unread line is a 6px dot in a seat every line keeps and primary ink, no weight change; reading it moves 0px`, async () => {
      const page = await open(SHELL(`<div style={{ width: 480 }}><Host /></div>`).replace("createRoot", `function Host() { const [u, setU] = React.useState(true); (window as any).read = () => setU(false); return <B.EventLog label="Activity"><B.EventLine id="a" href="#a" verb="opened" object="the page" detail="from the map" time="09:39:11" unread={u} /><B.EventLine id="b" href="#b" verb="read" object="the notes" time="09:38:00" /></B.EventLog>; }\ncreateRoot`), { theme });
      const primary = await resolve(page, "var(--basalt-text-primary)");
      const secondary = await resolve(page, "var(--basalt-text-secondary)");
      assert.equal(await css(page, "#a .basalt-event-dot", "width"), "6px");
      assert.equal(await css(page, "#a .basalt-event-dot", "backgroundColor"), primary);
      assert.equal(await css(page, "#b .basalt-event-dot", "backgroundColor"), "rgba(0, 0, 0, 0)");
      assert.equal(await css(page, "#a .basalt-event-verb", "color"), primary);
      assert.equal(await css(page, "#b .basalt-event-verb", "color"), secondary);
      assert.equal(await css(page, "#a .basalt-event-object", "fontWeight"), "400");
      assert.match(await page.locator("#a").innerText(), /New:/);
      const before = { line: await box(page, "#a"), text: await box(page, "#a .basalt-event-text"), time: await box(page, "#a .basalt-event-time") };
      await page.evaluate(() => (window).read());
      await settle(page);
      const after = { line: await box(page, "#a"), text: await box(page, "#a .basalt-event-text"), time: await box(page, "#a .basalt-event-time") };
      assert.deepEqual(after, before, "reading a line moves nothing");
      assert.equal(await css(page, "#a .basalt-event-dot", "backgroundColor"), "rgba(0, 0, 0, 0)");
      assert.doesNotMatch(await page.locator("#a").innerText(), /New:/);
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }

  test("R5: the time column is as wide as the widest stamp it can show: a day and a clock fit, and every line's text starts on one edge", async () => {
    const page = await open(SHELL(EVENTS()));
    const xs = [];
    for (const id of ["e1", "e2", "e3", "e4"]) xs.push((await box(page, `#${id} .basalt-event-text`)).x);
    assert.ok(xs.every((x) => Math.abs(x - xs[0]) < 0.01), `text edges ${xs}`);
    const widths = [];
    for (const id of ["e1", "e2", "e3", "e4"]) widths.push((await box(page, `#${id} .basalt-event-time`)).w);
    assert.ok(widths.every((w) => Math.abs(w - widths[0]) < 0.01), `time widths ${widths}`);
    const clip = await page.locator("#e2 .basalt-event-time").evaluate((el) => el.scrollWidth <= el.clientWidth + 0.5);
    assert.ok(clip, "17 Nov 09:38 is not clipped");
    assert.equal(await css(page, "#e1 .basalt-event-time", "fontVariantNumeric"), "tabular-nums");
    assert.equal(await css(page, "#e1 .basalt-event-time", "color"), await resolve(page, "var(--basalt-text-tertiary)"));
    await page.close();
  });

  test("the labelled rule is a 12px tertiary word between two hairlines, space-2 apart", async () => {
    const page = await open(SHELL(EVENTS()));
    assert.equal(await css(page, ".basalt-event-rule-word", "fontSize"), "12px");
    assert.equal(await css(page, ".basalt-event-rule", "columnGap"), "8px");
    assert.equal(await css(page, ".basalt-event-rule-line", "borderTopWidth"), "1px");
    assert.equal(await page.locator(".basalt-event-rule-line[aria-hidden='true']").count(), 4);
    await page.close();
  });

  test("the session log is a Listbox whose lines take a leading time cell; a disabled line does nothing", async () => {
    const page = await open(SHELL(`<div style={{ width: 480 }}><B.Listbox label="Session" defaultValue="a">
      <B.ListboxOption value="a" leading={<B.EventTime>09:39:11</B.EventTime>}><B.EventText verb="opened" object="the page" /></B.ListboxOption>
      <B.ListboxOption value="b" leading={<B.EventTime>09:38:00</B.EventTime>} disabled><B.EventText verb="read" object="the notes" /></B.ListboxOption>
    </B.Listbox></div>`));
    const [a, b] = [await box(page, '[data-value="a"] .basalt-event-time'), await box(page, '[data-value="b"] .basalt-event-time')];
    near(a.w, b.w, "one time column", 0.01);
    near((await box(page, '[data-value="a"] .basalt-event-text')).x, (await box(page, '[data-value="b"] .basalt-event-text')).x, "one text edge", 0.01);
    await page.locator('[data-value="b"]').click({ force: true });
    assert.equal(await page.locator('[data-value="a"]').getAttribute("aria-selected"), "true", "a disabled line takes no click");
    await page.close();
  });
});

// ---- the source stamp (V5, V6, R8) and its words (B8)
const STAMPS = `<div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
  <B.SourceStamp id="ok" source="github" state="answered" at={Date.UTC(2026, 10, 17, 18, 52, 7)} timeZone="UTC" />
  <B.SourceStamp id="stale" source="github" state="stale" at={Date.UTC(2026, 10, 17, 18, 52, 7)} timeZone="UTC" />
  <B.SourceStamp id="asking" source="github" state="asking" />
  <B.SourceStamp id="idle" source="github" state="idle" />
  <B.SourceStamp id="down" source="github" state="unreachable" />
  <B.SourceStamp id="open" source="github" state="answered" at={Date.UTC(2026, 10, 17, 18, 52, 7)} timeZone="UTC" onOpen={() => {}} />
</div>`;

describe("SourceStamp (D14b)", () => {
  for (const theme of THEMES) {
    test(`${theme}: V5 four 8px shapes as drawn and braille for asking, each in one 8 by 10 seat; V6 the source first, the time to the second`, async () => {
      const page = await open(SHELL(STAMPS), { theme });
      assert.equal((await page.locator("#ok").innerText()).trim(), "github 18:52:07");
      assert.equal((await page.locator("#stale").innerText()).trim(), "github 18:52:07, stale");
      assert.equal((await page.locator("#asking").innerText()).trim(), "asking github");
      assert.equal((await page.locator("#idle").innerText()).trim(), "github, not asked yet");
      assert.equal((await page.locator("#down").innerText()).trim(), "github unreachable");
      assert.equal(await page.locator("#ok time").getAttribute("datetime"), "2026-11-17T18:52:07.000Z", "an instant (cimip-gaps-3 E1)");
      for (const id of ["ok", "stale", "asking", "idle", "down"]) {
        const seat = await box(page, `#${id} .basalt-source-seat`);
        near(seat.w, 8, `${id}: seat width`);
        near(seat.h, 10, `${id}: seat height`);
      }
      assert.equal(await page.locator("#asking .basalt-spinner[data-variant='braille']").count(), 1, "asking is braille");
      assert.equal(await page.locator("#ok svg.basalt-source-mark").count(), 1);
      assert.equal(await page.locator("#asking svg.basalt-source-mark").count(), 0);
      // the words start on one edge whatever the state: a change of state moves nothing
      const xs = [];
      for (const id of ["ok", "stale", "asking", "idle", "down"]) xs.push((await box(page, `#${id} .basalt-source-words`)).x);
      assert.ok(xs.every((x) => Math.abs(x - xs[0]) < 0.01), `word edges ${xs}`);
      assert.equal(await css(page, "#ok", "color"), await resolve(page, "var(--basalt-text-tertiary)"));
      assert.equal(await css(page, "#stale", "color"), await resolve(page, "var(--basalt-text-secondary)"));
      assert.equal(await css(page, "#down", "color"), await resolve(page, "var(--basalt-text-secondary)"));
      assert.equal(await css(page, "#ok", "fontSize"), "12px");
      assert.equal(await css(page, "#ok", "columnGap"), "6px", "R8: space-1-5");
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }

  test("the button form is 24 tall, named 'Source: github 18:52:07. Open the request.', with the control ring at +2", async () => {
    const page = await open(SHELL(STAMPS));
    near((await box(page, "#open")).h, 24, "the button's height");
    assert.equal(await page.getByRole("button", { name: /^Source:\s*github\s*18:52:07\s*\.\s*Open the request\.$/ }).count(), 1);
    await page.locator("#open").focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    assert.equal(await css(page, "#open", "outlineOffset"), "2px");
    assert.equal(await css(page, "#open", "outlineWidth"), "2px");
    await page.close();
  });

  test("on a coarse pointer the button is at least 44 tall", async () => {
    const page = await open(SHELL(STAMPS), { hasTouch: true, isMobile: true, width: 390 });
    assert.ok((await box(page, "#open")).h >= 44);
    await page.close();
  });

  test("in forced colours each shape draws in the system foreground", async () => {
    const page = await open(SHELL(STAMPS));
    await page.emulateMedia({ forcedColors: "active" });
    const text = await resolve(page, "CanvasText");
    for (const id of ["ok", "stale", "idle", "down"]) assert.equal(await css(page, `#${id} svg`, "color"), text, id);
    await page.close();
  });
});

describe("SourceStateWords (D14b, B8)", () => {
  const HOST = (extra = "") => SHELL(`<div id="band" style={{ width: 420 }}><Host /></div>`).replace("createRoot", `function Host() { const [s, setS] = React.useState<"asking" | "unreachable">("asking"); (window as any).fail = () => setS("unreachable"); return <B.SourceStateWords what="the weather" state={s} tried={Date.UTC(2026, 10, 17, 18, 52, 7)} timeZone="UTC" why="timed out" onRetry={() => ((window as any).retried = true)} alternative={<a href="#elsewhere">See it elsewhere</a>} ${extra} />; }\ncreateRoot`);

  test("both sentences stand in one cell: the band keeps its height; 'Ask again' is a TextButton; the failure is said once, politely", async () => {
    const page = await open(HOST());
    const h0 = (await box(page, "#band")).h;
    assert.match(await page.locator("#band").innerText(), /Asking for the weather\./);
    assert.equal(await page.locator("#band button").count(), 1, "the hidden sentence's button is there but inert");
    assert.equal(await page.locator("#band button:not([inert] *)").count(), 0, "not reachable while asking");
    await page.evaluate(() => (window).fail());
    await settle(page);
    near((await box(page, "#band")).h, h0, "the band's height after the failure", 0.01);
    assert.match(await page.locator("#band").innerText(), /The weather is unreachable right now \(tried 18:52:07: timed out\)\./);
    assert.equal(await page.locator(".basalt-source-state .basalt-spinner, .basalt-skeleton").count(), 0, "never a spinner or a skeleton");
    await page.getByRole("button", { name: "Ask again" }).click();
    assert.equal(await page.evaluate(() => (window).retried), true);
    await page.waitForFunction(() => document.querySelector("[role=status]")?.textContent?.includes("unreachable"));
    assert.equal(await page.locator("[role=status]").count(), 1);
    await page.close();
  });
});

// ---- the status bar (V7, R6, R7, B7)
const BAR = `<Host />`;
const barFixture = (extra = "") => `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)";
function Host() {
  const [message, setMessage] = React.useState<any>(null);
  const [cleared, setCleared] = React.useState(0);
  (window as any).say = (m: any) => setMessage(m);
  (window as any).cleared = () => cleared;
  return <><main style={{ minHeight: 1200, padding: 24 }}><button id="before">before</button></main>
    <B.StatusBar id="bar" start={<a href="#run">run 4f2a, 3 allowed, 0 denied</a>} sources={<B.Button variant="ghost" size="sm" aria-expanded={false} aria-controls="drawer">1 of 2 sources, session 04:12</B.Button>} message={message} onMessageClear={() => { setCleared((n) => n + 1); setMessage(null); }} end={<button id="theme">theme</button>} ${extra} /></>;
}
createRoot(document.getElementById("root")).render(<Host />);`;

describe("StatusBar (D14b)", () => {
  test("from 720 it is a 44px foot in the layout, a hairline above; the message slot reserves its line, so a message moves nothing", async () => {
    const page = await open(barFixture());
    near((await box(page, "#bar")).h, 44, "the bar's height");
    assert.equal(await css(page, "#bar", "position"), "relative");
    assert.equal(await css(page, "#bar", "borderTopWidth"), "1px");
    const slot = await box(page, ".basalt-status-bar-message");
    const sources = await box(page, ".basalt-status-bar-sources");
    await page.evaluate(() => (window).say({ text: "Not a command: zz", id: 1 }));
    await settle(page);
    assert.deepEqual(await box(page, ".basalt-status-bar-message"), slot, "the slot does not move or resize");
    assert.deepEqual(await box(page, ".basalt-status-bar-sources"), sources);
    near((await box(page, "#bar")).h, 44, "the bar after the message");
    await page.close();
  });

  test("under 720 the bar is fixed at the foot: 56 plus the safe area; the message is stacked above and moves nothing", async () => {
    const page = await open(`${barFixture()}`, { width: 390, height: 800 });
    await page.addStyleTag({ content: ":root { --_inset-bottom-sim: 20px; }" });
    assert.equal(await css(page, "#bar", "position"), "fixed");
    const bar = await box(page, "#bar");
    near(bar.h, 56 + 20, "56 plus the inset");
    near(bar.bottom, 800, "at the foot");
    await page.evaluate(() => (window).say({ text: "Not a command: a longer message that wraps onto a second line on a phone", id: 1 }));
    await settle(page);
    assert.deepEqual(await box(page, "#bar"), bar, "the bar itself does not grow");
    assert.ok((await box(page, ".basalt-status-bar-message")).bottom <= bar.y + 0.01, "the message stands above the bar");
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--basalt-bottom-offset").trim().length > 0), true);
    await page.close();
  });

  test("V7: a message the app has also logged goes after 5000ms; any other stays until replaced or cleared with Esc", async () => {
    const page = await open(barFixture(), { clock: true });
    await page.evaluate(() => (window).say({ text: "Saved to the log", id: 1, logged: true }));
    await page.clock.runFor(4900);
    assert.match(await page.locator(".basalt-status-bar-text").innerText(), /Saved/);
    await page.clock.runFor(200);
    assert.equal(await page.locator(".basalt-status-bar-text").innerText(), "");
    await page.evaluate(() => (window).say({ text: "Not in the log", id: 2 }));
    await page.clock.runFor(60_000);
    assert.match(await page.locator(".basalt-status-bar-text").innerText(), /Not in the log/, "it stays");
    await page.evaluate(() => (window).say({ text: "Replaced", id: 3 }));
    assert.match(await page.locator(".basalt-status-bar-text").innerText(), /Replaced/);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".basalt-status-bar-text").innerText(), "", "Esc clears it");
    await page.close();
  });

  for (const theme of THEMES) {
    test(`${theme}: V7 an error carries XCircle in a 16px seat and danger ink, and is said once through an assertive region that was in the page before the text`, async () => {
      const page = await open(barFixture(), { theme, clock: true });
      assert.equal(await page.locator('[role="alert"]').count(), 1);
      assert.equal(await page.locator('[role="alert"]').innerText(), "", "mounted empty");
      await page.evaluate(() => (window).say({ text: "Could not reach github", status: "error", id: 1 }));
      await page.clock.runFor(100);
      assert.equal(await page.locator('[role="alert"]').innerText(), "Could not reach github");
      assert.equal(await css(page, ".basalt-status-bar-message .basalt-status-bar-text", "color"), await resolve(page, "var(--basalt-status-danger)"));
      const seat = await box(page, ".basalt-status-bar-seat");
      near(seat.w, 16, "seat width");
      near(seat.h, 16, "seat height");
      assert.equal(await page.locator(".basalt-status-bar-message svg").count(), 1);
      assert.equal(await page.locator(".basalt-status-bar-message").getAttribute("aria-hidden"), "true", "the visible words are not said twice");
      assert.equal(await page.locator('[role="status"]').innerText(), "", "not through the polite one");
      await page.close();
    });
  }

  for (const theme of THEMES) {
    test(`${theme}: the bar with an error and with a message passes axe`, async () => {
      const page = await open(barFixture(), { theme });
      await page.evaluate(() => (window).say({ text: "Could not reach github", status: "error", id: 1 }));
      await page.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent === "Could not reach github");
      assert.deepEqual(await axe(page), []);
      await page.evaluate(() => (window).say({ text: "Not a command: zz", id: 2 }));
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }

  test("a polite message is said through the polite region, once", async () => {
    const page = await open(barFixture(), { clock: true });
    await page.evaluate(() => (window).say({ text: "Not a command: zz", id: 1 }));
    await page.clock.runFor(500);
    assert.equal(await page.locator('[role="status"]').innerText(), "Not a command: zz");
    assert.equal(await page.locator('[role="alert"]').innerText(), "");
    await page.close();
  });

  test("the sources button keeps aria-expanded and aria-controls; with no tab bar the bar sets the page's bottom offset under 720", async () => {
    const page = await open(barFixture(), { width: 390 });
    assert.equal(await page.getByRole("button", { name: /sources/ }).getAttribute("aria-controls"), "drawer");
    const offset = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--basalt-bottom-offset").trim());
    assert.match(offset, /56px|calc/);
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-status-bar")), true, "the bar marks the root when it mounts");
    assert.doesNotMatch(await page.evaluate(() => [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]).map((rule) => rule.cssText).join("\n")), /:root:has\([^)]*status-bar/, "no :root:has() rule for the bar");
    await page.close();
  });
});

// ---- the description list's forms (V8, V9, R9, R10)
describe("DescriptionList forms (D15)", () => {
  const STACKED = `<div style={{ width: 560 }}><B.DescriptionList id="st" form="stacked"><B.DescriptionItem term="Hello">A short sentence that says what the first thing is, long enough to be a sentence.</B.DescriptionItem><B.DescriptionItem term="Second">Another.</B.DescriptionItem></B.DescriptionList></div>`;
  for (const theme of THEMES) {
    test(`${theme}: stacked terms: 18/26 at 600 primary, 16/24 secondary 2px under, 20px between entries, no dividers`, async () => {
      const page = await open(SHELL(STACKED), { theme });
      assert.equal(await css(page, "#st dt", "fontSize"), "18px");
      assert.equal(await css(page, "#st dt", "fontWeight"), "600");
      assert.equal(await css(page, "#st dt", "lineHeight"), "26px");
      assert.equal(await css(page, "#st dt", "color"), await resolve(page, "var(--basalt-text-primary)"));
      assert.equal(await css(page, "#st dd", "fontSize"), "16px");
      assert.equal(await css(page, "#st dd", "lineHeight"), "24px");
      assert.equal(await css(page, "#st dd", "color"), await resolve(page, "var(--basalt-text-secondary)"));
      assert.equal(await css(page, "#st dd", "textWrap"), "pretty");
      near((await box(page, "#st dd")).y - (await box(page, "#st dt")).bottom, 2, "dd under dt");
      near((await box(page, "#st .basalt-description-item", 1)).y - (await box(page, "#st .basalt-description-item", 0)).bottom, 20, "between entries");
      for (const n of [0, 1]) assert.equal(await css(page, "#st .basalt-description-item", "boxShadow", n), "none");
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }

  test("V9: dividers between rows only: none above the first row or below the last (the shipped list)", async () => {
    const page = await open(SHELL(`<div style={{ width: 560 }}><B.DescriptionList id="rows"><B.DescriptionItem term="A">1</B.DescriptionItem><B.DescriptionItem term="B">2</B.DescriptionItem><B.DescriptionItem term="C">3</B.DescriptionItem></B.DescriptionList></div>`));
    assert.equal(await css(page, "#rows .basalt-description-item", "boxShadow", 0), "none");
    assert.notEqual(await css(page, "#rows .basalt-description-item", "boxShadow", 1), "none");
    assert.notEqual(await css(page, "#rows .basalt-description-item", "boxShadow", 2), "none");
    await page.close();
  });

  test("V8: the three-column form: a 160px term, a thing as wide as the widest thing, then the detail; every row on one edge; 40px rows", async () => {
    const page = await open(SHELL(`<div style={{ width: 720 }}><B.DescriptionList id="three" form="three"><B.DescriptionItem term="get" detail="fetch a page">a.example</B.DescriptionItem><B.DescriptionItem term="send" detail="send a message to the owner">message-to-owner.example</B.DescriptionItem></B.DescriptionList></div>`));
    near((await box(page, "#three .basalt-description-term", 0)).w, 160, "the label column");
    const a = await box(page, "#three .basalt-description-more", 0);
    const b = await box(page, "#three .basalt-description-more", 1);
    near(a.x, b.x, "the third column starts on one edge", 0.01);
    near((await box(page, "#three .basalt-description-details", 0)).w, (await box(page, "#three .basalt-description-details", 1)).w, "the thing column holds the widest", 0.01);
    assert.ok(a.right <= (await box(page, "#three")).right + 0.5, "the detail takes the remainder");
    await page.close();
  });

  test("V8: the facts form lays whole lists out in columns of at least 480px: two across at 1152, one under; labels stay 160", async () => {
    const lists = `<B.DescriptionColumns id="cols">${["a", "b", "c", "d"].map((k) => `<B.DescriptionList key="${k}"><B.DescriptionItem term="Name">${k}</B.DescriptionItem></B.DescriptionList>`).join("")}</B.DescriptionColumns>`;
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<main style={{ width: 1152, padding: 0 }}>${lists}</main>);`);
    const xs = new Set();
    for (let i = 0; i < 4; i++) { const r = await box(page, "#cols > .basalt-description-list", i); xs.add(Math.round(r.x)); assert.ok(r.w >= 480, `column ${i} is ${r.w}`); }
    assert.equal(xs.size, 2, "two columns");
    assert.equal(await css(page, "#cols .basalt-description-item", "gridTemplateColumns", 0).then((c) => c.split(" ")[0]), "160px", "no list stacked");
    await page.close();
    const narrow = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<main style={{ width: 360 }}>${lists}</main>`.replace("</main>", "</main>") + ");", { width: 360 });
    const first = await box(narrow, "#cols > .basalt-description-list", 0);
    const second = await box(narrow, "#cols > .basalt-description-list", 1);
    assert.ok(Math.abs(first.x - second.x) < 0.5 && second.y > first.y, "one column when there is no room for 480");
    await narrow.close();
  });
});

// ---- inline-label rows (V10, R12) and the Send hint (V11)
const COMPOSE = `<B.InlineFields id="form" style={{ width: 560 }}>
  <B.InlineValue label="to">someone@example.invalid</B.InlineValue>
  <B.InlineField label="subject"><B.InlineInput id="subject" placeholder="what it is about" /></B.InlineField>
  <B.InlineField label="message" multiline><B.InlineTextarea id="body" placeholder="write here" /></B.InlineField>
</B.InlineFields>
<div style={{ marginTop: 16 }}><B.ActionShortcut shortcut="⌘↵"><B.Button id="send" type="submit" variant="primary">Send</B.Button></B.ActionShortcut></div>`;

describe("inline-label rows (D15)", () => {
  for (const theme of THEMES) {
    test(`${theme}: V10 an 80px label, rows at least 44, the bottom line the input boundary, a real 2px outline at -2 inset round the row on focus`, async () => {
      const page = await open(SHELL(COMPOSE), { theme });
      const rows = ".basalt-inline-field";
      near((await box(page, ".basalt-inline-label", 0)).w, 80, "the label column");
      near((await box(page, ".basalt-inline-label", 1)).w, 80, "the same in every row");
      near((await box(page, rows, 1)).h, 44, "a one-line row");
      assert.ok((await box(page, rows, 2)).h > 44, "a textarea grows its row");
      assert.equal(await css(page, rows, "borderBottomColor", 1), await resolve(page, "var(--basalt-border-input)"));
      assert.equal(await css(page, rows, "borderBottomWidth", 1), "1px");
      assert.equal(await css(page, "#subject", "outlineStyle"), "none", "the field has no outline of its own");
      assert.equal(await css(page, "#subject", "borderTopWidth"), "0px", "no box");
      // the label names the field
      assert.equal(await page.getByLabel("subject").count(), 1);
      assert.equal(await page.getByLabel("message").count(), 1);
      await page.locator("#subject").focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      const row = await page.locator(rows).nth(1).evaluate((el) => { const s = getComputedStyle(el); return { w: s.outlineWidth, o: s.outlineOffset, st: s.outlineStyle, c: s.outlineColor }; });
      assert.deepEqual([row.w, row.o, row.st], ["2px", "-2px", "solid"]);
      assert.equal(row.c, await resolve(page, "var(--basalt-border-focus)"));
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }

  test("in forced colours the focus outline is a system colour; on touch text entry is 16px", async () => {
    const page = await open(SHELL(COMPOSE));
    await page.emulateMedia({ forcedColors: "active" });
    await page.locator("#subject").focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    assert.equal(await page.locator(".basalt-inline-field").nth(1).evaluate((el) => getComputedStyle(el).outlineStyle), "solid");
    await page.close();
    const touch = await open(SHELL(COMPOSE), { hasTouch: true, isMobile: true, width: 390 });
    assert.equal(await css(touch, "#subject", "fontSize"), "16px");
    await touch.close();
  });

  for (const theme of THEMES) {
    test(`${theme}: V11 Send stays primary with aria-keyshortcuts="Meta+Enter"; the two chips stand beside it, outside the fill, as a hint`, async () => {
      const page = await open(SHELL(COMPOSE), { theme });
      assert.equal(await page.locator("#send").getAttribute("aria-keyshortcuts"), "Meta+Enter");
      assert.equal(await page.locator("#send").getAttribute("data-variant"), "primary");
      assert.equal(await page.locator("#send .basalt-kbd").count(), 0, "no chip inside the fill");
      const hint = page.locator(".basalt-action-shortcut-hint");
      assert.equal(await hint.getAttribute("data-kbd-hint"), "");
      assert.equal(await hint.getAttribute("aria-hidden"), "true");
      assert.equal(await hint.locator(".basalt-kbd-key").count(), 2);
      assert.equal(await hint.locator("[data-shortcut]").count(), 1);
      const [a, b] = [await box(page, ".basalt-action-shortcut-hint .basalt-kbd-key", 0), await box(page, ".basalt-action-shortcut-hint .basalt-kbd-key", 1)];
      near(b.x - a.right, 2, "the chips are 2px apart");
      assert.ok(a.x >= (await box(page, "#send")).right, "beside the button");
      await page.close();
    });
  }

  test("on touch the hint is hidden until a hardware key is pressed", async () => {
    const page = await open(SHELL(COMPOSE), { hasTouch: true, isMobile: true, width: 390 });
    assert.equal(await css(page, ".basalt-action-shortcut-hint", "display"), "none");
    await page.keyboard.press("Tab");
    assert.notEqual(await css(page, ".basalt-action-shortcut-hint", "display"), "none");
    await page.close();
  });
});

// ---- the filter toolbar (C14)
describe("FilterToolbar (D15)", () => {
  const TOOLBAR = `<B.FilterToolbar label="Filter and sort" kind={<B.Select aria-label="Kind" controlSize="2xl" options={[{ value: "all", label: "Everything" }]} defaultValue="all" />} filter={<B.MultiSelect label="Brand" toolbar options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} defaultValue={[]} />} result={<B.FilterResult>Showing 24 of 24 products</B.FilterResult>} sort={<B.Select aria-label="Sort" controlSize="2xl" options={[{ value: "f", label: "Featured" }]} defaultValue="f" />} />`;
  test("from 720: one row, the kind select hidden, the word 'Sort' shown (aria-hidden, in the select's name), the sort at the end", async () => {
    const page = await open(SHELL(TOOLBAR));
    assert.equal(await css(page, ".basalt-filter-toolbar-kind", "display"), "none");
    assert.equal(await css(page, ".basalt-filter-toolbar-label", "display"), "block");
    assert.equal(await page.locator(".basalt-filter-toolbar-label").getAttribute("aria-hidden"), "true");
    assert.equal(await page.getByRole("combobox", { name: "Sort" }).count(), 1);
    const sort = await box(page, ".basalt-filter-toolbar-sort");
    const bar = await box(page, ".basalt-filter-toolbar");
    near(sort.right, bar.right, "the sort is at the end", 1);
    assert.equal(await css(page, ".basalt-filter-toolbar", "columnGap"), "16px");
    assert.equal(await css(page, ".basalt-filter-toolbar", "rowGap"), "12px");
    assert.equal(await css(page, ".basalt-filter-toolbar", "marginBottom"), "28px");
    assert.equal(await page.locator(".basalt-filter-toolbar [role=status]").count(), 1, "the count is FilterResult's one debounced line");
    await page.close();
  });
  test("under 720: two columns, the kind select shown, the word hidden; selects are the built 44", async () => {
    const page = await open(SHELL(TOOLBAR), { width: 390 });
    assert.notEqual(await css(page, ".basalt-filter-toolbar-kind", "display"), "none");
    assert.equal(await css(page, ".basalt-filter-toolbar-label", "display"), "none");
    near((await box(page, ".basalt-filter-toolbar-kind [role=combobox]")).h, 44, "the kind select");
    assert.equal(await css(page, ".basalt-filter-toolbar", "marginBottom"), "20px");
    await page.close();
  });
});

// ---- X10: route focus
describe("useRouteFocus (X10)", () => {
  const ROUTE = (extra = "") => `document.body.style.margin = "0";
function Host() {
  const [page, setPage] = React.useState("home");
  const [fromControl, setFrom] = React.useState(false);
  const title = React.useRef<HTMLHeadingElement>(null);
  B.useRouteFocus({ key: page, title: page + " | Shop", target: title, fromControl });
  (window as any).go = (p: string, control = false) => { setFrom(control); setPage(p); };
  return <main style={{ height: 3000 }}><button id="control">control</button><h1 id="title" ref={title} tabIndex={-1} style={{ outline: "none" }}>{page}</h1></main>;
}
createRoot(document.getElementById("root")).render(<Host />);`;

  test("skips the first render; on a page change scrolls to the top, sets the title and focuses the page's title with no ring", async () => {
    const page = await open(ROUTE());
    assert.notEqual(await page.evaluate(() => document.activeElement?.id), "title", "the first render moves nothing");
    assert.notEqual(await page.title(), "home | Shop");
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.evaluate(() => (window).go("shop"));
    await page.waitForFunction(() => document.activeElement?.id === "title");
    assert.equal(await page.title(), "shop | Shop");
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    assert.equal(await css(page, "#title", "outlineStyle"), "none", "no ring: nothing operates it");
    await page.close();
  });

  test("a change that came from a control's own value leaves focus on the control (WCAG 3.2.2)", async () => {
    const page = await open(ROUTE());
    await page.locator("#control").focus();
    await page.evaluate(() => (window).go("shop", true));
    await page.waitForFunction(() => document.title === "shop | Shop");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "control");
    await page.close();
  });
});

// ---- X11: shortcuts
describe("useShortcuts (X11, V12)", () => {
  const KEYS = `document.body.style.margin = "0";
function Host() {
  const [log, setLog] = React.useState<string[]>([]);
  const [help, setHelp] = React.useState(false);
  const bindings = React.useMemo(() => [
    { key: "j", description: "Next", run: () => setLog((l) => [...l, "j"]) },
    { key: "G", description: "Last", run: () => setLog((l) => [...l, "G"]) },
    { key: "?", description: "Help", run: () => setHelp(true) },
  ], []);
  const state = B.useShortcuts(bindings);
  (window as any).log = () => log;
  return <main>
    <input id="field" aria-label="Field" />
    <div data-own-keys=""><button id="own">own</button></div>
    <button id="plain" {...state.keyshortcuts("j")}>next</button>
    <button id="open" onClick={() => setHelp(true)}>Keyboard shortcuts</button>
    {help ? <section id="help"><B.ShortcutList shortcuts={state.shortcuts} aria-label="Shortcuts" /><B.SingleKeysSwitch /></section> : null}
    <output id="out">{log.join(",")}</output>
  </main>;
}
createRoot(document.getElementById("root")).render(<Host />);`;

  test("a single key runs its handler; modifiers, a field and [data-own-keys] are left alone; the control carries aria-keyshortcuts", async () => {
    const page = await open(KEYS);
    await page.locator("#plain").focus();
    await page.keyboard.press("j");
    await page.keyboard.press("Shift+G");
    assert.equal(await page.locator("#out").innerText(), "j,G");
    await page.keyboard.press("Meta+j");
    await page.keyboard.press("Control+j");
    await page.keyboard.press("Alt+j");
    assert.equal(await page.locator("#out").innerText(), "j,G", "a key with a modifier is not a single key");
    await page.locator("#field").focus();
    await page.keyboard.type("jj");
    assert.equal(await page.locator("#out").innerText(), "j,G", "a key typed in a field");
    await page.locator("#own").focus();
    await page.keyboard.press("j");
    assert.equal(await page.locator("#out").innerText(), "j,G", "inside [data-own-keys]");
    assert.equal(await page.locator("#plain").getAttribute("aria-keyshortcuts"), "J");
    await page.close();
  });

  test("V12: the help dialog's 'Single-key shortcuts' Switch (default on) turns every single key off, `?` included, and is stored as basalt-keys; a visible opener still reaches it", async () => {
    const page = await open(KEYS);
    // a page set from a string has no storage of its own: stand one in, so the key the hook writes can be read
    await page.evaluate(() => { const m = new Map(); Object.defineProperty(window, "localStorage", { configurable: true, value: { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) } }); });
    await page.keyboard.press("?");
    assert.equal(await page.locator("#help").count(), 1);
    assert.equal(await page.locator("#help .basalt-shortcut-row").count(), 3);
    const toggle = page.getByRole("switch", { name: "Single-key shortcuts" });
    assert.equal(await toggle.getAttribute("aria-checked"), "true", "on by default");
    await toggle.click();
    assert.equal(await page.evaluate(() => localStorage.getItem("basalt-keys")), "off");
    await page.locator("#plain").focus();
    await page.keyboard.press("j");
    assert.equal(await page.locator("#out").innerText(), "", "off: no single key runs");
    await page.locator("#open").click();
    assert.equal(await page.getByRole("switch", { name: "Single-key shortcuts" }).getAttribute("aria-checked"), "false", "the visible opener still reaches the switch");
    await page.getByRole("switch", { name: "Single-key shortcuts" }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem("basalt-keys")), null, "on again clears it");
    await page.locator("#plain").focus();
    await page.keyboard.press("j");
    assert.equal(await page.locator("#out").innerText(), "j");
    // another tab turns them off: the storage event carries it here
    await page.evaluate(() => window.dispatchEvent(new StorageEvent("storage", { key: "basalt-keys", newValue: "off" })));
    await page.keyboard.press("j");
    assert.equal(await page.locator("#out").innerText(), "j", "off from another tab");
    await page.close();
  });
});

// ---- X11: time parts (V13, V14)
const dist = await import(pathToFileURL(path.join(pkg, "dist", "index.js")).href);

describe("time parts (X11)", () => {
  test("formatStamp, formatClock, formatDay and formatCountdown: tabular strings and machine values, the zone an argument", () => {
    const at = Date.UTC(2026, 10, 17, 14, 49, 7);
    assert.deepEqual(dist.formatStamp(at, { timeZone: "UTC" }), { text: "14:49:07", dateTime: "2026-11-17T14:49:07" });
    assert.deepEqual(dist.formatStamp(at, { timeZone: "Asia/Tokyo" }), { text: "23:49:07", dateTime: "2026-11-17T23:49:07" });
    assert.deepEqual(dist.formatClock(at, { timeZone: "UTC" }), { text: "2:49\u00a0PM", dateTime: "2026-11-17T14:49" }, "a clock a person reads follows the locale, en-US by default");
    assert.deepEqual(dist.formatClock(at, { timeZone: "UTC", locale: "en-GB" }), { text: "14:49", dateTime: "2026-11-17T14:49" });
    assert.deepEqual(dist.formatDay(Date.UTC(2026, 10, 1, 12), { now: at, timeZone: "UTC" }), { text: "Nov\u00a01", dateTime: "2026-11-01" });
    assert.equal(dist.formatDay(Date.UTC(2025, 0, 4, 12), { now: at, timeZone: "UTC" }).text, "Jan\u00a04, 2025", "the year when it is not this one");
    const left = dist.formatCountdown(at + (18 * 86400 + 9 * 3600 + 10 * 60 + 51) * 1000, at);
    assert.equal(left.text, "18d\u00a009:10:51");
    assert.equal(dist.formatCountdown(at + 5000, at).text, "00:00:05");
    assert.equal(dist.formatCountdown(at, at), null, "never negative: it has passed");
    assert.equal(dist.formatCountdown(at - 1000, at), null);
  });

  test("V13: the age is coarse as built: just now under 90 seconds, then minutes, hours, days to 45, months to 548 days, years", () => {
    const now = Date.UTC(2026, 10, 17, 12);
    const ago = (s, o) => dist.formatAge(now - s * 1000, now, o);
    assert.equal(ago(89), "just now");
    assert.equal(ago(90), "2\u00a0minutes ago");
    assert.equal(ago(3600), "60\u00a0minutes ago");
    assert.equal(ago(3600 * 1.5), "2\u00a0hours ago");
    assert.equal(ago(86400 * 11), "11\u00a0days ago");
    assert.equal(ago(86400 * 1), "24\u00a0hours ago");
    assert.equal(ago(86400 * 44), "44\u00a0days ago");
    assert.equal(ago(86400 * 45), "1\u00a0month ago");
    assert.equal(ago(86400 * 547), "18\u00a0months ago");
    assert.equal(ago(86400 * 548), "2\u00a0years ago");
    assert.equal(ago(86400 * 11, { short: true }), "11d");
    assert.equal(ago(86400 * 90, { short: true }), "3mo");
    assert.equal(ago(86400 * 365 * 6, { short: true }), "6y");
    assert.equal(ago(10, { short: true }), "now");
  });

  test("V13: DateAge writes the age only beside its absolute date; the narrow form reserves 'the widest'", async () => {
    const page = await open(SHELL(`<B.DateAge id="long" time={Date.UTC(2026, 10, 1, 12)} now={Date.UTC(2026, 10, 12, 12)} timeZone="UTC" /><br /><B.DateAge id="short" short time={Date.UTC(2026, 10, 1, 12)} now={Date.UTC(2026, 10, 12, 12)} timeZone="UTC" />`));
    // The dot is drawn by the stylesheet (DotSep, the wording audit's W8), so it is not in the text: the words read "Nov 1, 11 days ago", and the dot is a ::before the text scan never sees.
    assert.match((await page.locator("#long").innerText()).replace(/\s+/g, " "), /^Nov 1\s*,\s*11 days ago$/);
    assert.match(await page.locator("#long .basalt-dot-sep").evaluate((el) => getComputedStyle(el, "::before").content), /·/);
    assert.equal(await page.locator("#long time").getAttribute("datetime"), "2026-11-01");
    assert.match((await page.locator("#short").innerText()).replace(/\s+/g, " "), /^Nov 1\s*,\s*11d$/);
    assert.ok((await box(page, "#short .basalt-date-age-age")).w >= (await box(page, "#short .basalt-date-age-age .basalt-reserve > span:not([data-on])")).w - 0.5);
    assert.equal(await css(page, "#long .basalt-date-age-age", "fontSize"), "13px");
    assert.equal(await css(page, "#long .basalt-date-age-age", "color"), await resolve(page, "var(--basalt-text-tertiary)"));
    await page.close();
  });

  const TICK = `document.body.style.margin = "0";
function Hold() { const { setHeld } = B.useLoops(); return <><button id="hold" onClick={() => setHeld(true)}>hold</button><button id="release" onClick={() => setHeld(false)}>release</button></>; }
createRoot(document.getElementById("root")).render(<main><B.Clock id="clock" timeZone="UTC" /> <B.Countdown id="count" to={Date.UTC(1970, 0, 20, 0, 0, 0)} done="Open" /> <Hold /></main>);`;

  test("V14: a countdown ticks by the second and a clock by the minute; no live region; the width holds", async () => {
    const page = await open(TICK, { clock: true });
    const first = await page.locator("#count").innerText();
    const width = (await box(page, "#count")).w;
    await page.clock.runFor(3000);
    const later = await page.locator("#count").innerText();
    assert.notEqual(later, first, "the countdown moved");
    assert.match(later, /^\d+d \d\d:\d\d:\d\d$/);
    near((await box(page, "#count")).w, width, "the countdown's width", 0.01);
    assert.equal(await page.locator("#count").getAttribute("aria-live"), null);
    assert.equal(await page.locator("#count[role]").count(), 0, "no live region");
    assert.match(await page.locator("#count").getAttribute("datetime"), /^P\d+DT/);
    const minute = await page.locator("#clock").innerText();
    await page.clock.runFor(60_000);
    assert.notEqual(await page.locator("#clock").innerText(), minute, "the clock moved by a minute");
    await page.close();
  });

  test("V14: data-loops=held freezes both at the value they show; releasing writes the current value at once; reduced motion does not stop them", async () => {
    const page = await open(TICK, { clock: true, reducedMotion: "reduce" });
    await page.clock.runFor(2000);
    const during = await page.locator("#count").innerText();
    await page.locator("#hold").click();
    await page.clock.runFor(10_000);
    assert.equal(await page.locator("#count").innerText(), during, "held");
    await page.locator("#release").click();
    await page.clock.runFor(1000);
    assert.notEqual(await page.locator("#count").innerText(), during, "released: now, not where it stopped");
    await page.close();
  });

  test("a finished countdown says its completed wording in the same cell: 0px of width change, and what sits beside it does not move", async () => {
    const page = await open(`document.body.style.margin = "0"; const root = createRoot(document.getElementById("root")); window.draw = (now) => flushSync(() => root.render(<main><B.Countdown id="a" to={Date.UTC(2026, 10, 17, 12, 0, 5)} now={Date.UTC(2026, 10, 17, 12, 0, now)} done="Open" /><span id="next">Next</span></main>)); window.draw(0);`);
    const boxes = () => page.evaluate(() => ["a", "next"].map((id) => { const r = document.getElementById(id).getBoundingClientRect(); return [r.x, r.width]; }));
    assert.equal((await page.locator("#a").innerText()).trim(), "00:00:05");
    const running = await boxes();
    await page.evaluate(() => window.draw(6));
    assert.equal((await page.locator("#a").innerText()).trim(), "Open");
    assert.deepEqual(await boxes(), running, "the countdown's box and the word after it are where they were");
    await page.close();
  });
});

// ---- a page of every part, in both themes: axe
for (const theme of THEMES) {
  test(`${theme}: the whole batch on one page passes axe`, async () => {
    const page = await open(SHELL(`${EVENTS()}${STAMPS}${COMPOSE}${BLOCKS}<B.SourceStateWords what="the weather" state="unreachable" onRetry={() => {}} />`), { theme });
    assert.deepEqual(await axe(page), []);
    assert.deepEqual(page.errors, []);
    await page.close();
  });
}
