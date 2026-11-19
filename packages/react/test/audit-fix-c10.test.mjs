// The second audit's accessibility findings (A3, DECISIONS 133), the engineering batch c10: each is a documented rule the code did not keep, and each test
// below fails on the code before the fix. Both themes, and 1440 and 390 where it draws.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle, visibleAgainst } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["light", "dark"];

// ---- A3-18: the status bar's message band is part of the page's bottom offset under 720 (WCAG 2.4.11)
const BAR_PAGE = `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)";
function Host() {
  const [message, setMessage] = React.useState(null);
  window.say = (m) => setMessage(m);
  return <><main style={{ padding: "16px 16px 200px" }}>{Array.from({ length: 30 }, (_, i) => <p key={i} style={{ margin: "0 0 12px" }}><a href={"#l" + i} id={"l" + i}>Filler link {i}</a></p>)}</main>
    <B.StatusBar id="bar" start={<a href="#run" id="run">run</a>} message={message} end={<button id="theme">theme</button>} /></>;
}
createRoot(document.getElementById("root")).render(<Host />);`;

for (const theme of THEMES) {
  describe(`A3-18: the status bar's message band does not cover a focused element (${theme})`, () => {
    for (const [width, height, label, message] of [
      [390, 700, "a one-line message", { text: "Saved", id: 1 }],
      [390, 700, "a three-line error", { text: "Could not reach github, so nothing was saved, and the run stays queued until the connection comes back; try again later.", status: "error", id: 2 }],
      [320, 256, "a one-line error at 320 by 256", { text: "Offline", status: "error", id: 3 }],
    ]) {
      test(`${width} by ${height}, ${label}: none of the 31 links is under the bar or the band when it takes focus`, async () => {
        const { page } = await fixturePage(browser, BAR_PAGE, { theme, viewport: { width, height } });
        try {
          await page.locator(".basalt-status-bar").waitFor();
          await page.evaluate((m) => window.say(m), message);
          await settle(page);
          const band = await page.evaluate(() => document.querySelector(".basalt-status-bar-message").getBoundingClientRect().height);
          assert.ok(band > 20, `the message draws a band (${band})`);
          const covered = [];
          for (let i = 0; i < 30; i += 1) {
            const hit = await page.evaluate((id) => {
              const el = document.getElementById(id);
              el.focus();
              const r = el.getBoundingClientRect();
              const top = Math.min(document.querySelector(".basalt-status-bar").getBoundingClientRect().top, document.querySelector(".basalt-status-bar-message").getBoundingClientRect().top);
              return { id, bottom: r.bottom, top };
            }, `l${i}`);
            if (hit.bottom > hit.top + 0.5) covered.push(hit);
          }
          assert.deepEqual(covered, [], "a focused link reaches above the band");
        } finally { await page.close(); }
      });
    }

    test("no message, no band: the offset is the bar's own, and clearing the message returns it", async () => {
      const { page } = await fixturePage(browser, BAR_PAGE, { theme, viewport: { width: 390, height: 700 } });
      try {
        const pad = () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom));
        await page.locator(".basalt-status-bar").waitFor();
        await settle(page);
        const bare = await pad();
        await page.evaluate(() => window.say({ text: "Saved", id: 1 }));
        await settle(page);
        const counted = await pad();
        assert.ok(counted > bare + 20, `the band is counted (${bare}, ${counted})`);
        await page.evaluate(() => window.say(null));
        await settle(page);
        assert.equal(await pad(), bare);
      } finally { await page.close(); }
    });
  });
}

// The settled page under axe's WCAG 2.0 to 2.2 A and AA rules, as the other batches' tests read it.
async function axe(page) {
  await settle(page);
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; document.body.style.cssText = "background: var(--basalt-surface-page); color: var(--basalt-text-primary); margin: 0"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] });
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
}

// What Chromium's own accessibility tree exposes (Playwright's role queries ignore `inert`): [role, name] of every node that is not ignored.
async function exposed(page, ...roles) {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");
    return nodes.filter((node) => !node.ignored && roles.includes(node.role?.value)).map((node) => [node.role.value, node.name?.value ?? ""]);
  } finally { await cdp.detach(); }
}

const render = (jsx, before = "") => `${before}\ncreateRoot(document.getElementById("root")).render(${jsx});`;
const ring = (page, selector) => page.locator(selector).evaluate((el) => { const c = getComputedStyle(el); return { style: c.outlineStyle, width: c.outlineWidth, offset: c.outlineOffset, color: c.outlineColor }; });

// ---- A3-19: a drawer body that overflows and holds nothing focusable is a keyboard stop (WCAG 2.1.1)
const LONG = `Array.from({ length: 40 }, (_, i) => <p key={i} style={{ margin: 0 }}>Log line {i}</p>)`;
const DRAWER = (left, right) => render(`<main style={{ padding: 16 }}><button id="before">Before</button>
  <B.Drawer id="drawer" label="The session and the sources" rows={13}>
    <B.DrawerSection title="Session" actions={<button id="act">Copy</button>}><div id="left">{${left}}</div></B.DrawerSection>
    <B.DrawerSection title="Sources"><div id="right">{${right}}</div></B.DrawerSection>
  </B.Drawer></main>`);

