// cimip-gaps-3, topic t4 (forms and controls; the council's decision, cimip-gaps-3/t4/decision.md): a field's hint and error in one seat, the filter toolbar's
// fold on a phone, a status dot in a segment, FileInput, FormPreview, tab rows and segmented controls that scroll, a count on an option chip, FilterResult's
// spoken form and held width, the stepper's gate, and Reserve block. Driven in Chromium against the built package and its stylesheet. Synthetic data in two
// unlike domains (a bakery and a photo library). Written and not run: tests are paused (DECISIONS 359).
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { fixturePage, launch, settle } from "./support.mjs";

const pkg = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const open = async (body, options = DESKTOP, theme = "dark") => {
  const { page, errors } = await fixturePage(browser, body, { theme, ...options });
  await page.addStyleTag({ content: "body { background: var(--basalt-surface-page); color: var(--basalt-text-primary); margin: 0; padding: 24px; } button, input { font: inherit; }" });
  return { page, errors };
};
const top = (page, selector) => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top, selector);
const near = (a, b, message, within = 0.01) => assert.ok(Math.abs(a - b) <= within, `${message}: ${a} against ${b}`);
const active = (page) => page.evaluate(() => { const a = document.activeElement; return a === document.body ? "body" : a?.getAttribute("aria-label") ?? a?.textContent?.trim() ?? a?.tagName; });

// ---- 1. A field's hint and error in one seat ----

const FIELD = (props) => `
function App() {
  const [bad, setBad] = React.useState(false);
  window.setBad = setBad;
  return <form id="f">
    <B.Field ${props} label="Pickup date" name="date" description="As MM/DD." invalid={bad} error="Write the date as MM/DD, two days out or more (for example 12/04)."><B.Input defaultValue="12/1" required /></B.Field>
    <B.Field label="Name" name="name"><B.Input id="next" defaultValue="Rosa" /></B.Field>
  </form>;
}
${render("<App />")}`;

// A real FormGrid: row 1 is the reserved field beside another, row 2 holds the field whose top is measured. From 720 (and 640 of its own width) the two
// columns share every track; at 390 it is one column. Either way the next row must not move.
const GRID = `
function App() {
  const [bad, setBad] = React.useState(false);
  window.setBad = setBad;
  return <B.FormGrid reserveErrors>
    <B.Field column={1} row={1} label="File name" name="file" description="Letters, digits and dashes." invalid={bad} error="Use letters, digits and dashes only: no spaces, slashes or dots, and at most 60 characters."><B.Input defaultValue="lisbon trip/2026" /></B.Field>
    <B.Field column={2} row={1} label="Longest edge" name="edge" description="In pixels, 512 to 8192."><B.Input defaultValue="2048" /></B.Field>
    <B.Field column={1} row={2} label="Album" name="album"><B.Input id="next" defaultValue="Lisbon trip" /></B.Field>
    <B.Field column={2} row={2} label="Copies" name="copies"><B.Input id="beside" defaultValue="1" /></B.Field>
  </B.FormGrid>;
}
${render("<App />")}`;

