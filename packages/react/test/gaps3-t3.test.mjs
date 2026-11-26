// cimip-gaps-3, topic T3 (design, the council's decision): a cell that wraps, the call's air in every table, the linked row, cut text read whole, PanelRow's wrap,
// actions and static form, the sort over a list, Disclosure and DisclosureList, the notification centre's additions, the one-page band and the held foot. Driven in
// Chromium against the built package with the real stylesheet. Synthetic data in unlike domains (a shop's orders, a kitchen's recipes, a library's loans). Written
// while tests are paused (DECISIONS 359): not run yet.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const COARSE = { hasTouch: true, isMobile: true };
const open = async (body, { width = 1440, height = 900, theme = "dark", ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, body, { theme, viewport: { width, height }, ...options });
  await settle(page);
  page.errors = errors;
  return page;
};
const axe = async (page, rules) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async (only) => {
    const options = only ? { runOnly: { type: "rule", values: only }, resultTypes: ["violations"] } : { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, options);
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  }, rules);
};
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
const heads = (page, id) => page.evaluate((id) => [...document.querySelectorAll(`#${id} thead th`)].map((th) => { const r = th.getBoundingClientRect(); return [r.x, r.width, getComputedStyle(th).textAlign]; }), id);
const WARN = `const warnings = []; const warn = console.warn; console.warn = (...a) => { warnings.push(a.join(" ")); warn(...a); }; window.warnings = warnings;`;

// ---- 1 and 2: a cell that wraps; the call's air ----

const RULES = [
  { id: "r1", name: "Free shipping", rule: "Orders over 50 ship free inside the country.", status: "On" },
  { id: "r2", name: "Bulk discount", rule: "Ten or more of one item take 8% off the line, applied after any coupon and before tax is worked out on what is left.", status: "On" },
  { id: "r3", name: "Gift wrap", rule: "Wrapping is offered on every item except perishables, oversize parcels and anything sent straight from a partner's warehouse to the buyer.", status: "Off" },
];
const WRAP = (density, wrap = true) => `
const rows = ${JSON.stringify(RULES)};
function Rules() {
  const [order, setOrder] = React.useState(undefined);
  const [on, setOn] = React.useState(${wrap});
  const sorted = order ? [...rows].sort((a, b) => (order === "ascending" ? 1 : -1) * a.name.localeCompare(b.name)) : rows;
  return <>
    <button type="button" id="toggle" onClick={() => setOn((v) => !v)}>Toggle wrap</button>
    <B.TableContainer id="rules" density="${density}" label="Checkout rules">
      <B.Table columns={[{ width: 180 }, {}, { width: 120 }, { width: 96 }]} minWidth={640}>
        <B.TableHeader><B.TableRow><B.TableHead sort={order} onSortChange={setOrder}>Rule</B.TableHead><B.TableHead>What it does</B.TableHead><B.TableHead>Status</B.TableHead><B.TableHead numeric>Uses</B.TableHead></B.TableRow></B.TableHeader>
        <B.TableBody>{sorted.map((r, i) => <B.TableRow key={r.id} data-id={r.id}>
          <B.TableRowHead>{r.name}</B.TableRowHead>
          <B.TableCell wrap={on}>{r.rule}</B.TableCell>
          <B.TableCell><B.Badge status={r.status === "On" ? "success" : "neutral"}>{r.status}</B.Badge></B.TableCell>
          <B.TableCell numeric wrap>{(i + 1) * 120}</B.TableCell>
        </B.TableRow>)}</B.TableBody>
      </B.Table>
    </B.TableContainer>
  </>;
}
${WARN}
createRoot(document.getElementById("root")).render(<div style={{ padding: 24, width: 900 }}><Rules /></div>);`;

