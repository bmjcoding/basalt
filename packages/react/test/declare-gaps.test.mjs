// declare-gaps (DECISIONS 237, 239 to 242): what CIMIP's Declare dialog needed from Basalt. The owner decided Declare's looks in CIMIP; this is Basalt taking them in, and the implementation has not
// been reviewed. A form grid whose fields share label, control, hint and error tracks across columns; a wide form dialog that keeps the form's first focus; SegmentedControl's fullWidth, required,
// invalid, Field labelling and its one tab stop on the chosen segment; TextButton keeping focus and underlining a Reserve; a Switch description; ActionShortcut in a form's foot under 720; and a Field
// hint that holds its seat. Driven in Chromium against the built package with the real stylesheet. The fixtures load no web font, so text widths differ on CI's Linux runner: every measured margin is wider
// than a fallback font's width. Synthetic data only.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const COARSE = { hasTouch: true, isMobile: true };
const open = async (fixture, { width = 1440, height = 900, theme = "dark", ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, fixture, { theme, viewport: { width, height }, ...options });
  if (options.isMobile) { await page.evaluate(() => { const meta = document.createElement("meta"); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1"; document.head.append(meta); }); }
  await settle(page);
  if (options.isMobile) assert.equal(await page.evaluate(() => window.innerWidth), width);
  page.errors = errors;
  return page;
};
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const options = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, options);
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
};

// Declare, from Basalt's parts and synthetic words. The description spans rows 1 to 3 on the left; severity, application and the ticket are the right column's rows 1 to 3; the title and the agent's switch share row 4.
const SEVERITY = [["SEV1", "Customers cannot use a core service."], ["SEV2", "A core service is degraded for many customers."], ["SEV3", "A feature is degraded for some customers."], ["SEV4", "A minor problem with a workaround."]];
const DECLARE = (extra = "") => `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)";
const SEVERITY = ${JSON.stringify(SEVERITY)};
const APPS = [{ value: "pay", label: "Payments API" }, { value: "web", label: "Checkout web" }, { value: "id", label: "Identity" }];
function Declare() {
  const [open, setOpen] = React.useState(false);
  const [sev, setSev] = React.useState(undefined);
  const [errors, setErrors] = React.useState(false);
  const [written, setWritten] = React.useState(0);
  const [length, setLength] = React.useState(0);
  window.__fx = { setErrors, setSev, setWritten, setOpen };
  return (
    <div style={{ padding: 16 }}>
      <B.Dialog open={open} onOpenChange={setOpen}>
        <B.DialogTrigger id="opener" className="basalt-button" data-variant="primary">Declare incident</B.DialogTrigger>
        <B.DialogContent form size="wide" id="declare">
          <B.SheetHeader closeLabel="Close declare incident"><B.DialogTitle>Declare an incident</B.DialogTitle></B.SheetHeader>
          <B.SheetBody id="body">
            <B.DialogDescription>Say what is happening. Everyone on the list is told.</B.DialogDescription>
            <B.Form id="f" onFormSubmit={() => setErrors(true)}>
              <B.FormGrid id="grid" columns="3-2">
                <B.Field name="what" label="What is happening" required column={1} row={1} rows={3} invalid={errors || undefined} error="Say what is happening, in at least ten characters."
                  description={<B.Reserve className="reserve" show={length > 1800 ? "count" : "hint"} alternatives={{ hint: "The agent starts from this, and it stays inside the room.", count: "The agent starts from this, and it stays inside the room. 1,900 of 2,000 characters." }} />}>
                  <B.Textarea id="what" rows={2} onChange={(e) => setLength(e.target.value.length)} />
                </B.Field>
                <B.Field label="Severity" required column={2} row={1} invalid={errors && !sev}
                  description={<B.Reserve className="reserve" show={sev ?? "none"} alternatives={{ none: "Choose one: SEV1 is the most severe, SEV4 the least.", ...Object.fromEntries(SEVERITY) }} />}
                  error="Choose a severity.">
                  <B.SegmentedControl id="sev" fullWidth value={sev} onValueChange={setSev}>
                    {SEVERITY.map(([v]) => <B.Segment key={v} value={v}>{v}</B.Segment>)}
                  </B.SegmentedControl>
                </B.Field>
                <B.Field label="Application" optional column={2} row={2} description="Its owners and their numbers appear beside the room.">
                  <B.Combobox options={APPS} placeholder="Search the registry" emptyMessage="No application matches" />
                </B.Field>
                <B.Field name="ticket" label="ServiceNow ticket" optional column={2} row={3} description="Paste the number once the ticket exists. You can add it later.">
                  <B.Input id="ticket" />
                </B.Field>
                <B.Field name="title" label="Title" required column={1} row={4} invalid={errors || undefined} error="Write a title of at least three characters."
                  description={<B.Reserve className="reserve" show={written >= 3 ? "spent" : "hint"} alternatives={{ hint: "Shown in the incident list and to everyone told.", spent: "No more titles can be generated here. Write your own." }} />}>
                  <B.Input id="title" required />
                </B.Field>
                <B.FormGridItem id="agent" column={2} row={4}>
                  <B.Switch id="agent-switch" defaultChecked description="The agent reads the description and drafts the first message. Everything stays inside the room.">Agent first look</B.Switch>
                </B.FormGridItem>
              </B.FormGrid>
            </B.Form>
          </B.SheetBody>
          <B.SheetFooter><B.DialogActions><B.DialogClose id="cancel" render={<B.Button variant="secondary" />}>Cancel</B.DialogClose>
            <B.ActionShortcut shortcut="⌘↵" className="send"><B.Button id="go" variant="primary" type="submit" form="f">Declare incident</B.Button></B.ActionShortcut>
          </B.DialogActions></B.SheetFooter>
        </B.DialogContent>
      </B.Dialog>
      ${extra}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<Declare />);`;

const openDeclare = async (page, how = "click") => {
  if (how === "tap") await page.locator("#opener").tap(); else await page.locator("#opener").click();
  await page.locator("#declare").waitFor();
  await settle(page);
};
// Every field of the grid by its label's words: the boxes of its label, control, hint and error, in the document's coordinates.
const BOXES = `(() => {
  const box = (el) => { if (!el || !el.getClientRects().length) return null; const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, b: r.bottom + scrollY, r: r.right + scrollX }; };
  const out = {};
  for (const cell of document.querySelectorAll("#grid > *")) {
    const label = cell.querySelector(".basalt-field-label");
    const name = label ? label.firstChild.textContent : cell.id;
    const control = [...cell.children].find((c) => !c.matches(".basalt-field-label, .basalt-field-description, .basalt-field-error, .basalt-visually-hidden, .basalt-switch-field")) ?? cell.querySelector(".basalt-choice");
    out[name] = { cell: box(cell), label: box(label), control: box(control), hint: box(cell.querySelector(".basalt-field-description")), error: box(cell.querySelector(".basalt-field-error")) };
  }
  return out;
})()`;
const boxes = (page) => page.evaluate(BOXES);
const near = (a, b, message, tolerance = 0.01) => assert.ok(Math.abs(a - b) <= tolerance, `${message}: ${a} against ${b}`);

describe("FormGrid: fields in columns that line up (DECISIONS 242)", () => {
  test("at 1440 the labels, controls and hints of a row start at the same pixel across the columns, 0px", async () => {
    const page = await open(DECLARE());
    await openDeclare(page);
    const f = await boxes(page);
    // Row 1: the description's label and the severity's label; row 4: the title's label, and the switch's row sits on the title field's track.
    near(f["What is happening"].label.y, f.Severity.label.y, "row 1 labels");
    near(f["What is happening"].control.y, f.Severity.control.y, "the description's box begins at the severity control");
    near(f["What is happening"].control.b, f["ServiceNow ticket"].control.b, "the description's box ends at the ticket field");
    near(f["What is happening"].hint.y, f["ServiceNow ticket"].hint.y, "row 3 hints");
    near(f.Title.label.y, Math.max(f["ServiceNow ticket"].hint.b, f["What is happening"].hint.b) + 16, "row 4 begins a form gap under row 3's hints");
    near(f.Title.control.y + f.Title.control.h / 2, f.agent.control.y + f.agent.control.h / 2, "the switch row is centred on the title field");
    near(f.Title.hint.y, f.agent.hint.y, "row 4 hints");
    // Within the right column the rows follow each other on the tracks: label, control, hint.
    for (const name of ["Severity", "Application", "ServiceNow ticket", "Title"]) near(f[name].control.h, 32, `${name}'s control is size-control-md (32) tall`);
    near(f.agent.control.h, 32, "the switch's row is 32 tall");
    await page.close();
  });

  test("every edge is straight: the columns are 3 to 2 with space-8 between, and each field's label, control and hint start at its column's edge", async () => {
    const page = await open(DECLARE());
    await openDeclare(page);
    const f = await boxes(page);
    const left = f["What is happening"].cell, right = f.Severity.cell;
    near(right.x - (left.x + left.w), 32, "space-8 between the columns");
    near(left.w / right.w, 1.5, "3fr to 2fr", 0.02);
    for (const name of ["What is happening", "Title"]) for (const part of ["label", "control", "hint"]) near(f[name][part].x, left.x, `${name} ${part} starts at the left edge`);
    for (const name of ["Severity", "Application", "ServiceNow ticket"]) for (const part of ["label", "control", "hint"]) near(f[name][part].x, right.x, `${name} ${part} starts at the right edge`);
    for (const name of ["Severity", "Application", "ServiceNow ticket"]) near(f[name].control.r, right.x + right.w, `${name}'s control fills the column`);
    // The switch's line starts at the column's start edge, not past the switch.
    near(f.agent.hint.x, right.x, "the agent's line starts at the column edge");
    await page.close();
  });

  test("the spaces are Basalt's: 6 inside a field, 16 between rows, and the same in both columns", async () => {
    const page = await open(DECLARE());
    await openDeclare(page);
    const f = await boxes(page);
    for (const name of ["Severity", "Application", "ServiceNow ticket", "Title"]) near(f[name].control.y - f[name].label.b, 6, `${name}: label to control`);
    near(f.Severity.hint.y - f.Severity.control.b, 6, "control to hint");
    near(f.Application.label.y - (f.Severity.hint.b), 16, "severity's hint to the next label");
    near(f["ServiceNow ticket"].label.y - f.Application.hint.b, 16, "application's hint to the next label");
    // The description (rows 1 to 3) keeps the same label-to-box space as the fields beside it.
    near(f["What is happening"].control.y - f["What is happening"].label.b, 6, "the description's label to its box");
    await page.close();
  });

  test("an error under a field adds its height to its row in both columns and the box still ends with the ticket field, 0px", async () => {
    const page = await open(DECLARE());
    await openDeclare(page);
    const before = await boxes(page);
    await page.evaluate(() => window.__fx.setErrors(true));
    await settle(page);
    const f = await boxes(page);
    assert.ok(f.Severity.error && f["What is happening"].error && f.Title.error, "the errors show");
    near(f["What is happening"].label.y, f.Severity.label.y, "row 1 labels with an error");
    near(f["What is happening"].control.y, f.Severity.control.y, "row 1 controls' tops with an error");
    near(f["What is happening"].control.b, f["ServiceNow ticket"].control.b, "the box still ends with the ticket field");
    // Row 1's error track is the severity's own: the right column's later rows move down by its height, and so does the description's hint track.
    near(f["What is happening"].hint.y, f["ServiceNow ticket"].hint.y, "row 3 hints still share a line");
    assert.ok(f.Title.label.y > before.Title.label.y + 40, `row 4 moved down by the errors above it: ${before.Title.label.y} to ${f.Title.label.y}`);
    near(f.Title.control.y + f.Title.control.h / 2, f.agent.control.y + f.agent.control.h / 2, "the switch row is still centred on the title field");
    near(f.Title.hint.y, f.agent.hint.y, "row 4 hints still share a line");
    await page.close();
  });

  test("it holds at 1024 and 720 as at 1440", async () => {
    for (const width of [1024, 720]) {
      const page = await open(DECLARE(), { width });
      await openDeclare(page);
      const f = await boxes(page);
      near(f["What is happening"].label.y, f.Severity.label.y, `${width}: row 1 labels`);
      near(f["What is happening"].control.y, f.Severity.control.y, `${width}: row 1 controls`);
      near(f["What is happening"].control.b, f["ServiceNow ticket"].control.b, `${width}: the box ends with the ticket field`);
      near(f.Title.hint.y, f.agent.hint.y, `${width}: row 4 hints`);
      assert.ok(f.Severity.cell.x > f["What is happening"].cell.r, `${width}: two columns`);
      await page.close();
    }
  });

  test("under 720 it is one column in the markup's order, each field the width of the column", async () => {
    const page = await open(DECLARE(), { width: 390, height: 844, ...COARSE });
    await openDeclare(page, "tap");
    const f = await boxes(page);
    const order = ["What is happening", "Severity", "Application", "ServiceNow ticket", "Title", "agent"];
    for (let i = 1; i < order.length; i += 1) {
      assert.ok(f[order[i]].cell.y >= f[order[i - 1]].cell.b - 0.01, `${order[i]} comes after ${order[i - 1]}`);
      near(f[order[i]].cell.x, f[order[0]].cell.x, `${order[i]} is in the same column`);
      near(f[order[i]].cell.w, f[order[0]].cell.w, `${order[i]} is as wide as the column`);
    }
    // The form gap between fields, and the field gap inside one, are Basalt's.
    near(f.Severity.cell.y - f["What is happening"].cell.b, 16, "the form gap");
    near(f.Severity.control.y - f.Severity.label.b, 6, "the field gap");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "no horizontal scroll at 390");
    await page.close();
  });

  test("a FormGrid that is given a ratio draws it, and anything else is equal columns; a cell with no row is still placed", async () => {
    const page = await open(`document.body.style.margin = "0";
createRoot(document.getElementById("root")).render(<div style={{ padding: 16 }}>
  <B.FormGrid id="a" columns="1-2"><B.Field label="One" column={1} row={1}><B.Input /></B.Field><B.Field label="Two" column={2} row={1}><B.Input /></B.Field></B.FormGrid>
  <B.FormGrid id="b" columns="nonsense"><B.Field label="One" column={1} row={1}><B.Input /></B.Field><B.Field label="Two" column={2} row={1}><B.Input /></B.Field></B.FormGrid>
  <B.FormGrid id="c"><B.Field label="One"><B.Input /></B.Field><B.Field label="Two"><B.Input /></B.Field><B.Field label="Three"><B.Input /></B.Field></B.FormGrid>
</div>);`);
    const widths = (id) => page.evaluate((grid) => [...document.querySelectorAll(`#${grid} > .basalt-field`)].map((el) => Math.round(el.getBoundingClientRect().width)), id);
    const [one, two] = await widths("a");
    near(two / one, 2, "1-2", 0.05);
    const [equal, alsoEqual] = await widths("b");
    assert.equal(equal, alsoEqual, "equal columns");
    assert.equal((await widths("c")).length, 3);
    const rows = await page.evaluate(() => [...document.querySelectorAll("#c > .basalt-field")].map((el) => Math.round(el.getBoundingClientRect().top)));
    assert.equal(rows[0], rows[1], "the first two share a row");
    assert.ok(rows[2] > rows[1], "the third wraps to the next");
    await page.close();
  });
});