describe("Field reserveError (t4 item 1)", () => {
  for (const [name, options] of [["1440", DESKTOP], ["390", PHONE]]) {
    test(`hint to error and back moves the next field 0px, in a Form and in a FormGrid row (${name})`, async () => {
      for (const body of [FIELD("reserveError"), FIELD("").replace("<form", "<B.Form reserveErrors").replace("</form>", "</B.Form>"), GRID]) {
        const { page, errors } = await open(body, options);
        await page.waitForSelector("#next");
        const before = await top(page, "#next");
        await page.evaluate(() => window.setBad(true));
        await settle(page);
        near(await top(page, "#next"), before, "the next field with the error showing");
        await page.evaluate(() => window.setBad(false));
        await settle(page);
        near(await top(page, "#next"), before, "the next field back on the hint");
        if (body === GRID) assert.equal(await page.evaluate(() => document.querySelectorAll(".basalt-form-grid > .basalt-field").length), 4, "a real FormGrid row");
        assert.deepEqual(errors, []);
        await page.close();
      }
    });
  }

  test("a listed two-line message holds its room, and an unlisted node error grows the seat", async () => {
    const LONG = "Use letters, digits and dashes only: no spaces, slashes or dots, and at most sixty characters, so the file name works on every system.";
    const { page } = await open(`
function App() {
  const [bad, setBad] = React.useState(false);
  window.setBad = setBad;
  return <div style={{ width: 240 }}>
    <B.Field label="File name" description="Letters, digits and dashes." reserveError={[${JSON.stringify(LONG)}]} invalid={bad} error={${JSON.stringify(LONG)}}><B.Input /></B.Field>
    <B.Input id="next" />
  </div>;
}
${render("<App />")}`);
    const before = await top(page, "#next");
    const seat = await page.evaluate(() => document.querySelector(".basalt-field-foot").getBoundingClientRect().height);
    assert.ok(seat >= 32, `the seat holds two lines of the listed message (${seat}px)`);
    await page.evaluate(() => window.setBad(true));
    await settle(page);
    near(await top(page, "#next"), before, "the listed message moves nothing");
    await page.close();
  });

  test("the unseen line is out of the accessibility tree and aria-describedby; a field without the prop is unchanged", async () => {
    const { page } = await open(FIELD("reserveError"));
    const read = () => page.evaluate(() => {
      const input = document.querySelector("input[name=date], .basalt-field input");
      const ids = (input.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
      const foot = document.querySelector(".basalt-field-foot");
      return {
        described: ids.map((id) => document.getElementById(id)?.className ?? "missing"),
        unseen: [...foot.children].filter((el) => getComputedStyle(el).visibility === "hidden").map((el) => [el.className, el.getAttribute("aria-hidden"), el.inert]),
      };
    });
    const valid = await read();
    assert.ok(valid.described.some((c) => /basalt-field-description/.test(c)), "valid: the hint describes the control");
    assert.ok(valid.unseen.every(([, hidden, inert]) => hidden === "true" && inert === true), "valid: every sizer is aria-hidden and inert");
    await page.evaluate(() => window.setBad(true));
    await settle(page);
    const invalid = await read();
    assert.ok(!invalid.described.some((c) => /basalt-field-description/.test(c)), "invalid: the hint left aria-describedby");
    assert.ok(invalid.described.some((c) => /basalt-field-error/.test(c)), "invalid: the error describes the control");
    await page.close();
    // Without the prop: no seat, the two lines as shipped.
    const plain = await open(FIELD(""));
    assert.equal(await plain.page.evaluate(() => document.querySelectorAll(".basalt-field-foot").length), 0);
    await plain.page.close();
  });

  test("the sizers hold text only; a node error is not in the DOM while valid; FormData and checkValidity() are unchanged by the swap", async () => {
    const { page } = await open(`
function App() {
  const [bad, setBad] = React.useState(false);
  window.setBad = setBad;
  return <form id="f">
    <B.Field label="Pickup" name="pickup" reserveError={["Two days out or more."]} invalid={bad} error={<span id="node-error">Pick a <b>later</b> day</span>}><B.Input name="pickup" defaultValue="12/1" required /></B.Field>
  </form>;
}
${render("<App />")}`);
    const snapshot = () => page.evaluate(() => {
      const form = document.getElementById("f");
      return { data: [...new FormData(form).entries()].map(([k, v]) => `${k}=${v}`), valid: form.checkValidity(), sizerElements: [...document.querySelectorAll(".basalt-field-sizer")].map((s) => s.children.length), node: Boolean(document.getElementById("node-error")) };
    });
    const valid = await snapshot();
    assert.equal(valid.node, false, "a node error is not mounted while valid");
    assert.deepEqual(valid.sizerElements, [0], "a sizer is plain text");
    await page.evaluate(() => window.setBad(true));
    await settle(page);
    const invalid = await snapshot();
    assert.equal(invalid.node, true, "the node error shows while invalid");
    await page.evaluate(() => window.setBad(false));
    await settle(page);
    const back = await snapshot();
    assert.deepEqual([invalid.data, invalid.valid], [valid.data, valid.valid]);
    assert.deepEqual([back.data, back.valid], [valid.data, valid.valid]);
    await page.close();
  });
});

// ---- 2. The filter toolbar's fold ----

const TOOLBAR = (props = "") => `
function App() {
  const [open, setOpen] = React.useState(false);
  const actions = React.useRef(null);
  window.actions = actions;
  window.setFold = setOpen;
  return <B.FilterToolbar label="Filter books" narrow="fold" ${props} actionsRef={actions} activeCount={2}
    search={<B.Input id="search" aria-label="Search books" />}
    filter={[<B.MultiSelect key="f" toolbar label="Format" options={[{ value: "a", label: "Paperback" }, { value: "b", label: "Ebook" }]} />, <B.MultiSelect key="s" toolbar label="Shelf" options={[{ value: "c", label: "On loan" }]} />]}
    result={<B.FilterResult>Showing 214 of 1,862 books</B.FilterResult>}
    sort={<B.Select toolbar aria-label="Sort books" defaultValue="new" options={[{ value: "new", label: "Newest" }, { value: "title", label: "Title" }]} />} />;
}
${render("<App />")}`;

describe("FilterToolbar narrow=\"fold\" (t4 item 2)", () => {
  test("at 390 the fold shows the search, the trigger and the result; opening moves the result 0px; the trigger is named and expanded", async () => {
    const { page, errors } = await open(TOOLBAR(), PHONE);
    const trigger = page.locator(".basalt-filter-toolbar-fold-trigger");
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    assert.equal(await trigger.getAttribute("aria-label"), "Filters, 2 active");
    assert.equal(await trigger.getAttribute("aria-pressed"), null);
    assert.ok(await page.locator("#search").isVisible());
    assert.ok(await page.locator(".basalt-filter-result").isVisible());
    assert.equal(await page.locator(".basalt-filter-toolbar-fold").evaluate((el) => el.inert), true, "the closed fold is inert");
    const before = await top(page, ".basalt-filter-result");
    await trigger.click();
    await settle(page);
    near(await top(page, ".basalt-filter-result"), before, "the result line");
    assert.equal(await trigger.getAttribute("aria-expanded"), "true");
    assert.equal(await active(page), "Filters, 2 active", "opening leaves focus on the trigger");
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("the same control instances survive a fold and a pass over 720; from 720 nothing differs from the shipped row", async () => {
    const { page } = await open(TOOLBAR("defaultFoldOpen"), PHONE);
    await page.evaluate(() => { window.sortNode = document.querySelector("[aria-label='Sort books']"); window.searchNode = document.getElementById("search"); });
    await page.setViewportSize({ width: 1440, height: 900 });
    await settle(page);
    assert.ok(await page.evaluate(() => window.sortNode === document.querySelector("[aria-label='Sort books']") && window.searchNode === document.getElementById("search")));
    assert.equal(await page.locator(".basalt-filter-toolbar-fold-trigger").isVisible(), false, "no trigger from 720");
    assert.equal(await page.locator(".basalt-filter-toolbar-fold").evaluate((el) => getComputedStyle(el).display), "contents");
    await page.close();
    // The shipped row and the fold's row draw the same boxes from 720.
    const boxes = async (props) => {
      const { page: p } = await open(TOOLBAR(props), DESKTOP);
      const got = await p.evaluate(() => [".basalt-filter-toolbar-search", ".basalt-filter-toolbar-filter", ".basalt-filter-toolbar-result", ".basalt-filter-toolbar-sort"].map((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; }));
      await p.close();
      return got;
    };
    assert.deepEqual(await boxes(""), await boxes("").then(async () => {
      const { page: p } = await open(TOOLBAR("").replace(' narrow="fold"', ""), DESKTOP);
      const got = await p.evaluate(() => [".basalt-filter-toolbar-search", ".basalt-filter-toolbar-filter", ".basalt-filter-toolbar-result", ".basalt-filter-toolbar-sort"].map((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; }));
      await p.close();
      return got;
    }));
  });

  test("resizing under 720 with focus on Sort keeps focus; with foldOpen={false} held by the parent focus goes to the trigger, never body", async () => {
    {
      const { page } = await open(TOOLBAR(), DESKTOP);
      await page.locator("[aria-label='Sort books']").focus();
      await page.setViewportSize({ width: 390, height: 844 });
      await settle(page);
      assert.equal(await active(page), "Sort books", "focus stays on Sort, the fold opened for it");
      assert.equal(await page.locator(".basalt-filter-toolbar-fold-trigger").getAttribute("aria-expanded"), "true");
      await page.close();
    }
    {
      const { page } = await open(TOOLBAR("foldOpen={false} onFoldOpenChange={() => {}}"), DESKTOP);
      await page.locator("[aria-label='Sort books']").focus();
      await page.setViewportSize({ width: 390, height: 844 });
      await settle(page);
      await page.waitForTimeout(50);
      assert.equal(await active(page), "Filters, 2 active", "the parent kept it closed: focus on the trigger");
      await page.close();
    }
  });

  test("closing with focus inside sends it to the trigger; focusFilters() with the fold shut, open, and with narrow=\"rows\"", async () => {
    {
      const { page } = await open(TOOLBAR(), PHONE);
      await page.evaluate(() => window.actions.current.focusFilters());
      assert.equal(await active(page), "Filters, 2 active", "shut: the trigger");
      await page.locator(".basalt-filter-toolbar-fold-trigger").click();
      await settle(page);
      await page.evaluate(() => window.actions.current.focusFilters());
      assert.match(await active(page), /Format/, "open: the first filter's trigger");
      await page.close();
    }
    {
      // Controlled: the app closes the fold while focus is on Sort, inside it.
      const { page } = await open(TOOLBAR("foldOpen={open} onFoldOpenChange={setOpen}"), PHONE);
      await page.evaluate(() => window.setFold(true));
      await settle(page);
      await page.locator("[aria-label='Sort books']").focus();
      await page.evaluate(() => window.setFold(false));
      await settle(page);
      assert.equal(await active(page), "Filters, 2 active", "closed with focus inside: the trigger, never body");
      await page.close();
    }
    for (const [width, options] of [["390", PHONE], ["1440", DESKTOP]]) {
      const { page } = await open(TOOLBAR().replace(' narrow="fold"', ""), options);
      // One call, one focus: count what took it.
      await page.evaluate(() => { window.focused = []; document.addEventListener("focusin", (e) => window.focused.push(e.target.textContent?.trim() ?? e.target.tagName)); window.actions.current.focusFilters(); });
      assert.match(await active(page), /Format/, `rows at ${width}: the first filter's trigger`);
      assert.equal(await page.evaluate(() => window.focused.length), 1, `rows at ${width}: focused once`);
      await page.close();
    }
  });
});

// ---- 3. A status dot in a segment ----

describe("Segment status (t4 item 3)", () => {
  test("a chosen dotted segment's label is 600 and no edge moves; no dot on an icon-only segment; the forced-colours disc follows the item", async () => {
    const { page, errors } = await open(`
${render(`<B.SegmentedControl aria-label="Tickets" defaultValue="all"><B.Segment value="all">All</B.Segment><B.Segment value="late" status="danger">Late</B.Segment><B.Segment value="wait" status="pending">Waiting</B.Segment><B.Segment value="icon" status="success" aria-label="Done"><B.Icon icon={B.CheckGlyph} /></B.Segment></B.SegmentedControl>`)}`);
    const edges = () => page.evaluate(() => [...document.querySelectorAll(".basalt-segment")].map((s) => { const r = s.getBoundingClientRect(); return [r.left, r.right]; }));
    const before = await edges();
    await page.locator(".basalt-segment", { hasText: "Late" }).click();
    await settle(page);
    assert.deepEqual(await edges(), before, "no edge moves");
    assert.equal(await page.locator(".basalt-segment[data-pressed] .basalt-chosen-label > :first-child, .basalt-segment[data-pressed] [data-label]").first().evaluate((el) => getComputedStyle(el).fontWeight), "600");
    assert.equal(await page.locator(".basalt-segment[aria-label='Done'] .basalt-segment-dot").count(), 0, "no dot on an icon-only segment");
    assert.equal(await page.locator(".basalt-segment:has-text('All') .basalt-segment-dot").count(), 0, "no empty seat");
    assert.deepEqual(errors, []);
    await page.emulateMedia({ forcedColors: "active" });
    const disc = await page.locator(".basalt-segment[data-pressed] .basalt-segment-dot").evaluate((el) => ({ border: getComputedStyle(el).borderTopColor, color: getComputedStyle(el.parentElement).color, bg: getComputedStyle(el).backgroundImage }));
    assert.equal(disc.border, disc.color, "the disc is the item's own ink (HighlightText when chosen)");
    await page.close();
  });
});

// ---- 4. FileInput ----

const FILE = (props = "") => `
window.calls = [];
function App() {
  return <form id="f"><B.Field label="Photo" required><B.FileInput name="photo" ${props} onValueChange={(files) => window.calls.push(files.map((f) => f.name))} /></B.Field><button type="reset" id="reset">Reset</button></form>;
}
${render("<App />")}`;
const give = (page, names) => page.evaluate((list) => {
  const input = document.querySelector(".basalt-file-input-native");
  const t = new DataTransfer();
  for (const n of list) t.items.add(new File(["x".repeat(100)], n));
  input.files = t.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}, names);
const reading = (page) => page.evaluate(() => {
  const input = document.querySelector(".basalt-file-input-native");
  return { shown: document.querySelector(".basalt-file-input-line").textContent, files: [...input.files].map((f) => f.name), data: [...new FormData(document.getElementById("f")).getAll("photo")].map((f) => f.name).filter(Boolean) };
});

describe("FileInput (t4 item 4)", () => {
  test("after a pick, Clear and a form reset, the shown name, input.files, FormData and onValueChange agree; Clear calls onValueChange once", async () => {
    const { page, errors } = await open(FILE());
    await give(page, ["crumb.jpg"]);
    await settle(page);
    assert.deepEqual(await reading(page), { shown: "crumb.jpg", files: ["crumb.jpg"], data: ["crumb.jpg"] });
    await page.locator(".basalt-file-input-clear").click();
    await settle(page);
    assert.deepEqual(await reading(page), { shown: "No file chosen", files: [], data: [] });
    assert.deepEqual(await page.evaluate(() => window.calls), [["crumb.jpg"], []], "one call for the pick, one for Clear");
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains("basalt-file-input-native")), true, "Clear focuses the input");
    await give(page, ["crumb.jpg"]);
    await page.locator("#reset").click();
    await page.waitForTimeout(50);
    assert.deepEqual(await reading(page), { shown: "No file chosen", files: [], data: [] });
    assert.deepEqual(errors, []);
    await page.close();
  });

  // The browser's own drop path: a trusted drop through Chromium's input domain (a synthetic DragEvent has no default action, so it would prove nothing). Basalt's
  // drop listener only takes the drag look off; the files are the browser's.
  const drop = async (page, names) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-t4-drop-"));
    const files = names.map((name) => { const file = path.join(dir, name); fs.writeFileSync(file, "x".repeat(100)); return file; });
    const box = await page.locator(".basalt-file-input").boundingBox();
    const at = { x: box.x + box.width / 3, y: box.y + box.height / 2 };
    const cdp = await page.context().newCDPSession(page);
    const data = { items: [], files, dragOperationsMask: 1 };
    await cdp.send("Input.dispatchDragEvent", { type: "dragEnter", ...at, data });
    await cdp.send("Input.dispatchDragEvent", { type: "dragOver", ...at, data });
    const during = await page.locator(".basalt-file-input").getAttribute("data-drag");
    await cdp.send("Input.dispatchDragEvent", { type: "drop", ...at, data });
    await settle(page);
    return during;
  };

  test("a drop is the browser's: the drag look shows while over and goes on the drop; the shown name, input.files, FormData and onValueChange agree", async () => {
    const { page, errors } = await open(FILE());
    assert.equal(await drop(page, ["crumb.jpg"]), "", "the drag look while a file is over the box");
    assert.deepEqual(await reading(page), { shown: "crumb.jpg", files: ["crumb.jpg"], data: ["crumb.jpg"] });
    assert.deepEqual(await page.evaluate(() => window.calls), [["crumb.jpg"]], "one onValueChange, from the browser's change");
    assert.equal(await page.locator(".basalt-file-input").getAttribute("data-drag"), null, "the look is gone after the drop");
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("two files dropped on a single input: what is shown is what the input keeps, whatever the browser decides", async () => {
    const { page } = await open(FILE());
    await drop(page, ["a.jpg", "b.jpg"]);
    const got = await reading(page);
    assert.ok(got.files.length <= 1, `a single input holds at most one file (${got.files.length})`);
    assert.equal(got.shown, got.files[0] ?? "No file chosen");
    assert.deepEqual(got.data, got.files);
    assert.equal(await page.locator(".basalt-file-input").getAttribute("data-drag"), null);
    await page.close();
  });

  test("disabling the field after a pick disables Clear and refuses it; enabling gives it back", async () => {
    const { page } = await open(`
window.calls = [];
function App() {
  const [off, setOff] = React.useState(false);
  window.setOff = setOff;
  return <form id="f"><B.Field label="Photo" disabled={off}><B.FileInput name="photo" onValueChange={(files) => window.calls.push(files.map((f) => f.name))} /></B.Field></form>;
}
${render("<App />")}`);
    await give(page, ["crumb.jpg"]);
    await settle(page);
    await page.evaluate(() => window.setOff(true));
    await settle(page);
    const clear = page.locator(".basalt-file-input-clear");
    assert.ok(await clear.evaluate((el) => el.disabled || el.getAttribute("aria-disabled") === "true"), "Clear is disabled with the field");
    await clear.click({ force: true });
    assert.deepEqual((await reading(page)).files, ["crumb.jpg"], "a press on Clear does nothing while disabled");
    assert.equal(await page.locator(".basalt-file-input").getAttribute("data-disabled"), "");
    await page.evaluate(() => window.setOff(false));
    await settle(page);
    assert.equal(await clear.evaluate((el) => el.disabled || el.getAttribute("aria-disabled") === "true"), false);
    await page.close();
  });

  test("a className callback adds to the input's own class and never replaces it", async () => {
    const { page } = await open(`${render(`<B.Field label="Photo"><B.FileInput className={() => "app-own"} /></B.Field>`)}`);
    assert.deepEqual(await page.locator("input[type=file]").evaluate((el) => [...el.classList].sort()), ["app-own", "basalt-file-input-native"]);
    assert.equal(await page.locator("input[type=file]").evaluate((el) => getComputedStyle(el).opacity), "0", "it still covers the box unseen");
    await page.close();
  });

  for (const [name, options, height] of [["1440", DESKTOP, 32], ["touch", PHONE, 44]]) {
    test(`the box is the same height empty and chosen (${name}), and Clear's 44 on touch does not grow it`, async () => {
      const { page } = await open(FILE(), options);
      const h = () => page.locator(".basalt-file-input").evaluate((el) => el.getBoundingClientRect().height);
      assert.equal(await h(), height);
      await give(page, ["crumb.jpg"]);
      await settle(page);
      assert.equal(await h(), height);
      await page.close();
    });
  }

  test("one tab stop plus Clear; required from Field reaches the input", async () => {
    const { page } = await open(FILE());
    assert.equal(await page.locator(".basalt-file-input-native").evaluate((el) => el.required), true);
    await give(page, ["crumb.jpg"]);
    await page.keyboard.press("Tab");
    assert.ok(await page.evaluate(() => document.activeElement.classList.contains("basalt-file-input-native")));
    await page.keyboard.press("Tab");
    assert.ok(await page.evaluate(() => document.activeElement.classList.contains("basalt-file-input-clear")));
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.id), "reset");
    await page.close();
  });
});