describe("TableCell wrap (T3, 1)", () => {
  for (const [density, one, two] of [["compact", 32, 50], ["default", 40, 58], ["comfortable", 44, 62]]) {
    test(`one line is exactly ${one} and two are ${two} with a Badge in the row (${density})`, async () => {
      const page = await open(WRAP(density));
      const height = (id) => page.evaluate((id) => document.querySelector(`#rules tr[data-id="${id}"]`).getBoundingClientRect().height, id);
      assert.equal(await height("r1"), one, "a one-line wrap row is the row");
      const lines = await page.evaluate(() => { const cell = document.querySelector('#rules tr[data-id="r2"] td[data-wrap]'); const range = document.createRange(); range.selectNodeContents(cell); return range.getClientRects().length; });
      if (lines === 2) assert.equal(await height("r2"), two);
      else assert.equal(await height("r2"), one + 18 * (lines - 1), "each more line adds 18");
      // Short cells are centred in a grown row.
      const centred = await page.evaluate(() => { const row = document.querySelector('#rules tr[data-id="r3"]'); const badge = row.querySelector(".basalt-badge").getBoundingClientRect(); const r = row.getBoundingClientRect(); return Math.abs(badge.top + badge.height / 2 - (r.top + r.height / 2)); });
      assert.ok(centred <= 0.5, `the badge sits on the grown row's middle (${centred})`);
      await page.close();
    });
  }
  test("a wrap cell is never cut: no data-cut, no tabindex, no plate; numeric with wrap writes no data-wrap and warns once", async () => {
    const page = await open(WRAP("default"));
    assert.equal(await page.locator("#rules td[data-wrap][data-cut], #rules td[data-wrap][tabindex]").count(), 0);
    assert.equal(await page.locator("#rules td[data-numeric][data-wrap]").count(), 0);
    assert.equal((await page.evaluate(() => window.warnings)).filter((w) => w.includes("TableCell") && w.includes("wrap")).length, 1);
    await page.locator('#rules tr[data-id="r3"] td[data-wrap]').hover();
    await page.waitForTimeout(900);
    assert.equal(await page.locator(".basalt-cell-peek[data-open]").count(), 0);
    await page.close();
  });
  for (const theme of THEMES) {
    test(`every header and column moves 0px on a sort and on toggling wrap (${theme})`, async () => {
      const page = await open(WRAP("default"), { theme });
      const before = await heads(page, "rules");
      await page.locator("#rules th[data-sortable] .basalt-sort").click();
      await settle(page);
      assert.deepEqual(await heads(page, "rules"), before, "a sort moves nothing");
      await page.locator("#toggle").click();
      await settle(page);
      assert.deepEqual(await heads(page, "rules"), before, "toggling wrap moves nothing");
      assert.ok(await page.locator("#rules td[data-cut]").count() >= 1, "unwrapped, the long rules are cut again");
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }
});

const CALL = `
const recipes = [["Sourdough", "Feed the starter the night before"], ["Ramen broth", "Simmer the bones for twelve hours"]];
const table = (id, flat, density) => <B.TableContainer id={id} flat={flat} density={density} label={id}>
  <B.Table columns={[{}, { width: 120 }]} minWidth={480}>
    <B.TableHeader><B.TableRow><B.TableHead>Recipe</B.TableHead><B.TableHead>Time</B.TableHead></B.TableRow></B.TableHeader>
    <B.TableBody>{recipes.map(([name, step]) => <B.TableRow key={name}><B.TableCell><B.TableCall call={name} detail={step} /></B.TableCell><B.TableCell>2h</B.TableCell></B.TableRow>)}</B.TableBody>
  </B.Table>
</B.TableContainer>;
createRoot(document.getElementById("root")).render(<div style={{ padding: 24, display: "grid", gap: 24, width: 720 }}>
  {table("rimmed", false, "default")}{table("compact", false, "compact")}<B.Card>{table("flat", true, "default")}</B.Card>
</div>);`;

describe("TableCall's air in every table (T3, 2)", () => {
  test("a TableCall row is 54 in a rimmed table, a compact one and a flat one", async () => {
    const page = await open(CALL);
    for (const id of ["rimmed", "compact", "flat"]) {
      assert.equal(await page.evaluate((id) => document.querySelector(`#${id} tbody tr`).getBoundingClientRect().height, id), 54, id);
    }
    await page.close();
  });
});

// ---- 5: a row that opens what it names ----

const LINKED = `
const loans = [["L-101", "The Left Hand of Darkness", "Due Dec 2"], ["L-102", "A Wizard of Earthsea, a very long title that is cut in its column", "Due Dec 9"], ["L-103", "The Dispossessed", "Due Dec 12"]];
window.opened = [];
function Loans() {
  return <B.TableContainer id="loans" label="Loans"><B.Table columns={[{ width: 48 }, { width: 96 }, { width: 140 }, {}, { width: 120 }]} minWidth={640}>
    <B.TableHeader><B.TableRow><B.TableHead>Pick</B.TableHead><B.TableHead>Loan</B.TableHead><B.TableHead>Title</B.TableHead><B.TableHead>Note</B.TableHead><B.TableHead>Due</B.TableHead></B.TableRow></B.TableHeader>
    <B.TableBody>{loans.map(([id, title, due], i) => <B.TableRow key={id} linked data-id={id}>
      <B.TableCell><B.Checkbox aria-label={"Select " + id} /></B.TableCell>
      <B.TableRowHead><a href={"#" + id} onClick={(e) => { e.preventDefault(); window.opened.push(id); }}>{id}</a></B.TableRowHead>
      <B.TableCell>{title}</B.TableCell>
      <B.TableCell>{i === 2 ? <><a href="#other" data-row-opener onClick={(e) => { e.preventDefault(); window.opened.push("opener-" + id); }}>Details</a> <button type="button" id={"renew-" + id}>Renew</button></> : "Synthetic note"}</B.TableCell>
      <B.TableCell>{due}</B.TableCell>
    </B.TableRow>)}</B.TableBody>
  </B.Table></B.TableContainer>;
}
createRoot(document.getElementById("root")).render(<div style={{ padding: 24, width: 900 }}><Loans /></div>);`;

describe("TableRow linked (T3, 5)", () => {
  test("a plain press on a cell activates the opener once; every guard holds; data-row-opener wins", async () => {
    const page = await open(LINKED);
    const cell = (id, n) => page.locator(`#loans tr[data-id="${id}"] > *`).nth(n);
    const opened = () => page.evaluate(() => window.opened.splice(0));
    await cell("L-101", 4).click();
    assert.deepEqual(await opened(), ["L-101"], "a plain press follows the row head's link, once");
    await cell("L-101", 4).click({ modifiers: ["Meta"] });
    await cell("L-101", 4).click({ modifiers: ["Shift"] });
    await cell("L-101", 4).click({ button: "middle" });
    assert.deepEqual(await opened(), [], "a modified or middle click is the browser's");
    await page.evaluate(() => document.querySelector('#loans tr[data-id="L-101"]').addEventListener("click", (e) => e.preventDefault(), { capture: true, once: true }));
    await cell("L-101", 4).click();
    assert.deepEqual(await opened(), [], "a cancelled press opens nothing");
    await cell("L-101", 0).locator("input, [role=checkbox]").first().click();
    assert.deepEqual(await opened(), [], "a press on the checkbox is the checkbox's");
    await page.locator("#renew-L-103").click();
    assert.deepEqual(await opened(), [], "a press on a nested button is the button's");
    const cut = cell("L-102", 2);
    assert.equal(await cut.getAttribute("data-cut"), "", "the long title is cut");
    await cut.click();
    assert.deepEqual(await opened(), [], "a press on a cut cell reads it");
    assert.equal(await page.evaluate(() => document.activeElement.hasAttribute("data-cut")), true);
    const b = await box(cell("L-101", 4));
    await page.mouse.move(b.x + 10, b.y + 10);
    await page.mouse.down();
    await page.mouse.move(b.x + 30, b.y + 10, { steps: 4 });
    await page.mouse.up();
    assert.deepEqual(await opened(), [], "a drag of more than 6px opens nothing");
    await page.evaluate(() => { const td = document.querySelector('#loans tr[data-id="L-101"] > :nth-child(5)'); const r = document.createRange(); r.selectNodeContents(td); getSelection().removeAllRanges(); getSelection().addRange(r); });
    await cell("L-101", 4).click();
    assert.deepEqual(await opened(), [], "a live selection opens nothing");
    await page.evaluate(() => getSelection().removeAllRanges());
    await cell("L-103", 4).click();
    assert.deepEqual(await opened(), ["opener-L-103"], "data-row-opener wins over the row head's link");
    assert.equal(await page.locator("#loans tr[tabindex], #loans tr[role]").count(), 0, "no stop and no role on the row");
    assert.deepEqual(await axe(page), []);
    await page.close();
  });
});

// ---- 3: cut text read whole ----

const TEXT = `
const long = "The quarterly results for every region, with the returns and the refunds that came after the books had closed, read whole here.";
createRoot(document.getElementById("root")).render(<div style={{ padding: 24, display: "grid", gap: 16, width: 360 }}>
  <div id="grid" style={{ display: "grid", gridTemplateColumns: "1fr", alignItems: "stretch", height: 200 }}><B.Text id="clamp" lines={2}>{long}</B.Text></div>
  <B.Text id="short" lines={1}>Short</B.Text>
  <B.Text id="one" lines={1}>{long}</B.Text>
  <B.Text id="off" lines={1} peek={false}>{long}</B.Text>
  <a id="link" href="#file"><B.Text as="span" lines={1}>{long}</B.Text></a>
  <a id="excerpt" href="#post"><B.Text as="span" lines={1} peek={false}>{long}</B.Text></a>
  <button type="button" id="button" onClick={() => { window.pressed = (window.pressed || 0) + 1; }} style={{ width: 200 }}><B.Text as="span" lines={1}>{long}</B.Text></button>
  <label id="label" style={{ display: "flex", gap: 8, width: 240 }}><input type="checkbox" id="box" /><B.Text as="span" lines={1}>{long}</B.Text></label>
  <main id="main" tabIndex={-1}><B.Text id="inmain" lines={1}>{long}</B.Text></main>
</div>);`;

// A dialog that opens on its own takes focus from the page's controls, so it has a fixture of its own.
const TEXT_DIALOG = `
const long = "The quarterly results for every region, with the returns and the refunds that came after the books had closed, read whole here.";
createRoot(document.getElementById("root")).render(<B.Dialog defaultOpen><B.DialogContent><B.DialogTitle>Recipe</B.DialogTitle><div style={{ width: 240 }}><B.Text id="indialog" lines={1}>{long}</B.Text></div></B.DialogContent></B.Dialog>);`;

describe("Text lines and peek (T3, 3)", () => {
  test("a clamp of 2 at a user line height of 1.5 shows two whole lines and no part of a third in a stretched grid", async () => {
    const page = await open(TEXT);
    await page.addStyleTag({ content: "* { line-height: 1.5 !important; }" });
    await settle(page);
    const read = await page.locator("#clamp").evaluate((el) => ({ h: el.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(el).lineHeight) }));
    assert.equal(read.h, 2 * read.lh, "the cap is two of the reader's own lines");
    await page.close();
  });
  test("short text adds no stop; a cut one is a stop whose focus opens the plate, Esc closes it and the text keeps its ring; a still pointer does not flicker it", async () => {
    const page = await open(TEXT);
    await page.waitForTimeout(2200);
    assert.equal(await page.locator("#short").getAttribute("tabindex"), null);
    assert.equal(await page.locator("#one").getAttribute("tabindex"), "0");
    assert.equal(await page.locator("#off").getAttribute("tabindex"), null, "peek={false} adds no stop");
    await page.locator("#one").focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);
    assert.equal(await page.locator(".basalt-peek[data-open][data-kind=text]").count(), 1, "keyboard focus opens it");
    assert.equal(await page.locator(".basalt-peek[data-open]").getAttribute("data-focus"), "");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    assert.equal(await page.locator(".basalt-peek[data-open]").count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.id), "one", "focus stays");
    assert.notEqual(await page.locator("#one").evaluate((el) => getComputedStyle(el).outlineStyle), "none", "its own ring shows");
    await page.locator("#one").hover();
    await page.waitForTimeout(800);
    const opens = await page.evaluate(() => new Promise((done) => { let n = 0; const plate = document.querySelector(".basalt-peek"); const watch = new MutationObserver(() => { n += 1; }); watch.observe(plate, { attributes: true, attributeFilter: ["data-open"] }); setTimeout(() => { watch.disconnect(); done(n); }, 1500); }));
    assert.equal(opens, 0, "a still pointer neither reopens nor flickers it");
    await page.close();
  });
  test("inside a control the control is the stop: focus opens it, Esc keeps focus and presses nothing, a press on the plate presses once; a label's press checks its box", async () => {
    const page = await open(TEXT);
    await page.waitForTimeout(2200);
    assert.equal(await page.locator("#link [tabindex], #button [tabindex], #label [tabindex]").count(), 0, "no stop inside a control");
    await page.locator("#button").focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);
    assert.equal(await page.locator(".basalt-peek[data-open]").count(), 1, "the button's keyboard focus opens it");
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => document.activeElement.id), "button");
    assert.equal(await page.evaluate(() => window.pressed || 0), 0, "Esc presses nothing");
    await page.locator("#button").hover();
    await page.waitForTimeout(800);
    await page.locator(".basalt-peek[data-open]").click();
    assert.equal(await page.evaluate(() => window.pressed), 1, "a press on the plate is one press on the button");
    await page.locator("#label .basalt-text").click();
    assert.equal(await page.locator("#box").isChecked(), true, "a press on a label's words checks its box");
    await page.close();
  });
  test("inside main tabindex=-1 and inside a dialog a cut Text is its own stop with its own plate", async () => {
    const main = await open(TEXT);
    await main.waitForTimeout(2200);
    assert.equal(await main.locator("#inmain").getAttribute("tabindex"), "0", "inside main tabindex=-1");
    await main.close();
    const page = await open(TEXT_DIALOG);
    await page.waitForTimeout(2200);
    assert.equal(await page.locator("#indialog").getAttribute("tabindex"), "0", "inside a dialog");
    await page.locator("#indialog").focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);
    assert.equal(await page.locator(".basalt-peek[data-open]").count(), 1);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".basalt-dialog").count(), 1, "Esc closes the plate and not the dialog");
    await page.close();
  });
  test("under (hover: none) a Text in a link is whole at rest; with peek={false} it stays cut and opens nothing", async () => {
    const page = await open(TEXT, { width: 390, height: 844, ...COARSE });
    const lines = (id) => page.locator(`#${id} .basalt-text`).evaluate((el) => ({ white: getComputedStyle(el).whiteSpace, cut: el.scrollWidth > el.clientWidth }));
    assert.deepEqual(await lines("link"), { white: "normal", cut: false });
    assert.equal((await lines("excerpt")).white, "nowrap");
    await page.close();
  });
  test("a Text without lines runs no plate; a cut Text beside it does (the positive control; the chunk itself is bundle.test.mjs's split-graph test)", async () => {
    const page = await open(`createRoot(document.getElementById("root")).render(<div style={{ width: 200 }}><B.Text id="plain">Plain words that would never fit in two hundred pixels on one line</B.Text><B.Text id="cut" lines={1}>Plain words that would never fit in two hundred pixels on one line</B.Text></div>);`);
    await page.waitForTimeout(2500);
    assert.deepEqual(await page.locator("#plain").evaluate((el) => [el.hasAttribute("data-lines"), el.hasAttribute("data-cut"), el.getAttribute("tabindex")]), [false, false, null], "no hook ran on plain text");
    assert.deepEqual(await page.locator("#cut").evaluate((el) => [el.hasAttribute("data-cut"), el.getAttribute("tabindex")]), [true, "0"], "the plate's module ran for the cut text");
    await page.close();
  });
});

