// The hold on every loop (DECISIONS 99): `<html data-loops="held">` stops every Basalt loop, portals included, with or
// without reduced motion; releasing jumps every loop to the shared clock; `useLoops` keeps the state for the origin and
// follows it across tabs; the head line applies a stored hold before the first frame; the control is a pressed toggle,
// a Switch and a command, and none of them announces. And the gap beside braille: the seat is the cell's width, the gap
// equals it, so words start at 12, 18 and 24. Driven in Chromium against the built package with the real stylesheet.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { bundleFixture, launch, pkg, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const css = () => fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
const ORIGIN = "https://basalt.test";
const THEMES = ["dark", "light"];

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const { useLoops } = await import(pathToFileURL(path.join(pkg, "dist", "loops.js")).href);
const { loopsBootstrap } = await import(pathToFileURL(path.join(pkg, "dist", "loops-bootstrap.js")).href);

/**
 * A page on a real (fake-host) origin, so localStorage works, survives a reload and is shared with another page of the same
 * context. `stored` puts the hold in storage before any script runs; `bootstrap` inlines the head line.
 */
async function open(body, { context, theme = "dark", stored = false, bootstrap = false, reducedMotion, forcedColors, viewport } = {}) {
  context ??= await browser.newContext({ viewport: viewport ?? { width: 900, height: 700 }, reducedMotion, forcedColors, colorScheme: theme });
  const script = await bundleFixture(body);
  await context.route(`${ORIGIN}/**`, (route) => route.fulfill({
    contentType: "text/html",
    body: `<!doctype html><html lang="en" data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Basalt</title><style>${css()}</style><style>body { margin: 0; background: var(--basalt-surface-page); color: var(--basalt-text-primary); font-family: var(--basalt-font-family-sans); }</style>${bootstrap ? `<script>${loopsBootstrap}</script><script>window.__early = document.documentElement.getAttribute("data-loops"); requestAnimationFrame(() => { window.__first = document.documentElement.getAttribute("data-loops"); });</script>` : ""}</head><body><div id="root"></div><script>${script}</script></body></html>`,
  }));
  if (stored) await context.addInitScript(() => { try { localStorage.setItem("basalt-loops", "held"); } catch { /* none */ } });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${ORIGIN}/`);
  await frames(page);
  return { page, errors, context };
}

const frames = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const render = (jsx, before = "") => `${before}\ncreateRoot(document.getElementById("root")).render(${jsx});`;
const attr = (page) => page.evaluate(() => document.documentElement.getAttribute("data-loops"));

/** Every Basalt loop on the page: its name, whether it is running, and where it started on the document timeline. */
const loops = (page) => page.evaluate(() => document.getAnimations()
  .filter((a) => a.animationName?.startsWith("basalt-"))
  .map((a) => ({ name: a.animationName, state: a.playState, infinite: a.effect.getComputedTiming().iterations === Infinity, start: a.startTime === null ? null : Number(a.startTime) })));
const running = async (page) => (await loops(page)).filter((a) => a.state === "running");

// The whole library's loops at once, in the page and in two portals: a toast and a menu.
const app = `
function App() {
  const { held, setHeld } = B.useLoops();
  const t = B.useToast();
  const [open, setOpen] = React.useState(false);
  const [extra, setExtra] = React.useState(0);
  React.useEffect(() => { window.t = t; window.addSpinner = () => setExtra((n) => n + 1); window.openCommands = () => setOpen(true); }, [t]);
  return <main style={{ padding: 16, display: "grid", gap: 12, maxWidth: 520 }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h1 style={{ margin: 0, fontSize: 18 }}>Runs</h1>
      <B.Button id="toggle" pressed={held} onClick={() => setHeld(!held)}>Pause animations</B.Button>
    </header>
    <B.Switch id="switch" checked={held} onCheckedChange={setHeld}>Pause animations</B.Switch>
    <p id="state">{held ? "held" : "running"}</p>
    <div id="ring"><B.Spinner label="Loading runs" /></div>
    <B.Badge variant="plain" id="braille-a"><B.Spinner variant="braille" />Running</B.Badge>
    {Array.from({ length: extra }, (_, i) => <B.Badge key={i} variant="plain" className="extra"><B.Spinner variant="braille" />Running</B.Badge>)}
    <B.Button loading>Deploy</B.Button>
    <B.Progress value={null} label="Building" />
    <B.Skeleton />
    <B.Sparkline data={[1, 3, 2, 5]} loading label="Runs" />
    <B.Popover defaultOpen><B.PopoverTrigger>Details</B.PopoverTrigger><B.PopoverContent><B.PopoverTitle>Details</B.PopoverTitle><div id="popup-ring"><B.Spinner label="Loading more" /></div></B.PopoverContent></B.Popover>
    <B.CommandMenu open={open} onOpenChange={setOpen} groups={[{ label: "View", commands: [{ id: "loops", label: held ? "Resume animations" : "Pause animations", onSelect: () => setHeld(!held) }] }]} />
  </main>;
}`;
const shell = render(`<B.ToastProvider><App /></B.ToastProvider>`, app);

describe("the hold", () => {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    test(`with data-loops="held" no Basalt animation runs, portals included (${reducedMotion})`, async () => {
      const { page, errors, context } = await open(shell, { reducedMotion });
      await page.waitForFunction(() => window.t);
      await page.evaluate(() => window.t.show({ title: "Publishing", running: true }));
      await page.locator(".basalt-toast .basalt-spinner").waitFor();
      await page.locator("#popup-ring").waitFor();
      await settle(page);
      const before = await running(page);
      assert.ok(before.length >= (reducedMotion === "reduce" ? 4 : 10), `${reducedMotion}: the page has loops to hold (${before.map((a) => a.name).join(", ")})`);
      await page.locator("#toggle").click();
      await frames(page);
      assert.equal(await attr(page), "held");
      assert.deepEqual(await running(page), [], `${reducedMotion}: nothing runs while held`);
      // …including a portal opened while held
      await page.evaluate(() => window.t.show({ title: "Another", running: true }));
      await page.waitForFunction(() => document.querySelectorAll(".basalt-toast .basalt-spinner").length === 2);
      await settle(page);
      assert.deepEqual(await running(page), []);
      assert.deepEqual(errors, []);
      await context.close();
    });
  }

  test("held looks: braille on its first frame, the ring still at its drawing at full opacity, nothing hidden or swapped", async () => {
    for (const reducedMotion of ["no-preference", "reduce"]) {
      const { page, context } = await open(shell, { stored: true, bootstrap: true, reducedMotion });
      await settle(page);
      const look = await page.evaluate(() => {
        const ring = document.querySelector("#ring svg");
        const dots = [...document.querySelectorAll("#braille-a .basalt-spinner-dot")].map((d) => [Number(d.dataset.dot), getComputedStyle(d).opacity, getComputedStyle(d).animationName]);
        return { ring: { animation: getComputedStyle(ring).animationName, opacity: getComputedStyle(ring).opacity, transform: getComputedStyle(ring).transform, display: getComputedStyle(ring).display }, dots, skeleton: getComputedStyle(document.querySelector(".basalt-skeleton")).animationName, line: getComputedStyle(document.querySelector(".basalt-sparkline-line")).animationName };
      });
      assert.deepEqual({ ...look.ring, display: undefined }, { animation: "none", opacity: "1", transform: "none", display: undefined }, `${reducedMotion}: the ring stands still, at full opacity`);
      assert.notEqual(look.ring.display, "none");
      assert.deepEqual(look.dots.filter(([, opacity]) => opacity === "1").map(([dot]) => dot), [1, 2, 4], `${reducedMotion}: braille holds ⠋ (dots 1, 2 and 4)`);
      assert.ok(look.dots.every(([, , animation]) => animation === "none"));
      assert.equal(look.skeleton, "none");
      assert.equal(look.line, "none");
      assert.equal(await page.locator("#ring").getAttribute("role"), null);
      assert.equal(await page.getByRole("status", { name: "Loading runs" }).count(), 1, "a labelled ring keeps its status semantics");
      assert.equal(await page.locator("#braille-a .basalt-spinner").getAttribute("aria-hidden"), "true", "braille stays aria-hidden");
      assert.equal(await page.getByRole("button", { name: "Deploy" }).getAttribute("aria-busy"), "true", "a busy Button stays busy");
      await context.close();
    }
  });

  test("the toast's drain is a countdown, not a loop: the hold does not stop it", async () => {
    const { page, context } = await open(shell, { stored: true, bootstrap: true });
    await page.waitForFunction(() => window.t);
    await page.evaluate(() => window.t.show({ title: "Saved", status: "success", home: "centre", timeout: 60_000 }));
    await page.locator(".basalt-toast-drain").waitFor({ state: "attached" });
    const drain = (await loops(page)).filter((a) => a.name === "basalt-drain");
    assert.equal(drain.length, 1);
    assert.equal(drain[0].infinite, false);
    assert.equal(drain[0].state, "running");
    await context.close();
  });

  test("reduced motion never turns the hold on", async () => {
    const { page, context } = await open(shell, { reducedMotion: "reduce" });
    assert.equal(await attr(page), null);
    assert.equal(await page.locator("#toggle").getAttribute("aria-pressed"), "false");
    assert.equal(await page.evaluate(() => localStorage.getItem("basalt-loops")), null);
    await context.close();
  });

  test("it cannot be set on a subtree: only the root holds", async () => {
    const { page, context } = await open(render(`<div data-loops="held"><B.Spinner label="Loading" /></div>`));
    await settle(page);
    assert.equal((await running(page)).length, 1, "a data-loops on a div holds nothing");
    await context.close();
  });
});

describe("release jumps to now", () => {
  test("every Basalt loop's startTime is back at the origin, and spinners mounted 300ms apart tick in phase", async () => {
    const { page, context } = await open(shell, { stored: true, bootstrap: true });
    await settle(page);
    assert.deepEqual(await running(page), []);
    await page.waitForTimeout(300);
    await page.locator("#toggle").click();
    await frames(page);
    const released = await loops(page);
    assert.ok(released.length >= 6);
    for (const loop of released.filter((a) => a.infinite)) assert.equal(loop.start, 0, `${loop.name} rejoined the shared clock`);
    assert.equal(await attr(page), null);
    // a spinner mounted 300ms after the release joins the same clock
    await page.waitForTimeout(300);
    await page.evaluate(() => window.addSpinner());
    await page.locator(".extra").waitFor();
    const phase = await page.evaluate(() => {
      const a = document.querySelector("#braille-a").getAnimations({ subtree: true });
      const b = document.querySelector(".extra").getAnimations({ subtree: true });
      return { a: a.map((x) => Number(x.currentTime)), b: b.map((x) => Number(x.currentTime)), lit: [a, b].map((list) => list.map((x) => getComputedStyle(x.effect.target).opacity).join()) };
    });
    assert.equal(phase.a.length, 6);
    assert.deepEqual(phase.b, phase.a, "the two tick at the same point of the cycle");
    assert.equal(phase.lit[0], phase.lit[1]);
    await context.close();
  });

  test("a spinner mounted at different moments while held rejoins the clock on release too", async () => {
    const { page, context } = await open(shell, { stored: true, bootstrap: true });
    await settle(page);
    await page.waitForTimeout(300);
    await page.evaluate(() => window.addSpinner());
    await page.locator(".extra").waitFor();
    await page.getByRole("switch", { name: "Pause animations" }).click();
    await frames(page);
    assert.equal(await attr(page), null);
    for (const loop of (await loops(page)).filter((a) => a.infinite)) assert.equal(loop.start, 0);
    const phase = await page.evaluate(() => [document.querySelector("#braille-a"), document.querySelector(".extra")].map((el) => el.getAnimations({ subtree: true }).map((x) => Number(x.currentTime))));
    assert.deepEqual(phase[1], phase[0]);
    await context.close();
  });
});

// DECISIONS 316 (4.1): a queued stage's mark breathes, and is the fourth kind of thing that loops. It joins the hold and rejoins the clock.
describe("the queued breath", () => {
  const queued = render(`<B.ToastProvider><App /></B.ToastProvider>`, app.replace('<p id="state">', '<span id="queued"><B.StageMark state="queued" /></span><p id="state">'));
  test("it stops under the hold, at full, and rejoins the shared clock on release, in phase with a mark mounted later", async () => {
    const { page, context } = await open(queued);
    await settle(page);
    const breath = () => page.evaluate(() => { const b = document.querySelector("#queued .basalt-run-mark-breath"); const [a] = b.getAnimations(); return { running: a ? a.playState : null, start: a ? Number(a.startTime) : null, opacity: getComputedStyle(b).opacity }; });
    assert.equal((await breath()).running, "running");
    assert.equal((await breath()).start, 0, "on the shared clock from mount");
    await page.locator("#toggle").click();
    await frames(page);
    assert.deepEqual(await breath(), { running: null, start: null, opacity: "1" }, "held: still, at full");
    await page.waitForTimeout(250);
    await page.locator("#toggle").click();
    await frames(page);
    const released = await breath();
    assert.equal(released.running, "running");
    assert.equal(released.start, 0, "released: back at the timeline's origin");
    await context.close();
  });
});

describe("useLoops", () => {
  test("it stores the hold, restores it after a reload, and clears it on release", async () => {
    const { page, context } = await open(shell);
    assert.equal(await page.locator("#state").textContent(), "running");
    await page.locator("#toggle").click();
    assert.equal(await page.evaluate(() => localStorage.getItem("basalt-loops")), "held");
    assert.equal(await page.locator("#state").textContent(), "held");
    await page.reload();
    await frames(page);
    assert.equal(await attr(page), "held", "restored with no head line, by the first component that asks");
    assert.equal(await page.locator("#state").textContent(), "held");
    assert.equal(await page.locator("#toggle").getAttribute("aria-pressed"), "true");
    assert.deepEqual(await running(page), []);
    await page.locator("#toggle").click();
    assert.equal(await page.evaluate(() => localStorage.getItem("basalt-loops")), null);
    assert.equal(await attr(page), null);
    await context.close();
  });

  test("a storage event from another tab holds and releases this one", async () => {
    const first = await open(shell);
    const second = await open(shell, { context: first.context });
    await first.page.locator("#toggle").click();
    await second.page.waitForFunction(() => document.documentElement.getAttribute("data-loops") === "held");
    assert.equal(await second.page.locator("#toggle").getAttribute("aria-pressed"), "true");
    assert.equal(await second.page.getByRole("switch", { name: "Pause animations" }).getAttribute("aria-checked"), "true");
    assert.deepEqual(await running(second.page), []);
    await first.page.locator("#toggle").click();
    await second.page.waitForFunction(() => document.documentElement.getAttribute("data-loops") === null);
    assert.equal(await second.page.locator("#toggle").getAttribute("aria-pressed"), "false");
    for (const loop of (await loops(second.page)).filter((a) => a.infinite)) assert.equal(loop.start, 0, "the other tab rejoined the clock too");
    assert.deepEqual([...first.errors, ...second.errors], []);
    await first.context.close();
  });

  test("the server renders running", () => {
    const html = renderToString(createElement(function Probe() { const { held } = useLoops(); return createElement("span", null, held ? "held" : "running"); }));
    assert.match(html, />running</);
  });

  test("storage that throws leaves the page working", async () => {
    const context = await browser.newContext({ viewport: { width: 900, height: 700 } });
    await context.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } }); });
    const { page, errors } = await open(shell, { context, bootstrap: true });
    await page.locator("#toggle").click();
    assert.equal(await attr(page), "held", "the hold still applies to this page");
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe("the head line", () => {
  test("a stored hold is applied before the first frame, and with no component on the page", async () => {
    const { page, context } = await open(render(`<B.Spinner label="Loading" />`), { stored: true, bootstrap: true });
    assert.equal(await page.evaluate(() => window.__early), "held", "set by the script in the head, before the body is parsed");
    assert.equal(await page.evaluate(() => window.__first), "held", "and in place by the first frame");
    assert.deepEqual(await running(page), []);
    await context.close();
  });

  test("with nothing stored it sets nothing", async () => {
    const { page, context } = await open(render(`<B.Spinner label="Loading" />`), { bootstrap: true });
    assert.equal(await page.evaluate(() => window.__early), null);
    assert.equal((await running(page)).length, 1);
    await context.close();
  });

  test("it is a string", () => {
    assert.equal(typeof loopsBootstrap, "string");
    assert.match(loopsBootstrap, /basalt-loops/);
  });
});

describe("the control", () => {
  test("the pressed toggle, the Switch and the command reflect the hold; the name is fixed and nothing is announced", async () => {
    const { page, context } = await open(shell);
    // The command menu is a modal, so it inerts the page: read the page's controls by id, and drive them before it opens.
    const toggle = page.locator("#toggle");
    const sw = page.locator('[role="switch"]');
    const command = page.locator("[cmdk-item]");
    const openCommands = async () => { await page.evaluate(() => window.openCommands()); await page.locator(".basalt-command-input").waitFor(); await command.waitFor(); };
    assert.equal(await toggle.getAttribute("aria-pressed"), "false");
    assert.equal(await sw.getAttribute("aria-checked"), "false");
    assert.equal(await page.getByRole("button", { name: "Pause animations", exact: true }).count(), 1, "the toggle is named Pause animations");
    await page.evaluate(() => {
      window.__mutations = [];
      new MutationObserver((records) => {
        for (const r of records) {
          const live = (n) => (n.nodeType === 1 ? n : n.parentElement)?.closest?.("[aria-live], [role=alert], [role=status]");
          if (live(r.target) && r.type !== "attributes") window.__mutations.push(`${r.type} in a live region`);
          for (const n of r.addedNodes) if (n.nodeType === 1 && (n.matches("[aria-live], [role=alert], [role=status]") || n.querySelector("[aria-live], [role=alert], [role=status]"))) window.__mutations.push("a live region was added");
        }
      }).observe(document.body, { subtree: true, childList: true, characterData: true });
    });
    await toggle.click();
    await frames(page);
    assert.equal(await attr(page), "held");
    assert.equal(await toggle.getAttribute("aria-pressed"), "true");
    assert.equal(await sw.getAttribute("aria-checked"), "true");
    assert.equal(await toggle.evaluate((el) => el.textContent.trim()), "Pause animations", "the toggle's name does not change");
    await openCommands();
    assert.equal((await command.textContent()).trim(), "Resume animations", "the command reads Resume while held");
    await command.click();
    await frames(page);
    assert.equal(await attr(page), null, "the command releases");
    await openCommands();
    assert.equal(await toggle.getAttribute("aria-pressed"), "false");
    assert.equal(await sw.getAttribute("aria-checked"), "false");
    assert.equal((await command.textContent()).trim(), "Pause animations", "and reads Pause again");
    await command.click();
    await frames(page);
    assert.equal(await attr(page), "held", "the command holds");
    await page.keyboard.press("Escape");
    await page.locator(".basalt-command-input").waitFor({ state: "detached" });
    await page.getByRole("switch", { name: "Pause animations" }).click();
    assert.equal(await attr(page), null, "the Switch releases");
    assert.deepEqual(await page.evaluate(() => window.__mutations), [], "no live region was written or added");
    await context.close();
  });
});

describe("the gap beside braille", () => {
  const LINE = { 16: [14, 20], 20: [20, 28], 24: [30, 36] };
  const rows = `<div style={{ position: "relative" }}>${[16, 20, 24].map((size, i) => `
    <div data-row="${size}" style={{ position: "absolute", left: 0, top: ${i * 60}, display: "flex", alignItems: "center", height: ${LINE[size][1] + 8}, fontSize: ${LINE[size][0]}, lineHeight: "${LINE[size][1]}px" }}>
      <div style={{ width: 200, display: "flex" }}><B.Badge variant="plain" size={${size}} status="success" data-kind="dot">Passed</B.Badge></div>
      <div style={{ width: 200, display: "flex" }}><B.Badge variant="plain" size={${size}} data-kind="braille"><B.Spinner variant="braille" />Running</B.Badge></div>
      <div style={{ width: 200, display: "flex" }}><B.Badge variant="plain" status="pending" size={${size}} data-kind="pending">Queued</B.Badge></div>
    </div>`).join("")}
    <div data-row="plain" style={{ position: "absolute", left: 0, top: 200, display: "flex", alignItems: "center", height: 28, fontSize: 14, lineHeight: "20px" }}>
      <div style={{ width: 200, display: "flex" }}><B.Badge variant="plain" status="success" data-kind="dot">Passed</B.Badge></div>
      <div style={{ width: 200, display: "flex" }}><B.Badge variant="plain" data-kind="braille"><B.Spinner variant="braille" />Running</B.Badge></div>
    </div>
  </div>`;

  const measure = (page) => page.evaluate(() => [...document.querySelectorAll("[data-kind]")].map((badge) => {
    const text = [...badge.childNodes].find((n) => n.nodeType === 3);
    const range = document.createRange();
    range.selectNodeContents(text);
    const box = badge.getBoundingClientRect();
    const mark = (badge.querySelector(".basalt-badge-dot") ?? badge.querySelector("svg")).getBoundingClientRect();
    const dot = badge.querySelector(".basalt-badge-dot");
    return {
      size: badge.closest("[data-row]").dataset.row, kind: badge.dataset.kind,
      word: range.getBoundingClientRect().left - box.left,
      mark: { left: mark.left - box.left, top: mark.top, width: mark.width, height: mark.height },
      centre: mark.top + mark.height / 2 - badge.getBoundingClientRect().top,
      line: box.height,
      margins: dot ? [getComputedStyle(dot).marginInlineStart, getComputedStyle(dot).marginInlineEnd] : null,
      gap: getComputedStyle(badge).columnGap,
      boxHeight: badge.querySelector(".basalt-spinner")?.getBoundingClientRect().height,
    };
  }));

  for (const theme of THEMES) {
    test(`words start at 12, 18 and 24 for braille and for the dot; the marks sit on whole pixels (${theme})`, async () => {
      const { page, context } = await open(render(rows), { theme });
      const read = await measure(page);
      const expected = { 16: { word: 12, brailleWidth: 6, brailleHeight: 10, dotLeft: 0, margins: ["0px", "0px"], gap: "6px" }, 20: { word: 18, brailleWidth: 9, brailleHeight: 15, dotLeft: 1, margins: ["1px", "2px"], gap: "9px" }, 24: { word: 24, brailleWidth: 12, brailleHeight: 20, dotLeft: 3, margins: ["3px", "3px"], gap: "12px" } };
      for (const size of [16, 20, 24]) {
        const want = expected[size];
        for (const row of read.filter((r) => r.size === String(size))) {
          assert.equal(row.word, want.word, `${size} ${row.kind}: the word starts at ${want.word}`);
          assert.equal(row.gap, want.gap, `${size} ${row.kind}: the gap is the seat`);
          for (const [name, value] of Object.entries(row.mark)) assert.ok(Number.isInteger(value), `${size} ${row.kind}: mark ${name} is ${value}`);
          if (row.kind === "braille") {
            assert.equal(row.mark.left, 0);
            assert.equal(row.mark.width, want.brailleWidth);
            assert.equal(row.mark.height, want.brailleHeight);
          } else {
            assert.equal(row.mark.width, 6, "the dot stays 6px");
            assert.equal(row.mark.height, 6);
            assert.equal(row.mark.left, want.dotLeft, `${size}: the dot sits ${want.dotLeft} in from the seat's start`);
            assert.deepEqual(row.margins, want.margins);
          }
        }
        const dot = read.find((r) => r.size === String(size) && r.kind === "dot");
        const braille = read.find((r) => r.size === String(size) && r.kind === "braille");
        assert.ok(Math.abs(dot.centre - braille.centre) <= 0.5, `${size}: centres ${dot.centre} and ${braille.centre}`);
      }
      assert.equal(read.find((r) => r.size === "20" && r.kind === "braille").boxHeight, 16, "the 9 by 15 cell sits in a 9 by 16 box");
      assert.equal(read.find((r) => r.size === "20" && r.kind === "braille").mark.top % 1, 0);
      await context.close();
    });
  }

  test("size 16 changes no pixel: a badge with no size and one at 16 are the same boxes", async () => {
    const { page, context } = await open(render(rows));
    const read = await measure(page);
    const plain = read.filter((r) => r.size === "plain");
    const sixteen = read.filter((r) => r.size === "16");
    for (const kind of ["dot", "braille"]) {
      const a = plain.find((r) => r.kind === kind);
      const b = sixteen.find((r) => r.kind === kind);
      assert.equal(a.word, 12);
      assert.equal(a.word, b.word);
      assert.equal(a.mark.left, b.mark.left);
      assert.equal(a.mark.width, b.mark.width);
      assert.equal(a.gap, b.gap);
    }
    await context.close();
  });

  test("a braille Spinner inside a plain Badge takes the badge's size, so the two cannot disagree", async () => {
    const { page, context } = await open(render(`<B.Badge variant="plain" size={24} id="b"><B.Spinner variant="braille" size={16} />Running</B.Badge>`));
    assert.equal(await page.locator("#b svg").evaluate((el) => el.getBoundingClientRect().width), 12);
    assert.equal(await page.locator("#b .basalt-spinner").getAttribute("data-size"), "24");
    await context.close();
  });

  test("a bare braille Spinner keeps its own size", async () => {
    const { page, context } = await open(render(`<B.Spinner variant="braille" size={20} label="Loading" />`));
    assert.equal(await page.locator("svg").evaluate((el) => el.getBoundingClientRect().width), 9);
    await context.close();
  });
});