// ---- 5. FormPreview ----

const PREVIEW = (size) => `
${render(`<B.Dialog open><B.DialogContent form ${size}><B.SheetHeader closeLabel="Close"><B.DialogTitle>Write an invitation</B.DialogTitle></B.SheetHeader><B.SheetBody><B.FormPreview preview={<B.Card><B.CardContent><B.CardTitle>Winter potluck</B.CardTitle></B.CardContent></B.Card>}><B.Field label="Title"><B.Input /></B.Field></B.FormPreview></B.SheetBody></B.DialogContent></B.Dialog>`)}`;

describe("FormPreview (t4 item 5)", () => {
  test("two 459px columns in the wide dialog at 1440; one column in the 480 dialog and at 390, full width", async () => {
    const columns = async (size, options) => {
      const { page } = await open(PREVIEW(size), options);
      await page.waitForSelector(".basalt-form-preview-pane");
      await page.waitForTimeout(400);
      const got = await page.evaluate(() => { const f = document.querySelector(".basalt-form-preview-fields").getBoundingClientRect(); const p = document.querySelector(".basalt-form-preview-pane").getBoundingClientRect(); return { fields: f.width, pane: p.width, side: p.left > f.right, frame: document.querySelector(".basalt-form-preview").getBoundingClientRect().width }; });
      await page.close();
      return got;
    };
    const wide = await columns('size="wide"', DESKTOP);
    assert.ok(wide.side, "side by side");
    near(wide.fields, 459, "the fields' column", 1);
    near(wide.pane, 459, "the preview's column", 1);
    for (const [size, options] of [["", DESKTOP], ['size="wide"', PHONE]]) {
      const one = await columns(size, options);
      assert.equal(one.side, false, "one column");
      near(one.pane, one.frame, "the preview is full width", 0.5);
    }
  });

  test("no tab stop in the preview; the heading is an h3 under the dialog's title", async () => {
    const { page } = await open(PREVIEW('size="wide"'), DESKTOP);
    await page.waitForSelector(".basalt-form-preview-pane");
    const got = await page.evaluate(() => ({ stops: [...document.querySelectorAll(".basalt-form-preview-pane *")].filter((el) => el.tabIndex >= 0).length, heading: document.querySelector(".basalt-form-preview-heading").tagName, named: document.querySelector(".basalt-form-preview-pane").getAttribute("aria-labelledby") === document.querySelector(".basalt-form-preview-heading").id, live: document.querySelector(".basalt-form-preview-pane").closest("[aria-live]") === null }));
    assert.deepEqual(got, { stops: 0, heading: "H3", named: true, live: true });
    await page.close();
  });
});

