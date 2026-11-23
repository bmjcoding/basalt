// lists-facts (cimip-gaps-2, batch B6): a panel of rows (PanelList), a list to choose several from outside a table (SelectableList), one-line facts in a narrow column
// (DescriptionList narrow="line") and missing-value words, CodeBlock wrap (breaks at spaces only), Select toolbar (its own width), and a form dialog's body spacing. Found by
// building CIMIP on Basalt; every fixture is from another domain. Decided and built by Opus on the no-council path; the implementation has not been reviewed. Driven in Chromium
// against the built package with the real stylesheet. The fixtures load no web font, so every measured margin is wider than a fallback font's width. Synthetic data only.
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
const PAGE = `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)";`;

// ---- PanelList ----

const PANEL = `${PAGE}
createRoot(document.getElementById("root")).render(
  <div style={{ padding: 24, width: 520 }}>
    <h2 id="builds">Recent builds</h2>
    <B.PanelList aria-labelledby="builds">
      <B.PanelRow id="r1" href="#b1" title="main · Bump the image cache to 30 days" description="Checks and the browser suite" trailing="4m 12s" leading={<B.Badge variant="plain" status="success">Passed</B.Badge>} />
      <B.PanelRow id="r2" title="release/2.4 · Pin the font loader, then rebuild every page of the documentation site from scratch" description="Running" trailing="2m 50s" onClick={() => { window.pressed = (window.pressed ?? 0) + 1; }} />
      <B.PanelRow id="r3" href="https://example.com/builds" target="_blank" rel="external" title="Every build" />
    </B.PanelList>
    <B.Card id="card"><div style={{ padding: 16 }}><B.PanelList id="inner" aria-label="Inner"><B.PanelRow href="#x" title="Nested" /></B.PanelList></div></B.Card>
  </div>
);`;

describe("PanelList", () => {
  test("a panel at its level with one rim, radius 12, a divider between rows only, and rows that are links or buttons", async () => {
    for (const theme of ["dark", "light"]) {
      const page = await open(PANEL, { theme });
      const info = await page.evaluate(() => {
        const list = document.querySelector(".basalt-panel-list");
        const cs = getComputedStyle(list);
        const items = [...list.children].map((li) => getComputedStyle(li).borderTopWidth);
        return { level: list.dataset.level, inner: document.getElementById("inner").dataset.level, radius: cs.borderTopLeftRadius, rim: cs.borderTopWidth, side: cs.borderLeftWidth, items, r1: document.getElementById("r1").tagName, r2: [document.getElementById("r2").tagName, document.getElementById("r2").type], rel: document.getElementById("r3").rel, newTab: document.getElementById("r3").textContent };
      });
      assert.equal(info.level, "1");
      assert.equal(info.inner, "2", "a panel inside a card is one level deeper");
      assert.equal(info.radius, "12px");
      assert.equal(info.rim, "1px");
      assert.equal(info.side, "1px");
      assert.deepEqual(info.items, ["0px", "1px", "1px"], "a divider between rows, never above the first");
      assert.equal(info.r1, "A");
      assert.deepEqual(info.r2, ["BUTTON", "button"]);
      assert.deepEqual(info.rel.split(" ").sort(), ["external", "noopener", "noreferrer"]);
      assert.match(info.newTab, /opens in a new tab/);
      assert.deepEqual(await axe(page), [], theme);
      assert.deepEqual(page.errors, []);
      await page.close();
    }
  });

  test("the band is full bleed: hover is a wash with no ink change; focus is the ring inside at −2 and the end rows take the panel's inner corner", async () => {
    const page = await open(PANEL);
    // The rows are subgrids of the list: every title starts on one edge, a row with a seat or without, and every trailing value ends on one.
    const edges = await page.evaluate(() => [...document.querySelectorAll("#r1, #r2, #r3")].map((r) => [Math.round(r.querySelector(".basalt-panel-row-title").getBoundingClientRect().left), r.querySelector(".basalt-panel-row-end") ? Math.round(r.querySelector(".basalt-panel-row-end").getBoundingClientRect().right) : null]));
    assert.equal(new Set(edges.map((e) => e[0])).size, 1, `titles on one edge: ${JSON.stringify(edges)}`);
    assert.equal(edges[0][1], edges[1][1]);
    const rest = await page.evaluate(() => { const r = document.getElementById("r1"); return { bg: getComputedStyle(r).backgroundColor, ink: getComputedStyle(r.querySelector(".basalt-panel-row-title")).color, w: r.getBoundingClientRect().width, list: document.querySelector(".basalt-panel-list").clientWidth }; });
    assert.equal(rest.w, rest.list, "the row is the panel's inner width");
    await page.hover("#r1");
    await settle(page);
    const hover = await page.evaluate(() => { const r = document.getElementById("r1"); return { bg: getComputedStyle(r).backgroundColor, ink: getComputedStyle(r.querySelector(".basalt-panel-row-title")).color }; });
    assert.notEqual(hover.bg, rest.bg);
    assert.equal(hover.ink, rest.ink, "hover lifts no ink");
    await page.mouse.move(0, 0);
    await page.keyboard.press("Tab");
    const ring = await page.evaluate(() => { const r = document.activeElement; const cs = getComputedStyle(r); return { id: r.id, style: cs.outlineStyle, width: cs.outlineWidth, offset: cs.outlineOffset, radius: cs.borderTopLeftRadius, last: getComputedStyle(document.getElementById("r3")).borderBottomLeftRadius, mid: getComputedStyle(document.getElementById("r2")).borderTopLeftRadius }; });
    assert.equal(ring.id, "r1");
    assert.equal(ring.style, "solid");
    assert.equal(ring.width, "2px");
    assert.equal(ring.offset, "-2px");
    assert.equal(ring.radius, "11px");
    assert.equal(ring.last, "11px");
    assert.equal(ring.mid, "0px");
    await page.close();
  });

  test("the title and description are one line each and cut; the trailing value is never cut; a coarse pointer's row is at least 44", async () => {
    const page = await open(PANEL, { width: 390, ...COARSE });
    const info = await page.evaluate(() => {
      const r2 = document.getElementById("r2");
      const title = r2.querySelector(".basalt-panel-row-title");
      const end = r2.querySelector(".basalt-panel-row-end");
      return { cut: title.scrollWidth > title.clientWidth, lines: Math.round(title.getBoundingClientRect().height), endCut: end.scrollWidth > end.clientWidth, heights: [...document.querySelectorAll(".basalt-panel-row")].map((r) => r.getBoundingClientRect().height) };
    });
    assert.ok(info.cut);
    assert.equal(info.lines, 20);
    assert.equal(info.endCut, false);
    for (const h of info.heights) assert.ok(h >= 44, `row ${h}`);
    await page.close();
  });
});

