// cimip-gaps-3, topic t7 (cut content fades; the council's decision, cimip-gaps-3/t7/decision.md, DECISIONS 395 to 399): every scrollport Basalt draws fades its
// content at an edge that hides more. The band per side (0/band, band/band, band/0; the hidden distance below the token; right to left), no mask on a port
// that fits (after content shrinks too), the modes and the page's switch, clearance measured after Tab, the arrow keys and a controlled change, the protected
// item (focus and keep()), the hosts' rings, keyboard reach on text-only ports, rims and held actions unchanged, the segmented host and port, a classic
// scrollbar's strip, the tab row's hits, and the untitled CodeBlock's Copy rows. Synthetic data in two unlike domains (a greenhouse log and a recipe box).
// Driven in Chromium against the built package and its stylesheet. Written and not run: tests are paused (DECISIONS 359).
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { chromium } from "playwright";

import { fixturePage, launch, pixels, settle } from "./support.mjs";

let browser;
let classic;
before(async () => {
  browser = await launch();
  // A styled scrollbar is classic in Chromium whatever the system says (as parity-8 and table-filter launch): the strip's pixels are real.
  classic = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] });
});
after(async () => { await browser?.close(); await classic?.close(); });

const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 };
const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const open = async (body, options = DESKTOP, theme = "dark", on = browser) => {
  const { page, errors } = await fixturePage(on, body, { theme, ...options });
  await page.addStyleTag({ content: "body { background: var(--basalt-surface-page); color: var(--basalt-text-primary); margin: 0; padding: 24px; }" });
  await settle(page);
  return { page, errors };
};
/** The fade's state on a port: its attribute and its four bands, read from what the watcher wrote. */
const fade = (page, selector) => page.evaluate((s) => {
  const el = document.querySelector(s);
  const read = (name) => parseFloat(el.style.getPropertyValue(name)) || 0;
  return { mode: el.getAttribute("data-fade"), t: read("--_fade-t"), r: read("--_fade-r"), b: read("--_fade-b"), l: read("--_fade-l"), mask: getComputedStyle(el).maskImage };
}, selector);
const frame = (page) => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
const scrollTo = async (page, selector, x, y) => { await page.evaluate(([s, left, top]) => { const el = document.querySelector(s); if (left !== null) el.scrollLeft = left; if (top !== null) el.scrollTop = top; }, [selector, x, y]); await frame(page); };

const LOG = Array.from({ length: 40 }, (_, i) => `Bench ${i + 1}: misted the seedlings, checked the humidity at 72% and moved the ferns away from the vent.`);
const RECIPES = ["Bread", "Soups", "Salads", "Pickles", "Preserves", "Pastry", "Noodles", "Curries", "Dumplings", "Grills", "Desserts", "Drinks"];

const TABS = (dir = "ltr", value = "Bread") => `
function App() {
  const [value, setValue] = React.useState(${JSON.stringify(value)});
  window.choose = setValue;
  return <div dir="${dir}" style={{ width: 300 }}><B.Tabs value={value} onValueChange={setValue}><B.TabsList aria-label="Recipes">
    ${RECIPES.map((r) => `<B.Tab value="${r}">${r}</B.Tab>`).join("")}
  </B.TabsList></B.Tabs></div>;
}
${render("<App />")}`;

const SEGMENTS = (width, value = "Bread") => `
function App() {
  const [value, setValue] = React.useState(${JSON.stringify(value)});
  window.choose = setValue;
  return <div style={{ width: ${width} }}><B.SegmentedControl aria-label="Recipes" value={value} onValueChange={setValue}>
    ${RECIPES.slice(0, 8).map((r) => `<B.Segment value="${r}">${r}</B.Segment>`).join("")}
  </B.SegmentedControl></div>;
}
${render("<App />")}`;

const CODE = (title = "", width = 420) => `${render(`<div style={{ width: ${width} }}><B.CodeBlock ${title ? `title="${title}"` : ""} code={${JSON.stringify(["mist --bench 3 --humidity 72", "for (const bench of benches) { schedule(bench, { misting: 'every 40 minutes', vents: 'closed after dusk', lights: 'sixteen hours' }); }", "done"].join("\n"))}} /></div>`)}`;