for (const theme of THEMES) {
  describe(`A3-19: the drawer's bodies (${theme})`, () => {
    test("1440: an overflowing body with nothing to focus is a region named by its half's title, reached by Tab, with the control ring; axe finds nothing", async () => {
      const { page } = await fixturePage(browser, DRAWER(LONG, LONG), { theme, viewport: { width: 1440, height: 900 } });
      try {
        await page.locator(".basalt-drawer-body").first().waitFor();
        await page.waitForFunction(() => document.querySelectorAll(".basalt-drawer-body[tabindex]").length === 2);
        const bodies = await page.locator(".basalt-drawer-body").evaluateAll((els) => els.map((el) => ({ tabindex: el.getAttribute("tabindex"), role: el.getAttribute("role"), name: document.getElementById(el.getAttribute("aria-labelledby") ?? "")?.textContent })));
        assert.deepEqual(bodies, [{ tabindex: "0", role: "region", name: "Session" }, { tabindex: "0", role: "region", name: "Sources" }]);
        await page.locator("#act").focus();
        await page.keyboard.press("Tab");
        assert.equal(await page.evaluate(() => document.activeElement?.closest(".basalt-drawer-body") === document.activeElement && document.activeElement.parentElement.querySelector(".basalt-drawer-title").textContent), "Session", "Tab from the head's button lands on the body");
        const outline = await ring(page, ".basalt-drawer-body:focus");
        assert.deepEqual({ style: outline.style, width: outline.width, offset: outline.offset }, { style: "solid", width: "2px", offset: "2px" });
        assert.equal(outline.color, await page.evaluate(() => { const probe = document.createElement("i"); probe.style.color = "var(--basalt-border-focus)"; document.body.append(probe); const color = getComputedStyle(probe).color; probe.remove(); return color; }), "Basalt's ring, not the browser's auto");
        const before = await page.evaluate(() => document.querySelector(".basalt-drawer-body").scrollTop);
        await page.keyboard.press("ArrowDown");
        await page.waitForFunction((was) => document.querySelector(".basalt-drawer-body").scrollTop > was, before, { timeout: 3000 }).catch(() => {});
        assert.ok(await page.evaluate(() => document.querySelector(".basalt-drawer-body").scrollTop) > before, "the arrow keys scroll it");
        assert.deepEqual(await axe(page), []);
      } finally { await page.close(); }
    });

    test("1440: a body that fits, and a body that holds a control, are not stops; the one that overflows alone is", async () => {
      const { page } = await fixturePage(browser, DRAWER(`<p>Two lines</p>`, `[...${LONG}, <button key="b" id="inside">Open</button>]`), { theme, viewport: { width: 1440, height: 900 } });
      try {
        await page.locator(".basalt-drawer-body").first().waitFor();
        await settle(page);
        assert.deepEqual(await page.locator(".basalt-drawer-body").evaluateAll((els) => els.map((el) => el.hasAttribute("tabindex"))), [false, false]);
      } finally { await page.close(); }
    });

    test("1440: a body that grows past its box becomes a stop and one that shrinks stops being one", async () => {
      const { page } = await fixturePage(browser, DRAWER(`<p>One line</p>`, `<p>One line</p>`).replace("<p>One line</p>}</div>", "<p>One line</p>}</div>"), { theme, viewport: { width: 1440, height: 900 } });
      try {
        await page.locator("#left").waitFor();
        assert.equal(await page.locator(".basalt-drawer-body").first().evaluate((el) => el.hasAttribute("tabindex")), false);
        await page.evaluate(() => { document.getElementById("left").append(...Array.from({ length: 40 }, (_, i) => Object.assign(document.createElement("p"), { textContent: `Added ${i}` }))); });
        await page.waitForFunction(() => document.querySelector(".basalt-drawer-body").getAttribute("tabindex") === "0");
        await page.evaluate(() => { document.getElementById("left").replaceChildren(); });
        await page.waitForFunction(() => !document.querySelector(".basalt-drawer-body").hasAttribute("tabindex"));
      } finally { await page.close(); }
    });

    test("390: the halves stack and the page scrolls, so no body is a stop", async () => {
      const { page } = await fixturePage(browser, DRAWER(LONG, LONG), { theme, viewport: { width: 390, height: 800 } });
      try {
        await page.locator(".basalt-drawer-body").first().waitFor();
        await settle(page);
        assert.deepEqual(await page.locator(".basalt-drawer-body").evaluateAll((els) => els.map((el) => el.hasAttribute("tabindex"))), [false, false]);
        assert.deepEqual(await axe(page), []);
      } finally { await page.close(); }
    });
  });

  describe(`A3-19: the sheet's body (${theme})`, () => {
    const SHEET = (body) => render(`<B.Sheet defaultOpen><B.SheetContent side="right">
      <B.SheetHeader closeLabel="Close cart"><B.SheetTitle>Your cart</B.SheetTitle><B.SheetDescription>3 items</B.SheetDescription></B.SheetHeader>
      <B.SheetBody>${body}</B.SheetBody>
      <B.SheetFooter><button type="button" id="review">Review order</button></B.SheetFooter>
    </B.SheetContent></B.Sheet>`);
    for (const [width, height] of [[1440, 900], [390, 700]]) {
      test(`${width}: an overflowing body with nothing to focus is a region named by the sheet's title, with the ring, and needs no tabIndex from the app`, async () => {
        const { page } = await fixturePage(browser, SHEET(`<ul>{Array.from({ length: 80 }, (_, i) => <li key={i}>Line {i}</li>)}</ul>`), { theme, viewport: { width, height } });
        try {
          await page.locator(".basalt-sheet-body").waitFor();
          await page.waitForFunction(() => document.querySelector(".basalt-sheet-body").getAttribute("tabindex") === "0");
          const body = await page.locator(".basalt-sheet-body").evaluate((el) => ({ role: el.getAttribute("role"), name: document.getElementById(el.getAttribute("aria-labelledby") ?? "")?.textContent }));
          assert.deepEqual(body, { role: "region", name: "Your cart" });
          await page.locator(".basalt-sheet-body").focus();
          await page.keyboard.press("Tab");
          await page.locator(".basalt-sheet-body").focus();
          assert.equal((await ring(page, ".basalt-sheet-body:focus-visible")).style, "solid");
          assert.deepEqual(await axe(page), []);
        } finally { await page.close(); }
      });
    }
    test("a body that fits is no stop", async () => {
      const { page } = await fixturePage(browser, SHEET(`<p>Two lines</p>`), { theme, viewport: { width: 1440, height: 900 } });
      try {
        await page.locator(".basalt-sheet-body").waitFor();
        await settle(page);
        assert.equal(await page.locator(".basalt-sheet-body").evaluate((el) => el.hasAttribute("tabindex") || el.hasAttribute("role")), false);
      } finally { await page.close(); }
    });
  });

  // ---- A3-01's gap: a table that overflows has a role and a name, whatever the app gave
  describe(`A3-01's gap: a TableContainer with no label (${theme})`, () => {
    const TABLE = (frame, caption = "") => render(`<div style={{ width: 358, padding: 16 }}><B.TableContainer id="frame" ${frame}><B.Table columns={[{ width: 140 }, { width: 132 }, {}]} minWidth={560}>${caption}<B.TableHeader><B.TableRow><B.TableHead>Region</B.TableHead><B.TableHead>Latency</B.TableHead><B.TableHead>Note</B.TableHead></B.TableRow></B.TableHeader><B.TableBody><B.TableRow><B.TableRowHead>Frankfurt</B.TableRowHead><B.TableCell>128</B.TableCell><B.TableCell>Steady</B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer></div>`);
    const attrs = (page) => page.locator("#frame").evaluate((el) => ({ tabindex: el.getAttribute("tabindex"), role: el.getAttribute("role"), label: el.getAttribute("aria-label") }));
    test("390: with no label the stop is a region named by the table's caption", async () => {
      const { page } = await fixturePage(browser, TABLE("", "<caption>Latency by region</caption>"), { theme, viewport: { width: 390, height: 700 } });
      try {
        await page.waitForFunction(() => document.getElementById("frame").hasAttribute("tabindex"));
        assert.deepEqual(await attrs(page), { tabindex: "0", role: "region", label: "Latency by region" });
        assert.deepEqual(await axe(page), []);
      } finally { await page.close(); }
    });
    test("390: with no label and no caption it is a region named \"Scrollable table\"; its own label and aria-labelledby win", async () => {
      const { page } = await fixturePage(browser, TABLE(""), { theme, viewport: { width: 390, height: 700 } });
      try {
        await page.waitForFunction(() => document.getElementById("frame").hasAttribute("tabindex"));
        assert.deepEqual(await attrs(page), { tabindex: "0", role: "region", label: "Scrollable table" });
      } finally { await page.close(); }
      const own = await fixturePage(browser, TABLE(`label="Runs table"`, "<caption>Latency by region</caption>"), { theme, viewport: { width: 390, height: 700 } });
      try {
        await own.page.waitForFunction(() => document.getElementById("frame").hasAttribute("tabindex"));
        assert.deepEqual(await attrs(own.page), { tabindex: "0", role: "region", label: "Runs table" });
      } finally { await own.page.close(); }
      const by = await fixturePage(browser, TABLE(`aria-labelledby="t"`), { theme, viewport: { width: 390, height: 700 } });
      try {
        await by.page.waitForFunction(() => document.getElementById("frame").hasAttribute("tabindex"));
        assert.deepEqual(await attrs(by.page), { tabindex: "0", role: "region", label: null });
      } finally { await by.page.close(); }
    });
    test("1440: a table that fits is none of this", async () => {
      const { page } = await fixturePage(browser, TABLE(""), { theme, viewport: { width: 1440, height: 900 } });
      try {
        await page.evaluate(() => { document.querySelector("#root > div").style.width = "900px"; });
        await settle(page);
        assert.deepEqual(await attrs(page), { tabindex: null, role: null, label: null });
      } finally { await page.close(); }
    });
  });
}