// ---- 4: PanelRow ----

const PANEL = `
window.rowPressed = 0; window.submitted = 0;
createRoot(document.getElementById("root")).render(<div style={{ padding: 16, display: "grid", gap: 24 }}>
  <form id="form" onSubmit={(e) => { e.preventDefault(); window.submitted += 1; }}><B.PanelList aria-label="Saved carts"><B.PanelRow id="submit" type="submit" title="Submit the cart" /></B.PanelList></form>
  <B.PanelList id="contacts" aria-label="Suppliers" style={{ width: "var(--w)" }}>
    <B.PanelRow id="split" href="#dana" onClick={(e) => { e.preventDefault(); window.rowPressed += 1; }} title="Dana Brooks" description="Flour and grain, two deliveries a week"
      leading={<B.Avatar name="Dana Brooks" size={24} />} trailing="2m ago"
      actions={<B.Button size="sm" variant="secondary" id="call" onClick={() => { window.called = (window.called || 0) + 1; }}>Call +1 912-555-0142</B.Button>}>
      <span id="line">Contract <a id="childlink" href="#contract" onClick={(e) => { e.preventDefault(); window.childFollowed = (window.childFollowed || 0) + 1; }}>FL-2209</a> <B.Badge id="badge">Active</B.Badge></span>
    </B.PanelRow>
    <B.PanelRow href="#sam" title="Sam Okafor" description="Dairy" trailing="Yesterday" />
    <B.PanelRow interactive={false} title="Archived supplier" description="No longer delivering" />
  </B.PanelList>
</div>);`;