// ---- SelectableList ----

const PICK = (bar = "top") => `${PAGE}
const PEOPLE = [["a", "Ada Byrne"], ["k", "Kofi Mensah"], ["l", "Lena Ishikawa"], ["r", "Rafael Ortiz"], ["s", "Sana Iqbal"], ["t", "Tomas Weir"], ["u", "Uma Patel"], ["v", "Vera Lund"]];
function App() {
  const [chosen, setChosen] = React.useState([]);
  const [done, setDone] = React.useState([]);
  const [gone, setGone] = React.useState([]);
  window.chosen = chosen;
  // A refresh from the server: a row is dealt with elsewhere, or leaves the list, while focus stays where the reader left it.
  window.markDone = (id) => setDone((d) => [...d, id]);
  window.remove = (id) => setGone((g) => [...g, id]);
  const open = PEOPLE.map((p) => p[0]).filter((id) => !done.includes(id));
  const n = chosen.filter((id) => open.includes(id)).length;
  return (
    <div id="scroller" style={{ margin: 24, width: 420, height: 220, overflowY: "auto" }}>
      <B.SelectableList id="list" label="People asking to edit" values={open} value={chosen} onValueChange={(v) => { window.changes = [...(window.changes ?? []), v]; setChosen(v); }} barSide="${bar}"
        bar={<B.SelectionBar id="bar" allLabel="Everyone asking" count={(c, t) => c + " of " + t + " chosen"}><B.Button id="admit" size="sm" disabled={n === 0} focusableWhenDisabled onClick={() => { setDone([...done, ...chosen]); setChosen([]); }}>Let in</B.Button></B.SelectionBar>}>
        {PEOPLE.filter(([id]) => !gone.includes(id)).map(([id, name]) => <B.SelectableItem key={id} value={id} id={"row-" + id} label={"Choose " + name}><span>{name}</span></B.SelectableItem>)}
      </B.SelectableList>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);`;

const allBox = (page) => page.locator("#bar [role='checkbox']");