// ---- A3-20: the time in a chosen listbox option is secondary on the wash (WCAG 1.4.3; foundations: "on a hover or selected wash, tertiary text becomes secondary")
for (const theme of THEMES) {
  describe(`A3-20: the time of a chosen listbox option (${theme})`, () => {
    for (const width of [1440, 390]) {
      test(`${width}: it takes secondary ink on the chosen wash and on the hovered one, and is 4.5:1 or better from pixels`, async () => {
        const { page } = await fixturePage(browser, render(`<div style={{ width: ${Math.min(480, width - 32)}, padding: 16 }}><B.Listbox label="Session" defaultValue="a">
          <B.ListboxOption value="a" leading={<B.EventTime>09:39:11</B.EventTime>}><B.EventText verb="opened" object="the page" /></B.ListboxOption>
          <B.ListboxOption value="b" leading={<B.EventTime>09:38:00</B.EventTime>}><B.EventText verb="read" object="the notes" /></B.ListboxOption>
        </B.Listbox></div>`, `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)";`), { theme, viewport: { width, height: 600 } });
        try {
          await page.locator('[data-value="a"] .basalt-event-time').waitFor();
          await settle(page);
          const colors = await page.evaluate(() => {
            const probe = (value) => { const el = document.createElement("i"); el.style.color = value; document.body.append(el); const c = getComputedStyle(el).color; el.remove(); return c; };
            const time = (v) => getComputedStyle(document.querySelector(`[data-value="${v}"] .basalt-event-time`)).color;
            return { secondary: probe("var(--basalt-text-secondary)"), tertiary: probe("var(--basalt-text-tertiary)"), chosen: time("a"), rest: time("b") };
          });
          assert.equal(colors.chosen, colors.secondary, "the chosen option's time");
          assert.equal(colors.rest, colors.tertiary, "an option at rest keeps tertiary");
          assert.ok(await visibleAgainst(page, page.locator('[data-value="a"] .basalt-event-time')) >= 4.5, "the chosen time reads 4.5:1");
          if (width > 720) {
            await page.locator('[data-value="b"]').hover();
            await settle(page);
            assert.equal(await page.locator('[data-value="b"] .basalt-event-time').evaluate((el) => getComputedStyle(el).color), colors.secondary, "the hovered option's time");
          }
        } finally { await page.close(); }
      });
    }
  });
}

