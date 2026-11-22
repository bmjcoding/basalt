// Display states (DECISIONS 95): the new-tab cue, row headers, "Not observed", the scroll hint, the choice card, the pressed
// toggle and the pending ring, driven in Chromium against the built package with the real stylesheet. The council decided these;
// the implementation has not been reviewed. Text widths here use the fallback font (no web font loads), so measured margins are wide.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const THEMES = ["dark", "light"];
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const AXE = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };

const open = async (body, options = {}) => {
  const { page, errors } = await fixturePage(browser, body, options);
  await page.evaluate(() => { document.title = "Display states"; document.documentElement.lang = "en"; });
  await page.addStyleTag({ content: "body { margin: 0; background: var(--basalt-surface-page); color: var(--basalt-text-primary); }" });
  await settle(page);
  return { page, errors };
};
/** The colour a CSS expression resolves to, as the browser computes it. */
const colourOf = (page, css) => page.evaluate((value) => { const probe = document.createElement("i"); probe.style.cssText = `forced-color-adjust: none; color: ${value}`; document.body.append(probe); const out = getComputedStyle(probe).color; probe.remove(); return out; }, css);
const fillOf = (page, css) => page.evaluate((value) => { const probe = document.createElement("i"); probe.style.cssText = `forced-color-adjust: none; background-color: ${value}`; document.body.append(probe); const out = getComputedStyle(probe).backgroundColor; probe.remove(); return out; }, css);
const rect = (page, selector, nth = 0) => page.locator(selector).nth(nth).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
const axeViolations = async (page) => {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate((options) => axe.run(document, options).then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)), AXE);
};

// ---- External links ----

const LINKS = `
const { Link, Button, IconButton } = B;
function App() {
  return (
    <div style={{ padding: 24, display: "grid", gap: 12, width: 520, fontSize: 14 }}>
      <p id="prose">Read the <Link id="a-new" href="https://docs.example.test/rotate" target="_blank">key rotation guide</Link> and the <Link id="a-same" href="https://status.example.test">status page</Link>.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Button id="b-new" render={<a href="https://console.example.test" target="_blank" />} nativeButton={false}>Open console</Button>
        <Button id="b-same" render={<a href="https://console.example.test" />} nativeButton={false}>Open console</Button>
        <Button id="b-plain" iconEnd={B.ChevronDownGlyph}>Menu</Button>
        <Button id="b-new-end" iconEnd={B.ChevronDownGlyph} render={<a href="https://console.example.test" target="_blank" />} nativeButton={false}>Docs</Button>
        <Button id="b-xl" size="xl" variant="primary" render={<a href="https://console.example.test" target="_blank" />} nativeButton={false}>Open</Button>
        <IconButton id="i-new" icon={B.ExternalGlyph} label="Open console" render={<a href="https://console.example.test" target="_blank" />} nativeButton={false} />
        <IconButton id="i-same" icon={B.ExternalGlyph} label="Open console" render={<a href="https://console.example.test" />} nativeButton={false} />
        <Link id="a-logo" href="https://example.test" target="_blank"><img alt="Example" width="24" height="24" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" /></Link>
        <Link id="a-xlate" href="https://example.test" target="_blank" newTabLabel="(se abre en una pestaña nueva)">Documentación</Link>
        <Link id="a-label" href="https://example.test" target="_blank" aria-label="Release notes">Notes</Link>
      </div>
    </div>
  );
}
${render("<App />")}`;