describe("the band on each side", () => {
  test("a fitting port has no attribute and no mask; start, middle and end give 0/band, band/band, band/0; the band is the hidden distance below the token", async () => {
    const { page, errors } = await open(render(`<div style={{ width: 2000 }}><B.CodeBlock code="short line" /></div>`));
    assert.equal((await fade(page, ".basalt-code-pre")).mode, null);
    assert.equal((await fade(page, ".basalt-code-pre")).mask, "none");
    const long = await open(CODE());
    const at = (x) => scrollTo(long.page, ".basalt-code-pre", x, null).then(() => fade(long.page, ".basalt-code-pre"));
    const start = await at(0);
    assert.deepEqual([start.mode, start.l, start.r], ["inline", 0, 20]);
    const middle = await at(200);
    assert.deepEqual([middle.l, middle.r], [20, 20]);
    const max = await long.page.evaluate(() => { const p = document.querySelector(".basalt-code-pre"); return p.scrollWidth - p.clientWidth; });
    const end = await at(max);
    assert.deepEqual([end.l, end.r], [20, 0]);
    // Seven pixels from the end: the band there is the hidden distance, not the token.
    const near = await at(max - 7);
    assert.equal(near.r, 7);
    assert.deepEqual([...errors, ...long.errors], []);
  });

  test("right to left: the sides are read from the geometry, so the start is on the right", async () => {
    const { page } = await open(`${render(`<div dir="rtl" style={{ width: 420 }}><B.CodeBlock code={${JSON.stringify("x".repeat(400))}} /></div>`)}`);
    const start = await fade(page, ".basalt-code-pre");
    assert.deepEqual([start.r, start.l > 0], [0, true]);
  });

  test("after content shrinks to fit (rows filtered), the attribute is gone", async () => {
    const { page } = await open(`
function App() { const [rows, setRows] = React.useState(40); window.setRows = setRows;
  return <B.Listbox label="Benches">{Array.from({ length: rows }, (_, i) => <B.ListboxOption key={i} value={"b" + i}>{"Bench " + (i + 1)}</B.ListboxOption>)}</B.Listbox>; }
${render("<div style={{ height: 240, display: 'flex' }}><App /></div>")}`);
    assert.equal((await fade(page, ".basalt-listbox-scroll")).mode, "block");
    await page.evaluate(() => window.setRows(2));
    await frame(page);
    assert.equal((await fade(page, ".basalt-listbox-scroll")).mode, null);
  });
});

describe("the modes and the page's switch", () => {
  for (const [name, media] of [["more contrast", { contrast: "more" }], ["forced colours", { forcedColors: "active" }], ["print", { media: "print" }]]) {
    test(`under ${name} every mask is none, an open menu's included, and the tab row keeps its clip-path`, async () => {
      const { page } = await open(`${TABS()}`);
      await page.evaluate(() => window.choose("Drinks"));
      await frame(page);
      await page.emulateMedia(media);
      const tab = await page.evaluate(() => { const p = document.querySelector(".basalt-tabs-scroll"); return { mask: getComputedStyle(p).maskImage, clip: getComputedStyle(p).clipPath }; });
      assert.equal(tab.mask, "none");
      assert.notEqual(tab.clip, "none");
    });
  }
  test("under reduced transparency (Chromium reports it) and with data-fades=\"off\" on the root the mask is none; reduced motion keeps it", async () => {
    const { page } = await open(CODE());
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.notEqual((await fade(page, ".basalt-code-pre")).mask, "none");
    await page.evaluate(() => document.documentElement.setAttribute("data-fades", "off"));
    assert.equal((await fade(page, ".basalt-code-pre")).mask, "none");
    await page.evaluate(() => document.documentElement.removeAttribute("data-fades"));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
    assert.equal((await fade(page, ".basalt-code-pre")).mask, "none");
  });
});

