// The conversation stream (cimip-gaps-2, B2; decided by Opus on the no-council path, DECISIONS 226 and 265; the implementation is reviewed by Astra):
// StreamMessage, StreamNote, StreamQuote, the entry you came to (arrived), DisclosureRow, ActivityList, Presence and formatElapsed. Driven in Chromium
// against the built package with the real stylesheet. Synthetic people and data only, from two unlike domains (a support thread, a team chat, a build).
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

const open = async (body, { theme = "light", width = 1024, height = 900, ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, body, { theme, viewport: { width, height }, ...options });
  await settle(page);
  page.errors = errors;
  return page;
};
const render = (jsx) => `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)";
function App() { ${jsx} }
createRoot(document.getElementById("root")).render(<App />);`;
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const options = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, options);
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
};
const frames = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

const THREAD = `<div style={{ padding: 48, maxWidth: 640 }}>
  <B.Stream label="Ticket 4821">
    <B.EventLogRule>Today</B.EventLogRule>
    <B.StreamMessage id="first" author="Jules Ferreira" time="4:12 PM" dateTime="2026-11-18T16:12">Exporting invoices as CSV gives me an empty file.</B.StreamMessage>
    <B.StreamMessage id="joined" author="Jules Ferreira" time="4:13 PM" joined>Since yesterday.</B.StreamMessage>
    <B.StreamNote id="note" time="4:14 PM">Assigned to Ada Brooks</B.StreamNote>
    <B.StreamMessage id="reply" author="Ada Brooks" time="4:20 PM" meta={<B.Presence status="away" since={Date.UTC(2026, 10, 18, 14, 54)} now={Date.UTC(2026, 10, 18, 15, 0)} />}>
      <B.StreamQuote id="quote" cite="Jules Ferreira asked">Why is my export empty?</B.StreamQuote>
      <p>Which date range did you choose?</p>
    </B.StreamMessage>
  </B.Stream>
</div>`;

describe("messages, notes and quotes", () => {
  test("a joined message draws no avatar and no head, says who and when, and its words start where a head message's do", async () => {
    const page = await open(render(`return ${THREAD};`));
    const r = await page.evaluate(() => {
      const box = (s) => document.querySelector(s).getBoundingClientRect();
      return {
        firstText: box("#first .basalt-stream-text").left, joinedText: box("#joined .basalt-stream-text").left, noteText: box("#note .basalt-stream-note-text").left,
        gutter: box("#first .basalt-stream-gutter").width, joinedAvatar: document.querySelectorAll("#joined .basalt-avatar").length, joinedHead: document.querySelectorAll("#joined .basalt-stream-head").length,
        joinedSaid: document.querySelector("#joined").textContent, gap: box("#joined").top - box("#first").bottom, headGap: box("#reply").top - box("#note").bottom,
        avatarHidden: document.querySelector("#first .basalt-stream-gutter").getAttribute("aria-hidden"),
        listRole: document.querySelector(".basalt-stream").getAttribute("role"),
      };
    });
    assert.equal(r.joinedAvatar, 0);
    assert.equal(r.joinedHead, 0);
    assert.match(r.joinedSaid, /^Jules Ferreira, 4:13 PM: Since yesterday\.$/);
    assert.equal(r.gutter, 32);
    assert.equal(r.firstText, r.joinedText);
    assert.equal(r.firstText, r.noteText);
    assert.equal(r.gap, 4, "a joined message is space-1 below");
    assert.equal(r.headGap, 16, "a new author is space-4 below");
    assert.equal(r.avatarHidden, "true");
    assert.equal(r.listRole, "list");
    assert.deepEqual(page.errors, []);
  });

  for (const theme of ["light", "dark"]) {
    test(`${theme}: the quote is a fill one step from its ground with no rim, radius 8, its source above its words; axe finds nothing`, async () => {
      const page = await open(render(`return ${THREAD};`), { theme });
      const q = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector("#quote"));
        return { bg: s.backgroundColor, page: getComputedStyle(document.body).backgroundColor, border: s.borderTopWidth, radius: s.borderTopLeftRadius, cite: document.querySelector("#quote figcaption").textContent, quote: document.querySelector("#quote blockquote").textContent };
      });
      assert.notEqual(q.bg, q.page);
      assert.equal(q.border, "0px");
      assert.equal(q.radius, "8px");
      assert.equal(q.cite, "Jules Ferreira asked");
      assert.equal(q.quote, "Why is my export empty?");
      assert.deepEqual(await axe(page), []);
    });
  }

  test("presence says its state and how long, with a duration for machines", async () => {
    const page = await open(render(`return ${THREAD};`));
    const p = await page.evaluate(() => ({ text: document.querySelector("#reply .basalt-presence").textContent, dt: document.querySelector("#reply .basalt-elapsed").getAttribute("datetime"), status: document.querySelector("#reply .basalt-presence").getAttribute("data-status") }));
    assert.equal(p.text, "Away 6 min");
    assert.equal(p.dt, "PT6M");
    assert.equal(p.status, "pending");
  });
});