describe("the indeterminate Progress bar, held", () => {
  const bars = render(`<div style={{ padding: 16, width: 400, display: "grid", gap: 16 }}>
    <B.Progress id="indeterminate" value={null} label="Preparing" showValue={false} />
    <B.Progress id="p0" value={0} label="Zero" showValue={false} />
    <B.Progress id="p30" value={30} label="Thirty" showValue={false} />
    <B.Progress id="p100" value={100} label="Hundred" showValue={false} />
  </div>`);
  const track = (page, id) => page.locator(`#${id} .basalt-progress-track`).screenshot({ animations: "allow" });

  for (const theme of THEMES) {
    for (const reducedMotion of ["no-preference", "reduce"]) {
      test(`held shows the empty track: it matches a bar at 0 and differs from 30 and 100, with no animation (${theme}, ${reducedMotion})`, async () => {
        const { page, context } = await open(bars, { stored: true, bootstrap: true, theme, reducedMotion });
        await settle(page);
        await page.waitForTimeout(300);
        assert.deepEqual(await running(page), [], "nothing runs");
        const held = await track(page, "indeterminate");
        assert.ok((await track(page, "p0")).equals(held), "the pixels of the track are a determinate bar at 0");
        assert.ok(!(await track(page, "p30")).equals(held), "and differ from 30");
        assert.ok(!(await track(page, "p100")).equals(held), "and from 100");
        // the semantics and the label stay
        const bar = page.getByRole("progressbar", { name: "Preparing" });
        assert.equal(await bar.getAttribute("aria-valuenow"), null, "still indeterminate");
        assert.equal(await page.locator("#indeterminate .basalt-progress-label").textContent(), "Preparing");
        assert.equal(await page.locator("#indeterminate .basalt-progress-indicator").evaluate((el) => getComputedStyle(el).visibility), "hidden");
        // released, the bar is back and moves
        await page.evaluate(() => { localStorage.removeItem("basalt-loops"); document.documentElement.removeAttribute("data-loops"); });
        await frames(page);
        assert.equal(await page.locator("#indeterminate .basalt-progress-indicator").evaluate((el) => getComputedStyle(el).visibility), "visible");
        assert.ok((await running(page)).length >= 1, "released, it runs again");
        await context.close();
      });
    }
  }
});