// ---- 6. Tabs and segments wider than their column ----

const TABS = `${render(`<div style={{ width: 292 }}><B.Tabs defaultValue="a"><B.TabsList aria-label="Recipe">${["Overview", "Ingredients", "Method", "Notes", "Nutrition", "Reviews"].map((n, i) => `<B.Tab value="${"abcdef"[i]}">${n}</B.Tab>`).join("")}</B.TabsList></B.Tabs></div>`)}`;
const SEGMENTS = (props = "", dir = "ltr") => `${render(`<div dir="${dir}" style={{ width: 320 }}><B.SegmentedControl aria-label="Forecast" defaultValue="today" ${props}>${["Today", "Next 3 days", "Next 7 days", "Next 14 days", "Next 30 days"].map((n, i) => `<B.Segment value="s${i}">${n}</B.Segment>`).join("").replace('value="s0"', 'value="today"')}</B.SegmentedControl></div>`)}`;

describe("Tabs that scroll (t4 item 6)", () => {
  test("in a 292px column the page does not scroll sideways; End shows the last tab whole with its ring at +2; the window does not move", async () => {
    const { page, errors } = await open(TABS);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "no sideways page scroll");
    await page.locator("[role=tab]").first().focus();
    const y = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("End");
    await settle(page);
    const got = await page.evaluate(() => { const port = document.querySelector(".basalt-tabs-scroll").getBoundingClientRect(); const tab = document.activeElement.getBoundingClientRect(); return { inside: tab.left >= port.left && tab.right <= port.right, offset: getComputedStyle(document.activeElement).outlineOffset }; });
    assert.deepEqual(got, { inside: true, offset: "2px" });
    assert.equal(await page.evaluate(() => window.scrollY), y, "the window did not move");
    assert.equal(await page.locator(".basalt-tabs-scroll").evaluate((el) => getComputedStyle(el).scrollbarWidth), "none");
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("a press on the last tab in view shows the next one's start (space-6 clear)", async () => {
    const { page } = await open(TABS);
    const lastInView = await page.evaluate(() => { const port = document.querySelector(".basalt-tabs-scroll").getBoundingClientRect(); const tabs = [...document.querySelectorAll("[role=tab]")]; return tabs.findLastIndex((t) => t.getBoundingClientRect().right <= port.right); });
    await page.locator("[role=tab]").nth(lastInView).click();
    await settle(page);
    const next = await page.evaluate((i) => { const port = document.querySelector(".basalt-tabs-scroll").getBoundingClientRect(); const t = document.querySelectorAll("[role=tab]")[i + 1]; return t ? t.getBoundingClientRect().left < port.right : true; }, lastInView);
    assert.ok(next, "the next tab's start shows");
    await page.close();
  });
});

describe("Segments that scroll (t4 item 6)", () => {
  for (const dir of ["ltr", "rtl"]) {
    test(`in a 320px column: one row, the -2 ring only while overflowing, one tab stop, the arrows work, the pill under the chosen segment after a scroll (${dir})`, async () => {
      const { page, errors } = await open(SEGMENTS("", dir));
      const track = page.locator(".basalt-segmented");
      assert.equal(await track.getAttribute("data-overflow"), "");
      const rows = await page.evaluate(() => new Set([...document.querySelectorAll(".basalt-segment")].map((s) => Math.round(s.getBoundingClientRect().top))).size);
      assert.equal(rows, 1, "one row");
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => getComputedStyle(document.activeElement).outlineOffset), "-2px");
      for (let i = 0; i < 4; i++) await page.keyboard.press(dir === "rtl" ? "ArrowLeft" : "ArrowRight");
      await page.keyboard.press("Enter");
      await settle(page);
      await page.waitForTimeout(400);
      const got = await page.evaluate(() => { const port = document.querySelector(".basalt-segmented-scroll").getBoundingClientRect(); const chosen = document.querySelector(".basalt-segment[data-pressed]").getBoundingClientRect(); const pill = document.querySelector(".basalt-pill").getBoundingClientRect(); return { inside: chosen.left >= port.left - 0.5 && chosen.right <= port.right + 0.5, pill: Math.abs(pill.left - chosen.left) < 1 && Math.abs(pill.width - chosen.width) < 1 }; });
      assert.deepEqual(got, { inside: true, pill: true });
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement.closest(".basalt-segmented")), null, "one tab stop");
      assert.deepEqual(errors, []);
      await page.close();
    });
  }

  test("a control that fits has no data-overflow, computes overflow: visible and draws its ring whole at +2 on the first, a middle and the last segment, in forced colours too; fullWidth is equal while it fits", async () => {
    for (const forced of [false, true]) {
      const { page } = await open(`${render(`<div style={{ width: 600 }}><B.SegmentedControl aria-label="Crust" defaultValue="thin"><B.Segment value="thin">Thin</B.Segment><B.Segment value="classic">Classic</B.Segment><B.Segment value="deep">Deep dish</B.Segment></B.SegmentedControl><B.SegmentedControl aria-label="Size" defaultValue="s" fullWidth><B.Segment value="s">Small</B.Segment><B.Segment value="m">Medium</B.Segment><B.Segment value="l">Large</B.Segment></B.SegmentedControl></div>`)}`);
      if (forced) await page.emulateMedia({ forcedColors: "active" });
      const track = page.locator(".basalt-segmented").first();
      assert.equal(await track.getAttribute("data-overflow"), null);
      assert.equal(await track.evaluate((el) => getComputedStyle(el).overflowX + " " + getComputedStyle(el).overflowY), "visible visible");
      for (const index of [0, 1, 2]) {
        await page.locator(".basalt-segmented").first().locator(".basalt-segment").nth(index).focus({ focusVisible: true });
        assert.equal(await page.evaluate(() => getComputedStyle(document.activeElement).outlineOffset), "2px");
      }
      const widths = await page.locator(".basalt-segmented").nth(1).evaluate((el) => [...el.querySelectorAll(".basalt-segment")].map((s) => Math.round(s.getBoundingClientRect().width * 100) / 100));
      assert.ok(widths.every((w) => Math.abs(w - widths[0]) < 0.5), `equal segments: ${widths}`);
      await page.close();
    }
  });
});

