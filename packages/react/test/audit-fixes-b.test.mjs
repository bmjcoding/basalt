// The second audit fix batch (stream components-nov14, audit findings A3-01, A3-02, A3-03, A2-03, A3-05, A3-17, A3-07, A2-10, A3-08,
// A2-14, A4-01's focus half, A5-01 and A4-13). Each restores behaviour foundations or a WCAG 2.2 A or AA criterion already commits to,
// with no pixel changed at rest, and each test below fails on the commit before the fix. Synthetic data only.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import * as esbuild from "esbuild";

import { bundleFixture, fixturePage, launch, pkg, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const THEMES = ["light", "dark"];
const frames = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

// ---- A3-01: a table that scrolls sideways is a named keyboard stop ----

const TABLE = (props = "", width = 300, extra = "") => render(`<div style={{ width: ${width} }} id="host"><B.TableContainer ${props}><B.Table columns={[{ width: 200 }, { width: 200 }, {}]} minWidth={640}><B.TableHeader><B.TableRow><B.TableHead>Name</B.TableHead><B.TableHead>Region</B.TableHead><B.TableHead>Status</B.TableHead></B.TableRow></B.TableHeader><B.TableBody><B.TableRow><B.TableCell>Run one</B.TableCell><B.TableCell>Frankfurt</B.TableCell><B.TableCell>Done</B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer></div>${extra}`);

for (const theme of THEMES) {
  describe(`A3-01 table region (${theme})`, () => {
    test("a table wider than its box is a stop with a role and a name, and the arrow keys scroll it", async () => {
      const { page } = await fixturePage(browser, TABLE('label="Runs table"'), { theme });
      await page.waitForFunction(() => document.querySelector(".basalt-table-container").tabIndex === 0);
      const region = page.getByRole("region", { name: "Runs table" });
      assert.equal(await region.count(), 1, "named region");
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement?.className), "basalt-table-container", "Tab lands on the container");
      const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return { style: s.outlineStyle, width: s.outlineWidth, offset: s.outlineOffset }; });
      assert.deepEqual(ring, { style: "solid", width: "2px", offset: "2px" }, "Basalt's control ring, not the browser's");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(() => document.querySelector(".basalt-table-container").scrollLeft > 0, null, { timeout: 3000 }); // the key's scroll is smooth
      await page.close();
    });

    test("a table that fits is not a stop, and gets no role", async () => {
      const { page } = await fixturePage(browser, TABLE('label="Runs table"', 1000), { theme });
      await frames(page);
      assert.deepEqual(await page.evaluate(() => { const el = document.querySelector(".basalt-table-container"); return { tabindex: el.getAttribute("tabindex"), role: el.getAttribute("role"), label: el.getAttribute("aria-label") }; }), { tabindex: null, role: null, label: null });
      await page.evaluate(() => { document.getElementById("host").style.width = "300px"; });
      await page.waitForFunction(() => document.querySelector(".basalt-table-container").tabIndex === 0);
      await page.evaluate(() => { document.getElementById("host").style.width = "1000px"; });
      await page.waitForFunction(() => !document.querySelector(".basalt-table-container").hasAttribute("tabindex"));
      await page.close();
    });

    test("with no name it is still a stop (the scroll must be reachable), a region named \"Scrollable table\" (A3-01's gap, batch c10); aria-label works as a name", async () => {
      const { page } = await fixturePage(browser, TABLE(""), { theme });
      await page.waitForFunction(() => document.querySelector(".basalt-table-container").tabIndex === 0);
      assert.deepEqual(await page.evaluate(() => { const el = document.querySelector(".basalt-table-container"); return { role: el.getAttribute("role"), label: el.getAttribute("aria-label") }; }), { role: "region", label: "Scrollable table" });
      await page.close();
      const named = await fixturePage(browser, TABLE('aria-label="Fleet"'), { theme });
      await named.page.waitForFunction(() => document.querySelector(".basalt-table-container").tabIndex === 0);
      assert.equal(await named.page.getByRole("region", { name: "Fleet" }).count(), 1);
      await named.page.close();
    });
  });
}