describe("SelectableList", () => {
  test("a press anywhere on a row chooses it; the all box goes mixed, then all, then none; the count says so in words", async () => {
    const page = await open(PICK());
    assert.equal(await allBox(page).getAttribute("aria-checked"), "false");
    assert.equal(await page.locator(".basalt-selection-count [data-on]").textContent(), "0 of 8 chosen");
    // The row's far end (its words' empty room) is still the checkbox's label.
    const row = await page.locator("#row-k").boundingBox();
    await page.mouse.click(row.x + row.width - 8, row.y + row.height / 2);
    await settle(page);
    assert.deepEqual(await page.evaluate(() => window.chosen), ["k"]);
    assert.equal(await page.locator("#row-k").getAttribute("data-selected"), "");
    assert.equal(await page.locator("#row-k [role='checkbox']").getAttribute("aria-checked"), "true");
    assert.equal(await allBox(page).getAttribute("aria-checked"), "mixed");
    assert.equal(await page.locator(".basalt-selection-count [data-on]").textContent(), "1 of 8 chosen");
    await allBox(page).click();
    assert.deepEqual(await page.evaluate(() => window.chosen), ["a", "k", "l", "r", "s", "t", "u", "v"]);
    assert.equal(await allBox(page).getAttribute("aria-checked"), "true");
    await allBox(page).click();
    assert.deepEqual(await page.evaluate(() => window.chosen), []);
    // Chosen out of order, the value is in the list's order.
    await page.locator("#row-r [role='checkbox']").click();
    await page.locator("#row-a [role='checkbox']").click();
    assert.deepEqual(await page.evaluate(() => window.chosen), ["a", "r"]);
    assert.equal(await page.locator("#row-a [role='checkbox']").getAttribute("aria-label"), "Choose Ada Byrne");
    assert.equal(await page.locator(".basalt-selection-count").getAttribute("role"), "status");
    assert.deepEqual(page.errors, []);
    await page.close();
  });

  test("a row dealt with keeps its place and box with an empty seat, and is no longer counted; the count's room never changes", async () => {
    const page = await open(PICK());
    const before = await page.evaluate(() => ({ rows: [...document.querySelectorAll(".basalt-selectable-item")].map((r) => { const b = r.getBoundingClientRect(); return [b.top, b.height]; }), count: document.querySelector(".basalt-selection-count").getBoundingClientRect().width, admit: document.getElementById("admit").getBoundingClientRect().left }));
    await page.locator("#row-a [role='checkbox']").click();
    await page.locator("#row-l [role='checkbox']").click();
    const mid = await page.evaluate(() => ({ count: document.querySelector(".basalt-selection-count").getBoundingClientRect().width, admit: document.getElementById("admit").getBoundingClientRect().left }));
    assert.equal(mid.count, before.count, "the count's room is held");
    assert.equal(mid.admit, before.admit, "the actions do not move");
    await page.click("#admit");
    await settle(page);
    const after = await page.evaluate(() => ({ rows: [...document.querySelectorAll(".basalt-selectable-item")].map((r) => { const b = r.getBoundingClientRect(); return [b.top, b.height]; }), done: [...document.querySelectorAll(".basalt-selectable-item[data-done]")].map((r) => r.id), boxes: document.querySelectorAll(".basalt-selectable-item [role='checkbox']").length, seat: (() => { const s = document.querySelector("#row-a .basalt-selectable-seat").getBoundingClientRect(); const b = document.querySelector("#row-k [role='checkbox']").getBoundingClientRect(); return [s.width, s.height, s.left, b.width, b.height, b.left]; })() }));
    assert.deepEqual(after.rows, before.rows, "no row moved");
    assert.deepEqual(after.done, ["row-a", "row-l"]);
    assert.equal(after.boxes, 6);
    assert.deepEqual(after.seat.slice(0, 3), after.seat.slice(3), "the empty seat is the box's size and place");
    assert.equal(await page.locator(".basalt-selection-count [data-on]").textContent(), "0 of 6 chosen");
    assert.equal(await page.locator("#admit").getAttribute("aria-disabled"), "true");
    await page.close();
  });

  test("a row dealt with, or taken out, while its box holds focus hands focus to the next row that can be chosen, else the one before, else the all box", async () => {
    const page = await open(PICK());
    const focused = () => page.evaluate(() => document.activeElement?.closest(".basalt-selectable-item")?.id ?? (document.activeElement?.closest(".basalt-selection-bar") ? "all" : document.activeElement?.tagName));
    // Focus in the row by the keyboard, then a refresh marks it dealt with.
    await page.locator("#row-k [role='checkbox']").focus();
    await page.evaluate(() => window.markDone("k"));
    await settle(page);
    assert.equal(await focused(), "row-l", "the next row's box");
    // A row taken out of the list while focused.
    await page.evaluate(() => window.remove("l"));
    await settle(page);
    assert.equal(await focused(), "row-r");
    // The last row hands focus back to the one before it, skipping a row already dealt with.
    await page.evaluate(() => window.markDone("u"));
    await page.locator("#row-v [role='checkbox']").focus();
    await page.evaluate(() => window.markDone("v"));
    await settle(page);
    assert.equal(await focused(), "row-t");
    // When none is left, the all box is disabled: focus goes to the first action, which stays focusable.
    await page.evaluate(() => { for (const id of ["a", "r", "s"]) window.markDone(id); });
    await page.locator("#row-t [role='checkbox']").focus();
    await page.evaluate(() => window.markDone("t"));
    await settle(page);
    assert.equal(await page.evaluate(() => document.activeElement?.id), "admit");
    // Focus that the reader moved elsewhere (the action) is never taken back.
    const again = await open(PICK());
    await again.locator("#row-a [role='checkbox']").click();
    await again.locator("#admit").focus();
    await again.evaluate(() => window.markDone("a"));
    await settle(again);
    assert.equal(await again.evaluate(() => document.activeElement?.id), "admit");
    await again.close();
    await page.close();
  });

  test("a chosen row keeps the selected wash under the pointer; hover is for rows not chosen", async () => {
    const page = await open(PICK());
    await page.locator("#row-a [role='checkbox']").click();
    await page.mouse.move(0, 0);
    await settle(page);
    const rest = await page.evaluate(() => getComputedStyle(document.getElementById("row-a")).backgroundColor);
    await page.hover("#row-a");
    await settle(page);
    const hovered = await page.evaluate(() => getComputedStyle(document.getElementById("row-a")).backgroundColor);
    assert.equal(hovered, rest, "the selected wash, not the hover wash");
    await page.hover("#row-k");
    await settle(page);
    const other = await page.evaluate(() => [getComputedStyle(document.getElementById("row-k")).backgroundColor, getComputedStyle(document.getElementById("row-a")).backgroundColor]);
    assert.notEqual(other[0], other[1], "an unchosen row's hover wash is not the selected wash");
    await page.close();
  });

  test("the count's room holds the widest of its wordings for none, one, all but one and all, or the app's own widest", async () => {
    const COUNT = `${PAGE}
function App() {
  const [v, setV] = React.useState([]);
  window.setV = setV;
  const ids = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];
  return (
    <div style={{ width: 600, padding: 24 }}>
      <B.SelectableList label="Files" values={ids} value={v} onValueChange={setV} bar={<B.SelectionBar id="bar1" count={(c, t) => (c === 0 ? "Nothing chosen yet" : c + " of " + t)}><B.Button id="act1" size="sm">Move</B.Button></B.SelectionBar>}>
        {ids.map((id) => <B.SelectableItem key={id} value={id}>{"File " + id}</B.SelectableItem>)}
      </B.SelectableList>
      <B.SelectableList label="Files" values={ids} bar={<B.SelectionBar id="bar2" widest="Every file in the folder" count={(c, t) => (c === t ? "Every file" : c + " of " + t)}><B.Button id="act2" size="sm">Move</B.Button></B.SelectionBar>}>
        {ids.map((id) => <B.SelectableItem key={id} value={id}>{"File " + id}</B.SelectableItem>)}
      </B.SelectableList>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);`;
    const page = await open(COUNT);
    const at = () => page.evaluate(() => document.getElementById("act1").getBoundingClientRect().left);
    const start = await at();
    for (const v of [["a"], ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"], []]) {
      await page.evaluate((v) => window.setV(v), v);
      await settle(page);
      assert.equal(await at(), start, `the action held still at ${v.length}`);
    }
    const words = await page.evaluate(() => [...document.querySelectorAll("#bar2 .basalt-selection-count .basalt-reserve > *")].map((el) => el.textContent));
    assert.ok(words.includes("Every file in the folder"), "the app's widest wording is reserved");
    await page.close();
  });

  test("the bar sticks to its edge of the scroller, opaque, on a divider", async () => {
    for (const [side, edge] of [["top", "borderBottomWidth"], ["bottom", "borderTopWidth"]]) {
      const page = await open(PICK(side));
      await page.evaluate(() => { document.getElementById("scroller").scrollTop = 80; });
      const info = await page.evaluate((edge) => {
        const s = document.getElementById("scroller").getBoundingClientRect();
        const bar = document.getElementById("bar");
        const b = bar.getBoundingClientRect();
        const cs = getComputedStyle(bar);
        return { position: cs.position, top: b.top - s.top, bottom: s.bottom - b.bottom, bg: cs.backgroundColor, line: cs[edge] };
      }, edge);
      assert.equal(info.position, "sticky");
      assert.equal(Math.round(side === "top" ? info.top : info.bottom), 0, side);
      assert.ok(!/transparent|\/ 0|rgba\(0, 0, 0, 0\)/.test(info.bg) && !/\/\s*0?\.\d/.test(info.bg), `an opaque fill: ${info.bg}`);
      assert.equal(info.line, "1px");
      await page.close();
    }
  });

  test("no axe violations in either theme, and a coarse pointer's row is at least 44", async () => {
    for (const theme of ["dark", "light"]) {
      const page = await open(PICK(), { theme });
      await page.locator("#row-a [role='checkbox']").click();
      // The actions' ink steps from disabled as the first row is chosen: read it once the step has run.
      await settle(page);
      assert.deepEqual(await axe(page), [], theme);
      await page.close();
    }
    const page = await open(PICK(), { width: 390, ...COARSE });
    const heights = await page.evaluate(() => [...document.querySelectorAll(".basalt-selectable-item")].map((r) => r.getBoundingClientRect().height));
    for (const h of heights) assert.ok(h >= 44, `row ${h}`);
    await page.close();
  });
});

// ---- DescriptionList narrow="line" and missing words ----

const FACTS = `${PAGE}
const items = (
  <>
    <B.DescriptionItem id="i1" term="Branch" mono>release/2.4</B.DescriptionItem>
    <B.DescriptionItem id="i2" term="Coverage" missing />
    <B.DescriptionItem id="i3" term="Reviewer" missing>None yet</B.DescriptionItem>
    <B.DescriptionItem id="i4" term="Customer" values={["Juno Halvorsen", "Annual plan since Mar 2024"]} />
    <B.DescriptionItem id="i5" term="Time to first reply" missing>No reply yet</B.DescriptionItem>
    <B.DescriptionItem id="i6" term="Contacts" missing values={["No email on file", "No phone on file"]} />
    <B.DescriptionItem id="i7" term="Phone" missing values={[]}>No phone on file</B.DescriptionItem>
    <B.DescriptionItem id="i8" term="Uptime" missing values={[]} />
  </>
);
createRoot(document.getElementById("root")).render(
  <div style={{ padding: 24, display: "flex", gap: 24, alignItems: "start" }}>
    <div style={{ width: 320 }}><B.DescriptionList id="stack">{items}</B.DescriptionList></div>
    <div style={{ width: 320 }}><B.DescriptionList id="line" narrow="line">{items}</B.DescriptionList></div>
    <div style={{ width: 600 }}><B.DescriptionList id="wide" narrow="line">{items}</B.DescriptionList></div>
  </div>
);`;

describe("DescriptionList", () => {
  test("narrow=\"line\" keeps label and value on one row under 480, the label column 80; the default still stacks; 480 and up is unchanged", async () => {
    const page = await open(FACTS);
    const info = await page.evaluate(() => {
      const read = (list) => [...document.querySelectorAll(`#${list} .basalt-description-item`)].map((item) => {
        const dt = item.querySelector("dt").getBoundingClientRect();
        const dds = [...item.querySelectorAll("dd")].map((d) => d.getBoundingClientRect());
        return { dtTop: dt.top, dtW: dt.width, ddTop: dds[0].top, ddLeft: dds[0].left - item.getBoundingClientRect().left, second: dds[1] ? [dds[1].top - dds[0].bottom, dds[1].left - item.getBoundingClientRect().left] : null, h: item.getBoundingClientRect().height };
      });
      return { stack: read("stack"), line: read("line"), wide: read("wide"), height: ["stack", "line"].map((id) => document.getElementById(id).getBoundingClientRect().height) };
    });
    for (const row of info.line) {
      assert.ok(row.ddTop - row.dtTop < 2 && row.ddTop - row.dtTop > -2, "on one row");
      assert.equal(row.dtW, 80);
      assert.equal(row.ddLeft, 96, "80 and the space-4 gap");
    }
    assert.deepEqual(info.line[3].second, [4, 96], "a second value stacks in the value column, space-1 apart");
    for (const row of info.stack) assert.ok(row.ddTop > row.dtTop + 10, "the default stacks");
    for (const row of info.wide) { assert.equal(row.dtW, 160); assert.equal(row.ddLeft, 176); }
    assert.ok(info.height[1] < info.height[0] * 0.75, `one line each is shorter: ${info.height}`);
    // A long label wraps inside its 80.
    assert.ok(info.line[4].h > 40, "a label that wraps makes its own row taller");
    await page.close();
  });

  test("a missing value says \"Not observed\" by default, or the app's own words, in tertiary ink with no mark", async () => {
    const page = await open(FACTS);
    const info = await page.evaluate(() => {
      const dd = (id) => document.querySelector(`#line #${id} dd`);
      const p = dd("i1");
      return { observed: dd("i2").textContent, own: dd("i3").textContent, same: getComputedStyle(dd("i2")).color === getComputedStyle(dd("i3")).color, differs: getComputedStyle(dd("i3")).color !== getComputedStyle(p).color, mono: dd("i3").hasAttribute("data-mono"), missing: dd("i3").hasAttribute("data-missing") };
    });
    assert.equal(info.observed, "Not observed");
    // An empty `values` in the missing state falls back to the children, or to "Not observed": one dd, never none.
    assert.deepEqual(await page.evaluate(() => ["i7", "i8"].map((id) => [...document.querySelectorAll(`#line #${id} dd`)].map((d) => d.textContent))), [["No phone on file"], ["Not observed"]]);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll("#line #i6 dd")].map((d) => [d.textContent, d.hasAttribute("data-missing")])), [["No email on file", true], ["No phone on file", true]], "supplied values are what a missing row says");
    assert.equal(info.own, "None yet");
    assert.ok(info.same, "the same ink for both");
    assert.ok(info.differs, "not the value's primary ink");
    assert.equal(info.mono, false);
    assert.equal(info.missing, true);
    assert.deepEqual(await axe(page), []);
    await page.close();
  });
});