describe("external links: the new-tab cue", () => {
  for (const theme of THEMES) {
    test(`${theme}: the arrow and the phrase appear exactly when the target opens a new tab`, async () => {
      const { page, errors } = await open(LINKS, { theme, ...DESKTOP });
      const state = (id) => page.locator(id).evaluate((el) => ({ glyphs: el.querySelectorAll(".basalt-external").length, hidden: el.querySelector(".basalt-external")?.getAttribute("aria-hidden") ?? null, words: [...el.querySelectorAll(".basalt-visually-hidden")].map((n) => n.textContent) }));
      for (const id of ["#a-new", "#b-new", "#b-xl"]) {
        const s = await state(id);
        assert.equal(s.glyphs, 1, `${id} has one arrow`);
        assert.equal(s.hidden, "true", `${id}'s arrow is aria-hidden`);
        assert.deepEqual(s.words, [" (opens in a new tab)"], `${id} says it`);
      }
      for (const id of ["#a-same", "#b-same", "#b-plain", "#i-same"]) {
        assert.deepEqual(await state(id), { glyphs: 0, hidden: null, words: [] }, `${id} opens in the same tab, so it says nothing`);
      }
      // a new-tab Button's trailing slot is the arrow alone: the caret it was given is not drawn
      assert.equal(await page.locator("#b-new-end .basalt-icon").count(), 1);
      assert.equal(await page.locator("#b-new-end .basalt-external").count(), 1);
      assert.equal(await page.locator("#b-plain > .basalt-icon").count(), 1, "a plain button keeps its caret");
      // the accessible name starts with the visible label
      assert.ok(await page.getByRole("link", { name: "key rotation guide (opens in a new tab)", exact: true }).count());
      // Base UI gives a Button rendered as an anchor role="button", so it is found as one
      assert.ok(await page.getByRole("button", { name: "Open console (opens in a new tab)", exact: true }).count());
      assert.ok(await page.getByRole("link", { name: "status page", exact: true }).count());
      // an IconButton gets the phrase in its label and no second glyph
      assert.equal(await page.locator("#i-new").getAttribute("aria-label"), "Open console (opens in a new tab)");
      assert.equal(await page.locator("#i-new .basalt-external").count(), 0);
      assert.equal(await page.locator("#i-same").getAttribute("aria-label"), "Open console");
      // a link that holds only a logo skips the glyph and keeps the phrase
      assert.deepEqual(await state("#a-logo"), { glyphs: 0, hidden: null, words: [" (opens in a new tab)"] });
      assert.ok(await page.getByRole("link", { name: "Example (opens in a new tab)", exact: true }).count());
      // the phrase is one translatable string, and an aria-label carries it in the label itself
      assert.ok(await page.getByRole("link", { name: "Documentación (se abre en una pestaña nueva)", exact: true }).count());
      assert.equal(await page.locator("#a-label").getAttribute("aria-label"), "Release notes (opens in a new tab)");
      // the safe rel is added whether the anchor is a Link or a Button's render element
      for (const id of ["#a-new", "#b-new"]) assert.equal(await page.locator(id).getAttribute("rel"), "noopener noreferrer");
      assert.deepEqual(errors, []);
      await page.close();
    });
  }

  test("the glyph is 16px in running text and Buttons xs to lg and 20px in an xl Button, and is never underlined", async () => {
    const { page } = await open(LINKS, { theme: "light", ...DESKTOP });
    const size = (id) => page.locator(`${id} .basalt-external svg`).evaluate((el) => ({ w: el.getBoundingClientRect().width, display: getComputedStyle(el).display, decoration: getComputedStyle(el).textDecorationLine }));
    assert.deepEqual(await size("#a-new"), { w: 16, display: "inline-block", decoration: "none" });
    assert.equal((await size("#b-new")).w, 16);
    assert.equal((await size("#b-xl")).w, 20);
    // an inline-block is atomic: the link's underline stops at the word, and the glyph's box is not decorated
    assert.equal(await page.locator("#a-new").evaluate((el) => getComputedStyle(el).textDecorationLine), "underline");
    await page.close();
  });

  test("beside text of 20px and up a link's arrow is 20px, and a Button inside such text keeps its own size", async () => {
    const body = `const { Link, Text, Heading, Button } = B;
      ${render(`<div style={{ padding: 16 }}>
        <Text id="sm" size="md"><Link id="l16" href="https://x.test" target="_blank">Guide</Link></Text>
        <Text id="xl" size="xl"><Link id="l20" href="https://x.test" target="_blank">Guide</Link> <Button id="b" size="md" render={<a href="https://x.test" target="_blank" />} nativeButton={false}>Open</Button></Text>
        <Heading id="h" size="2xl"><Link id="h24" href="https://x.test" target="_blank">Guide</Link></Heading>
      </div>`)}`;
    const { page } = await open(body, { theme: "light", ...DESKTOP });
    const width = (id) => page.locator(`${id} .basalt-external svg`).evaluate((el) => el.getBoundingClientRect().width);
    assert.deepEqual([await width("#l16"), await width("#l20"), await width("#h24"), await width("#b")], [16, 20, 20, 16]);
    await page.close();
  });

  test("the arrow never starts a line alone, in a column from 90px to 330px", async () => {
    const { page } = await open(LINKS, { theme: "light", ...DESKTOP });
    const bad = await page.evaluate(() => {
      const host = document.createElement("p");
      host.style.cssText = "font-size: 14px; line-height: 20px; margin: 0; padding: 0; position: absolute; left: 0; top: 0;";
      host.innerHTML = 'Read <a class="basalt-link" id="probe" href="#">the key rotation guide for every region</a> today';
      document.body.append(host);
      const link = host.querySelector("a");
      // the same markup Link renders for a new tab
      link.innerHTML = '<span class="basalt-link-label">the key rotation guide for every region</span><span class="basalt-external" aria-hidden="true">⁠<svg class="basalt-icon" width="16" height="16" viewBox="0 0 24 24"></svg></span>';
      const out = [];
      for (let width = 90; width <= 330; width += 3) {
        host.style.width = `${width}px`;
        const label = link.querySelector(".basalt-link-label").firstChild;
        const range = document.createRange();
        range.setStart(label, label.length - 1);
        range.setEnd(label, label.length);
        const last = range.getBoundingClientRect();
        const arrow = link.querySelector("svg").getBoundingClientRect();
        // the last letter and the arrow share a line: their vertical centres are within one line's half height
        if (Math.abs((last.top + last.bottom) / 2 - (arrow.top + arrow.bottom) / 2) > 10) out.push(width);
      }
      host.remove();
      return out;
    });
    assert.deepEqual(bad, []);
    await page.close();
  });

  for (const theme of THEMES) {
    test(`${theme}: a link's arrow is secondary at rest and lifts to the link's ink on hover and focus; a Button's is its own ink`, async () => {
      const { page } = await open(LINKS, { theme, ...DESKTOP });
      const ink = (id) => page.locator(`${id} .basalt-external`).evaluate((el) => ({ glyph: getComputedStyle(el).color, link: getComputedStyle(el.parentElement).color }));
      await settle(page);
      const rest = await ink("#a-new");
      assert.equal(rest.glyph, await colourOf(page, "var(--basalt-text-secondary)"));
      assert.equal(rest.link, await colourOf(page, "var(--basalt-text-primary)"));
      await page.locator("#a-new").hover();
      await settle(page);
      let lit = await ink("#a-new");
      assert.equal(lit.glyph, lit.link, "hover lifts the arrow to the link's ink");
      await page.mouse.move(0, 0);
      await settle(page);
      assert.equal((await ink("#a-new")).glyph, rest.glyph);
      await page.keyboard.press("Tab");
      await page.locator("#a-new").focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await settle(page);
      lit = await ink("#a-new");
      assert.equal(lit.glyph, lit.link, "focus lifts it too");
      const button = await ink("#b-new");
      assert.equal(button.glyph, button.link, "in a Button the arrow is the Button's own ink");
      await page.close();
    });
  }

  test("forced colours: the arrow is LinkText in a link and the Button's own colour in a Button", async () => {
    const { page } = await open(LINKS, { theme: "light", ...DESKTOP });
    await page.emulateMedia({ forcedColors: "active" });
    await settle(page);
    const colours = await page.evaluate(() => Object.fromEntries(["#a-new", "#b-new"].map((id) => { const el = document.querySelector(id); const glyph = el.querySelector(".basalt-external"); return [id, [getComputedStyle(glyph).color, getComputedStyle(el).color]]; })));
    for (const [id, [glyph, own]] of Object.entries(colours)) assert.equal(glyph, own, `${id}: the arrow follows its link or button through currentColor`);
    assert.equal(colours["#a-new"][1], await colourOf(page, "LinkText"));
    await page.close();
  });

  test("in a still-table cell the label truncates and the arrow stays whole", async () => {
    const body = `const { Link, Table, TableContainer, TableHeader, TableBody, TableRow, TableHead, TableCell } = B;
      ${render(`<div style={{ width: 300, padding: 16 }}><TableContainer><Table columns={[{ width: 120 }, {}]}><TableHeader><TableRow><TableHead>Region</TableHead><TableHead>Note</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Sydney</TableCell><TableCell><Link href="https://example.test" target="_blank">A very long note label that cannot fit in this column</Link></TableCell></TableRow></TableBody></Table></TableContainer></div>`)}`;
    const { page } = await open(body, { theme: "dark", ...DESKTOP });
    const cell = await page.locator("tbody td").nth(1).evaluate((el) => el.getBoundingClientRect().right);
    const arrow = await rect(page, ".basalt-external svg");
    assert.equal(arrow.width, 16, "the arrow is whole");
    assert.ok(arrow.right <= cell - 15, `the arrow ends inside the cell's padding (${arrow.right} of ${cell})`);
    const label = await page.locator(".basalt-link-label").evaluate((el) => ({ clipped: el.scrollWidth > el.clientWidth, overflow: getComputedStyle(el).textOverflow }));
    assert.deepEqual(label, { clipped: true, overflow: "ellipsis" });
    await page.close();
  });
});