// ---- A3-02: the phone tab bar never covers the focused element ----

for (const theme of THEMES) {
  test(`A3-02 focus is never under the tab bar (${theme})`, async () => {
    const links = Array.from({ length: 40 }, (_, i) => `<a key="${i}" href="#l${i}" style={{ display: "block", padding: "10px 0" }}>Filler link ${i + 1}</a>`).join("");
    const { page } = await fixturePage(browser, render(`<B.AppShell brand="Basalt" brandLabel="Home" sidebar={<div />} header={<B.AppHeader title="Runs" />} tabBar={<B.TabBar><B.TabBarItem icon={B.HomeGlyph} href="#home" current>Home</B.TabBarItem><B.TabBarItem icon={B.MessagesGlyph} href="#messages">Messages</B.TabBarItem><B.TabBarItem icon={B.TrendsGlyph} href="#trends">Trends</B.TabBarItem></B.TabBar>}>${links}</B.AppShell>`), { theme, viewport: { width: 390, height: 700 } });
    const covered = [];
    const walk = async (key) => {
      for (let i = 0; i < 44; i += 1) {
        await page.keyboard.press(key);
        await page.evaluate(() => new Promise((resolve) => { let last = -1; let still = 0; const tick = () => { const y = scrollY; still = y === last ? still + 1 : 0; last = y; if (still >= 3) resolve(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); }));
        const hit = await page.evaluate(() => {
          const el = document.activeElement; const bar = document.querySelector(".basalt-tabbar");
          if (!el || bar.contains(el) || el === document.body) return null;
          const a = el.getBoundingClientRect(); const b = bar.getBoundingClientRect();
          return a.bottom > b.top + 0.5 && a.top < b.bottom ? { text: el.textContent, bottom: a.bottom, barTop: b.top } : false;
        });
        if (hit) covered.push(hit);
      }
    };
    await page.keyboard.press("Tab");
    await walk("Tab");
    await walk("Shift+Tab");
    assert.deepEqual(covered, [], "no focused link ever sits under the bar");
    const padding = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom));
    assert.ok(padding >= 56, `scroll-padding-bottom is at least the bar's 56px (${padding})`);
    await page.close();
  });
}

// ---- A3-03 and A2-03: the command menu's field names the lit row; the lazy list keeps focus ----

const MENU = `import * as React from "react"; import { createRoot } from "react-dom/client"; import * as B from "./dist/index.js";
  const GROUPS = [{ label: "Sandbox", commands: [{ id: "new", label: "New sandbox" }, { id: "dep", label: "Deploy sandbox" }, { id: "dup", label: "Duplicate sandbox" }, { id: "del", label: "Delete sandbox" }] }];
  function App() { const [o, s] = React.useState(false); return <><button id="trigger" onClick={() => s(true)}>Commands</button><B.CommandMenu open={o} onOpenChange={s} groups={GROUPS} /></>; }
  createRoot(document.getElementById("root")).render(<App />);`;

for (const theme of THEMES) {
  test(`A3-03 CommandMenu: the field names the lit row at every moment (${theme})`, async () => {
    const { page } = await fixturePage(browser, MENU, { theme });
    await page.click("#trigger");
    await page.waitForSelector("[cmdk-item]");
    const read = () => page.evaluate(() => {
      const field = document.querySelector(".basalt-command-input");
      const lit = document.querySelector("[cmdk-item][data-selected='true']");
      const named = field.getAttribute("aria-activedescendant");
      return { named, lit: lit?.id ?? null, text: lit?.textContent ?? null, target: named ? document.getElementById(named)?.textContent ?? "MISSING" : null };
    });
    const expectSynced = async (step, text) => {
      await frames(page);
      const now = await read();
      assert.ok(now.lit, `${step}: a row is lit`);
      assert.equal(now.named, now.lit, `${step}: the field names the lit row (${JSON.stringify(now)})`);
      if (text) assert.match(now.target, text, step);
    };
    await expectSynced("on open", /New sandbox/);
    await page.keyboard.type("dep");
    await expectSynced("after typing", /Deploy/);
    await page.locator(".basalt-command-input").fill("");
    await expectSynced("after clearing", /New sandbox/);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expectSynced("after arrowing", /Duplicate/);
    await page.keyboard.type("del");
    await expectSynced("after arrowing then typing", /Delete|Deploy/); // whichever cmdk lights, the field names it
    await page.locator(".basalt-command-input").fill("");
    await expectSynced("after clearing again");
    await page.keyboard.press("Enter");
    await page.close();
  });
}