describe("formatElapsed", () => {
  test("nothing under a minute, then minutes, hours and minutes, and days", async () => {
    const { formatElapsed } = await import(pathToFileURL(path.join(pkg, "dist", "index.js")).href);
    const now = Date.UTC(2026, 10, 18, 15, 0);
    assert.equal(formatElapsed(now - 59_000, now), null);
    assert.deepEqual(formatElapsed(now - 6 * 60_000, now), { text: "6 min", dateTime: "PT6M" });
    assert.deepEqual(formatElapsed(now - 60 * 60_000, now), { text: "1 hr", dateTime: "PT1H" });
    assert.deepEqual(formatElapsed(now - 65 * 60_000, now), { text: "1 hr 5 min", dateTime: "PT1H5M" });
    assert.deepEqual(formatElapsed(now - 3 * 86_400_000, now), { text: "3 days", dateTime: "P3D" });
    assert.deepEqual(formatElapsed(now - 86_400_000, now), { text: "1 day", dateTime: "P1D" });
    assert.equal(formatElapsed(now + 60_000, now), null, "a start in the future is not negative");
  });
});

const ARRIVED = (card = false) => `const [arrived, setArrived] = React.useState(true);
  const [ended, setEnded] = React.useState(0);
  window.__ended = ended;
  return (
    <div style={{ padding: 48, maxWidth: 640 }}>
      <div style={{ height: 1400 }}>Above</div>
      <B.Stream label="Ticket 4821">
        <B.StreamMessage id="before" author="Jules Ferreira" time="4:12 PM">Exporting invoices as CSV gives me an empty file.</B.StreamMessage>
        <B.StreamMessage id="came" author="Jules Ferreira" time="4:13 PM" joined arrived={${!card} && arrived} arrivedLabel="From your notice" onArrivedEnd={() => { setArrived(false); setEnded((n) => n + 1); }}>Since yesterday.</B.StreamMessage>
        <B.StreamEntry id="card" panel arrived={${card}}>
          <B.Card><B.CardHeader><B.CardTitle>Suggested edit</B.CardTitle><B.StreamArrivedWord /></B.CardHeader><B.CardContent>Move the plan limits above the pricing.</B.CardContent></B.Card>
        </B.StreamEntry>
        <B.StreamNote id="after" time="4:40 PM">Status set to Waiting</B.StreamNote>
      </B.Stream>
      <div style={{ height: 1400 }}>Below</div>
      <button id="elsewhere">Elsewhere</button>
    </div>
  );`;