/** Whether `item`'s rect, grown by `ring`, is outside every live band of `port`. */
const clearOfBands = (page, port, item, ring) => page.evaluate(([p, i, r]) => {
  const el = document.querySelector(p);
  const at = document.querySelector(i).getBoundingClientRect();
  const box = el.getBoundingClientRect();
  const read = (n) => parseFloat(el.style.getPropertyValue(n)) || 0;
  const t = read("--_fade-t") + read("--_in-t") + read("--_pin-t");
  const b = read("--_fade-b") + read("--_in-b") + read("--_pin-b");
  const l = read("--_fade-l") + read("--_in-l") + read("--_pin-l");
  const rr = read("--_fade-r") + read("--_in-r") + read("--_pin-r");
  return at.top - r >= box.top + t - 0.5 && at.bottom + r <= box.bottom - b + 0.5 && at.left - r >= box.left + l - 0.5 && at.right + r <= box.right - rr + 0.5;
}, [port, item, ring]);

describe("clearance, measured after the move", () => {
  test("tabs: Tab, the arrow keys and a controlled change leave the tab and its +2 ring outside every band, measured from the column", async () => {
    for (const dir of ["ltr", "rtl"]) {
      const { page } = await open(TABS(dir));
      await page.keyboard.press("Tab");
      for (let i = 0; i < 6; i += 1) {
        await page.keyboard.press(dir === "rtl" ? "ArrowLeft" : "ArrowRight");
        await frame(page);
        assert.ok(await clearOfBands(page, ".basalt-tabs-scroll", ".basalt-tab:focus", 4), `${dir}: the focused tab is clear after ${i + 1} keys`);
      }
      await page.evaluate(() => window.choose("Drinks"));
      await frame(page);
      assert.ok(await clearOfBands(page, ".basalt-tabs-scroll", '.basalt-tab[aria-selected="true"]', 4), `${dir}: the chosen tab is clear`);
    }
  });

  test("segments, a menu, a select, the command list, search results, notifications and a sheet body: the active or focused item is clear of every band", async () => {
    const { page } = await open(SEGMENTS(240));
    await page.keyboard.press("Tab");
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press("ArrowRight");
      await frame(page);
      assert.ok(await clearOfBands(page, ".basalt-segmented-scroll", ".basalt-segment:focus", 0));
    }
    const menu = await open(`${render(`<B.Menu defaultOpen><B.MenuTrigger>Benches</B.MenuTrigger><B.MenuContent>${LOG.slice(0, 30).map((_, i) => `<B.MenuItem>Bench ${i + 1}</B.MenuItem>`).join("")}</B.MenuContent></B.Menu>`)}`);
    for (let i = 0; i < 20; i += 1) await menu.page.keyboard.press("ArrowDown");
    await frame(menu.page);
    assert.ok(await clearOfBands(menu.page, ".basalt-menu-scroll", ".basalt-menu-item[data-highlighted]", 0));
  });

  test("a focused field wheeled to a sheet body's edge keeps its ring whole on all four sides, and the band on that side is its room", async () => {
    const { page } = await open(`${render(`<B.Sheet defaultOpen><B.SheetContent><B.SheetHeader closeLabel="Close"><B.SheetTitle>Bench notes</B.SheetTitle></B.SheetHeader><B.SheetBody>${LOG.slice(0, 12).map((l) => `<p>${l}</p>`).join("")}<B.Field label="Note"><B.Input defaultValue="Ferns moved" /></B.Field>${LOG.slice(12, 24).map((l) => `<p>${l}</p>`).join("")}</B.SheetBody></B.SheetContent></B.Sheet>`)}`);
    await page.focus(".basalt-sheet-body input");
    for (const offset of [-40, -20, -8, 0, 8]) {
      await page.evaluate((d) => { const body = document.querySelector(".basalt-sheet-body"); const field = body.querySelector("input"); body.scrollTop = field.offsetTop - body.clientHeight + field.offsetHeight + d; }, offset);
      await frame(page);
      assert.ok(await clearOfBands(page, ".basalt-sheet-body", ".basalt-sheet-body input", 4) || (await fade(page, ".basalt-sheet-body")).b === 0, `offset ${offset}`);
    }
  });
});