// ---- Table additions ----

const TABLE = (state = "") => `
const { Table, TableContainer, TableHeader, TableBody, TableRow, TableHead, TableRowHead, TableCell, TableScrollHint } = B;
function App() {
  const [wide, setWide] = React.useState(false);
  window.setWide = setWide;
  return (
    <div style={{ width: ${state.includes("narrow") ? 358 : 700}, padding: 16 }}>
      <TableContainer id="frame">
        <Table columns={[{ width: 140 }, { width: 132 }, { width: 132 }, {}]} minWidth={wide ? 760 : 0} ${state.includes("pinned") ? "pinned={1}" : ""}>
          <TableHeader><TableRow><TableHead>Region</TableHead><TableHead numeric>Latency</TableHead><TableHead numeric>Errors</TableHead><TableHead>Note</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow id="r1"><TableRowHead>Frankfurt</TableRowHead><TableCell numeric>128</TableCell><TableCell numeric>0</TableCell><TableCell>Steady</TableCell></TableRow>
            <TableRow id="r2"><TableRowHead>Sydney</TableRowHead><TableCell numeric notObserved /><TableCell numeric notObserved /><TableCell>No probe</TableCell></TableRow>
            <TableRow id="r3" selected><TableRowHead>Tokyo</TableRowHead><TableCell numeric>96</TableCell><TableCell numeric notObserved /><TableCell></TableCell></TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <TableScrollHint id="hint" />
    </div>
  );
}
${render("<App />")}`;