// ---- A3-06 (b): cut cells are measured again when a style sheet lands anywhere (WCAG 1.4.12)
const SPACING = `*, *::before, *::after { letter-spacing: 0.12em !important; word-spacing: 0.16em !important; line-height: 1.5 !important; }`;
const CUT = render(`<div style={{ padding: 16 }}><B.TableContainer label="Runs"><B.Table columns={[{ width: 220 }, {}]} minWidth={480}>
  <B.TableHeader><B.TableRow><B.TableHead>Run</B.TableHead><B.TableHead>Note</B.TableHead></B.TableRow></B.TableHeader>
  <B.TableBody><B.TableRow><B.TableRowHead>Nightly migration backfill</B.TableRowHead><B.TableCell>Steady</B.TableCell></B.TableRow></B.TableBody>
</B.Table></B.TableContainer></div>`, `document.body.style.margin = "0";`);
const cutCount = (page) => page.evaluate(() => document.querySelectorAll("[data-cut]").length);

for (const theme of THEMES) {
  describe(`A3-06 (b): a style sheet outside <head> sets the cut cells to be measured again (${theme})`, () => {
    for (const [where, add] of [
      ["the <html> element", (css) => { const el = document.createElement("style"); el.textContent = css; document.documentElement.append(el); }],
      ["the <body>", (css) => { const el = document.createElement("style"); el.textContent = css; document.body.append(el); }],
      ["a <style> already in <html>, its text changed", (css) => { const el = document.createElement("style"); document.documentElement.append(el); setTimeout(() => { el.textContent = css; }, 50); }],
    ]) {
      test(`1440: spacing set from ${where} cuts a cell, which becomes a focus stop with a plate`, async () => {
        const { page } = await fixturePage(browser, CUT, { theme, viewport: { width: 1440, height: 900 } });
        try {
          await page.locator("table").waitFor();
          await settle(page);
          assert.equal(await cutCount(page), 0, "whole at rest");
          await page.evaluate(`(${add.toString()})(${JSON.stringify(SPACING)})`);
          await page.waitForFunction(() => document.querySelectorAll("[data-cut]").length > 0, null, { timeout: 3000 });
          const cell = page.locator("[data-cut]").first();
          assert.equal(await cell.getAttribute("tabindex"), "0");
          await cell.focus();
          await page.waitForFunction(() => document.querySelector(".basalt-cell-peek")?.hasAttribute("data-open"));
        } finally { await page.close(); }
      });
    }
    test("390: the same at a phone's width", async () => {
      const { page } = await fixturePage(browser, CUT, { theme, viewport: { width: 390, height: 800 } });
      try {
        await page.locator("table").waitFor();
        await settle(page);
        const rest = await cutCount(page);
        await page.evaluate(`(${((css) => { const el = document.createElement("style"); el.textContent = css; document.documentElement.append(el); }).toString()})(${JSON.stringify(SPACING)})`);
        await page.waitForFunction((was) => document.querySelectorAll("[data-cut]").length > was, rest, { timeout: 3000 });
      } finally { await page.close(); }
    });
  });
}