describe("a wide form dialog keeps the form's first focus", () => {
  test("opened by a click, focus is on the first field, not the title; a touch opens it on the title", async () => {
    const page = await open(DECLARE());
    await openDeclare(page);
    assert.equal(await page.evaluate(() => document.activeElement?.id), "what", "the first field has focus");
    const dialog = await page.locator("#declare").evaluate((el) => Math.round(el.getBoundingClientRect().width));
    assert.equal(dialog, 992, "and the dialog is the wide one");
    await page.close();
    const touch = await open(DECLARE(), { width: 390, height: 844, ...COARSE });
    await openDeclare(touch, "tap");
    assert.equal(await touch.evaluate(() => document.activeElement?.className), "basalt-dialog-title", "a touch opened it on the title");
    await touch.close();
  });

  test("opened by the keyboard, focus is on the first field", async () => {
    const page = await open(DECLARE());
    await page.locator("#opener").focus();
    await page.keyboard.press("Enter");
    await page.locator("#declare").waitFor();
    await settle(page);
    assert.equal(await page.evaluate(() => document.activeElement?.id), "what");
    await page.close();
  });

  test("a wide dialog that is not a form still opens on its title", async () => {
    const page = await open(`document.body.style.margin = "0";
createRoot(document.getElementById("root")).render(<B.Dialog><B.DialogTrigger id="opener">Read</B.DialogTrigger><B.DialogContent size="wide" id="manual"><B.DialogTitle>The manual</B.DialogTitle><B.DialogDescription>Reference.</B.DialogDescription><B.Button id="inside">Copy</B.Button></B.DialogContent></B.Dialog>);`);
    await page.locator("#opener").click();
    await page.locator("#manual").waitFor();
    await settle(page);
    assert.equal(await page.evaluate(() => document.activeElement?.className), "basalt-dialog-title");
    await page.close();
  });
});