describe("PanelRow wrap, actions and the static form (T3, 4)", () => {
  test("a row without href is still a button and submits a form; a split row has no interactive element inside another", async () => {
    const page = await open(PANEL.replace('"var(--w)"', "720"));
    assert.equal(await page.locator("#submit").evaluate((el) => el.tagName), "BUTTON");
    await page.locator("#submit").click();
    assert.equal(await page.evaluate(() => window.submitted), 1);
    assert.deepEqual(await axe(page, ["nested-interactive"]), []);
    assert.deepEqual(await axe(page), []);
    await page.close();
  });
  test("an action does not fire the row and the row does not fire the action; a child link is above the cover; the band shows no wash over it", async () => {
    const page = await open(PANEL.replace('"var(--w)"', "720"));
    await page.locator("#call").click();
    assert.deepEqual(await page.evaluate(() => [window.called, window.rowPressed]), [1, 0]);
    await page.locator("#split").click();
    assert.deepEqual(await page.evaluate(() => [window.called, window.rowPressed]), [1, 1]);
    const at = await box(page.locator("#childlink"));
    assert.equal(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.id, [at.x + at.width / 2, at.y + at.height / 2]), "childlink");
    await page.locator("#childlink").click();
    assert.deepEqual(await page.evaluate(() => [window.childFollowed, window.rowPressed]), [1, 1], "a tap on the link follows it and not the row");
    await page.locator("#childlink").focus();
    await page.keyboard.press("Enter");
    assert.deepEqual(await page.evaluate(() => [window.childFollowed, window.rowPressed]), [2, 1], "Enter on it does the same");
    await page.locator("#badge").click();
    assert.equal(await page.evaluate(() => window.rowPressed), 2, "a press on the badge beside it presses the row");
    await page.locator("#childlink").hover();
    const wash = await page.locator(".basalt-panel-row[data-split]").evaluate((el) => getComputedStyle(el).backgroundColor);
    assert.match(wash, /rgba\(0, 0, 0, 0\)|transparent/, "no hover wash while the pointer is on the link");
    await page.close();
  });
  test("at 390 the trailing fact is visible and the actions are a line of their own, 44 tall", async () => {
    const page = await open(PANEL.replace('"var(--w)"', "358"), { width: 390, height: 844, ...COARSE });
    assert.ok((await box(page.locator("#contacts .basalt-panel-row-end").first())).width > 0);
    const action = await box(page.locator("#call"));
    const words = await box(page.locator("#contacts .basalt-panel-row-words").first());
    assert.equal(action.height, 44);
    assert.ok(action.y >= words.y + words.height, "under the words");
    await page.close();
  });
  test("a list without actions is pixel-identical to main (the one-target row's geometry)", async () => {
    const page = await open(`createRoot(document.getElementById("root")).render(<B.PanelList aria-label="Orders" style={{ width: 600 }}><B.PanelRow href="#a" title="Order 1041" description="Two items" trailing="$42.00" /><B.PanelRow href="#b" title="Order 1042" trailing="$18.50" /></B.PanelList>);`);
    const rows = await page.locator(".basalt-panel-row").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [el.tagName, r.width, r.height]; }));
    assert.deepEqual(rows, [["A", 600, 72], ["A", 600, 48]], "the shipped geometry: 12 + 24 + 2 + 18 + 12, and 12 + 24 + 12");
    await page.close();
  });
});