describe("axe", () => {
  const modes = [
    ...THEMES.map((theme) => ({ name: `${theme}`, theme })),
    { name: "dark, forced colours", theme: "dark", forcedColors: "active" },
    { name: "light, forced colours", theme: "light", forcedColors: "active" },
    { name: "dark, reduced motion", theme: "dark", reducedMotion: "reduce" },
    { name: "light, reduced motion", theme: "light", reducedMotion: "reduce" },
  ];
  for (const mode of modes) {
    test(`no WCAG 2.2 AA violations, running and held (${mode.name})`, async () => {
      const { page, context } = await open(shell, mode);
      await page.waitForFunction(() => window.t);
      await page.evaluate(() => window.t.show({ title: "Publishing", running: true }));
      await page.locator(".basalt-toast").waitFor();
      await page.waitForTimeout(500);
      await settle(page);
      await page.addScriptTag({ content: axeSource });
      const audit = () => page.evaluate(() => window.axe.run(
        { exclude: [["[data-base-ui-focus-guard]"]] },
        { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] },
      ));
      const fmt = (result) => result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join("; ")})`);
      assert.deepEqual(fmt(await audit()), [], "running");
      await page.locator("#toggle").click({ force: true });
      await frames(page);
      assert.equal(await attr(page), "held");
      await page.waitForTimeout(250);
      await settle(page);
      assert.deepEqual(fmt(await audit()), [], "held");
      await context.close();
    });
  }
});