// ---- CodeBlock wrap ----

const CMD = "deploy --project storefront-web --region us-east-2 --image registry.example.com/web:2.4.1 --replicas 3 --confirm";
const LONG = "x".repeat(90);
const CODE = `${PAGE}
createRoot(document.getElementById("root")).render(
  <div style={{ padding: 16, width: 358, display: "grid", gap: 16 }}>
    <B.CodeBlock code={${JSON.stringify(CMD)}} prompt="$" wrap className="w-prompt" />
    <B.CodeBlock code={${JSON.stringify(`${CMD}\n\necho done`)}} wrap className="w-plain" copyable={false} />
    <B.CodeBlock code={${JSON.stringify(CMD)}} className="scroll" />
    <B.CodeBlock code={${JSON.stringify(`ls ${LONG} -l`)}} wrap className="w-long" copyable={false} />
  </div>
);`;

describe("CodeBlock wrap", () => {
  test("a long line breaks at spaces only: every word is whole on one line, and the block does not scroll", async () => {
    const page = await open(CODE, { width: 390 });
    const info = await page.evaluate(() => {
      const read = (sel) => {
        const pre = document.querySelector(`${sel} .basalt-code-pre`);
        const words = [...pre.querySelectorAll(".basalt-code-word")];
        return { scrolls: pre.scrollWidth > pre.clientWidth + 1, split: words.filter((w) => w.getClientRects().length !== 1).map((w) => w.textContent), lines: Math.round(pre.querySelector("code").getBoundingClientRect().height / 20), text: pre.textContent };
      };
      return { prompt: read(".w-prompt"), plain: read(".w-plain"), scroll: read(".scroll"), long: read(".w-long") };
    });
    assert.equal(info.prompt.scrolls, false);
    assert.deepEqual(info.prompt.split, [], "no word breaks inside, after a hyphen, a slash or a dot");
    assert.ok(info.prompt.lines >= 3, `wrapped onto ${info.prompt.lines} lines`);
    assert.equal(info.plain.scrolls, false);
    assert.deepEqual(info.plain.split, []);
    assert.ok(info.plain.text.includes("--image registry.example.com/web:2.4.1"), "the text is the code");
    assert.equal(info.scroll.scrolls, true, "without wrap it scrolls, as shipped");
    assert.equal(info.scroll.lines, 1);
    assert.equal(info.long.scrolls, true, "a word longer than the line still scrolls");
    assert.deepEqual(info.long.split, []);
    await page.close();
  });

  test("with no prompt a wrapped line's continuation is indented 2ch, an empty line keeps its height, and beside a prompt the continuation starts at the text's edge", async () => {
    const page = await open(CODE, { width: 390 });
    const info = await page.evaluate(() => {
      const row = document.querySelector(".w-plain .basalt-code-row");
      const words = [...row.querySelectorAll(".basalt-code-word")];
      const first = words[0].getBoundingClientRect();
      const later = words.find((w) => w.getBoundingClientRect().top > first.top + 10).getBoundingClientRect();
      const ch = (() => { const s = document.createElement("span"); s.textContent = "0"; row.append(s); const w = s.getBoundingClientRect().width; s.remove(); return w; })();
      const rows = [...document.querySelectorAll(".w-plain .basalt-code-row")].map((r) => r.getBoundingClientRect().height);
      const text = [...document.querySelector(".w-prompt .basalt-code-text").querySelectorAll(".basalt-code-word")];
      const t0 = text[0].getBoundingClientRect();
      const t1 = text.find((w) => w.getBoundingClientRect().top > t0.top + 10).getBoundingClientRect();
      return { indent: later.left - first.left, ch, empty: rows[1], prompt: t1.left - t0.left };
    });
    assert.ok(Math.abs(info.indent - 2 * info.ch) < 0.5, `indent ${info.indent}, 2ch ${2 * info.ch}`);
    assert.equal(info.empty, 20, "an empty line keeps its line");
    assert.ok(Math.abs(info.prompt) < 0.5, "beside a prompt the continuation is on the text's edge");
    await page.close();
  });
});