describe("SegmentedControl: fullWidth, a Field's control, one tab stop on the chosen value", () => {
  test("fullWidth: equal segments that fill the container, and the pill still slides to the chosen one", async () => {
    const page = await open(DECLARE());
    await openDeclare(page);
    const group = page.locator("#sev");
    const widths = await group.locator(".basalt-segment").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
    for (const w of widths) near(w, widths[0], "equal segments", 0.05);
    const box = await group.evaluate((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return { w: r.width, pad: parseFloat(s.paddingLeft), gap: parseFloat(s.columnGap) }; });
    near(widths.reduce((a, b) => a + b, 0) + 3 * box.gap + 2 * box.pad, box.w, "the segments fill the control");
    const column = await page.evaluate(() => document.querySelector("#sev").closest(".basalt-field").getBoundingClientRect().width);
    near(box.w, column, "the control fills the column");
    // Nothing chosen: no segment pressed and no pill drawn.
    assert.equal(await group.locator("[data-pressed]").count(), 0);
    // data-slide is the port's since cimip-gaps-3 t7 (the pill's own box).
    assert.equal(await group.evaluate((el) => el.querySelector(".basalt-segmented-scroll").hasAttribute("data-slide")), false, "no pill with nothing chosen");
    await group.getByRole("button", { name: "SEV2" }).click();
    await settle(page);
    assert.equal(await group.evaluate((el) => el.querySelector(".basalt-segmented-scroll").hasAttribute("data-slide")), true);
    await group.getByRole("button", { name: "SEV4" }).click();
    await page.waitForTimeout(60);
    const mid = await group.locator(".basalt-pill").evaluate((el) => getComputedStyle(el).transform);
    await settle(page);
    const end = await group.locator(".basalt-segmented-scroll").evaluate((el) => ({  // the pill is placed in the port (cimip-gaps-3 t7)
      pill: getComputedStyle(el.querySelector(".basalt-pill")).transform, seg: el.querySelector('[data-pressed]').getBoundingClientRect().left - el.getBoundingClientRect().left - el.clientLeft }));
    assert.notEqual(mid, end.pill, "the pill was on its way 60ms in: it slides");
    near(Number(end.pill.match(/matrix\([^)]*, ([\d.]+), [\d.]+\)$/)?.[1]), end.seg, "and ends under the chosen segment", 0.6);
    await page.close();
  });

  test("in a Field the label names the group, with the word after it when required, and the line and error describe it", async () => {
    const page = await open(DECLARE());
    await openDeclare(page);
    const group = page.locator("#sev");
    assert.equal(await group.getAttribute("role"), "group");
    await page.getByRole("group", { name: /^Severity\s*,\s*Required$/ }).waitFor();
    const necessity = await page.locator('.basalt-field:has(#sev) .basalt-field-necessity').evaluate((el) => ({ text: el.textContent, hidden: el.getAttribute("aria-hidden") }));
    assert.deepEqual(necessity, { text: "Required", hidden: "true" }, "the word after the label is as on other fields, hidden from assistive technology");
    // It says no more than "required" about it: a group of pressed buttons takes no aria-required.
    assert.equal(await group.getAttribute("aria-required"), null);
    const line = await page.evaluate(() => { const ids = document.getElementById("sev").getAttribute("aria-describedby").split(" "); return ids.map((id) => document.getElementById(id)?.textContent ?? null); });
    assert.equal(line.length, 1, "described by the line alone while valid");
    assert.ok(line[0].includes("Choose one"));
    assert.equal(await group.getAttribute("aria-invalid"), null);
    await page.evaluate(() => window.__fx.setErrors(true));
    await settle(page);
    assert.equal(await group.getAttribute("aria-invalid"), "true");
    const described = await page.evaluate(() => document.getElementById("sev").getAttribute("aria-describedby").split(" ").map((id) => document.getElementById(id).textContent));
    assert.equal(described.length, 2);
    assert.equal(described[1], "Choose a severity.", "and by the error while invalid");
    // Choosing clears it (the app's state); the group is valid again.
    await group.getByRole("button", { name: "SEV3" }).click();
    await settle(page);
    assert.equal(await group.getAttribute("aria-invalid"), null);
    await page.close();
  });

  test("without a Field: `required` says it in the name, `invalid` sets aria-invalid, and the control draws no mark of its own (DECISIONS 242)", async () => {
    const page = await open(`document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)";
createRoot(document.getElementById("root")).render(<div style={{ padding: 16, display: "grid", gap: 16, width: 400 }}>
  <B.SegmentedControl id="plain" aria-label="View"><B.Segment value="a">A</B.Segment><B.Segment value="b">B</B.Segment></B.SegmentedControl>
  <B.SegmentedControl id="req" aria-label="Severity" required><B.Segment value="a">A</B.Segment><B.Segment value="b">B</B.Segment></B.SegmentedControl>
  <B.SegmentedControl id="bad" aria-label="Severity" required invalid requiredLabel="Obligatoire"><B.Segment value="a">A</B.Segment><B.Segment value="b">B</B.Segment></B.SegmentedControl>
</div>);`);
    assert.equal(await page.locator("#plain").getAttribute("aria-label"), "View");
    assert.equal(await page.locator("#req").getAttribute("aria-label"), "Severity, Required");
    assert.equal(await page.locator("#bad").getAttribute("aria-label"), "Severity, Obligatoire");
    assert.equal(await page.locator("#bad").getAttribute("aria-invalid"), "true");
    assert.equal(await page.locator("#req").getAttribute("aria-invalid"), null);
    const look = (id) => page.locator(id).evaluate((el) => { const s = getComputedStyle(el); return [s.boxShadow, s.borderTopColor, s.backgroundColor, s.outlineStyle, ...[...el.querySelectorAll(".basalt-segment")].map((b) => getComputedStyle(b).color)].join("|"); });
    assert.equal(await look("#bad"), await look("#req"), "an invalid group looks as a valid one: no danger hairline or colour");
    await page.close();
  });

  test("Tab lands on the chosen value, and on the first value when none is chosen", async () => {
    const page = await open(DECLARE());
    await openDeclare(page);
    const active = () => page.evaluate(() => document.activeElement?.textContent ?? document.activeElement?.id);
    // The textarea has focus; Tab goes to the first thing in the right column, which is the severity group, and none is chosen: its first value.
    await page.keyboard.press("Tab");
    assert.equal(await active(), "SEV1", "nothing chosen: the first value");
    // Choose SEV3 by Space, tab out and back: Tab lands on SEV3, not SEV1.
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    assert.equal(await active(), "SEV3");
    await page.keyboard.press("Space");
    await settle(page);
    assert.equal(await page.locator("#sev [data-pressed]").textContent(), "SEV3");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("role")), "combobox", "Tab leaves the group once");
    await page.keyboard.press("Shift+Tab");
    assert.equal(await active(), "SEV3", "Shift+Tab lands on the chosen value");
    // The arrows move focus within it without choosing, and Tab out and back still lands on the chosen value.
    await page.keyboard.press("ArrowLeft");
    assert.equal(await active(), "SEV2");
    assert.equal(await page.locator("#sev [data-pressed]").textContent(), "SEV3", "an arrow moves focus and chooses nothing");
    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "what", "Shift+Tab from inside leaves the group");
    await page.keyboard.press("Tab");
    assert.equal(await active(), "SEV3", "back in, on the chosen value rather than where the arrows left it");
    // Exactly one segment is a tab stop.
    assert.deepEqual(await page.locator("#sev .basalt-segment").evaluateAll((els) => els.map((el) => el.tabIndex)), [-1, -1, 0, -1]);
    await page.close();
  });

  test("a disabled first segment is skipped for the stop when none is chosen", async () => {
    const page = await open(`document.body.style.margin = "0";
createRoot(document.getElementById("root")).render(<div style={{ padding: 16 }}><input id="before" aria-label="before" /><B.SegmentedControl id="s" aria-label="Level"><B.Segment value="a" disabled>A</B.Segment><B.Segment value="b">B</B.Segment><B.Segment value="c">C</B.Segment></B.SegmentedControl></div>);`);
    await page.locator("#before").focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), "B");
    await page.close();
  });
});