// ---- 6: the sort over a list ----

const SORTED = `
const books = [{ id: "a", t: "Kindred" }, { id: "b", t: "Beloved" }, { id: "c", t: "Lilith's Brood" }];
function Books() {
  const [order, setOrder] = React.useState("own");
  const [said, setSaid] = React.useState("");
  const rows = order === "title" ? [...books].sort((x, y) => x.t.localeCompare(y.t)) : books;
  return <>
    <B.FilterToolbar label="Sort books" sortLabel={false} sort={<B.Select toolbar aria-label="Sort" valuePrefix="Sort" value={order} onValueChange={(v) => { setOrder(v); setSaid(v === "title" ? "Sorted by title, A to Z." : "Sorted as added."); }} options={[{ value: "own", label: "As added" }, { value: "title", label: "Title A to Z" }]} />} />
    <B.Reflow><B.DisclosureList aria-label="Books">{rows.map((b) => <B.DisclosureRow key={b.id} data-id={b.id} title={b.t}>Synthetic notes on {b.t}</B.DisclosureRow>)}</B.DisclosureList></B.Reflow>
    <B.StatusLine>{said}</B.StatusLine>
  </>;
}
createRoot(document.getElementById("root")).render(<div style={{ padding: 24, width: 600 }}><Books /></div>);`;