const controlled = async (body) => {
  const built = await esbuild.build({
    stdin: { contents: `import * as React from "react"; import { createRoot } from "react-dom/client"; import * as B from "./dist/index.js";
      window.__loadPanel = () => new Promise((resolve) => { window.__release = () => resolve(import("./dist/command-panel.js")); });
      ${body}`, resolveDir: pkg, loader: "tsx" },
    bundle: true, format: "iife", write: false, jsx: "automatic", platform: "browser", logLevel: "silent", define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "controlled-panel-import", setup(build) {
      build.onLoad({ filter: /dist[\\/][^\\/]*\.js$/ }, (args) => {
        const source = fs.readFileSync(args.path, "utf8");
        if (!source.includes('import("./command-panel.js")')) return undefined;
        return { contents: source.replace('import("./command-panel.js")', "window.__loadPanel()"), loader: "js" };
      });
    } }],
  });
  return built.outputFiles[0].text;
};

for (const theme of THEMES) {
  describe(`A2-03 the lazy CommandList keeps focus (${theme})`, () => {
    const LIST = `<><button id="other">Elsewhere</button><B.CommandList label="Console" groups={[{ label: "Tasks", commands: [{ id: "one", label: "One" }, { id: "two", label: "Two" }] }]} /></>`;
    const open = async () => {
      const script = await controlled(render(LIST));
      const page = await browser.newPage();
      page.setDefaultTimeout(5000);
      await page.setContent(`<html data-theme="${theme}"><head><style>${fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8")}</style></head><body><div id="root"></div></body></html>`);
      await page.addScriptTag({ content: script });
      await page.waitForSelector(".basalt-command-input");
      return page;
    };
    test("the field that had focus while typing still has it when cmdk arrives, and typing goes on", async () => {
      const page = await open();
      await page.focus(".basalt-command-input");
      await page.keyboard.type("One");
      await page.evaluate(() => window.__release());
      await page.waitForSelector("[cmdk-item]");
      assert.equal(await page.evaluate(() => document.activeElement?.className), "basalt-command-input", "the panel's field has focus");
      await page.keyboard.type("x");
      assert.equal(await page.inputValue(".basalt-command-input"), "Onex", "the next key lands in the search");
      await page.close();
    });
    test("focus that was somewhere else is left there", async () => {
      const page = await open();
      await page.focus(".basalt-command-input");
      await page.keyboard.type("One");
      await page.focus("#other");
      await page.evaluate(() => window.__release());
      await page.waitForSelector("[cmdk-item]");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "other");
      await page.close();
    });
  });
}

// ---- A3-05: an open modal leaves nothing outside it operable by assistive technology ----