describe("table: row headers, not observed, the scroll hint", () => {
  for (const theme of THEMES) {
    test(`${theme}: a row header is a th scope="row" at 500 on the row's own fill, with no band`, async () => {
      const { page } = await open(TABLE(), { theme, ...DESKTOP });
      const info = await page.locator("#r1 th").evaluate((el) => { const s = getComputedStyle(el); const td = getComputedStyle(el.nextElementSibling); return { tag: el.tagName, scope: el.getAttribute("scope"), weight: s.fontWeight, size: s.fontSize, line: s.lineHeight, color: s.color, align: s.textAlign, bg: s.backgroundColor, padding: s.paddingLeft, height: s.height, tdHeight: td.height, tdWeight: td.fontWeight, tdPadding: td.paddingLeft, shadow: s.boxShadow, tdShadow: td.boxShadow }; });
      assert.deepEqual({ tag: info.tag, scope: info.scope, weight: info.weight, size: info.size, line: info.line, align: info.align }, { tag: "TH", scope: "row", weight: "500", size: "13px", line: "18px", align: "start" });
      assert.equal(info.color, await colourOf(page, "var(--basalt-text-primary)"));
      assert.equal(info.tdWeight, "400", "data cells stay 400");
      assert.equal(info.bg, "rgba(0, 0, 0, 0)", "no band: the row's own fill shows through");
      assert.equal(info.padding, info.tdPadding);
      assert.equal(info.height, info.tdHeight);
      assert.equal(info.shadow, info.tdShadow, "the cell's divider");
      assert.notEqual(info.bg, await fillOf(page, "var(--basalt-surface-sunken-strong)"));
      assert.equal(await page.locator("#r1 th .basalt-sort").count(), 0, "a row header does not sort");
      // the hover wash runs through the row header: it paints no fill of its own, so the row's wash is what shows
      await page.locator("#r1").hover();
      await settle(page);
      assert.equal(await page.locator("#r1 th").evaluate((el) => getComputedStyle(el).backgroundColor), "rgba(0, 0, 0, 0)");
      assert.equal(await page.locator("#r1").evaluate((el) => getComputedStyle(el).backgroundColor), await fillOf(page, "var(--basalt-state-hover)"));
      await page.close();
    });

    test(`${theme}: pinned, the row header is the pinned column and opaque at rest, hovered and selected`, async () => {
      const { page } = await open(TABLE("pinned narrow"), { theme, ...DESKTOP });
      await page.locator("#frame").evaluate((el) => { el.scrollLeft = 200; });
      await settle(page);
      const opaque = (colour) => !/\/\s*[\d.]+%?\s*\)/.test(colour) && !/^rgba\(.*,\s*0?\.\d+\)$/.test(colour) && colour !== "rgba(0, 0, 0, 0)";
      for (const row of ["#r1", "#r3"]) {
        for (const hover of [false, true]) {
          if (hover) await page.locator(row).hover({ position: { x: 40, y: 10 } }); else await page.mouse.move(0, 0);
          await settle(page);
          const bg = await page.locator(`${row} th`).evaluate((el) => { const s = getComputedStyle(el); return { position: s.position, colour: s.backgroundColor, left: el.getBoundingClientRect().left, frame: el.closest(".basalt-table-container").getBoundingClientRect().left }; });
          assert.equal(bg.position, "sticky");
          assert.ok(opaque(bg.colour), `${row} hover ${hover}: ${bg.colour}`);
          assert.ok(Math.abs(bg.left - bg.frame - 1) < 2, "it stays at the container's start while scrolled");
        }
      }
      await page.close();
    });

    test(`${theme}: "Not observed" is tertiary, lifts to secondary on the hover and selected washes, and ends on the numbers' edge`, async () => {
      const { page } = await open(TABLE(), { theme, ...DESKTOP });
      const cell = (row, col) => page.locator(`${row} td`).nth(col);
      const colour = (row, col) => cell(row, col).evaluate((el) => getComputedStyle(el).color);
      assert.equal(await cell("#r2", 0).textContent(), "Not observed");
      assert.equal(await colour("#r2", 0), await colourOf(page, "var(--basalt-text-tertiary)"));
      assert.equal(await colour("#r1", 0), await colourOf(page, "var(--basalt-text-primary)"), "zero stays the digit in primary");
      assert.equal(await cell("#r1", 1).textContent(), "0");
      assert.equal(await cell("#r3", 2).textContent(), "", "an empty string stays blank");
      assert.equal(await colour("#r3", 1), await colourOf(page, "var(--basalt-text-secondary)"), "on the selected wash it lifts");
      await page.locator("#r2").hover();
      await settle(page);
      assert.equal(await colour("#r2", 0), await colourOf(page, "var(--basalt-text-secondary)"), "on the hover wash it lifts");
      // no mark: the cell holds the words and nothing else
      assert.equal(await cell("#r2", 0).evaluate((el) => el.children.length), 0);
      // the words end where the numbers end
      const edges = await page.evaluate(() => {
        const end = (td) => { const range = document.createRange(); range.selectNodeContents(td); return range.getBoundingClientRect().right; };
        const rows = [...document.querySelectorAll("tbody tr")];
        return { number: end(rows[0].children[1]), words: end(rows[1].children[1]), sel: end(rows[2].children[1]) };
      });
      assert.ok(Math.abs(edges.words - edges.number) < 0.6, `words end ${edges.words}, numbers ${edges.number}`);
      await page.close();
    });
  }

  test("the scroll hint shows only while the table overflows, says the table's column count, and moves every header 0px", async () => {
    const { page } = await open(TABLE(), { theme: "light", ...DESKTOP });
    const hint = page.locator("#hint");
    assert.equal(await hint.isHidden(), true, "a table that fits has no hint");
    const headers = () => page.evaluate(() => [...document.querySelectorAll("thead th")].map((th) => { const r = th.getBoundingClientRect(); const label = document.createRange(); label.selectNodeContents(th); return { x: r.x, y: r.y, w: r.width, h: r.height, inset: label.getBoundingClientRect().left - r.x }; }));
    const rows = () => page.evaluate(() => [...document.querySelectorAll("tbody tr")].map((tr) => tr.getBoundingClientRect().height));
    const before = { headers: await headers(), rows: await rows() };
    await page.evaluate(() => window.setWide(true));
    await page.locator("#hint:not([hidden])").waitFor();
    assert.equal((await hint.textContent()).trim(), "Scroll sideways to see all 4 columns");
    const after = { headers: await headers(), rows: await rows() };
    // only the one remainder column (the last) takes the rest, so its width follows the table's minimum; every other number is identical
    for (const [i, from] of before.headers.entries()) {
      const to = after.headers[i];
      assert.equal(to.x, from.x, `header ${i} start`);
      assert.equal(to.y, from.y, `header ${i} top`);
      assert.equal(to.h, from.h, `header ${i} height`);
      assert.equal(to.inset, from.inset, `header ${i} label inset`);
      if (i < before.headers.length - 1) assert.equal(to.w, from.w, `header ${i} width`);
    }
    assert.deepEqual(after.rows, before.rows);
    const style = await hint.evaluate((el) => { const s = getComputedStyle(el); return { size: s.fontSize, line: s.lineHeight, color: s.color, aria: el.getAttribute("aria-hidden"), below: el.getBoundingClientRect().top >= document.querySelector("#frame").getBoundingClientRect().bottom }; });
    assert.deepEqual({ size: style.size, line: style.line, aria: style.aria, below: style.below }, { size: "12px", line: "16px", aria: "true", below: true });
    assert.equal(style.color, await colourOf(page, "var(--basalt-text-tertiary)"));
    // scrolling changes nothing about it
    const text = await hint.textContent();
    const box = await rect(page, "#hint");
    await page.locator("#frame").evaluate((el) => { el.scrollLeft = 300; });
    await page.waitForTimeout(100);
    assert.equal(await hint.textContent(), text);
    assert.deepEqual(await rect(page, "#hint"), box);
    await page.evaluate(() => window.setWide(false));
    await page.locator("#hint[hidden]").waitFor({ state: "attached" });
    await page.close();
  });

  test("at 390 the table is still: pinned and scrolling, with the hint, and no column hidden", async () => {
    const { page } = await open(TABLE("pinned narrow wide"), { theme: "dark", ...PHONE });
    await page.evaluate(() => window.setWide(true));
    await page.locator("#hint:not([hidden])").waitFor();
    assert.equal(await page.locator("thead th").count(), 4);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "the page does not scroll sideways");
    await page.close();
  });
});

// ---- The choice card ----

const CARDS = `
const { ChoiceCard, ChoiceCardGroup, Card, Text } = B;
${render(`<div style={{ padding: 16, display: "grid", gap: 16, width: 640 }}>
  <ChoiceCardGroup aria-label="Plan" id="plans">
    <ChoiceCard id="plan-a" name="plan" value="a" title="Starter" description="For trying it out"><Text tone="tertiary" size="sm">Up to 3 projects</Text></ChoiceCard>
    <ChoiceCard id="plan-b" name="plan" value="b" title="Team" description="For a group" defaultChecked />
    <ChoiceCard id="plan-c" name="plan" value="c" title="Scale" description="For many" />
  </ChoiceCardGroup>
  <ChoiceCardGroup multiple aria-label="Regions" id="regions">
    <ChoiceCard multiple id="reg-a" name="reg" value="a" title="Frankfurt" description="eu-central" />
    <ChoiceCard multiple id="reg-b" name="reg" value="b" title="Sydney" description="ap-southeast" />
  </ChoiceCardGroup>
</div>`)}`;
const card = (id) => `label:has(> #${id})`;