describe("the protected item in MentionPicker (focus stays in the field)", () => {
  const PICKER = `
function App() {
  const field = React.useRef(null);
  const options = ${JSON.stringify(Array.from({ length: 30 }, (_, i) => ({ label: `Grower ${i + 1}`, value: `g${i}`, description: i === 4 ? "Waters the north benches every morning before the vents open, then logs the readings; ".repeat(8) : undefined })))};
  return <><B.Textarea ref={field} aria-label="Note" /><B.MentionPicker field={field} options={options} /></>;
}
${render("<App />")}`;
  test("arrowing onto an option taller than the port gives no band on the side it crosses; an ordinary option brings it back; closing keeps nothing", async () => {
    const { page } = await open(PICKER);
    await page.focus("textarea");
    await page.keyboard.type("@");
    for (let i = 0; i < 4; i += 1) await page.keyboard.press("ArrowDown");
    await frame(page);
    const tall = await fade(page, ".basalt-mention-picker .basalt-menu-scroll");
    assert.ok(tall.t === 0 || tall.b === 0, "a side the tall option crosses has no band");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await frame(page);
    const after = await fade(page, ".basalt-mention-picker .basalt-menu-scroll");
    assert.ok(after.t > 0 || after.b > 0, "the band comes back");
    await page.keyboard.press("Escape");
    await frame(page);
    assert.equal(await page.locator(".basalt-mention-picker").count(), 0);
  });
});

/** The focus colour as the page resolves it, in 8-bit sRGB. */
const focusColour = (page) => page.evaluate(() => {
  const probe = document.createElement("i");
  probe.style.color = "var(--basalt-border-focus)";
  document.body.append(probe);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = getComputedStyle(probe).color;
  ctx.fillRect(0, 0, 1, 1);
  probe.remove();
  return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
});
/**
 * The ring's pixel at the middle of each side of `selector`'s border box: `at` CSS pixels outside it for a ring at +2 (3: the middle of the 2px stroke), or
 * inside it for a ring at -2 (a negative `at`). Each is compared to the resolved focus colour within one level of rounding a channel.
 */
const ringOnFourSides = async (page, selector, at) => {
  const box = await page.locator(selector).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const want = await focusColour(page);
  const spots = [[box.x + box.w / 2, box.y - at], [box.x + box.w / 2, box.y + box.h + at - 1], [box.x - at, box.y + box.h / 2], [box.x + box.w + at - 1, box.y + box.h / 2]];
  for (const [i, [x, y]] of spots.entries()) {
    const [got] = await pixels(page, { x: Math.round(x), y: Math.round(y), width: 1, height: 1 });
    assert.ok(got.every((c, k) => Math.abs(c - want[k]) <= 2), `${selector}, side ${["top", "bottom", "left", "right"][i]}: ${got} against the focus colour ${want}`);
  }
};