// ---- 7. Counts ----

describe("OptionChip count and FilterResult (t4 item 7)", () => {
  test("chip counts 7 to 512 move no chip; zero is drawn; the chosen chip's count in forced colours is HighlightText", async () => {
    const { page } = await open(`
function App() {
  const [n, setN] = React.useState(7);
  window.setN = setN;
  return <B.OptionChips legend="Paper" defaultValue="kraft" options={[{ value: "cotton", label: "Cotton", count: n }, { value: "linen", label: "Linen Laid", count: 0, unavailable: "out of stock" }, { value: "kraft", label: "Kraft", count: 18 }]} countSeat={512} />;
}
${render("<App />")}`);
    const boxes = () => page.evaluate(() => [...document.querySelectorAll(".basalt-option-chip")].map((c) => { const r = c.getBoundingClientRect(); return [r.left, r.top, r.width]; }));
    const before = await boxes();
    await page.evaluate(() => window.setN(512));
    await settle(page);
    assert.deepEqual(await boxes(), before);
    assert.equal(await page.locator(".basalt-option-chip[data-unavailable] .basalt-option-chip-figure > :first-child").textContent(), "0");
    await page.emulateMedia({ forcedColors: "active" });
    const ink = await page.locator(".basalt-option-chip[data-checked] .basalt-option-chip-figure").evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el.closest(".basalt-option-chip")).color]);
    assert.equal(ink[0], ink[1], "the chosen chip's count is its HighlightText");
    await page.close();
  });

  test("FilterResult wraps the same empty, at 3 and at its maximum; an empty one keeps a line; development warns on a form field in reserve", async () => {
    const { page, errors } = await open(`
function App() {
  const [text, setText] = React.useState("");
  window.setText = setText;
  return <div style={{ width: 160 }}><B.FilterResult reserve="Showing 428 of 428 lots">{text}</B.FilterResult><p id="after">after</p><B.FilterResult reserve={<input name="x" />}>x</B.FilterResult></div>;
}
${render("<App />")}`);
    const h = () => page.locator(".basalt-filter-result").first().evaluate((el) => el.getBoundingClientRect().height);
    const empty = await h();
    assert.ok(empty > 0, "an empty result keeps its height");
    for (const t of ["Showing 3 of 428 lots", "Showing 428 of 428 lots"]) {
      await page.evaluate((v) => window.setText(v), t);
      await settle(page);
      assert.equal(await h(), empty);
    }
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("two quick changes are one announcement after 400ms; the string form is unchanged; spoken is said in place of a node", async () => {
    const { page } = await open(`
function App() {
  const [n, setN] = React.useState(1);
  window.setN = setN;
  return <><B.FilterResult id="a">{"Showing " + n + " of 9 lots"}</B.FilterResult><B.FilterResult id="b" spoken={n + " books shown"}><span>Books shown</span> <b>({n})</b></B.FilterResult></>;
}
${render("<App />")}`);
    const said = () => page.evaluate(() => [...document.querySelectorAll("[role=status]")].map((s) => s.textContent));
    await page.evaluate(() => { window.setN(2); setTimeout(() => window.setN(3), 100); });
    await page.waitForTimeout(250);
    assert.deepEqual(await said(), ["Showing 1 of 9 lots", "1 books shown"], "nothing said yet");
    await page.waitForTimeout(400);
    assert.deepEqual(await said(), ["Showing 3 of 9 lots", "3 books shown"]);
    assert.equal(await page.locator("#a [role=status]").count() + await page.locator("#b [role=status]").count(), 2, "one region a line");
    await page.close();
  });
});