describe("the choice card", () => {
  for (const theme of THEMES) {
    test(`${theme}: it is a native radio or checkbox in a card, and choosing moves no title and changes no rim or level`, async () => {
      const { page, errors } = await open(CARDS, { theme, ...DESKTOP });
      assert.equal(await page.locator("#plan-a").getAttribute("type"), "radio");
      assert.equal(await page.locator("#reg-a").getAttribute("type"), "checkbox");
      assert.equal(await page.locator("#plans").getAttribute("role"), "radiogroup");
      assert.equal(await page.locator("#regions").getAttribute("role"), "group");
      assert.ok(await page.getByRole("radio", { name: "Starter" }).count());
      assert.ok(await page.getByRole("checkbox", { name: "Frankfurt" }).count());
      // the name is the title, the description is its description
      assert.equal(await page.locator("#plan-a").evaluate((el) => el.getAttribute("aria-describedby") !== null), true);
      const snapshot = (id) => page.locator(card(id)).evaluate((el) => { const title = el.querySelector(".basalt-card-title"); const t = title.getBoundingClientRect(); const s = getComputedStyle(el); const ts = getComputedStyle(title); return { title: { x: t.x, y: t.y, w: t.width }, level: el.getAttribute("data-level"), rim: [s.borderTopColor, s.borderLeftColor, s.borderTopWidth], radius: s.borderRadius, titleColour: ts.color, titleWeight: ts.fontWeight, box: el.getBoundingClientRect().height }; });
      const before = await snapshot("plan-a");
      assert.equal(before.level, "1");
      // clicking anywhere on the card chooses it: here, its description
      await page.locator(`${card("plan-a")} .basalt-card-description`).click();
      assert.equal(await page.locator("#plan-a").isChecked(), true);
      assert.equal(await page.locator("#plan-b").isChecked(), false, "one of many");
      await settle(page);
      assert.deepEqual(await snapshot("plan-a"), before, "choosing moves no title, and changes no rim, level, radius, title ink or weight");
      // any of many: independent
      await page.locator(`${card("reg-a")} .basalt-card-title`).click();
      await page.locator(`${card("reg-b")} .basalt-card-title`).click();
      assert.deepEqual(await page.evaluate(() => [document.querySelector("#reg-a").checked, document.querySelector("#reg-b").checked]), [true, true]);
      assert.equal(await page.evaluate(() => document.activeElement.id), "reg-b");
      assert.deepEqual(errors, []);
      await page.close();
    });

    test(`${theme}: selected is one solid fill at the card's own level, hover is the wash alone, and tertiary content steps up`, async () => {
      const { page } = await open(CARDS, { theme, ...DESKTOP });
      const paint = (id) => page.locator(card(id)).evaluate((el) => { const s = getComputedStyle(el); const probe = document.createElement("i"); probe.style.backgroundColor = "var(--basalt-plate)"; el.append(probe); const plate = getComputedStyle(probe).backgroundColor; probe.remove(); return { bg: s.backgroundColor, image: s.backgroundImage, plate, veil: getComputedStyle(el, "::before").opacity }; });
      const rest = await paint("plan-a");
      const chosen = await paint("plan-b");
      assert.equal(chosen.bg, chosen.plate, "the plate recipe, one solid colour");
      assert.equal(chosen.image, "none");
      assert.ok(!/\/|rgba/.test(chosen.bg), `opaque: ${chosen.bg}`);
      assert.notEqual(rest.bg, chosen.bg);
      assert.equal(chosen.veil, "0");
      await page.locator(card("plan-a")).hover({ position: { x: 20, y: 60 } });
      await settle(page);
      assert.equal((await paint("plan-a")).veil, "1", "hover on an unselected card is the hover wash");
      assert.equal((await paint("plan-a")).bg, rest.bg, "and nothing else changes");
      await page.locator(card("plan-b")).hover({ position: { x: 20, y: 60 } });
      await settle(page);
      assert.equal((await paint("plan-b")).veil, "0", "a selected card takes no further step");
      assert.equal((await paint("plan-b")).bg, chosen.bg);
      // no press scale
      await page.mouse.down();
      assert.equal(await page.locator(card("plan-b")).evaluate((el) => getComputedStyle(el).transform), "none");
      await page.mouse.up();
      // tertiary content steps to secondary on the fill
      await page.locator(card("plan-a")).click({ position: { x: 20, y: 10 } });
      await settle(page);
      assert.equal(await page.locator(`${card("plan-a")} .basalt-text`).evaluate((el) => getComputedStyle(el).color), await colourOf(page, "var(--basalt-text-secondary)"));
      await page.close();
    });

    test(`${theme}: the seat is reserved on every card, the box is the checked control's look, and focus is the ring at +2`, async () => {
      const { page } = await open(CARDS, { theme, ...DESKTOP });
      const box = (id) => page.locator(`${card(id)} .basalt-choice-card-box`).evaluate((el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); const c = el.closest("label").getBoundingClientRect(); const t = el.closest("label").querySelector(".basalt-card-title").getBoundingClientRect(); return { w: r.width, h: r.height, bg: s.backgroundColor, shadow: s.boxShadow, radius: s.borderRadius, endGap: c.right - r.right, beforeTitle: r.left > t.left }; });
      const empty = await box("plan-a");
      const checked = await box("plan-b");
      assert.deepEqual([empty.w, empty.h, checked.w, checked.h], [16, 16, 16, 16]);
      assert.equal(empty.endGap, checked.endGap, "the seat is where it is whether or not it is chosen");
      assert.equal(empty.shadow.includes("0px 0px 0px 1px"), true, "empty: the input boundary");
      assert.equal(checked.bg, await fillOf(page, "var(--basalt-action-primary)"), "checked: exactly the checked control");
      assert.equal(checked.shadow, "none");
      assert.ok(parseFloat(empty.radius) >= 8, `a radio's box is round (${empty.radius})`);
      const checkbox = await page.locator(`${card("reg-a")} .basalt-choice-card-box`).evaluate((el) => getComputedStyle(el).borderRadius);
      assert.equal(checkbox, "4px");
      // focus: the control ring, outside the card
      await page.locator("#plan-a").focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      // a radio group takes one tab stop, on its chosen radio
      assert.equal(await page.evaluate(() => document.activeElement.id), "plan-b");
      const ring = await page.locator(card("plan-b")).evaluate((el) => { const s = getComputedStyle(el); return { width: s.outlineWidth, style: s.outlineStyle, offset: s.outlineOffset, colour: s.outlineColor }; });
      assert.deepEqual({ width: ring.width, style: ring.style, offset: ring.offset }, { width: "2px", style: "solid", offset: "2px" });
      assert.equal(ring.colour, await colourOf(page, "var(--basalt-border-focus)"));
      // the radios are one native group: an arrow key moves the choice
      await page.keyboard.press("ArrowDown");
      assert.equal(await page.evaluate(() => document.activeElement.id), "plan-c");
      assert.equal(await page.locator("#plan-c").isChecked(), true);
      await page.close();
    });
  }

  test("forced colours: the wash drops, the card keeps Canvas with a CanvasText edge, and the checked box is Highlight", async () => {
    const { page } = await open(CARDS, { theme: "dark", ...DESKTOP });
    await page.emulateMedia({ forcedColors: "active" });
    await settle(page);
    const state = await page.locator(card("plan-b")).evaluate((el) => { const s = getComputedStyle(el); const box = getComputedStyle(el.querySelector(".basalt-choice-card-box")); const dot = getComputedStyle(el.querySelector(".basalt-choice-card-dot")); return { bg: s.backgroundColor, edge: s.borderTopColor, veil: getComputedStyle(el, "::before").display, box: box.backgroundColor, dot: dot.backgroundColor, dotOpacity: dot.opacity }; });
    assert.equal(state.bg, await fillOf(page, "Canvas"));
    assert.equal(state.edge, await colourOf(page, "CanvasText"));
    assert.equal(state.veil, "none");
    assert.equal(state.box, await fillOf(page, "Highlight"));
    assert.equal(state.dot, await fillOf(page, "HighlightText"));
    assert.equal(state.dotOpacity, "1", "the checked box keeps its mark");
    const empty = await page.locator(`${card("plan-a")} .basalt-choice-card-box`).evaluate((el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, border: s.borderTopColor, width: s.borderTopWidth }; });
    assert.deepEqual(empty, { bg: await fillOf(page, "Canvas"), border: await colourOf(page, "ButtonText"), width: "1px" });
    await page.close();
  });

  for (const theme of THEMES) {
    test(`${theme}: axe finds nothing, at rest and under reduced motion`, async () => {
      const { page } = await open(CARDS, { theme, ...DESKTOP });
      assert.deepEqual(await axeViolations(page), []);
      await page.emulateMedia({ reducedMotion: "reduce" });
      const fade = await page.locator(card("plan-a")).evaluate((el) => getComputedStyle(el).transitionDuration);
      assert.equal(fade, "0.1s", "the same 100ms fade under reduced motion");
      await page.close();
    });
  }
});