describe("TextButton: keeps focus when it disables itself, and its underline reaches a Reserve", () => {
  const TEXT = `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)";
function App() {
  const [written, setWritten] = React.useState(0);
  const [kept, setKept] = React.useState(true);
  window.__presses ??= 0;
  const spent = written >= 3;
  return (
    <div style={{ padding: 16, display: "grid", gap: 16, justifyItems: "start", fontSize: 14 }}>
      <B.TextButton id="gen" focusableWhenDisabled={kept ? undefined : false} disabled={spent} onClick={() => { window.__presses += 1; setWritten((n) => n + 1); }}>
        <B.Reserve className="words" show={written > 0 ? "again" : "first"} alternatives={{ first: "Generate a title", again: "Regenerate title" }} />
      </B.TextButton>
      <B.TextButton id="plain" disabled={spent}>Plain</B.TextButton>
      <button id="opt" onClick={() => setKept(false)}>Opt out</button>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);`;

  test("a press that disables it leaves focus on it, aria-disabled and out of reach of a press; focusableWhenDisabled={false} opts out", async () => {
    const page = await open(TEXT);
    await page.locator("#gen").focus();
    for (let i = 0; i < 3; i += 1) await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => window.__presses), 3);
    assert.equal(await page.evaluate(() => document.activeElement?.id), "gen", "focus is still on the button once it is disabled");
    assert.equal(await page.locator("#gen").getAttribute("aria-disabled"), "true");
    assert.equal(await page.locator("#gen").evaluate((el) => el.hasAttribute("disabled")), false, "not the native attribute: it stays focusable");
    await page.keyboard.press("Enter");
    await page.locator("#gen").click({ force: true });
    assert.equal(await page.evaluate(() => window.__presses), 3, "a disabled press does nothing");
    // The same for a plain-text one: it is focusable by default.
    await page.locator("#plain").focus();
    assert.equal(await page.evaluate(() => document.activeElement?.id), "plain");
    await page.close();
    const out = await open(TEXT.replace("useState(true)", "useState(false)"));
    await out.locator("#gen").focus();
    for (let i = 0; i < 3; i += 1) await out.keyboard.press("Enter");
    await settle(out);
    await out.waitForTimeout(100);
    assert.notEqual(await out.evaluate(() => document.activeElement?.id), "gen", "with focusableWhenDisabled={false} focus is dropped as before");
    assert.equal(await out.locator("#gen").evaluate((el) => el.hasAttribute("disabled")), true);
    await out.close();
  });

  test("a button whose words change holds its width, and the underline is under the words that are shown", async () => {
    const page = await open(TEXT);
    const measure = () => page.evaluate(() => {
      const button = document.getElementById("gen");
      const on = button.querySelector(".words > [data-on]");
      const range = document.createRange();
      range.selectNodeContents(on);
      return { width: button.getBoundingClientRect().width, shown: on.textContent, line: getComputedStyle(on).textDecorationLine, color: getComputedStyle(on).textDecorationColor, offset: getComputedStyle(on).textUnderlineOffset, thick: getComputedStyle(on).textDecorationThickness, box: on.getBoundingClientRect().width, text: range.getBoundingClientRect().width, label: getComputedStyle(button.querySelector(".basalt-text-button-label")).textDecorationColor };
    });
    const first = await measure();
    assert.equal(first.line, "underline", "the shown wording is underlined");
    near(first.box, first.text, "the underline is as wide as the shown words", 0.6);
    assert.equal(first.color, first.label, "in the label's colour");
    await page.locator("#gen").click();
    await settle(page);
    const second = await measure();
    assert.equal(second.shown, "Regenerate title");
    near(second.width, first.width, "the button's width did not change");
    near(second.box, second.text, "the shorter wording draws its own underline, not the longest's width", 0.6);
    // The wording that is not shown draws nothing: hidden, so is its underline.
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#gen .words > :not([data-on])")).visibility), "hidden");
    // Hover steps the underline to the ink, as a Link's does, under the words too.
    await page.locator("#gen").hover();
    await page.waitForTimeout(250);
    const hovered = await measure();
    assert.notEqual(hovered.color, first.color);
    assert.equal(hovered.color, hovered.label);
    await page.close();
  });
});