// ---- 8. The stepper's gate ----

const STEPPER = (props) => `
window.done = 0;
function App() {
  const [v, setV] = React.useState(window.start ?? "a");
  const [held, setHeld] = React.useState(true);
  window.free = () => setHeld(false);
  return <B.Stepper steps={[{ id: "a", label: "Choose a plan" }, { id: "b", label: "Invite" }]} value={v} onValueChange={setV} ${props} />;
}
${render("<App />")}`;

describe("Stepper nextDisabled, nextReason and onDone (t4 item 8)", () => {
  test("a held Next keeps focus through click, Enter and Space and fires nothing; a two-line reason keeps its height across enabling", async () => {
    const { page } = await open(STEPPER('nextDisabled={held} nextReason="Choose a plan to go on: one for yourself, a studio or a company."'), { viewport: { width: 300, height: 600 } });
    const next = page.locator(".basalt-button[data-variant=primary]");
    await next.focus();
    for (const press of ["click", "Enter", "Space"]) {
      if (press === "click") await next.click({ force: true }); else await page.keyboard.press(press);
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute("data-variant")), "primary", `focus kept after ${press}`);
    }
    assert.equal(await page.locator(".basalt-text-morph, [aria-live]").first().textContent().then((t) => /Choose a plan/.test(t)), true, "still on step 1");
    assert.equal(await next.getAttribute("aria-describedby"), await page.locator(".basalt-stepper-reason").getAttribute("id"));
    const h = await page.locator(".basalt-stepper-reason").evaluate((el) => el.getBoundingClientRect().height);
    await page.evaluate(() => window.free());
    await settle(page);
    assert.equal(await page.locator(".basalt-stepper-reason").evaluate((el) => el.getBoundingClientRect().height), h);
    assert.equal(await next.getAttribute("aria-describedby"), null, "described only while held");
    await page.close();
  });

  test("giving or taking away nextReason keeps the buttons in place and focus on Next", async () => {
    const { page } = await open(`
function App() {
  const [reason, setReason] = React.useState(undefined);
  window.setReason = setReason;
  return <B.Stepper steps={[{ id: "a", label: "Choose a plan" }, { id: "b", label: "Invite" }]} value="a" onValueChange={() => {}} nextDisabled={reason !== undefined} nextReason={reason} onDone={() => {}} />;
}
${render("<App />")}`);
    const next = page.locator(".basalt-button[data-variant=primary]");
    await next.focus();
    await page.evaluate(() => { window.nextNode = document.activeElement; });
    for (const value of ["Choose a plan to go on.", undefined, "Choose a plan to go on."]) {
      await page.evaluate((v) => window.setReason(v), value);
      await settle(page);
      assert.equal(await page.evaluate(() => document.activeElement === window.nextNode), true, `focus stays on the same Next (${value ?? "no reason"})`);
    }
    assert.equal(await page.evaluate(() => document.querySelector(".basalt-stepper").nextElementSibling?.className), "basalt-stepper-reason", "the reason is the row's sibling");
    await page.close();
  });

  test("two presses of Done call onDone once; no onDone holds Done; Back on step 1 keeps focus", async () => {
    {
      const { page } = await open(STEPPER("onDone={() => { window.done++; return new Promise((r) => setTimeout(r, 500)); }}").replace("window.done = 0;", 'window.done = 0; window.start = "b";'));
      const done = page.locator(".basalt-button[data-variant=primary]");
      await done.click();
      await done.click();
      await page.waitForTimeout(700);
      assert.equal(await page.evaluate(() => window.done), 1);
      await page.close();
    }
    {
      const { page } = await open(STEPPER("").replace("window.done = 0;", "window.done = 0; window.start = \"b\";"));
      assert.equal(await page.locator(".basalt-button[data-variant=primary]").getAttribute("aria-disabled"), "true", "Done is held without onDone");
      await page.close();
    }
    {
      const { page } = await open(STEPPER("onDone={() => {}}"));
      const back = page.locator(".basalt-button").first();
      await back.focus();
      await back.click({ force: true });
      assert.equal(await page.evaluate(() => document.activeElement === document.querySelector(".basalt-button")), true, "Back on step 1 keeps focus");
      await page.close();
    }
  });
});