// ---- Select toolbar ----

const SELECTS = `${PAGE}
const STATUS = [{ value: "any", label: "Any status" }, { value: "open", label: "Open" }, { value: "waiting", label: "Waiting on customer" }];
function App() {
  const [v, setV] = React.useState("open");
  window.setStatus = setV;
  return (
    <div style={{ padding: 24 }}>
      <div id="row" style={{ display: "flex", gap: 8, width: 900 }}>
        <B.Select toolbar aria-label="Status" value={v} onValueChange={setV} options={STATUS} />
        <B.Select toolbar aria-label="Result" defaultValue="any" options={[{ value: "any", label: "Any result" }, { value: "failed", label: "Failed" }]} />
      </div>
      <div id="prefixed" style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <B.Select toolbar valuePrefix="Status" value={v} onValueChange={setV} options={STATUS} />
        <B.Button id="after-prefixed">Apply</B.Button>
      </div>
      <div id="narrow" style={{ width: 120, marginTop: 16 }}><B.Select toolbar aria-label="Narrow" defaultValue="waiting" options={STATUS} /></div>
      <B.FilterToolbar label="Filter" filter={[<B.Select key="a" toolbar aria-label="In toolbar" defaultValue="open" options={STATUS} />]} />
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);`;

describe("Select toolbar", () => {
  test("as wide as its widest option, whatever is chosen; it fills a narrower column and cuts; in FilterToolbar it fills its column under 720", async () => {
    const page = await open(SELECTS);
    const read = () => page.evaluate(() => { const t = [...document.querySelectorAll("#row .basalt-select-trigger")].map((el) => el.getBoundingClientRect()); return { w: t[0].width, next: t[1].left }; });
    const a = await read();
    await page.evaluate(() => window.setStatus("waiting"));
    await settle(page);
    const b = await read();
    await page.evaluate(() => window.setStatus("any"));
    await settle(page);
    const c = await read();
    assert.equal(b.w, a.w);
    assert.equal(c.w, a.w);
    assert.equal(b.next, a.next, "choosing moves nothing after it");
    assert.ok(a.w < 300, `not stretched: ${a.w}`);
    // With a prefix the seat follows it and holds the same reservation: across every value the trigger keeps one width and the button after it never moves.
    const prefixed = async () => page.evaluate(() => [document.querySelector("#prefixed .basalt-select-trigger").getBoundingClientRect().width, document.getElementById("after-prefixed").getBoundingClientRect().left, Boolean(document.querySelector("#prefixed .basalt-select-lead > .basalt-select-seat"))]);
    const seen = [];
    for (const value of ["open", "waiting", "any"]) {
      await page.evaluate((value) => window.setStatus(value), value);
      await settle(page);
      seen.push(await prefixed());
    }
    assert.ok(seen.every((x) => x[2]), "the seat is kept after the prefix");
    assert.equal(new Set(seen.map((x) => x[0])).size, 1, `one width: ${JSON.stringify(seen)}`);
    assert.equal(new Set(seen.map((x) => x[1])).size, 1, "nothing after it moves");
    const name = await page.locator("#row .basalt-select-trigger").first().evaluate((el) => el.textContent);
    assert.ok(name.includes("Any status"));
    const narrow = await page.evaluate(() => { const t = document.querySelector("#narrow .basalt-select-trigger"); const v = t.querySelector(".basalt-select-value"); return { w: t.getBoundingClientRect().width, cut: v.scrollWidth > v.clientWidth, ellipsis: getComputedStyle(v).textOverflow }; });
    assert.equal(narrow.w, 120);
    assert.ok(narrow.cut);
    assert.equal(narrow.ellipsis, "ellipsis");
    // The sizers are hidden from assistive technology and the trigger's name is the value alone.
    assert.deepEqual(await axe(page), []);
    await page.close();
    const phone = await open(SELECTS, { width: 390, ...COARSE });
    const fill = await phone.evaluate(() => { const t = document.querySelector(".basalt-filter-toolbar .basalt-select-trigger"); return [t.getBoundingClientRect().width, t.closest(".basalt-filter-toolbar-filter").getBoundingClientRect().width]; });
    assert.equal(fill[0], fill[1]);
    await phone.close();
  });
});