for (const theme of THEMES) {
  test(`A3-05 a morphing button and a slider behind an open dialog are hidden from assistive technology (${theme})`, async () => {
    const { page } = await fixturePage(browser, render(`<main><B.Button><B.TextMorph text="Continue" /></B.Button><B.Stepper steps={[{ id: "a", label: "Step one" }, { id: "b", label: "Step two" }]} value="a" onValueChange={() => {}} /><B.Slider label="Volume" defaultValue={30} /><B.Dialog><B.DialogTrigger render={<B.Button>Delete sandbox</B.Button>} /><B.DialogContent><B.DialogTitle>Delete?</B.DialogTitle><B.DialogDescription>Gone.</B.DialogDescription><B.DialogActions><B.DialogClose render={<B.Button>Cancel</B.Button>} /></B.DialogActions></B.DialogContent></B.Dialog></main>`), { theme });
    await page.getByRole("button", { name: "Delete sandbox" }).click();
    await page.getByRole("dialog").waitFor();
    await settle(page);
    const exposed = await page.evaluate(() => {
      const modal = document.querySelector("[role=dialog]");
      return [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=slider], [role=button]")]
        .filter((el) => !modal.contains(el) && !el.closest("[aria-hidden=true], [inert]"))
        .map((el) => `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") ?? el.textContent).trim().slice(0, 20)}"`);
    });
    assert.deepEqual(exposed, [], "every control outside the dialog is hidden from assistive technology");
    // The slider's printed value is aria-hidden and carries no live region of its own.
    assert.equal(await page.evaluate(() => document.querySelectorAll(".basalt-progress-value[aria-live]").length), 0);
    // What the label still tells a screen reader is unchanged: one polite live region with the whole string, once the modal is gone.
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await settle(page);
    assert.equal(await page.evaluate(() => document.querySelectorAll("button[inert], input[inert]").length), 0, "no control stays inert after the dialog closes");
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Delete sandbox", "and the trigger took focus back");
    assert.equal(await page.evaluate(() => document.querySelector(".basalt-text-morph [aria-live]")?.getAttribute("aria-live")), "polite");
    assert.equal(await page.getByRole("button", { name: "Continue" }).count(), 1, "the button is operable again");
    await page.close();
  });
}

for (const theme of THEMES) {
  test(`A3-05 a dialog that is not modal leaves the page usable (${theme})`, async () => {
    const { page } = await fixturePage(browser, render(`<main><B.Button id="outside">Outside</B.Button><B.Dialog modal={false}><B.DialogTrigger render={<B.Button>Open</B.Button>} /><B.DialogContent><B.DialogTitle>Note</B.DialogTitle><B.DialogDescription>Not modal.</B.DialogDescription></B.DialogContent></B.Dialog></main>`), { theme });
    await page.getByRole("button", { name: "Open" }).click();
    await page.getByRole("dialog").waitFor();
    await settle(page);
    assert.equal(await page.evaluate(() => document.querySelectorAll("#outside[inert]").length), 0, "nothing is made inert for a dialog that is not modal");
    await page.close();
  });

  test(`A3-05 a Sheet, an AlertDialog and the CommandMenu leave nothing outside them reachable either (${theme})`, async () => {
    const jsx = `<main><B.Button><B.TextMorph text="Continue" /></B.Button><B.Sheet><B.SheetTrigger render={<B.Button>Sheet</B.Button>} /><B.SheetContent><B.SheetTitle>Settings</B.SheetTitle><B.SheetDescription>Body</B.SheetDescription></B.SheetContent></B.Sheet><B.AlertDialog><B.AlertDialogTrigger render={<B.Button>Alert</B.Button>} /><B.AlertDialogContent><B.AlertDialogTitle>Sure?</B.AlertDialogTitle><B.AlertDialogDescription>Really.</B.AlertDialogDescription><B.AlertDialogActions><B.AlertDialogCancel render={<B.Button>No</B.Button>} /></B.AlertDialogActions></B.AlertDialogContent></B.AlertDialog></main>`;
    const { page } = await fixturePage(browser, render(jsx), { theme });
    const exposed = () => page.evaluate(() => { const modal = document.querySelector("[role=dialog], [role=alertdialog]"); return [...document.querySelectorAll("button, a[href], input")].filter((el) => !modal.contains(el) && !el.closest("[aria-hidden=true], [inert]")).map((el) => el.textContent.trim()); });
    await page.getByRole("button", { name: "Sheet" }).click(); await page.getByRole("dialog").waitFor(); await settle(page);
    assert.deepEqual(await exposed(), [], "sheet");
    await page.keyboard.press("Escape"); await page.getByRole("dialog").waitFor({ state: "hidden" }); await settle(page);
    await page.getByRole("button", { name: "Alert" }).click(); await page.getByRole("alertdialog").waitFor(); await settle(page);
    assert.deepEqual(await exposed(), [], "alert dialog");
    await page.close();
  });
}