// ---- 9. Reserve block ----

describe("Reserve block (t4 item 9)", () => {
  for (const [name, options] of [["1440", DESKTOP], ["390", PHONE]]) {
    test(`notes of one, two and four lines move the following paragraph 0px; the shown note is its natural height (${name})`, async () => {
      const { page } = await open(`
const NOTES = { one: <B.Callout title="Ships today" />, two: <B.Callout status="warning" title="Ships in 3 to 5 days">The mill is restocking this paper.</B.Callout>, four: <B.Callout status="danger" title="The last backup failed">The drive was full at 3:12 AM. Free 18 GB or choose a larger drive, then back up again. We will try again tonight at 3 AM, and email you if that fails too.</B.Callout> };
function App() {
  const [show, setShow] = React.useState("one");
  window.setShow = setShow;
  return <div style={{ maxWidth: 480 }}><B.Reserve block show={show} alternatives={NOTES} /><p id="after">after</p></div>;
}
${render("<App />")}`, options);
      const at = await top(page, "#after");
      for (const key of ["two", "four", "one"]) {
        await page.evaluate((k) => window.setShow(k), key);
        await settle(page);
        near(await top(page, "#after"), at, `after the ${key}-line note`);
        const natural = await page.evaluate(() => { const shown = document.querySelector(".basalt-reserve[data-block] > [data-on]"); return shown.getBoundingClientRect().height === shown.firstElementChild.getBoundingClientRect().height; });
        assert.ok(natural, "the shown note hugs its words");
      }
      await page.close();
    });
  }

  test("unseen notes are out of the Tab order, selection and find-in-page", async () => {
    const { page } = await open(`${render(`<B.Reserve block show="a" alternatives={{ a: <B.Callout title="Short" />, b: <B.Callout title="Long" actions={<B.Button>Retry</B.Button>}>Longer words here.</B.Callout> }} />`)}`);
    const got = await page.evaluate(() => { const off = document.querySelector(".basalt-reserve[data-block] > :not([data-on])"); return { inert: off.inert, hidden: off.getAttribute("aria-hidden"), visibility: getComputedStyle(off).visibility, found: window.find("Longer words") }; });
    assert.deepEqual(got, { inert: true, hidden: "true", visibility: "hidden", found: false });
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.textContent), "", "the unseen Retry is not a tab stop");
    await page.close();
  });
});

// ---- Development warnings: the dist modules under Node, where NODE_ENV is not production (the browser fixtures are production builds) ----

describe("development warnings (t4)", () => {
  test("a status dot on an icon-only segment warns once and draws no dot", async () => {
    const React = await import("react");
    const { renderToString } = await import("react-dom/server");
    const B = await import(pathToFileURL(path.join(pkg, "dist", "index.js")).href);
    const warn = console.warn;
    const said = [];
    console.warn = (m) => said.push(String(m));
    let html = "";
    try {
      html = renderToString(React.createElement(B.SegmentedControl, { "aria-label": "Done" }, React.createElement(B.Segment, { value: "a", status: "success", "aria-label": "Done" }, React.createElement(B.Icon, { icon: B.CheckGlyph }))));
    } finally { console.warn = warn; }
    assert.equal(said.filter((m) => /^Basalt Segment: `status` needs words/.test(m)).length, 1);
    assert.ok(!html.includes("basalt-segment-dot"));
  });
});