// ---- The pressed toggle ----

const TOGGLES = `
const { Button, IconButton, Card } = B;
function App() {
  const [on, setOn] = React.useState(false);
  return (
    <Card style={{ margin: 16, padding: 16, width: 640, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <Button id="t-sec" pressed={on} onClick={() => setOn(!on)}>Notifications</Button>
      <Button id="t-sec-off" pressed={false}>Notifications</Button>
      <Button id="t-ghost" variant="ghost" pressed={on} onClick={() => setOn(!on)}>Notifications</Button>
      <Button id="t-ghost-off" variant="ghost" pressed={false}>Notifications</Button>
      <Button id="t-icon" variant="secondary" icon={B.NotificationsGlyph} pressed={on}>Alerts</Button>
      <IconButton id="t-ib" icon={B.NotificationsGlyph} label="Alerts" variant="secondary" pressed={on} />
      <IconButton id="t-ib-ghost" icon={B.NotificationsGlyph} label="Alerts" pressed={on} />
      <Button id="t-primary" variant="primary" {...{ pressed: true }}>Deploy</Button>
      <Button id="t-danger" variant="danger" {...{ pressed: true }}>Delete</Button>
      <Button id="t-plain">Plain</Button>
    </Card>
  );
}
${render("<App />")}`;
const el = (page, id, fn, arg) => page.locator(id).evaluate(fn, arg);