// ---- A3-17: on touch, a table's lone checkbox or link has a 44px hit box that draws nothing ----

for (const theme of THEMES) {
  test(`A3-17 a cell's checkbox and link have 44px hit boxes on a coarse pointer, and nothing drawn moves (${theme})`, async () => {
    const jsx = render(`<B.TableContainer label="Runs table"><B.Table columns={[{ width: 56 }, { width: 120 }, {}]}><B.TableHeader><B.TableRow><B.TableHead><B.Checkbox aria-label="Select all" /></B.TableHead><B.TableHead>Name</B.TableHead><B.TableHead>Region</B.TableHead></B.TableRow></B.TableHeader><B.TableBody><B.TableRow><B.TableCell><B.Checkbox aria-label="Select run one" /></B.TableCell><B.TableCell><B.Link href="#one">Run one</B.Link></B.TableCell><B.TableCell>Frankfurt</B.TableCell></B.TableRow><B.TableRow><B.TableCell><B.Checkbox aria-label="Select run two" /></B.TableCell><B.TableCell><B.Link href="#two">Run two</B.Link></B.TableCell><B.TableCell>Sydney</B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer>`);
    const { page } = await fixturePage(browser, jsx, { theme, hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    const measure = (selector) => page.evaluate((selector) => {
      const el = document.querySelector(selector);
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
      const owns = (x, y) => { const hit = document.elementFromPoint(x, y); return !!hit && (hit === el || el.contains(hit)); };
      const reach = (dx, dy) => { let d = 0; while (d < 80 && owns(cx + dx * (d + 1), cy + dy * (d + 1))) d += 1; return d; };
      const textRange = document.createRange(); textRange.selectNodeContents(el);
      return { width: reach(-1, 0) + reach(1, 0) + 1, height: reach(0, -1) + reach(0, 1) + 1, drawn: [Math.round(r.width), Math.round(r.height)], rowHeight: el.closest("tr").getBoundingClientRect().height, textTop: Math.round(textRange.getBoundingClientRect().top - el.closest("tr").getBoundingClientRect().top), ring: getComputedStyle(el).outlineOffset };
    }, selector);
    const row = await measure("tbody tr:first-child .basalt-checkbox");
    assert.ok(row.width >= 44 && row.height >= 44, `row checkbox hit box ${row.width}x${row.height}`);
    assert.deepEqual(row.drawn, [16, 16], "the drawn checkbox keeps its size");
    const head = await measure("thead .basalt-checkbox");
    assert.ok(head.width >= 44 && head.height >= 44, `header checkbox hit box ${head.width}x${head.height}`);
    const link = await measure("tbody tr:first-child a");
    assert.ok(link.height >= 44, `link hit box height ${link.height}`);
    assert.equal(row.rowHeight, 44, "rows stay 44px");
    assert.equal(await page.evaluate(() => document.querySelector("thead tr").getBoundingClientRect().height), 44, "the header row stays 44px");
    // The text sits where it sat: on the same line as the plain text beside it, in the 44px row.
    const plain = await page.evaluate(() => { const td = document.querySelector("tbody tr:first-child td:last-child"); const range = document.createRange(); range.selectNodeContents(td); return Math.round(range.getBoundingClientRect().top - td.closest("tr").getBoundingClientRect().top); });
    assert.equal(link.textTop, plain, `the link's text is at the same height in its row as the text beside it (${link.textTop} against ${plain})`);
    const lineWidth = await page.evaluate(() => { const a = document.querySelector("tbody tr:first-child a"); const r = document.createRange(); r.selectNodeContents(a); return Math.round(r.getBoundingClientRect().left - a.closest("td").getBoundingClientRect().left); });
    assert.equal(lineWidth, 16, "and starts at the cell's own 16px padding");
    await page.close();
  });
}

// ---- A3-07: horizontal tabs' underline follows the selected tab when the direction changes ----

for (const theme of THEMES) {
  describe(`A3-07 right-to-left tabs (${theme})`, () => {
    const TABS = render(`<B.Tabs defaultValue="b"><B.TabsList aria-label="Sections"><B.Tab value="a">Alpha</B.Tab><B.Tab value="b">Beta tab</B.Tab><B.Tab value="c">Gamma</B.Tab></B.TabsList></B.Tabs>`);
    const under = (page) => page.evaluate(() => {
      const tab = document.querySelector("[role=tab][aria-selected=true]").getBoundingClientRect();
      const bar = document.querySelector(".basalt-tabs-indicator").getBoundingClientRect();
      return { tab: [Math.round(tab.left), Math.round(tab.right)], bar: [Math.round(bar.left), Math.round(bar.right)] };
    });
    test("with dir flipped to rtl after the tabs mounted, the underline is under the selected tab", async () => {
      const { page } = await fixturePage(browser, TABS, { theme, viewport: { width: 700, height: 300 } });
      await settle(page);
      await page.evaluate(() => { document.documentElement.dir = "rtl"; });
      await page.waitForFunction(() => { const t = document.querySelector("[role=tab][aria-selected=true]").getBoundingClientRect(); const b = document.querySelector(".basalt-tabs-indicator").getBoundingClientRect(); return Math.abs(t.left - b.left) < 1.5 && Math.abs(t.right - b.right) < 1.5; }, null, { timeout: 3000 }).catch(() => {});
      await settle(page);
      const pos = await under(page);
      assert.deepEqual(pos.bar, pos.tab, `underline ${pos.bar} under tab ${pos.tab}`);
      await page.evaluate(() => { document.documentElement.dir = "ltr"; });
      await page.waitForTimeout(100); await settle(page);
      const back = await under(page);
      assert.deepEqual(back.bar, back.tab, "and back again");
      await page.close();
    });
    test("rtl from the start is under the selected tab, and stays there when another is chosen", async () => {
      const { page } = await fixturePage(browser, `document.documentElement.dir = "rtl"; ${TABS}`, { theme, viewport: { width: 700, height: 300 } });
      await settle(page);
      let pos = await under(page);
      assert.deepEqual(pos.bar, pos.tab);
      await page.getByRole("tab", { name: "Gamma" }).click();
      await settle(page);
      pos = await under(page);
      assert.deepEqual(pos.bar, pos.tab);
      await page.close();
    });
  });
}

// ---- A2-10: a numeric column's header and cells share one alignment edge in right-to-left ----

for (const theme of THEMES) {
  for (const dir of ["rtl", "ltr"]) {
    test(`A2-10 numeric header and cells share an edge (${dir}, ${theme})`, async () => {
      const { page } = await fixturePage(browser, render(`<div dir="${dir}" style={{ width: 390 }}><B.TableContainer label="Counts"><B.Table columns={[{}, { width: 140 }]} minWidth={390}><B.TableHeader><B.TableRow><B.TableHead>Name</B.TableHead><B.TableHead numeric onSortChange={() => {}}>Count</B.TableHead></B.TableRow></B.TableHeader><B.TableBody><B.TableRow><B.TableCell>One</B.TableCell><B.TableCell numeric>123</B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer></div>`), { theme });
      const edges = await page.evaluate(() => {
        const label = document.querySelector("th[data-numeric] .basalt-sort-label").getBoundingClientRect();
        const td = document.querySelector("td[data-numeric]"); const range = document.createRange(); range.selectNodeContents(td); const number = range.getBoundingClientRect();
        const name = document.querySelector("thead th:first-child"); const nameCell = document.querySelector("tbody td:first-child");
        return { label: [label.left, label.right], number: [number.left, number.right], headAlign: getComputedStyle(name).textAlign, cellAlign: getComputedStyle(nameCell).textAlign };
      });
      const edge = (pair) => (dir === "rtl" ? pair[0] : pair[1]);
      assert.ok(Math.abs(edge(edges.label) - edge(edges.number)) < 1, JSON.stringify(edges));
      assert.equal(edges.headAlign, dir === "rtl" ? "right" : "left", "a header starts at the start edge"); assert.equal(edges.cellAlign, "start");
      await page.close();
    });
  }
}

// ---- A3-08: focusable code and transcript regions have a role to go with their name ----

for (const theme of THEMES) {
  test(`A3-08 CodeBlock and Terminal regions have a role (${theme})`, async () => {
    const { page } = await fixturePage(browser, render(`<><B.CodeBlock title="Install" language="bash" code="npm install basalt" /><B.Terminal title="Replay" lines={[{ kind: "command", text: "npm test" }, { kind: "done", text: "12 passed" }]} /><B.Terminal title="Empty" lines={[]} /></>`), { theme });
    await frames(page);
    const roles = await page.evaluate(() => [...document.querySelectorAll("pre[tabindex='0']")].map((el) => `${el.getAttribute("aria-label")}|${el.getAttribute("role")}`));
    assert.ok(roles.includes("Install code|region"), roles.join(", "));
    for (const entry of roles) assert.ok(!entry.endsWith("|null"), `a focusable named region has a role: ${entry}`);
    await page.close();
  });
}

// ---- A2-14: TabBar and TableScrollHint forward the ref their types accept ----

test("A2-14 TabBar and TableScrollHint forward their refs (object and callback)", async () => {
  const { page } = await fixturePage(browser, `window.navRef = React.createRef(); window.hintRef = React.createRef(); window.calls = [];
    ${render(`<><B.TabBar ref={window.navRef}><B.TabBarItem icon={B.HomeGlyph} href="/">Home</B.TabBarItem></B.TabBar><B.TableContainer><B.Table columns={[{}]} minWidth={600}><B.TableBody><B.TableRow><B.TableCell>A</B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer><B.TableScrollHint ref={window.hintRef} /><B.TableScrollHint ref={(el) => window.calls.push(el ? el.tagName : "null")} /></>`)}`);
  await frames(page);
  const got = await page.evaluate(() => ({ nav: window.navRef.current?.tagName ?? null, hint: window.hintRef.current?.tagName ?? null, calls: window.calls }));
  assert.equal(got.nav, "NAV");
  assert.equal(got.hint, "P");
  assert.ok(got.calls.includes("P"), JSON.stringify(got));
  await page.close();
});

// ---- A4-01 (focus half): in forced colours the selected tab, pressed segment and current page show the focus ring ----

for (const theme of THEMES) {
  test(`A4-01 forced colours: keyboard focus on the selected tab, pressed segment and current page draws the standard ring, and at rest none draws an outline (decision 138) (${theme})`, async () => {
    const { page } = await fixturePage(browser, render(`<><B.Tabs defaultValue="a"><B.TabsList aria-label="Sections"><B.Tab value="a">Alpha</B.Tab><B.Tab value="b">Beta</B.Tab></B.TabsList></B.Tabs><B.SegmentedControl aria-label="Range" defaultValue="day"><B.Segment value="day">Day</B.Segment><B.Segment value="week">Week</B.Segment></B.SegmentedControl><B.Pagination page={2} pageCount={5} onPageChange={() => {}} /></>`), { theme });
    await page.emulateMedia({ forcedColors: "active" });
    await settle(page);
    const ring = (selector) => page.evaluate((selector) => { const el = document.querySelector(selector); const s = getComputedStyle(el); return { style: s.outlineStyle, width: s.outlineWidth, offset: s.outlineOffset, visible: el.matches(":focus-visible") }; }, selector);
    const cases = [["tab", "[role=tab][aria-selected=true]"], ["segment", "[aria-pressed=true]:not(.basalt-button), .basalt-segment[data-pressed]"], ["page", ".basalt-pagination [aria-current=page]"]];
    for (const [name, selector] of cases) {
      const rest = await ring(selector);
      // Decision 138 (A2, with C6): no state is ever marked by an outline. The inset Highlight outline these items wore at rest is gone:
      // the chosen item is Highlight on HighlightText (or the tab's underline), and focus alone draws the ring.
      assert.equal(rest.style, "none", `${name} at rest draws no outline as a state mark`);
      await page.focus(selector);
      await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab"); // make the focus keyboard-driven
      const focused = await ring(selector);
      assert.equal(focused.visible, true, `${name} is :focus-visible`);
      assert.deepEqual([focused.style, focused.width, focused.offset], ["solid", "2px", "2px"], `${name}: the standard ring on focus`);
      await page.evaluate(() => document.activeElement?.blur());
    }
    await page.close();
  });
}

// ---- A5-01: the selected fills paint in a browser without light-dark() ----

describe("A5-01 selected fills without light-dark()", () => {
  const SELECTED = render(`<><div data-level="1" style={{ padding: 16, background: "var(--_surface)" }} id="panel"><B.SegmentedControl aria-label="Range" defaultValue="day"><B.Segment value="day">Day</B.Segment><B.Segment value="week">Week</B.Segment></B.SegmentedControl><B.ChoiceCardGroup><B.ChoiceCard title="Alpha" defaultChecked /></B.ChoiceCardGroup><B.Button variant="secondary" aria-pressed="true">Toggled</B.Button><B.Tabs defaultValue="a" orientation="vertical"><B.TabsList aria-label="Sections"><B.Tab value="a">Alpha</B.Tab><B.Tab value="b">Beta</B.Tab></B.TabsList></B.Tabs><div id="probe" style={{ background: "var(--_plate)" }}>plate</div><div className="basalt-tabs-list" id="tabsprobe"><span id="pill" style={{ background: "var(--_pill)" }}>pill</span></div></div><div id="page-plate" style={{ background: "var(--_plate-solid)" }}>page</div></>`);
  const fills = (page) => page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1; const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const rgba = (css) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = "#000"; ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data]; };
    const bg = (el) => getComputedStyle(el).backgroundColor;
    return {
      "lit row plate (level 1)": rgba(bg(document.getElementById("probe"))),
      "segment pill": rgba(bg(document.getElementById("pill"))),
      "selected choice card": rgba(bg(document.querySelector(".basalt-choice-card"))),
      "pressed toggle (on the panel)": rgba(bg(document.querySelector(".basalt-button[aria-pressed=true]"))),
      "pressed toggle (on the page)": rgba(bg(document.getElementById("page-plate"))),
    };
  });
  for (const theme of THEMES) {
    test(`the demo with light-dark() made unknown still paints the fills, and a browser that has it paints the same (${theme})`, async () => {
      const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
      assert.ok(css.includes("light-dark("), "the shipped CSS uses light-dark()");
      const as = await fixturePage(browser, SELECTED, { theme });
      await settle(as.page);
      const modern = await fills(as.page);
      await as.page.close();
      // An older browser: the function name is not one it knows, so it and @supports read it as unsupported.
      const legacy = await browser.newPage();
      await legacy.setContent(`<html data-theme="${theme}"><head><style>${css.replaceAll("light-dark(", "light-dark-unknown(")}</style></head><body><div id="root"></div></body></html>`);
      await legacy.addScriptTag({ content: await bundleFixture(SELECTED) });
      await settle(legacy);
      const without = await fills(legacy);
      await legacy.close();
      for (const [name, value] of Object.entries(without)) {
        assert.ok(value[3] > 0, `${name}: painted (${value})`);
        const was = modern[name];
        const worst = Math.max(...value.slice(0, 3).map((c, i) => Math.abs(c - was[i])), Math.abs(value[3] - was[3]));
        assert.ok(worst <= 2, `${name}: ${value} against ${was} with light-dark()`);
      }
    });
  }
});

// ---- A4-13: in print, the header bar is static ----

test("A4-13 React's header bar is static in print and sticky on screen", async () => {
  const { page } = await fixturePage(browser, render(`<><header className="basalt-chrome basalt-site-header">Bar</header><main style={{ height: 3000 }}>Page</main></>`));
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("header")).position), "sticky");
  await page.emulateMedia({ media: "print" });
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("header")).position), "static");
  await page.close();
});