// ---- A3-22: an open-list row a filter turned off is not openable and is exposed as unavailable
const OPEN_LIST = `window.__open = [];
const rows = [["alpha", "Alpha"], ["beta", "Beta"], ["gamma", "Gamma"], ["delta", "Delta"]];
function Work() {
  const [off, setOff] = React.useState(["beta", "gamma"]);
  window.__setOff = setOff;
  return <main style={{ padding: 16, width: 480 }}><button id="before">before</button>
    <B.OpenList label="Work"><B.OpenListGroup label="Work">{rows.map(([id, name]) => <B.OpenListRow key={id} id={id} name={name} opens="record" off={off.includes(id)} onOpen={() => window.__open.push(id)} />)}</B.OpenListGroup></B.OpenList></main>;
}
createRoot(document.getElementById("root")).render(<Work />);`;

for (const theme of THEMES) {
  describe(`A3-22: the open list's filtered rows (${theme})`, () => {
    for (const width of [1440, 390]) {
      test(`${width}: a pointer press, Enter and a screen reader's click do not open an off row, which is aria-disabled; an on row still opens`, async () => {
        const { page } = await fixturePage(browser, OPEN_LIST, { theme, viewport: { width, height: 800 } });
        try {
          await page.locator("[data-open-button]").first().waitFor();
          assert.deepEqual(await page.locator("[data-open-button]").evaluateAll((els) => els.map((el) => el.getAttribute("aria-disabled"))), [null, "true", "true", null]);
          await page.locator('[data-open-row="beta"] [data-open-button]').click({ force: true });
          await page.locator('[data-open-row="beta"] [data-open-button]').evaluate((el) => { el.focus(); });
          await page.keyboard.press("Enter");
          await page.locator('[data-open-row="gamma"] [data-open-button]').evaluate((el) => el.click());
          assert.deepEqual(await page.evaluate(() => window.__open), [], "no off row opened");
          await page.locator('[data-open-row="delta"] [data-open-button]').click({ force: true });
          assert.deepEqual(await page.evaluate(() => window.__open), ["delta"], "an on row opens");
          await page.evaluate(() => window.__setOff([]));
          await page.locator('[data-open-row="beta"] [data-open-button]').click({ force: true });
          assert.deepEqual(await page.evaluate(() => window.__open), ["delta", "beta"], "and a row that is on again opens");
          assert.deepEqual(await page.locator("[data-open-button]").evaluateAll((els) => els.map((el) => el.hasAttribute("aria-disabled"))), [false, false, false, false]);
        } finally { await page.close(); }
      });

      test(`${width}: an off row takes the disabled ink, the not-allowed cursor and no hover step; an on row keeps its ink, its pointer and its hover`, async () => {
        const { page } = await fixturePage(browser, OPEN_LIST, { theme, viewport: { width, height: 800 } });
        try {
          await page.locator("[data-open-button]").first().waitFor();
          await settle(page);
          const probe = (value) => page.evaluate((v) => { const el = document.createElement("i"); el.style.color = v; document.body.append(el); const c = getComputedStyle(el).color; el.remove(); return c; }, value);
          const disabled = await probe("var(--basalt-text-disabled)");
          const read = (id) => page.locator(`[data-open-row="${id}"]`).evaluate((row) => ({
            ink: getComputedStyle(row.querySelector(".basalt-open-button")).color,
            into: getComputedStyle(row.querySelector(".basalt-open-into")).color,
            cursor: getComputedStyle(row.querySelector(".basalt-open-button")).cursor,
            rowCursor: getComputedStyle(row).cursor,
            wash: getComputedStyle(row, "::before").backgroundColor,
          }));
          const off = await read("beta");
          assert.equal(off.ink, disabled, "the name takes the disabled ink");
          assert.equal(off.into, await probe("var(--basalt-text-tertiary)"), "the word at the end keeps tertiary, and takes no lift");
          assert.deepEqual([off.cursor, off.rowCursor], ["not-allowed", "not-allowed"]);
          const on = await read("delta");
          assert.notEqual(on.ink, disabled);
          assert.equal(on.cursor, "pointer");
          if (width > 720) {
            await page.locator('[data-open-row="beta"]').hover();
            await settle(page);
            assert.deepEqual(await read("beta"), off, "no wash and no lift on hover");
            await page.locator('[data-open-row="delta"]').hover();
            await settle(page);
            const lit = await read("delta");
            assert.notEqual(lit.wash, on.wash, "an on row still takes its hover wash");
          }
        } finally { await page.close(); }
      });
    }
  });
}