describe("the pressed toggle", () => {
  for (const theme of THEMES) {
    test(`${theme}: aria-pressed, the check only on text toggles, never on primary or danger, and one width pressed or not`, async () => {
      const { page, errors } = await open(TOGGLES, { theme, ...DESKTOP });
      for (const id of ["#t-sec", "#t-ghost", "#t-icon", "#t-ib", "#t-ib-ghost"]) assert.equal(await page.locator(id).getAttribute("aria-pressed"), "false", id);
      for (const id of ["#t-primary", "#t-danger", "#t-plain"]) assert.equal(await page.locator(id).getAttribute("aria-pressed"), null, `${id} does not toggle`);
      const seat = (id) => page.locator(`${id} .basalt-button-check`).count();
      assert.deepEqual([await seat("#t-sec"), await seat("#t-ghost")], [1, 1]);
      for (const id of ["#t-icon", "#t-ib", "#t-ib-ghost", "#t-primary", "#t-danger", "#t-plain"]) assert.equal(await seat(id), 0, `${id} carries no check`);
      // pressed and unpressed toggles of one label are the same width
      for (const [on, off] of [["#t-sec", "#t-sec-off"], ["#t-ghost", "#t-ghost-off"]]) {
        const before = await rect(page, on);
        const ref = await rect(page, off);
        assert.equal(before.width, ref.width);
        await page.locator(on).click();
        await page.mouse.move(0, 0);
        await settle(page);
        assert.equal(await page.locator(on).getAttribute("aria-pressed"), "true");
        assert.equal((await rect(page, on)).width, before.width, `${on}: pressing moves no width`);
        assert.equal((await rect(page, on)).height, before.height);
        await page.locator(on).click();
        await page.mouse.move(0, 0);
      }
      assert.deepEqual(errors, []);
      await page.close();
    });

    test(`${theme}: pressed is the selected plate as one solid fill at the level, primary ink, the check swapped in, and no weight change`, async () => {
      const { page } = await open(TOGGLES, { theme, ...DESKTOP });
      const paint = (id) => page.locator(id).evaluate((node) => { const s = getComputedStyle(node); const probe = document.createElement("i"); probe.style.backgroundColor = "var(--basalt-plate)"; node.parentElement.append(probe); const plate = getComputedStyle(probe).backgroundColor; probe.remove(); const seat = node.querySelector(".basalt-button-check .basalt-icon"); return { bg: s.backgroundColor, image: s.backgroundImage, colour: s.color, weight: s.fontWeight, radius: s.borderRadius, shadow: s.boxShadow, plate, check: seat ? getComputedStyle(seat).opacity : null }; });
      const secOff = await paint("#t-sec");
      const ghostOff = await paint("#t-ghost");
      assert.equal(secOff.check, "0");
      assert.equal(ghostOff.colour, await colourOf(page, "var(--basalt-text-secondary)"));
      await page.locator("#t-sec").click();
      await page.mouse.move(0, 0);
      await settle(page);
      const sec = await paint("#t-sec");
      const ghost = await paint("#t-ghost");
      for (const [name, on, off] of [["secondary", sec, secOff], ["ghost", ghost, ghostOff]]) {
        assert.equal(on.bg, on.plate, `${name}: the plate`);
        assert.equal(on.image, "none", `${name}: never a layered wash`);
        assert.equal(on.colour, await colourOf(page, "var(--basalt-text-primary)"), `${name}: the label steps to primary`);
        assert.equal(on.weight, off.weight, `${name}: no weight change`);
        assert.equal(on.radius, off.radius, `${name}: the radius does not change`);
        assert.equal(on.check, "1", `${name}: the check shows`);
      }
      assert.ok(sec.shadow.includes(await colourOf(page, "var(--basalt-border-hover)")), "a secondary's hairline steps to border-hover");
      assert.notEqual(ghost.bg, ghostOff.bg, "a ghost gains its rectangle");
      // the momentary press stays Button's: .98 while held, and the fill stays the plate
      await page.locator("#t-sec").hover();
      await page.mouse.down();
      await settle(page);
      assert.equal(await el(page, "#t-sec", (n) => getComputedStyle(n).transform), "matrix(0.98, 0, 0, 0.98, 0, 0)");
      assert.equal((await paint("#t-sec")).bg, sec.plate);
      await page.mouse.up();
      await page.close();
    });

    test(`${theme}: an icon toggle shows the plate, the ink step and the glyph's selected form, with no check`, async () => {
      const { page } = await open(TOGGLES, { theme, ...DESKTOP });
      const glyph = (id) => page.locator(`${id} svg`).first().evaluate((svg) => svg.innerHTML.length);
      const off = await glyph("#t-ib");
      await page.locator("#t-sec").click();
      await page.mouse.move(0, 0);
      await settle(page);
      assert.notEqual(await glyph("#t-ib"), off, "the glyph's selected form is drawn");
      assert.equal(await el(page, "#t-ib-ghost", (n) => getComputedStyle(n).color), await colourOf(page, "var(--basalt-text-primary)"));
      await page.close();
    });

    test(`${theme}: axe finds nothing`, async () => {
      const { page } = await open(TOGGLES, { theme, ...DESKTOP });
      await page.locator("#t-sec").click();
      assert.deepEqual(await axeViolations(page), []);
      await page.close();
    });
  }

  test("on the page itself a pressed toggle takes the page's own plate: about #e8e8e8 in light, the next level plus the wash in dark", async () => {
    const body = `const { Button } = B; ${render(`<div style={{ padding: 16 }}><Button id="p" pressed>Mute</Button></div>`)}`;
    for (const [theme, expected] of [["light", [232, 232, 232]], ["dark", null]]) {
      const { page } = await open(body, { theme, ...DESKTOP });
      const bg = await page.locator("#p").evaluate((n) => getComputedStyle(n).backgroundColor);
      // Read as painted (the plate is the token plate-0 now, written in oklch, so its computed text is not rgb()).
      const painted = (css) => page.evaluate((value) => { const c = document.createElement("canvas"); c.width = c.height = 1; const x = c.getContext("2d"); x.fillStyle = value; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3); }, css);
      const rgb = await painted(bg);
      if (expected) rgb.forEach((c, i) => assert.ok(Math.abs(c - expected[i]) <= 1, `${theme}: ${bg}`));
      else assert.deepEqual(rgb, await painted(await fillOf(page, "color-mix(in srgb, var(--basalt-neutral-100) 9%, var(--basalt-surface-1))")), "dark: unchanged");
      assert.ok(!/\/|rgba/.test(bg), `opaque: ${bg}`);
      await page.close();
    }
  });

  test("forced colours: a pressed toggle is Highlight with HighlightText on first render, after a click, and while hovered", async () => {
    const { page } = await open(TOGGLES, { theme: "dark", ...DESKTOP });
    await page.emulateMedia({ forcedColors: "active" });
    const check = async (id, when) => {
      const s = await page.locator(id).evaluate((node) => { const label = node.querySelector(".basalt-button-label") ?? node; const seat = node.querySelector(".basalt-button-check svg"); return { bg: getComputedStyle(node).backgroundColor, label: getComputedStyle(label).color, seat: seat ? getComputedStyle(seat).color : null, icon: node.querySelector(":scope > .basalt-icon") ? getComputedStyle(node.querySelector(":scope > .basalt-icon")).color : null }; });
      assert.equal(s.bg, await fillOf(page, "Highlight"), `${id} ${when}: fill`);
      assert.equal(s.label, await colourOf(page, "HighlightText"), `${id} ${when}: label`);
      if (s.seat) assert.equal(s.seat, await colourOf(page, "HighlightText"), `${id} ${when}: check`);
      if (s.icon) assert.equal(s.icon, await colourOf(page, "HighlightText"), `${id} ${when}: glyph`);
    };
    await page.locator("#t-sec").click();
    await page.mouse.move(0, 0);
    await settle(page);
    for (const id of ["#t-sec", "#t-ghost", "#t-ib", "#t-icon"]) await check(id, "after a click");
    for (const id of ["#t-sec", "#t-ghost"]) { await page.locator(id).hover(); await settle(page); await check(id, "hovered"); }
    // an unpressed toggle is not Highlight
    assert.notEqual(await el(page, "#t-sec-off", (n) => getComputedStyle(n).backgroundColor), await fillOf(page, "Highlight"));
    // and on first render
    const fresh = await open(TOGGLES.replace("useState(false)", "useState(true)"), { theme: "light", ...DESKTOP });
    await fresh.page.emulateMedia({ forcedColors: "active" });
    await settle(fresh.page);
    assert.equal(await el(fresh.page, "#t-sec", (n) => getComputedStyle(n).backgroundColor), await fillOf(fresh.page, "Highlight"));
    await fresh.page.close();
    await page.close();
  });

  test("reduced motion: the check swaps with a 100ms crossfade and the .98 scale is gone", async () => {
    const { page } = await open(TOGGLES, { theme: "dark", ...DESKTOP });
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await page.locator("#t-sec .basalt-button-check .basalt-icon").evaluate((n) => getComputedStyle(n).transitionDuration), "0.1s");
    await page.locator("#t-sec").hover();
    await page.mouse.down();
    await settle(page);
    assert.equal(await el(page, "#t-sec", (n) => getComputedStyle(n).transform), "none");
    await page.mouse.up();
    await page.close();
  });
});