describe("the entry you came to", () => {
  for (const theme of ["light", "dark"]) {
    test(`${theme}: it is scrolled to, focused with no ring, and marked by a plate and a word`, async () => {
      const page = await open(render(ARRIVED()), { theme, height: 800 });
      const r = await page.evaluate(() => {
        const came = document.querySelector("#came");
        const before = getComputedStyle(came, "::before");
        const box = came.getBoundingClientRect();
        return {
          focused: document.activeElement === came, outline: getComputedStyle(came).outlineStyle, inView: box.top >= 0 && box.bottom <= innerHeight,
          plate: before.backgroundColor, radius: before.borderTopLeftRadius, inset: before.inset, head: Boolean(came.querySelector(".basalt-stream-head")),
          word: came.querySelector(".basalt-stream-word")?.textContent, wordVisible: getComputedStyle(came.querySelector(".basalt-stream-word")).visibility,
        };
      });
      assert.ok(r.focused, "focus is on the entry");
      assert.equal(r.outline, "none");
      assert.ok(r.inView, "the entry is in view");
      assert.notEqual(r.plate, "rgba(0, 0, 0, 0)");
      assert.equal(r.radius, "8px");
      assert.equal(r.inset, "-4px -8px");
      assert.ok(r.head, "a joined message that arrives draws its head");
      assert.equal(r.word, "From your notice");
      assert.equal(r.wordVisible, "visible");
      assert.deepEqual(await axe(page), []);
    });

    test(`${theme}: a panel takes the wash on its own fill inside its one rim, nothing is drawn round it, and its head says the word`, async () => {
      const page = await open(render(ARRIVED(true)), { theme, height: 800 });
      const r = await page.evaluate(() => {
        const card = document.querySelector("#card .basalt-card");
        return { focused: document.activeElement === document.querySelector("#card"), bg: getComputedStyle(card).backgroundColor, rim: getComputedStyle(card).borderTopWidth, around: getComputedStyle(document.querySelector("#card"), "::before").content, word: document.querySelector("#card .basalt-stream-word")?.textContent };
      });
      assert.ok(r.focused);
      assert.equal(r.rim, "1px", "the card keeps its one rim");
      assert.equal(r.around, "none", "nothing is drawn round a panel");
      assert.equal(r.word, "Linked");
      await page.mouse.click(5, 5);
      await settle(page);
      assert.notEqual(await page.evaluate(() => getComputedStyle(document.querySelector("#card .basalt-card")).backgroundColor), r.bg, "the wash was its own, and it goes");
      assert.deepEqual(await axe(page), []);
    });
  }

  test("a key that scrolls leaves the mark; a press ends it, says so once, fades it, and nothing moves", async () => {
    const page = await open(render(ARRIVED()), { height: 800 });
    const boxes = () => page.evaluate(() => ["before", "came", "card", "after"].map((id) => { const r = document.getElementById(id).getBoundingClientRect(); return [r.left, r.top + scrollY, r.width, r.height]; }));
    const at = await boxes();
    await frames(page);
    await page.keyboard.press("ArrowDown");
    await frames(page);
    assert.equal(await page.locator("#came").getAttribute("data-arrived"), "");
    await page.mouse.click(5, 5);
    await frames(page);
    assert.equal(await page.locator("#came").getAttribute("data-arrived"), null);
    assert.equal(await page.evaluate(() => window.__ended), 1);
    // The fade is 0.75 of duration-slow on ease-in: mid-way the plate is still there, then it is gone.
    await settle(page);
    const gone = await page.evaluate(() => ({ plate: getComputedStyle(document.querySelector("#came"), "::before").backgroundColor, word: getComputedStyle(document.querySelector("#came .basalt-stream-word")).visibility, tab: document.querySelector("#came").getAttribute("tabindex") }));
    assert.equal(gone.plate, "rgba(0, 0, 0, 0)");
    assert.equal(gone.word, "hidden");
    assert.equal(gone.tab, "-1", "it stays a focus target, so focus is never dropped");
    assert.deepEqual(await boxes(), at, "the mark's going moves nothing");
  });

  test("forced colours: the plate drops and the word stays", async () => {
    const page = await open(render(ARRIVED()), { height: 800, forcedColors: "active" });
    const r = await page.evaluate(() => ({ plate: getComputedStyle(document.querySelector("#came"), "::before").display, word: getComputedStyle(document.querySelector("#came .basalt-stream-word")).visibility }));
    assert.equal(r.plate, "none");
    assert.equal(r.word, "visible");
  });

  test("in a LoadingShape (and its twin) an arrived entry does nothing: no focus, no scroll, no mark", async () => {
    const page = await open(render(`return (<div style={{ padding: 48 }}><div style={{ height: 1400 }}>Above</div>
      <B.LoadingShape loading label="Loading" showAfter={0} prefill={(v) => <B.Stream label="x"><B.StreamMessage author={B.standIn(1, 10, v)} time="1:00 PM" arrived>{B.standIn(2, 40, v)}</B.StreamMessage></B.Stream>}>{() => null}</B.LoadingShape></div>);`), { height: 800 });
    const r = await page.evaluate(() => ({ y: scrollY, focus: document.activeElement?.tagName, marked: document.querySelectorAll("[data-arrived]").length }));
    assert.equal(r.y, 0);
    assert.equal(r.focus, "BODY");
    assert.equal(r.marked, 0);
  });
});

const ROWS = `const [n, setN] = React.useState(0);
  return (
    <div style={{ padding: 24, maxWidth: 520 }}>
      <B.DisclosureRow id="row" mark={<B.Spinner variant="braille" size={16} label="Running" />} title="Read the status page for the export service and the notes for every outage in the last thirty days" meta="2.1 s">
        <p id="detail">One open issue: the first part of a split export is empty.</p>
      </B.DisclosureRow>
      <B.ActivityList label="Build 1287">
        <B.ActivityStep id="done" status="done" meta="0.4 s">Checked out main at 4f2c9e1</B.ActivityStep>
        <B.ActivityStep id="failed" status="failed" meta="48 s" detail={<p id="log">Expected 1,204.50, received 1,204.49</p>}>3 of 412 unit tests failed in the billing module, all in the rounding of split exports</B.ActivityStep>
        <B.ActivityStep id="running" status="running">Building the web app for production</B.ActivityStep>
        <B.ActivityStep id="waiting" status="waiting">The deploy to staging needs an approver</B.ActivityStep>
        <B.ActivityStep id="skipped" status="done" word="Skipped">12 rows with no email</B.ActivityStep>
      </B.ActivityList>
    </div>
  );`;