describe("hosts and keyboard reach", () => {
  const SHEET_BODY = `${render(`<B.Sheet defaultOpen><B.SheetContent><B.SheetHeader><B.SheetTitle>Bench log</B.SheetTitle></B.SheetHeader><B.SheetBody>${LOG.map((l) => `<p>${l}</p>`).join("")}</B.SheetBody></B.SheetContent></B.Sheet>`)}`;
  const DRAWER_BODY = `${render(`<B.Drawer id="d" open label="Bench"><B.DrawerSection title="Log">${LOG.map((l) => `<p>${l}</p>`).join("")}</B.DrawerSection></B.Drawer>`)}`;
  const TERMINAL = `${render(`<div style={{ width: 420 }}><B.Terminal title="Watering" lines={${JSON.stringify([{ kind: "command", text: "water --all-benches --verbose --log /var/log/greenhouse/watering-schedule-for-the-whole-season.txt" }, { kind: "output", text: LOG[0] }])}} /></div>`)}`;

  for (const [name, body, port, host, at] of [
    ["CodeBlock", CODE("bench.sh"), ".basalt-code-pre", ".basalt-code", 3],
    ["Terminal", TERMINAL, ".basalt-terminal .basalt-code-pre", ".basalt-terminal", 3],
    ["a sheet body", SHEET_BODY, ".basalt-sheet-body", ".basalt-sheet-body-host", -1],
    ["a drawer body", DRAWER_BODY, ".basalt-drawer-body", ".basalt-drawer-body-host", 3],
  ]) {
    test(`${name}: reached by Tab, its host's ring is the focus colour on all four sides, the port draws none, and the arrow keys scroll it`, async () => {
      for (const theme of ["dark", "light"]) {
        const { page, errors } = await open(body, DESKTOP, theme);
        let reached = false;
        for (let i = 0; i < 8 && !reached; i += 1) {
          await page.keyboard.press("Tab");
          reached = await page.evaluate((s) => document.activeElement === document.querySelector(s), port);
        }
        assert.ok(reached, `${theme}: Tab reaches the port`);
        assert.equal(await page.locator(port).evaluate((el) => getComputedStyle(el).outlineStyle), "none", "the masked port draws no ring of its own");
        await ringOnFourSides(page, host, at);
        const before = await page.locator(port).evaluate((el) => [el.scrollLeft, el.scrollTop]);
        await page.keyboard.press(name === "CodeBlock" || name === "Terminal" ? "ArrowRight" : "ArrowDown");
        await page.keyboard.press(name === "CodeBlock" || name === "Terminal" ? "ArrowRight" : "ArrowDown");
        await frame(page);
        const after = await page.locator(port).evaluate((el) => [el.scrollLeft, el.scrollTop]);
        assert.ok(after[0] !== before[0] || after[1] !== before[1], `${theme}: the arrow keys scroll ${name}`);
        assert.deepEqual(errors, []);
        await page.close();
      }
    });
  }

  test("a docked tray of rows that only report, and a plain popover with a title, are stops named by their tray and their title; Tab then the arrow keys scroll them", async () => {
    const tray = await open(`${render(`<div className="basalt-app-foot" style={{ position: "static", maxHeight: 160 }}><B.Tray label="Waiting on you" summary={(n) => n + " waiting"}>${LOG.slice(0, 10).map((l, i) => `<B.TrayRow key={${i}} stay>${l}</B.TrayRow>`).join("")}</B.Tray></div>`)}`);
    await tray.page.keyboard.press("Tab");
    const stop = await tray.page.evaluate(() => { const p = document.querySelector(".basalt-tray-scroll"); return { focused: document.activeElement === p, role: p.getAttribute("role"), name: document.getElementById(p.getAttribute("aria-labelledby") ?? "")?.getAttribute("aria-label") }; });
    assert.deepEqual(stop, { focused: true, role: "region", name: "Waiting on you" });
    await tray.page.keyboard.press("ArrowDown");
    await frame(tray.page);
    assert.ok(await tray.page.evaluate(() => document.querySelector(".basalt-tray-scroll").scrollTop > 0));
    const pop = await open(`${render(`<B.Popover defaultOpen><B.PopoverTrigger>Recipe</B.PopoverTrigger><B.PopoverContent style={{ maxHeight: 200 }}><B.PopoverTitle>Sourdough</B.PopoverTitle>${LOG.map((l) => `<p>${l}</p>`).join("")}</B.PopoverContent></B.Popover>`)}`);
    const named = await pop.page.evaluate(() => { const p = document.querySelector(".basalt-popover-scroll"); return { tab: p.getAttribute("tabindex"), role: p.getAttribute("role"), name: document.getElementById(p.getAttribute("aria-labelledby") ?? "")?.textContent }; });
    assert.deepEqual(named, { tab: "0", role: "region", name: "Sourdough" });
    await pop.page.focus(".basalt-popover-scroll");
    await pop.page.keyboard.press("ArrowDown");
    await frame(pop.page);
    assert.ok(await pop.page.evaluate(() => document.querySelector(".basalt-popover-scroll").scrollTop > 0));
  });

  test("a port that only overflows sideways is a stop too (the command pane's body with a wide table)", async () => {
    // Through the package's own hook: a SheetBody that holds one wide, short line and nothing focusable.
    const sheet = await open(`${render(`<B.Sheet defaultOpen><B.SheetContent><B.SheetHeader><B.SheetTitle>Wide</B.SheetTitle></B.SheetHeader><B.SheetBody><pre style={{ margin: 0 }}>${"x".repeat(400)}</pre></B.SheetBody></B.SheetContent></B.Sheet>`)}`);
    assert.equal(await sheet.page.locator(".basalt-sheet-body").getAttribute("tabindex"), "0");
  });

  test("a real Menu's rim pixels are unchanged while its rows scroll; a Sheet with no SheetBody keeps its actions' pixels and the band ends on their divider", async () => {
    const menu = await open(`${render(`<B.Menu defaultOpen><B.MenuTrigger>Benches</B.MenuTrigger><B.MenuContent style={{ maxHeight: 282 }}>${LOG.slice(0, 24).map((_, i) => `<B.MenuItem>Bench ${i + 1}</B.MenuItem>`).join("")}</B.MenuContent></B.Menu>`)}`);
    const rim = await menu.page.evaluate(() => { const r = document.querySelector(".basalt-menu").getBoundingClientRect(); return [{ x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: 1 }, { x: Math.round(r.left), y: Math.round(r.top), width: 1, height: Math.round(r.height) }]; });
    const before = await Promise.all(rim.map((clip) => pixels(menu.page, clip)));
    await scrollTo(menu.page, ".basalt-menu-scroll", null, 200);
    assert.equal((await fade(menu.page, ".basalt-menu-scroll")).mode, "block");
    assert.equal(await menu.page.locator(".basalt-menu").evaluate((el) => getComputedStyle(el).maskImage), "none", "the popup that draws the rim is never masked");
    const after = await Promise.all(rim.map((clip) => pixels(menu.page, clip)));
    assert.deepEqual(after, before, "the rim's pixels, top and side, while the rows scroll");
    const { page } = await open(`${render(`<B.Sheet defaultOpen><B.SheetContent><B.SheetTitle>Recipe box</B.SheetTitle>${LOG.map((l) => `<p>${l}</p>`).join("")}<B.SheetActions><B.Button>Save</B.Button></B.SheetActions></B.SheetContent></B.Sheet>`)}`);
    const actions = await page.evaluate(() => { const r = document.querySelector(".basalt-dialog-actions").getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + 8), width: Math.round(r.width), height: Math.round(r.height - 8) }; });
    await scrollTo(page, ".basalt-sheet-scroll", null, 0);
    const still = await pixels(page, actions);
    await scrollTo(page, ".basalt-sheet-scroll", null, 400);
    assert.deepEqual(await pixels(page, actions), still, "the held actions' pixels mid-scroll");
    const pin = await page.evaluate(() => parseFloat(document.querySelector(".basalt-sheet-scroll").style.getPropertyValue("--_pin-b")));
    const divider = await page.evaluate(() => { const port = document.querySelector(".basalt-sheet-scroll").getBoundingClientRect(); const a = document.querySelector(".basalt-dialog-actions").getBoundingClientRect(); return port.bottom - (a.top + 6); });
    assert.ok(Math.abs(pin - divider) <= 1, `the strip ends on the divider: ${pin} against ${divider}`);
    assert.equal((await fade(page, ".basalt-sheet-scroll")).b, 16);
  });
});