// ---- Badges ----

const BADGES = (width) => `
const { Badge, BadgePair, Spinner } = B;
${render(`<div style={{ padding: 16, width: ${width}, display: "grid", gap: 12, fontSize: 13 }}>
  <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Badge id="pend" status="pending">In review</Badge><Badge id="ok" status="success">Ready</Badge><Badge id="plain" status="pending" variant="plain">Queued</Badge><Spinner variant="braille" /></div>
  <BadgePair id="pair" name={<span id="pair-name">sleep-trends-weekly-summary</span>} status={<Badge id="p-status" status="pending">In review</Badge>} fact={<Badge id="p-fact">Synthetic data</Badge>} />
  <BadgePair id="pair-short" name={<span id="short-name">billing</span>} status={<Badge id="s-status" status="success">Ready</Badge>} fact={<Badge id="s-fact">Demo</Badge>} />
</div>`)}`;

describe("badges: pending, and two on one object", () => {
  for (const theme of THEMES) {
    test(`${theme}: pending is a hollow 6px ring in the word's ink, aria-hidden, with the word spoken`, async () => {
      const { page } = await open(BADGES(600), { theme, ...DESKTOP });
      for (const id of ["#pend", "#plain"]) {
        const ring = await page.locator(`${id} .basalt-badge-dot`).evaluate((dot) => { const s = getComputedStyle(dot); const r = dot.getBoundingClientRect(); return { aria: dot.getAttribute("aria-hidden"), w: r.width, h: r.height, border: s.borderTopWidth, style: s.borderTopStyle, colour: s.borderTopColor, bg: s.backgroundColor, ink: getComputedStyle(dot.parentElement).color, radius: s.borderRadius, shadow: s.boxShadow }; });
        assert.equal(ring.aria, "true");
        assert.deepEqual([ring.w, ring.h, ring.border, ring.style, ring.bg, ring.shadow], [6, 6, "1px", "solid", "rgba(0, 0, 0, 0)", "none"]);
        assert.equal(ring.colour, ring.ink, `${id}: the word's own ink`);
      }
      assert.equal(await el(page, "#pend .basalt-badge-dot", (n) => getComputedStyle(n).borderTopColor), await colourOf(page, "var(--basalt-text-secondary)"));
      // the filled dot beside it stays filled, and the ring needs none of it
      assert.notEqual(await el(page, "#ok .basalt-badge-dot", (n) => getComputedStyle(n).backgroundColor), "rgba(0, 0, 0, 0)");
      assert.equal(await page.locator("#pend").evaluate((n) => n.textContent), "In review", "the word is the text; the ring adds none");
      assert.ok(await page.getByText("In review", { exact: true }).first().count());
      await page.close();
    });
  }

  test("forced colours: the pending ring survives as a CanvasText border", async () => {
    const { page } = await open(BADGES(600), { theme: "dark", ...DESKTOP });
    await page.emulateMedia({ forcedColors: "active" });
    await settle(page);
    const ring = await page.locator("#pend .basalt-badge-dot").evaluate((n) => { const s = getComputedStyle(n); return { colour: s.borderTopColor, width: s.borderTopWidth, style: s.borderTopStyle }; });
    assert.deepEqual(ring, { colour: await colourOf(page, "CanvasText"), width: "1px", style: "solid" });
    await page.close();
  });

  test("the pair sits space-2 after the name and apart, and moves under the name as a unit when it doesn't fit", async () => {
    const wide = await open(BADGES(700), { theme: "light", ...DESKTOP });
    const geometry = async (page) => {
      const name = await rect(page, "#pair-name");
      const status = await rect(page, "#p-status");
      const fact = await rect(page, "#p-fact");
      return { name, status, fact };
    };
    const w = await geometry(wide.page);
    assert.equal(w.status.x - w.name.right, 8, "space-2 after the name");
    assert.equal(w.fact.x - w.status.right, 8, "space-2 apart");
    assert.ok(Math.abs(w.name.y + w.name.height / 2 - (w.status.y + w.status.height / 2)) < 6, "one line");
    const widths = [w.status.width, w.fact.width];
    await wide.page.close();
    // 390: name, status and fact cannot share a line
    const narrow = await open(BADGES(262), { theme: "light", ...PHONE });
    const n = await geometry(narrow.page);
    assert.ok(n.status.y >= n.name.bottom - 1, "the pair is under the name");
    assert.equal(n.status.y, n.fact.y, "and stays together on one row");
    assert.equal(n.fact.x - n.status.right, 8);
    assert.equal(n.status.x, n.name.x, "the pair starts at the name's start edge");
    assert.deepEqual([n.status.width, n.fact.width], widths, "a badge never truncates");
    const clipped = await narrow.page.locator("#p-status, #p-fact").evaluateAll((els) => els.map((e) => e.scrollWidth > e.clientWidth));
    assert.deepEqual(clipped, [false, false]);
    // short names fit beside the pair
    const short = await rect(narrow.page, "#short-name");
    const shortStatus = await rect(narrow.page, "#s-status");
    assert.ok(Math.abs(short.y + short.height / 2 - (shortStatus.y + shortStatus.height / 2)) < 6);
    // DOM order is the spoken order: the name, the status, the fact
    assert.equal(await narrow.page.locator("#pair").evaluate((n) => n.textContent), "sleep-trends-weekly-summaryIn reviewSynthetic data");
    await narrow.page.close();
  });

  for (const theme of THEMES) {
    test(`${theme}: axe finds nothing`, async () => {
      const { page } = await open(BADGES(600), { theme, ...DESKTOP });
      assert.deepEqual(await axeViolations(page), []);
      await page.close();
    });
  }
});

describe("links and tables: axe", () => {
  for (const theme of THEMES) {
    test(`${theme}: axe finds nothing in the new-tab links or the table with row headers`, async () => {
      const links = await open(LINKS, { theme, ...DESKTOP });
      assert.deepEqual(await axeViolations(links.page), []);
      await links.page.close();
      const table = await open(TABLE("pinned"), { theme, ...DESKTOP });
      assert.deepEqual(await axeViolations(table.page), []);
      await table.page.close();
    });
  }
});