describe("Sort over a list (T3, 6)", () => {
  test("the same item nodes before and after; focus and an open row survive; the order is said once; sortLabel={false} draws no word", async () => {
    const page = await open(SORTED);
    assert.equal(await page.locator(".basalt-filter-toolbar-label").count(), 0);
    await page.evaluate(() => { window.nodes = [...document.querySelectorAll("[data-id]")]; });
    await page.locator('[data-id="c"] .basalt-disclosure-row').click();
    await page.locator('[data-id="a"] .basalt-disclosure-row').focus();
    await page.evaluate(() => { const sel = document.querySelector(".basalt-filter-toolbar [role=combobox], .basalt-filter-toolbar button"); sel.click(); });
    await page.getByRole("option", { name: "Title A to Z" }).click();
    await settle(page);
    assert.equal(await page.evaluate(() => window.nodes.every((n) => n.isConnected)), true, "every node kept");
    assert.equal(await page.locator('[data-id="c"] .basalt-disclosure-row').getAttribute("aria-expanded"), "true", "the open row stays open");
    assert.equal(await page.locator(".basalt-status-line, [role=status]").filter({ hasText: "Sorted by title, A to Z." }).count(), 1);
    await page.close();
  });
});

// ---- 7: Disclosure and DisclosureList ----

const DISCLOSURE = `
createRoot(document.getElementById("root")).render(<div style={{ padding: 16, width: 358, display: "grid", gap: 16 }}>
  <p>Proof the dough overnight. <B.Disclosure id="why" title="Why overnight?"><p>A slow, cold proof builds flavour.</p></B.Disclosure></p>
  <B.DisclosureList id="steps" aria-label="Steps">
    <B.DisclosureRow title="Mix">Flour and water.</B.DisclosureRow>
    <B.DisclosureRow wrap title="Fold the dough four times at half-hour intervals, then leave it covered on the counter">Gently.</B.DisclosureRow>
    <B.DisclosureRow title="Bake at the highest heat the oven reaches, lid on for the first twenty minutes">Then lid off.</B.DisclosureRow>
  </B.DisclosureList>
</div>);`;

describe("Disclosure and DisclosureList (T3, 7)", () => {
  test("Disclosure is 44 tall on touch, its closed detail absent from the tree, with aria-expanded and aria-controls", async () => {
    const page = await open(DISCLOSURE, { width: 390, height: 844, ...COARSE });
    const trigger = page.locator("#why button");
    assert.ok((await box(trigger)).height >= 44);
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    assert.ok(await trigger.getAttribute("aria-controls"));
    const tree = await page.accessibility.snapshot({ root: await page.locator("#why").elementHandle() });
    assert.doesNotMatch(JSON.stringify(tree), /slow, cold proof/, "the closed detail is out of the tree");
    await page.close();
  });
  test("rows are li; a one-line row is 40 (44 on touch); a wrap row is whole while closed; an opened row is not clipped; the list fits 358", async () => {
    for (const [options, height] of [[{ width: 1440 }, 40], [{ width: 390, height: 844, ...COARSE }, 44]]) {
      const page = await open(DISCLOSURE, options);
      assert.equal(await page.locator("#steps > li.basalt-disclosure").count(), 3);
      assert.equal((await box(page.locator("#steps .basalt-disclosure-row").first())).height, height);
      const wrapped = page.locator("#steps > li").nth(1).locator(".basalt-disclosure-title");
      assert.equal(await wrapped.evaluate((el) => el.scrollWidth <= el.clientWidth && getComputedStyle(el).whiteSpace === "normal"), true);
      const last = page.locator("#steps > li").nth(2);
      await last.locator(".basalt-disclosure-row").click();
      await page.waitForTimeout(600);
      assert.equal(await last.locator(".basalt-disclosure-title").evaluate((el) => el.scrollWidth <= el.clientWidth), true, "an open row wraps whole");
      assert.ok((await box(page.locator("#steps"))).width <= 358);
      await page.close();
    }
  });
});

// ---- 8: notifications ----

const NOTES = (extra = "", entries = "ENTRIES") => `
const ENTRIES = [
  { id: "m1", title: "Priya mentioned you on the spring menu draft that the whole kitchen is reviewing this week", description: "Menus, spring", time: "2m ago", unread: true, direct: true },
  { id: "o1", title: "Order 1041 shipped", time: "1h ago", unread: true, count: 3 },
  { id: "g1", title: "Sam and Ada replied", time: "3h ago", entries: [{ id: "g1a", title: "Sam replied", time: "3h ago", unread: true, direct: true }, { id: "g1b", title: "Ada replied", time: "4h ago", unread: true }] },
  { id: "r1", title: "Stock count finished", time: "Yesterday" },
];
function Centre() {
  const [entries, setEntries] = React.useState(${entries});
  const [loading, setLoading] = React.useState(false);
  window.read = () => setEntries((list) => list.map((e) => (e.id === "o1" ? { ...e, unread: false } : e)));
  window.refresh = () => setLoading(true);
  window.land = () => { setEntries(ENTRIES); setLoading(false); };
  return <B.NotificationCenter entries={entries} loading={loading || undefined} onMarkAllRead={() => {}} onClearAll={() => {}} defaultOpen ${extra} />;
}
createRoot(document.getElementById("root")).render(<div style={{ padding: 24, display: "flex", justifyContent: "flex-end" }}><Centre /></div>);`;