// ---- A3-25: names, roles and landmarks in the new parts
const landmarks = (page) => page.evaluate(() => [...document.querySelectorAll('section, [role="region"]')].filter((el) => el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby")).map((el) => el.className));

for (const theme of THEMES) {
  describe(`A3-25: CommandBlock and OpenListGroup are not landmarks; PeriodStepper's group has a name (${theme})`, () => {
    test("a command block and an open-list group are named groups, and no region", async () => {
      const { page } = await fixturePage(browser, render(`<main style={{ padding: 16, width: 480 }}>
        <B.CommandBlock command="git status" status="allowed" exit={0}><p>clean</p></B.CommandBlock>
        <B.CommandBlock command="git push" status="403" refused exit={1}><p>refused</p></B.CommandBlock>
        <B.OpenList label="Work"><B.OpenListGroup label="Recent"><B.OpenListRow id="a" name="Alpha" onOpen={() => {}} /></B.OpenListGroup></B.OpenList>
      </main>`), { theme });
      try {
        await page.locator(".basalt-command-block").first().waitFor();
        assert.deepEqual(await landmarks(page), [], "no named section or region");
        assert.deepEqual(await page.getByRole("group").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label") ?? document.getElementById(el.getAttribute("aria-labelledby") ?? "")?.textContent)), ["git status", "git push", "Work", "Recent"]);
        assert.equal(await page.getByRole("region").count(), 0);
        assert.equal(await page.getByRole("group", { name: "git status" }).count(), 1);
        assert.equal(await page.getByRole("group", { name: "Recent" }).count(), 1);
      } finally { await page.close(); }
    });
    test("the period stepper's group is named, by default and by the app", async () => {
      const { page } = await fixturePage(browser, render(`<main style={{ padding: 16 }}>
        <B.PeriodStepper id="a" label="28 Sept to 4 Oct" previousLabel="The week before" nextLabel="The week after" />
        <B.PeriodStepper id="b" aria-label="Semaine" label="5 to 11 Oct" previousLabel="Before" nextLabel="After" />
      </main>`), { theme });
      try {
        await page.locator("#a").waitFor();
        assert.equal(await page.getByRole("group", { name: "Period" }).count(), 1);
        assert.equal(await page.getByRole("group", { name: "Semaine" }).count(), 1);
      } finally { await page.close(); }
    });
  });
}

const PHASE = `import { weightData, calls, lb } from "./test/fixtures/figure-data.ts";
const p = weightData(84);
function Scene() {
  const [week, setWeek] = React.useState(11);
  return <div id="host" style={{ width: window.innerWidth > 720 ? 900 : 340 }}><B.PhaseChart title="Weight over twelve weeks" name="Weight" days={p.days} values={p.values} reasons={p.reasons} calls={calls()} week={week} onWeekChange={setWeek} laneLabel="Choose a week" previousLabel="Previous week" nextLabel="Next week" callName={(i) => "Week " + (i + 1)} statusLine={(i, c) => "Week " + (i + 1) + " " + c.word + ": " + c.text} activateHint="opens its week" summary="Twelve weeks." now={Date.UTC(2026, 10, 10, 12)} format={lb} unit="lb" /></div>;
}
createRoot(document.getElementById("root")).render(<Scene />);`;

for (const theme of THEMES) {
  describe(`A3-25: the phase chart's week buttons speak the new week once (${theme})`, () => {
    test("390: Previous week changes a status that says the week once, and the drawn sentence is hidden from assistive technology", async () => {
      const { page } = await fixturePage(browser, PHASE, { theme, viewport: { width: 390, height: 900 } });
      try {
        await page.locator(".basalt-phase-open").waitFor();
        const status = page.locator(".basalt-phase-open [role=status]");
        assert.equal(await status.count(), 1, "one status");
        const said = async () => (await status.textContent()).trim();
        const first = await said();
        assert.match(first, /^Week 12 /);
        await page.getByRole("button", { name: "Previous week" }).click();
        await page.waitForFunction(() => /^Week 11 /.test(document.querySelector(".basalt-phase-open [role=status]")?.textContent ?? ""), null, { timeout: 3000 });
        assert.notEqual(await said(), first);
        assert.equal(await page.locator(".basalt-phase-open > span:not([role=status]):not([aria-hidden=true])").count(), 0, "every drawn copy of the sentence is hidden from the tree; the status is the one voice");
        assert.equal(await page.locator(".basalt-phase-open > span[aria-hidden=true]").count() > 1, true, "the sentence is still drawn");
      } finally { await page.close(); }
    });
  });

  describe(`A3-25: MarksRow carries its values; a closed "Show all" list has no empty items; CopyButton speaks once (${theme})`, () => {
    test("a labelled marks row is an image described by its values, in order; with no label it is hidden whole as before", async () => {
      const { page } = await fixturePage(browser, render(`<div style={{ width: 300, padding: 16 }}>
        <B.MarksRow id="a" kind="columns" values={[3200, 0, null, 12000]} cap={12000} label="Steps this week" format={(v) => v + " steps"} />
        <B.MarksRow id="b" kind="pills" values={[420, null]} cap={540} label="Nights" />
        <B.MarksRow id="c" kind="blocks" values={[10]} cap={90} />
      </div>`), { theme, viewport: { width: 390, height: 600 } });
      try {
        await page.locator("#a").waitFor();
        const read = (id) => page.locator(id).evaluate((el) => ({ role: el.getAttribute("role"), name: el.getAttribute("aria-label"), described: document.getElementById(el.getAttribute("aria-describedby") ?? "")?.textContent ?? null, hidden: el.getAttribute("aria-hidden") }));
        assert.deepEqual(await read("#a"), { role: "img", name: "Steps this week", described: "3200 steps, 0 steps, not recorded, 12000 steps", hidden: null });
        assert.deepEqual(await read("#b"), { role: "img", name: "Nights", described: "420, not recorded", hidden: null });
        assert.deepEqual(await read("#c"), { role: null, name: null, described: null, hidden: "true" });
        assert.equal(await page.getByRole("img", { name: "Steps this week", description: "3200 steps, 0 steps, not recorded, 12000 steps" }).count(), 1, "the tree gives the description");
      } finally { await page.close(); }
    });

    test("a closed DirectoryList exposes only the rows that show; open, all of them", async () => {
      const { page } = await fixturePage(browser, render(`<main style={{ padding: 16, width: 360 }}><B.DirectoryList title="Projects" shown={2}>
        {["One", "Two", "Three", "Four", "Five"].map((n) => <B.DirectoryRow key={n} href={"#" + n} name={n} />)}
      </B.DirectoryList></main>`), { theme, viewport: { width: 390, height: 800 } });
      try {
        await page.locator(".basalt-directory-list").waitFor();
        await settle(page);
        assert.equal((await exposed(page, "listitem")).length, 2, "no empty list items for the rows that are out of sight");
        await page.getByRole("button", { name: "Show all 5" }).click();
        await page.waitForFunction(() => document.querySelectorAll(".basalt-directory-item[inert]").length === 0, null, { timeout: 3000 });
        assert.equal((await exposed(page, "listitem")).length, 5);
        await page.getByRole("button", { name: "Show fewer" }).click();
        await settle(page);
        assert.equal((await exposed(page, "listitem")).length, 2);
      } finally { await page.close(); }
    });

    test("CopyButton keeps its name and the status alone says it was copied", async () => {
      const { page } = await fixturePage(browser, render(`<main style={{ padding: 16 }}><B.CopyButton text="hello" id="copy">Copy address</B.CopyButton><B.CopyButton text="x" id="own" aria-label="Copy the key">Copy</B.CopyButton></main>`), { theme, viewport: { width: 390, height: 600 } });
      try {
        await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => {} }, configurable: true }); });
        await page.locator("#copy").waitFor();
        assert.equal(await page.getByRole("button", { name: "Copy address" }).count(), 1);
        await page.locator("#copy").click();
        await page.waitForFunction(() => document.querySelector("[role=status]")?.textContent === "Copied to clipboard");
        assert.equal(await page.getByRole("button", { name: "Copy address" }).count(), 1, "the name is as it was while the words say Copied");
        assert.equal(await page.getByRole("button", { name: "Copied" }).count(), 0, "nothing else says Copied");
        assert.equal(await page.locator("#copy .basalt-copy-words [data-on]").textContent(), "Copied", "the words drawn are still Copied");
        assert.equal(await page.getByRole("button", { name: "Copy the key" }).count(), 1, "an aria-label of the app's own stands");
      } finally { await page.close(); }
    });
  });

  describe(`A3-13: a Spinner with a label is announced (${theme})`, () => {
    test("its text is in the status as well as its name, for both variants", async () => {
      const { page } = await fixturePage(browser, render(`<div style={{ padding: 16 }}><B.Spinner label="Loading runs" /><B.Spinner variant="braille" label="Syncing" /><B.Spinner /></div>`), { theme, viewport: { width: 390, height: 600 } });
      try {
        await page.locator(".basalt-spinner").first().waitFor();
        assert.deepEqual(await page.locator('.basalt-spinner[role="status"]').evaluateAll((els) => els.map((el) => ({ text: el.textContent, label: el.getAttribute("aria-label") }))), [{ text: "Loading runs", label: "Loading runs" }, { text: "Syncing", label: "Syncing" }], "its name is kept, and its words are in the status too");
        assert.equal(await page.locator('.basalt-spinner[aria-hidden="true"]').count(), 1, "a spinner with no label is still hidden");
      } finally { await page.close(); }
    });
  });
}