// ---- The form dialog's body ----

const DIALOG = `${PAGE}
createRoot(document.getElementById("root")).render(
  <B.Dialog defaultOpen>
    <B.DialogContent form>
      <B.SheetHeader closeLabel="Close reply"><B.DialogTitle>Reply</B.DialogTitle></B.SheetHeader>
      <B.SheetBody>
        <B.DialogDescription id="desc">They see this by email.</B.DialogDescription>
        <div id="ready" role="group" aria-label="Ready answers" style={{ display: "flex", gap: 8 }}><B.Button size="sm">Looking into it</B.Button></div>
        <B.Form id="f">
          <B.Field label="Message"><B.Textarea rows={3} /></B.Field>
          <div id="many"><B.MultiSelect label="Tags" options={[{ value: "billing", label: "Billing" }, { value: "bug", label: "Bug" }]} defaultValue={["billing"]} /></div>
          <B.Fieldset id="group" legend="Also send to"><B.Checkbox name="also" value="owner" defaultChecked>The account owner</B.Checkbox><B.Checkbox name="also" value="finance">Finance</B.Checkbox></B.Fieldset>
        </B.Form>
      </B.SheetBody>
      <B.SheetFooter><B.DialogActions><B.DialogClose render={<B.Button>Cancel</B.Button>} /></B.DialogActions></B.SheetFooter>
    </B.DialogContent>
  </B.Dialog>
);`;