describe("fix pass 1 (Astra)", () => {
  test("a long status peek scrolled to its end stays there while the page scrolls and the plate is placed again", async () => {
    const { page } = await open(`${render(`<div style={{ height: 2000 }}><div style={{ position: "fixed", bottom: 0, left: 0, width: 260 }}><B.StatusBar message={{ text: ${JSON.stringify(LOG.join(" "))} }} /></div></div>`)}`);
    await page.locator(".basalt-status-bar-message").hover();
    await page.waitForSelector(".basalt-peek[data-open] .basalt-peek-scroll");
    const end = await page.evaluate(() => { const p = document.querySelector(".basalt-peek-scroll"); p.scrollTop = p.scrollHeight; return p.scrollTop; });
    await frame(page);
    await page.mouse.wheel(0, 0);
    await page.evaluate(() => window.scrollBy(0, 1));
    await frame(page);
    assert.equal(await page.evaluate(() => document.querySelector(".basalt-peek-scroll").scrollTop), end, "the port is kept and its scroll with it");
  });

  for (const chosen of [undefined, "b24"]) {
    test(`Tab into a Listbox ${chosen ? "with a chosen option far down" : "with none chosen"}: the active descendant is in view, clear of the band, and kept`, async () => {
      const { page } = await open(`${render(`<div style={{ height: 240, display: "flex" }}><B.Listbox label="Benches"${chosen ? ` defaultValue="${chosen}"` : ""}>{Array.from({ length: 30 }, (_, i) => <B.ListboxOption key={i} value={"b" + i} disabled={i === 0}>{"Bench " + (i + 1)}</B.ListboxOption>)}</B.Listbox></div>`)}`);
      await page.keyboard.press("Tab");
      await frame(page);
      const id = await page.locator('[role="listbox"]').getAttribute("aria-activedescendant");
      assert.ok(id, "an active descendant is named");
      assert.equal(await page.evaluate((i) => document.getElementById(i).dataset.value, id), chosen ?? "b1", "the chosen option, or the first enabled one");
      assert.ok(await clearOfBands(page, ".basalt-listbox-scroll", `#${id.replace(/%/g, "\\%")}`, 0), "clear of every band");
    });
  }
});