describe("Notifications (T3, 8)", () => {
  test("a wrapped row's name holds title, line and time; ×N is visible beside a cut title and spoken once", async () => {
    const page = await open(NOTES("wrap"));
    const first = page.locator(".basalt-notification").first();
    const name = await first.evaluate((el) => el.textContent);
    assert.match(name, /Unread, for you: Priya mentioned you.*Menus, spring.*2m ago/);
    await page.close();
    const cut = await open(NOTES());
    const counted = cut.locator('.basalt-notification:has(.basalt-notification-count)').first();
    assert.ok((await box(counted.locator(".basalt-notification-count"))).width > 0, "the count shows");
    assert.equal((await counted.textContent()).match(/3 times/g).length, 1, "spoken once");
    assert.equal(await counted.locator(".basalt-notification-caret").count(), 0, "no chevron on an entry that is not a group");
    await cut.close();
  });
  test("the bell is one width in its three states; the direct count walks into groups; the ringed dot is drawn in forced colours", async () => {
    const widths = [];
    for (const entries of ["[]", "ENTRIES.map((e) => ({ ...e, direct: false, entries: e.entries?.map((c) => ({ ...c, direct: false })) }))", "ENTRIES"]) {
      const page = await open(NOTES("", entries));
      widths.push((await box(page.locator(".basalt-notifications-trigger"))).width);
      if (entries === "ENTRIES") {
        assert.equal(await page.locator(".basalt-notifications-trigger").getAttribute("aria-label"), "Notifications, 4 unread, 2 for you", "the unread direct child of a group counts");
        assert.equal(await page.locator(".basalt-notifications-trigger").getAttribute("data-direct"), "");
      }
      await page.close();
    }
    assert.equal(new Set(widths).size, 1, JSON.stringify(widths));
    const forced = await open(NOTES(), { forcedColors: "active" });
    const ring = await forced.locator(".basalt-notifications-trigger").evaluate((el) => { const s = getComputedStyle(el, "::before"); return [s.borderTopWidth, s.borderTopStyle, s.width]; });
    assert.deepEqual(ring, ["1px", "solid", "10px"]);
    await forced.close();
  });
  test("the reason is the button's description and goes at zero; focus survives an entry becoming read; at 360 the reason starts on the title's edge", async () => {
    const page = await open(NOTES('markAllReadReason="Read-only while the shop is closed."'), { width: 360, height: 800 });
    const mark = page.locator(".basalt-notifications-mark");
    const reason = page.locator(".basalt-notifications-reason");
    assert.equal(await mark.getAttribute("aria-describedby"), await reason.getAttribute("id"));
    assert.equal(await mark.getAttribute("aria-disabled"), "true");
    assert.equal(Math.round((await box(reason)).x), Math.round((await box(page.locator(".basalt-notifications-title"))).x));
    const read = page.locator('.basalt-notification').nth(1);
    await read.focus();
    await page.evaluate(() => window.read());
    await settle(page);
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains("basalt-notification")), true, "focus survives read");
    await page.close();
    const none = await open(NOTES('markAllReadReason="Read-only while the shop is closed."', "ENTRIES.map((e) => ({ ...e, unread: false, entries: e.entries?.map((c) => ({ ...c, unread: false })) }))"));
    assert.equal(await none.locator(".basalt-notifications-reason").count(), 0);
    assert.equal(await none.locator(".basalt-notifications-mark").getAttribute("aria-describedby"), null);
    await none.close();
  });
  test("loading keeps one height from waiting to bones, says its label once after the grace, never shows 0 unread or the empty words; a refresh keeps each action", async () => {
    // The clock is paused from the start: advance it before reading anything (settle() waits for frames, which a paused clock never draws).
    const { page, errors } = await fixturePage(browser, NOTES("", "[]").replace("useState(false)", "useState(true)"), { theme: "dark", viewport: { width: 1440, height: 900 }, clock: true });
    page.errors = errors;
    await page.clock.runFor(50);
    const height = () => page.locator(".basalt-notifications-scroll").evaluate((el) => el.getBoundingClientRect().height);
    const waiting = await height();
    await page.clock.runFor(350);
    assert.equal(await height(), waiting, "the shown phase is the waiting phase's height");
    assert.equal(await page.locator(".basalt-notifications-count").textContent(), "");
    assert.equal(await page.locator(".basalt-notifications-empty").count(), 0);
    assert.equal((await page.evaluate(() => [...document.querySelectorAll("[role=status], [aria-live]")].map((n) => n.textContent).join("|"))).match(/Loading notifications/g)?.length, 1);
    await page.evaluate(() => window.land());
    await page.clock.runFor(500);
    await page.locator(".basalt-notifications-mark").focus();
    await page.evaluate(() => window.refresh());
    await page.clock.runFor(500);
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains("basalt-notifications-mark")), true);
    assert.equal(await page.locator(".basalt-notifications-mark").getAttribute("aria-disabled"), null, "on, as it was");
    await page.close();
  });
});