describe("Form dialog body", () => {
  test("a block between the description and the first field sits space-4 above the label; the description keeps space-5 under it", async () => {
    const page = await open(DIALOG);
    const gaps = await page.evaluate(() => {
      const r = (el) => el.getBoundingClientRect();
      const desc = r(document.getElementById("desc"));
      const ready = r(document.getElementById("ready"));
      const label = r(document.querySelector("#f .basalt-field-label, #f label"));
      return [ready.top - desc.bottom, label.top - ready.bottom];
    });
    assert.deepEqual(gaps.map(Math.round), [20, 16]);
    // Values beyond a text field keep the form's own gap: the multi-select and the checked group are space-4 apart, as fields are.
    const more = await page.evaluate(() => { const r = (id) => document.getElementById(id).getBoundingClientRect(); return [r("many").top - document.querySelector("#f .basalt-field").getBoundingClientRect().bottom, r("group").top - r("many").bottom]; });
    assert.deepEqual(more.map(Math.round), [16, 16]);
    await page.close();
  });
});

// ---- Described menu rows wrap (DECISIONS 275, the owner's option B) ----

const MENU = `${PAGE}
createRoot(document.getElementById("root")).render(
  <div style={{ padding: 24, display: "flex", gap: 16 }}>
    <B.Menu defaultOpen modal={false}>
      <B.MenuTrigger render={<B.Button>Access</B.Button>} />
      <B.MenuContent id="menu">
        <B.MenuRadioGroup defaultValue="edit">
          <B.MenuRadioItem id="view" value="view" description="Reads the document and its comments, and cannot change anything at all in it">Can view</B.MenuRadioItem>
          <B.MenuRadioItem id="edit" value="edit" description="Changes the text">Can edit</B.MenuRadioItem>
        </B.MenuRadioGroup>
        <B.MenuItem id="copy">Copy link</B.MenuItem>
      </B.MenuContent>
    </B.Menu>
  </div>
);`;
const SELECT_DESCRIBED = `${PAGE}
createRoot(document.getElementById("root")).render(
  <div style={{ padding: 24 }}>
    <B.Select aria-label="Plan" defaultOpen defaultValue="team" options={[{ value: "team", label: "Team", description: "Every seat in the workspace, billed each month, with the admin controls and the audit log" }, { value: "solo", label: "Solo" }]} />
  </div>
);`;