// ---- Outside the lane (A2, from A3's log): after typing in the command menu and clearing, the rows come back in their own order, and "dep" runs Deploy
const GROUPS = `[
  { label: "Sandboxes", commands: [
    { id: "new", label: "New sandbox", onSelect: run("New sandbox") },
    { id: "dup", label: "Duplicate sandbox", onSelect: run("Duplicate sandbox") },
    { id: "del", label: "Delete sandbox", keywords: ["remove"], onSelect: run("Delete sandbox") } ] },
  { label: "Runs", commands: [
    { id: "rerun", label: "Re-run last task", onSelect: run("Re-run last task") },
    { id: "deploy", label: "Deploy", onSelect: run("Deploy") } ] } ]`;
const COMMANDS = {
  menu: `window.ran = []; const run = (n) => () => window.ran.push(n);
    createRoot(document.getElementById("root")).render(<B.CommandMenu open onOpenChange={() => {}} groups={${GROUPS}} />);`,
  list: `window.ran = []; const run = (n) => () => window.ran.push(n);
    createRoot(document.getElementById("root")).render(<div style={{ width: 520, padding: 16 }}><B.CommandList label="Commands" groups={${GROUPS}} /></div>);`,
};
const commandRows = (page) => page.evaluate(() => [...document.querySelectorAll("[cmdk-item]")].filter((r) => r.getBoundingClientRect().height > 0).map((r) => r.textContent.trim().replace(/\s+/g, " ").slice(0, 18) + (r.dataset.selected === "true" ? "*" : "")));
const ORIGINAL = ["New sandbox*", "Duplicate sandbox", "Delete sandbox", "Re-run last task", "Deploy"];