describe("Switch description", () => {
  test("the line is under the row at the column's start edge, in a Field description's style, and the switch is described by it", async () => {
    const page = await open(`document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)";
createRoot(document.getElementById("root")).render(<div style={{ padding: 16, width: 360 }}>
  <B.Switch id="s" defaultChecked description="The agent reads the description and drafts the first message.">Agent first look</B.Switch>
  <B.Field label="Ticket" description="Paste the number." ><B.Input /></B.Field>
  <B.Switch id="bare">No description</B.Switch>
  <B.Switch id="own" description="Own line" aria-describedby="x">Own</B.Switch><p id="x">elsewhere</p>
</div>);`);
    const sw = await page.locator('[role="switch"]').first().evaluate((el) => ({ describedby: el.getAttribute("aria-describedby"), switchLeft: el.getBoundingClientRect().left, role: el.getAttribute("role") }));
    const line = page.locator(`[id="${sw.describedby}"]`);
    assert.equal(await line.textContent(), "The agent reads the description and drafts the first message.");
    const style = (loc) => loc.evaluate((el) => { const s = getComputedStyle(el); return [s.fontSize, s.lineHeight, s.fontWeight, s.color, s.fontFamily].join("|"); });
    assert.equal(await style(line), await style(page.locator(".basalt-field-description").first()), "the Field description's style");
    const left = await line.evaluate((el) => el.getBoundingClientRect().left);
    near(left, sw.switchLeft, "starts at the column's start edge, not past the switch");
    const row = await page.locator('[role="switch"]').first().evaluate((el) => el.closest(".basalt-choice").getBoundingClientRect().bottom);
    const top = await line.evaluate((el) => el.getBoundingClientRect().top);
    near(top - row, 6, "the field gap under the row");
    const describedby = (name) => page.getByRole("switch", { name }).evaluate((el) => el.getAttribute("aria-describedby"));
    assert.equal(await describedby("No description"), null);
    assert.match(await describedby("Own"), /^x \S+$/, "a caller's own description is kept, then the line's");
    await page.close();
  });
});