describe("Notifications: a refresh keeps the list's nodes (T3 fix 1, item 1)", () => {
  for (const from of ["undefined", "false"]) {
    test(`loading ${from} to true with entries shown keeps a focused entry in an open group, the same node, and the group open`, async () => {
      const page = await open(`
const ENTRIES = [
  { id: "g1", title: "Sam and Ada replied", time: "3h ago", entries: [{ id: "g1a", title: "Sam replied", time: "3h ago", unread: true }, { id: "g1b", title: "Ada replied", time: "4h ago" }] },
  { id: "r1", title: "Stock count finished", time: "Yesterday" },
];
function Page() {
  const [loading, setLoading] = React.useState(${from});
  window.refresh = () => setLoading(true);
  return <B.NotificationList entries={ENTRIES} loading={loading} onMarkAllRead={() => {}} />;
}
createRoot(document.getElementById("root")).render(<div style={{ padding: 24, width: 480 }}><Page /></div>);`);
      await page.locator(".basalt-notification[data-group]").click();
      await settle(page);
      const inner = page.locator(".basalt-notification-entries .basalt-notification").first();
      await inner.focus();
      await page.evaluate(() => { window.held = document.activeElement; });
      await page.evaluate(() => window.refresh());
      await settle(page);
      assert.equal(await page.evaluate(() => document.activeElement === window.held && window.held.isConnected), true, "the focused entry is the same node and keeps focus");
      assert.equal(await page.locator(".basalt-notification[data-group]").getAttribute("aria-expanded"), "true", "the group stays open");
      await page.close();
    });
  }
});

// ---- 9 and 11: ListBand at one page ----

const BAND = (props = "", total = 4) => `
function List() {
  const [size, setSize] = React.useState(10);
  const [page, setPage] = React.useState(1);
  window.setSize = setSize;
  return <B.ListBand id="band" total={${total}} maxTotal={40} page={page} pageSize={size} pageSizes={[2, 10, 25]} onPageChange={setPage} onPageSizeChange={setSize} noun="Loans" ${props}>
    <B.PanelList aria-label="Loans">{Array.from({ length: Math.min(size, ${total}) }, (_, i) => <B.PanelRow key={i} href={"#l" + i} title={"Loan " + (i + 1)} />)}</B.PanelList>
  </B.ListBand>;
}
createRoot(document.getElementById("root")).render(<div style={{ padding: 16 }}><List /></div>);`;

describe("ListBand at one page (T3, 9 and 11)", () => {
  test("at 358 and one page the range starts on the gutter and the band is one row; the select moves 0px from one page to two and keeps focus as the same element", async () => {
    const page = await open(BAND(), { width: 390, height: 844, ...COARSE });
    const row = await box(page.locator(".basalt-list-band-row"));
    const range = await box(page.locator(".basalt-list-band-range"));
    assert.equal(Math.round(range.x), Math.round(row.x), "on the gutter");
    assert.ok(row.height <= 60, `one row (${row.height})`);
    const select = page.locator(".basalt-list-band-size [role=combobox], .basalt-list-band-size button").first();
    const before = await box(select);
    await select.focus();
    await page.evaluate(() => { window.held = document.activeElement; window.setSize(2); });
    await settle(page);
    assert.deepEqual(await box(select), before, "the select moves 0px");
    assert.equal(await page.evaluate(() => document.activeElement === window.held), true, "the same element keeps focus");
    await page.close();
  });
  test('onePage="size" draws only the select; keepFootRoom at one page draws no text', async () => {
    const page = await open(BAND('onePage="size" keepFootRoom'), { width: 1440 });
    for (const sel of [".basalt-list-band-range", ".basalt-list-band-row > .basalt-pagination"]) assert.equal(await page.locator(sel).evaluate((el) => getComputedStyle(el).visibility), "hidden", sel);
    await page.close();
    const narrow = await open(BAND("keepFootRoom"), { width: 390, height: 844, ...COARSE });
    const foot = await narrow.locator(".basalt-list-band-foot").evaluate((el) => [...el.querySelectorAll("*")].filter((n) => getComputedStyle(n).visibility === "visible" && n.childNodes.length && [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())).length);
    assert.equal(foot, 0, "the held foot draws no text");
    assert.equal(await narrow.locator(".basalt-list-band-foot [aria-label]").count(), 0, "no landmark name");
    await narrow.close();
  });
});

// ---- 10: axe in both themes ----

describe("axe on every T3 part, both themes (T3, 10)", () => {
  for (const theme of THEMES) {
    test(`no violations (${theme})`, async () => {
      for (const body of [WRAP("default"), LINKED, PANEL.replace('"var(--w)"', "720"), DISCLOSURE, NOTES("wrap"), BAND()]) {
        const page = await open(body, { theme });
        assert.deepEqual(await axe(page), []);
        await page.close();
      }
    });
  }
});