for (const theme of THEMES) {
  describe(`the command menu keeps its order and runs what is lit (${theme})`, () => {
    for (const [kind, width] of [["menu", 1440], ["menu", 390], ["list", 1440], ["list", 390]]) {
      test(`${kind} at ${width}: "dep" lights Deploy above Duplicate, and Enter runs it; after clearing the rows are in their own order and "dep" does it again`, async () => {
        const { page } = await fixturePage(browser, COMMANDS[kind], { theme, viewport: { width, height: 800 } });
        try {
          await page.locator("[cmdk-input]").waitFor();
          await page.locator("[cmdk-input]").focus();
          await page.waitForFunction(() => document.querySelectorAll("[cmdk-item]").length === 5);
          await settle(page);
          assert.deepEqual(await commandRows(page), ORIGINAL);
          await page.keyboard.type("dep");
          await page.waitForFunction(() => document.querySelectorAll("[cmdk-item]").length === 2);
          await settle(page);
          assert.deepEqual(await commandRows(page), ["Deploy*", "Duplicate sandbox"], "the better match is first and lit");
          await page.keyboard.type("x"); // nothing matches "depx"
          await page.keyboard.press("Backspace");
          await page.keyboard.press("Backspace");
          await page.keyboard.press("Backspace");
          await page.keyboard.press("Backspace");
          await page.waitForFunction(() => document.querySelectorAll("[cmdk-item]").length === 5);
          await settle(page);
          assert.deepEqual(await commandRows(page), ORIGINAL, "cleared: the rows are where they were and the first is lit");
          assert.equal(await page.locator("[cmdk-input]").evaluate((el) => document.getElementById(el.getAttribute("aria-activedescendant") ?? "")?.textContent.includes("New sandbox")), true, "and the field names it");
          await page.keyboard.type("dep");
          await page.waitForFunction(() => document.querySelectorAll("[cmdk-item]").length === 2);
          await page.keyboard.press("Enter");
          assert.deepEqual(await page.evaluate(() => window.ran), ["Deploy"]);
        } finally { await page.close(); }
      });
    }
  });
}

// ---- the Terminal's figure is named by its title alone
for (const theme of THEMES) {
  describe(`the Terminal's figure name (${theme})`, () => {
    test("the figure is named by its title, and not by the caption's state and buttons", async () => {
      const { page } = await fixturePage(browser, render(`<div style={{ width: 520, padding: 16 }}><B.Terminal title="Proxy" lines={[{ kind: "command", text: "deploy" }, { kind: "done", text: "ok" }]} status="done" copyable /></div>`), { theme, viewport: { width: 1440, height: 800 } });
      try {
        await page.locator("figure.basalt-terminal").waitFor();
        const names = await exposed(page, "figure");
        assert.deepEqual(names, [["figure", "Proxy"]]);
      } finally { await page.close(); }
    });
  });
}

// ---- Outside the lane (A4): the marks row's height and the range meter's marker take no transition under reduced motion (foundations: no size and no position animates)
for (const theme of THEMES) {
  describe(`reduced motion: MarksRow and RangeMeter (${theme})`, () => {
    const FIXTURE = render(`<div style={{ width: 300, padding: 16 }}><B.MarksRow kind="columns" values={[3, 0, null, 5]} cap={5} label="Steps" /><B.RangeMeter label="Change" value={5} min={0} max={10} plan={[3, 6]} /></div>`);
    const durations = (page) => page.evaluate(() => [".basalt-marks-mark", ".basalt-range-marker"].map((s) => getComputedStyle(document.querySelector(s)).transitionDuration));
    test("390 and 1440: no transition under reduced motion, and the glide stays without it", async () => {
      for (const width of [390, 1440]) {
        const reduced = await fixturePage(browser, FIXTURE, { theme, viewport: { width, height: 600 }, reducedMotion: "reduce" });
        try {
          await reduced.page.locator(".basalt-range-marker").waitFor({ state: "attached" });
          assert.deepEqual(await durations(reduced.page), ["0s", "0s"], `at ${width}, reduced`);
        } finally { await reduced.page.close(); }
        const free = await fixturePage(browser, FIXTURE, { theme, viewport: { width, height: 600 }, reducedMotion: "no-preference" });
        try {
          await free.page.locator(".basalt-range-marker").waitFor({ state: "attached" });
          assert.deepEqual((await durations(free.page)).map((d) => d !== "0s"), [true, true], `at ${width}, the glide is kept`);
        } finally { await free.page.close(); }
      }
    });
  });
}