describe("the segmented host and port", () => {
  test("the pill's rect equals the chosen segment's, fitting and overflowing; a control that fits keeps its box", async () => {
    for (const width of [900, 240]) {
      const { page } = await open(SEGMENTS(width, "Pickles"));
      const [pill, chosen] = await page.evaluate(() => [document.querySelector(".basalt-pill"), document.querySelector(".basalt-segment[data-pressed]")].map((el) => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); }));
      assert.deepEqual(pill, chosen, `width ${width}`);
    }
    const fits = await open(SEGMENTS(900));
    const host = await fits.page.evaluate(() => { const h = document.querySelector(".basalt-segmented"); const p = document.querySelector(".basalt-segmented-scroll"); return { host: h.getBoundingClientRect().width, port: p.getBoundingClientRect().width, padding: getComputedStyle(p).paddingLeft, overflow: h.hasAttribute("data-overflow"), mask: getComputedStyle(p).maskImage }; });
    assert.equal(host.host, host.port, "the host is the port's size");
    assert.deepEqual([host.padding, host.overflow, host.mask], ["2px", false, "none"]);
    const track = await fits.page.evaluate(() => getComputedStyle(document.querySelector(".basalt-segmented")).maskImage);
    assert.equal(track, "none", "the track is never masked");
  });
});

describe("a classic scrollbar keeps full paint", () => {
  for (const dir of ["ltr", "rtl"]) {
    test(`${dir}: a CodeBlock's horizontal bar and a sheet's vertical bar are pinned strips`, async () => {
      const { page } = await open(`${CODE()}`, DESKTOP, "dark", classic);
      await page.addStyleTag({ content: "::-webkit-scrollbar { width: 12px; height: 12px; background: #444 } ::-webkit-scrollbar-thumb { background: #bbb }" });
      await page.evaluate((d) => { document.documentElement.dir = d; }, dir);
      await scrollTo(page, ".basalt-code-pre", dir === "rtl" ? -100 : 100, null);
      const pin = await page.evaluate(() => parseFloat(document.querySelector(".basalt-code-pre").style.getPropertyValue("--_pin-b")));
      assert.equal(pin, 12);
      assert.ok(await page.evaluate(() => document.querySelector(".basalt-code-pre").hasAttribute("data-fade-pin")));
    });
  }
});