describe("the disclosure row", () => {
  test("a button that opens its detail: aria-expanded and aria-controls; closed the line is cut, open it wraps; the keys open and close it", async () => {
    const page = await open(render(ROWS), { width: 600 });
    const trigger = page.locator("#row .basalt-disclosure-row");
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator("#detail").count(), 0, "a closed detail is not in the document");
    const closed = await page.evaluate(() => { const t = document.querySelector("#row .basalt-disclosure-title"); return { ws: getComputedStyle(t).whiteSpace, cut: t.scrollWidth > t.clientWidth, h: t.getBoundingClientRect().height }; });
    assert.equal(closed.ws, "nowrap");
    assert.ok(closed.cut);
    await trigger.focus();
    await page.keyboard.press("Enter");
    await settle(page);
    assert.equal(await trigger.getAttribute("aria-expanded"), "true");
    const controls = await trigger.getAttribute("aria-controls");
    assert.equal(await page.evaluate((id) => document.getElementById(id)?.contains(document.getElementById("detail")), controls), true);
    const opened = await page.evaluate(() => document.querySelector("#row .basalt-disclosure-title").getBoundingClientRect().height);
    assert.ok(opened > closed.h * 1.5, "open, the line wraps");
    const ring = await page.evaluate(() => { const s = getComputedStyle(document.querySelector("#row .basalt-disclosure-row")); return [s.outlineStyle, s.outlineOffset, s.outlineWidth]; });
    assert.deepEqual(ring, ["solid", "2px", "2px"]);
    await page.keyboard.press("Space");
    await settle(page);
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
  });

  test("hover lifts the ink and draws no wash; 28 tall with a fine pointer, 44 on touch", async () => {
    const page = await open(render(ROWS), { width: 600 });
    const row = page.locator("#row .basalt-disclosure-row");
    const rest = await row.evaluate((el) => getComputedStyle(el).color);
    await row.hover();
    await settle(page);
    const hover = await row.evaluate((el) => ({ color: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor }));
    assert.notEqual(hover.color, rest);
    assert.equal(hover.bg, "rgba(0, 0, 0, 0)");
    assert.equal(Math.round((await row.boundingBox()).height), 28);
    const touch = await open(render(ROWS), { width: 390, hasTouch: true, isMobile: true });
    assert.ok((await touch.locator("#row .basalt-disclosure-row").boundingBox()).height >= 44);
  });
});

describe("the activity list", () => {
  test("a sentence a step that wraps, the status in a seat and in words, the running step in primary ink and the metas lined up", async () => {
    const page = await open(render(ROWS), { width: 390 });
    const r = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const text = (s) => q(s).textContent;
      const right = (s) => q(s).getBoundingClientRect().right;
      return {
        failed: text("#failed .basalt-activity-sentence"), running: text("#running .basalt-activity-sentence"), done: text("#done .basalt-activity-sentence"), waiting: text("#waiting .basalt-activity-sentence"), skipped: text("#skipped .basalt-activity-sentence"),
        wordShown: getComputedStyle(q("#failed .basalt-activity-word")).fontWeight, wraps: q("#failed .basalt-activity-sentence").getBoundingClientRect().height > 30,
        runningInk: getComputedStyle(q("#running .basalt-activity-sentence")).color, doneInk: getComputedStyle(q("#done .basalt-activity-sentence")).color,
        metaDone: right("#done .basalt-activity-meta"), metaFailed: right("#failed .basalt-activity-meta"),
        startDone: q("#done .basalt-activity-sentence").getBoundingClientRect().left, startFailed: q("#failed .basalt-activity-sentence").getBoundingClientRect().left,
        danger: getComputedStyle(q("#failed .basalt-activity-dot")).backgroundColor, doneDot: getComputedStyle(q("#done .basalt-activity-dot")).backgroundColor,
        ring: getComputedStyle(q("#waiting .basalt-activity-dot")).borderTopWidth, braille: document.querySelectorAll("#running .basalt-spinner[data-variant='braille']").length,
        widthOk: document.documentElement.scrollWidth <= innerWidth,
      };
    });
    assert.equal(r.failed, "Failed 3 of 412 unit tests failed in the billing module, all in the rounding of split exports");
    assert.equal(r.running, "Running: Building the web app for production");
    assert.equal(r.done, "Done: Checked out main at 4f2c9e1");
    assert.equal(r.waiting, "Waiting The deploy to staging needs an approver");
    assert.equal(r.skipped, "Skipped 12 rows with no email");
    assert.equal(r.wordShown, "500");
    assert.ok(r.wraps, "a long sentence wraps at 390");
    assert.notEqual(r.runningInk, r.doneInk);
    assert.equal(r.metaDone, r.metaFailed, "the metas line up whether or not a step opens");
    assert.equal(r.startDone, r.startFailed, "the sentences start at one x");
    assert.notEqual(r.danger, r.doneDot);
    assert.equal(r.ring, "1px");
    assert.equal(r.braille, 1);
    assert.ok(r.widthOk, "nothing is wider than the window");
    assert.deepEqual(await axe(page), []);
  });
});