describe("Described menu rows", () => {
  for (const width of [1440, 390]) {
    test(`at ${width}: a Menu stays at most 320 wide; a description wraps, the row grows, the label stays one line, and the plates cover the taller row`, async () => {
      const page = await open(MENU, { width, ...(width === 390 ? COARSE : {}) });
      const info = await page.evaluate(() => {
        const box = (el) => el.getBoundingClientRect();
        const view = document.getElementById("view");
        const edit = document.getElementById("edit");
        const before = getComputedStyle(view, "::before");
        return {
          menu: box(document.getElementById("menu")).width,
          viewH: box(view).height, editH: box(edit).height,
          label: box(view.querySelector(".basalt-menu-item-label")).height,
          desc: box(view.querySelector(".basalt-menu-item-description")).height,
          white: getComputedStyle(view.querySelector(".basalt-menu-item-description")).whiteSpace,
          plate: parseFloat(before.height), inset: parseFloat(before.top),
        };
      });
      assert.ok(info.menu <= 320, `menu ${info.menu}`);
      assert.equal(info.white, "normal");
      assert.ok(info.desc >= 36, `the long description wraps: ${info.desc}`);
      assert.equal(Math.round(info.label), 20, "the label is one line");
      assert.ok(info.viewH >= info.editH + 18, `the row grows: ${info.viewH} against ${info.editH}`);
      assert.equal(Math.round(info.plate + 2 * info.inset), Math.round(info.viewH), "the row's own plate covers the whole row");
      if (width === 1440) {
        // The shared plate glides between rows of different heights, taking each row's own.
        await page.hover("#view");
        await settle(page);
        const tall = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#menu .basalt-plate")).height));
        await page.hover("#copy");
        await settle(page);
        const short = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#menu .basalt-plate")).height));
        assert.equal(Math.round(tall), Math.round(info.plate));
        assert.ok(short < tall - 18, `the plate changes height: ${tall} then ${short}`);
      }
      assert.deepEqual(page.errors, []);
      await page.close();
    });
  }

  test("Select keeps its description to one cut line (menus only)", async () => {
    const page = await open(SELECT_DESCRIBED);
    await settle(page);
    const desc = await page.evaluate(() => { const d = document.querySelector(".basalt-select-popup .basalt-menu-item-description"); return [getComputedStyle(d).whiteSpace, getComputedStyle(d).textOverflow, Math.round(d.getBoundingClientRect().height)]; });
    assert.deepEqual(desc, ["nowrap", "ellipsis", 18]);
    await page.close();
  });
});