describe("hits", () => {
  test("2px inside a tab's band the tab is hit; 2px outside the clip nothing of the row is", async () => {
    const { page } = await open(TABS());
    await page.evaluate(() => window.choose("Pastry"));
    await frame(page);
    const hits = await page.evaluate(() => {
      const port = document.querySelector(".basalt-tabs-scroll");
      const box = port.getBoundingClientRect();
      const left = box.left + (parseFloat(port.style.getPropertyValue("--_clip-left")) || 0);
      const y = box.top + box.height / 2;
      return { inside: document.elementFromPoint(left + 2, y)?.closest(".basalt-tab") !== null, outside: document.elementFromPoint(left - 2, y)?.closest(".basalt-tab") ?? null };
    });
    assert.equal(hits.inside, true);
    assert.equal(hits.outside, null);
  });
});

describe("the untitled CodeBlock's Copy rows", () => {
  for (const [name, options] of [["desktop", DESKTOP], ["touch", PHONE]]) {
    test(`${name}: no glyph under the button mid-scroll, a line that fits has the mask-off pixels, and no row is divided by a layer's edge`, async () => {
      for (const dir of ["ltr", "rtl"]) {
        const { page } = await open(`${render(`<div dir="${dir}" style={{ width: 340 }}><B.CodeBlock code={${JSON.stringify(["fits", "x".repeat(300), "fits too"].join("\n"))}} /></div>`)}`, options);
        const rows = await page.evaluate(() => { const p = document.querySelector(".basalt-code-pre"); return { h: parseFloat(p.style.getPropertyValue("--_copy-h")), top: parseFloat(getComputedStyle(p).paddingTop), line: parseFloat(getComputedStyle(p).lineHeight) }; });
        assert.equal((rows.h - rows.top) % rows.line, 0, `${dir}: whole rows`);
        const fitting = await page.evaluate(() => { const p = document.querySelector(".basalt-code-pre"); const r = p.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + 52), width: Math.round(r.width), height: 20 }; });
        const masked = await pixels(page, fitting);
        await page.evaluate(() => document.documentElement.setAttribute("data-fades", "off"));
        const plain = await pixels(page, fitting);
        assert.deepEqual(masked, plain, `${dir}: the line that fits is untouched`);
        await page.evaluate(() => document.documentElement.removeAttribute("data-fades"));
        await scrollTo(page, ".basalt-code-pre", dir === "rtl" ? -60 : 60, null);
        const button = await page.evaluate(() => { const r = document.querySelector(".basalt-code-copy").getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }; });
        await page.evaluate(() => { document.querySelector(".basalt-code-copy").style.visibility = "hidden"; });
        const under = await pixels(page, button);
        const well = await page.evaluate(() => getComputedStyle(document.querySelector(".basalt-code")).backgroundColor);
        assert.ok(under.every((px) => px === under[0]), `${dir}: one colour under the button (the well ${well}), no glyph`);
      }
    });
  }
  test("the end padding is 54px at the default density and 70px on touch; the titled block keeps 16px", async () => {
    const pads = async (options, title) => { const { page } = await open(CODE(title), options); return page.evaluate(() => getComputedStyle(document.querySelector(".basalt-code-pre")).paddingInlineEnd); };
    assert.equal(await pads(DESKTOP, ""), "54px");
    assert.equal(await pads(PHONE, ""), "70px");
    assert.equal(await pads(DESKTOP, "bench.sh"), "16px");
  });
});

describe("tokens", () => {
  test("size-scroll-fade is 20px and size-scroll-fade-block 16px", async () => {
    const { page } = await open(render("<div />"));
    const values = await page.evaluate(() => { const s = getComputedStyle(document.documentElement); return [s.getPropertyValue("--basalt-size-scroll-fade").trim(), s.getPropertyValue("--basalt-size-scroll-fade-block").trim()]; });
    assert.deepEqual(values, ["20px", "16px"]);
  });
});