describe("ActionShortcut in a form dialog's foot under 720", () => {
  test("at 390 the two actions are equal 44px buttons, Cancel first", async () => {
    const page = await open(DECLARE(), { width: 390, height: 844, ...COARSE });
    await openDeclare(page, "tap");
    const foot = await page.evaluate(() => [...document.querySelectorAll(".basalt-sheet-foot .basalt-button")].map((el) => { const r = el.getBoundingClientRect(); return { text: el.textContent, w: r.width, h: r.height }; }));
    assert.deepEqual(foot.map((b) => b.text), ["Cancel", "Declare incident"]);
    for (const b of foot) near(b.h, 44, `${b.text} is 44 tall`);
    near(foot[0].w, foot[1].w, "the two buttons are equal", 0.5);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".send .basalt-action-shortcut-hint")).display), "none", "the shortcut's chips are hidden on touch");
    await page.close();
  });
});

describe("a Field hint whose words change holds its seat", () => {
  test("a Reserve in a description is a block that wraps at the field's width, and the field never moves when the wording does", async () => {
    const page = await open(`document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)";
function App() {
  const [show, setShow] = React.useState("short");
  window.__show = setShow;
  return <div style={{ padding: 16, width: 300 }}>
    <B.Field id="f" label="Title" description={<B.Reserve id="r" show={show} alternatives={{ short: "Short hint.", long: "A hint long enough to wrap onto a second and a third line at three hundred pixels wide." }} />}><B.Input id="i" /></B.Field>
    <p id="after">After the field</p>
  </div>;
}
createRoot(document.getElementById("root")).render(<App />);`);
    const read = () => page.evaluate(() => { const r = document.getElementById("r"); const f = document.getElementById("f"); return { display: getComputedStyle(r).display, rw: r.getBoundingClientRect().width, fw: document.getElementById("i").getBoundingClientRect().width, fh: f.getBoundingClientRect().height, after: document.getElementById("after").getBoundingClientRect().top, hint: r.getBoundingClientRect().height }; });
    const short = await read();
    assert.equal(short.display, "grid");
    near(short.rw, short.fw, "as wide as the field, a block");
    assert.ok(short.hint > 30, "the room is the longest wording's, wrapped (several lines)");
    await page.evaluate(() => window.__show("long"));
    await settle(page);
    const long = await read();
    near(long.fh, short.fh, "the field's height did not change");
    near(long.after, short.after, "nothing under it moved");
    await page.close();
  });
});

describe("axe, in both themes", () => {
  for (const theme of ["dark", "light"]) {
    test(`the form dialog with its errors, ${theme}`, async () => {
      const page = await open(DECLARE(), { theme });
      await openDeclare(page);
      assert.deepEqual(await axe(page), [], "empty");
      await page.evaluate(() => window.__fx.setErrors(true));
      await settle(page);
      assert.deepEqual(await axe(page), [], "with its errors");
      await page.evaluate(() => window.__fx.setSev("SEV2"));
      await settle(page);
      assert.deepEqual(await axe(page), [], "with a severity chosen");
      assert.deepEqual(page.errors, []);
      await page.close();
    });
  }
  test("under 720 on touch", async () => {
    const page = await open(DECLARE(), { width: 390, height: 844, ...COARSE });
    await openDeclare(page, "tap");
    await page.evaluate(() => window.__fx.setErrors(true));
    await settle(page);
    assert.deepEqual(await axe(page), []);
    await page.close();
  });
});
