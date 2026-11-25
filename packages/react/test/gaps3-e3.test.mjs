// cimip-gaps-3, batch E3 (engineering): CommandMenu's name, filter, a row that keeps it open, the first row lit as rows arrive and keys typed before its
// field has focus; Tray's open state; Callout's heading; a notification entry's title as markup; the toast stack placed by a column; the loading shape's
// clipped bones; ShareBar's unbroken words; the stream's edge room; Textarea autosize. Driven in Chromium against the built package and its stylesheet.
// Synthetic data in two unlike domains (a recipe box and a build server).
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const DESKTOP = { viewport: { width: 1000, height: 800 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const open = async (body, options = DESKTOP, theme = "dark") => {
  const { page, errors } = await fixturePage(browser, body, { theme, ...options });
  await page.addStyleTag({ content: "body { background: var(--basalt-surface-page); color: var(--basalt-text-primary); margin: 0; } button, input { font: inherit; }" });
  return { page, errors };
};
const lit = (page) => page.evaluate(() => document.querySelector("[cmdk-item][data-selected='true'] .basalt-menu-item-label")?.textContent ?? null);
const labels = (page) => page.evaluate(() => [...document.querySelectorAll("[cmdk-item] .basalt-menu-item-label")].map((el) => el.textContent));

const RECIPES = `
const RECIPES = [{ label: "Recipes", commands: [
  { id: "soup", label: "Tomato soup", onSelect: () => { window.log.push("ran:soup"); } },
  { id: "pie", label: "Apple pie", onSelect: () => { window.log.push("ran:pie"); } },
  { id: "bread", label: "Plain bread", keepOpen: true, onSelect: () => { window.log.push("ran:bread"); } },
  { id: "jam", label: "Plum jam", onSelect: async () => { window.log.push("ran:jam"); } },
] }];
window.log = [];
`;

describe("CommandMenu", () => {
  test("label names the dialog and the field, listLabel the listbox; the defaults stay Command menu and Commands", async () => {
    const names = async (props) => {
      const { page, errors } = await open(`${RECIPES}${render(`<B.CommandMenu open onOpenChange={() => {}} groups={RECIPES} ${props} />`)}`);
      await page.waitForSelector("[cmdk-item]");
      const got = await page.evaluate(() => {
        const input = document.querySelector("[cmdk-input]");
        const named = input.getAttribute("aria-labelledby") ? document.getElementById(input.getAttribute("aria-labelledby")).textContent : input.getAttribute("aria-label");
        return { dialog: document.querySelector(".basalt-command[role='dialog']").getAttribute("aria-label"), field: named, list: document.querySelector("[cmdk-list]").getAttribute("aria-label") };
      });
      assert.deepEqual(errors, []);
      await page.close();
      return got;
    };
    assert.deepEqual(await names(""), { dialog: "Command menu", field: "Command menu", list: "Commands" });
    assert.deepEqual(await names(`label="Find" listLabel="Results"`), { dialog: "Find", field: "Find", list: "Results" });
  });

  test("while the panel loads, the field is named by its placeholder without a label (today's name), and by the label with one", async () => {
    const first = async (props) => {
      const { page } = await open(`${RECIPES}
// The first search field drawn is the loading one: its name is read as it is inserted.
new MutationObserver((_, watcher) => {
  const field = document.querySelector(".basalt-command-input");
  if (field && window.firstName === undefined) { window.firstName = field.getAttribute("aria-label"); window.firstLoading = !field.hasAttribute("cmdk-input"); watcher.disconnect(); }
}).observe(document.body, { subtree: true, childList: true });
${render(`<B.CommandMenu open onOpenChange={() => {}} groups={RECIPES} ${props} />`)}`);
      await page.waitForSelector("[cmdk-item]");
      const got = await page.evaluate(() => ({ name: window.firstName, loading: window.firstLoading }));
      await page.close();
      return got;
    };
    assert.deepEqual(await first(`placeholder="Find a recipe"`), { name: "Find a recipe", loading: true });
    assert.deepEqual(await first(`placeholder="Find a recipe" label="Find"`), { name: "Find", loading: true });
  });

  test("filter={false} shows every row the app gives, in its order; a filter function shows, orders and lights from one set of scores", async () => {
    const fixture = (filter) => `${RECIPES}
function App() {
  const [search, setSearch] = React.useState("");
  return <B.CommandMenu open onOpenChange={() => {}} groups={RECIPES} search={search} onSearchChange={setSearch} ${filter} />;
}
${render("<App />")}`;
    {
      const { page } = await open(fixture("filter={false}"));
      await page.waitForSelector("[cmdk-item]");
      await page.fill("[cmdk-input]", "pie");
      await settle(page);
      assert.deepEqual(await labels(page), ["Tomato soup", "Apple pie", "Plain bread", "Plum jam"], "nothing is hidden or moved");
      assert.equal(await lit(page), "Tomato soup", "the first row given is lit");
      await page.close();
    }
    {
      // Rows whose label starts with the words, longest label first; everything else hidden.
      const { page } = await open(fixture(`filter={(c, s) => (c.label.toLowerCase().startsWith(s.toLowerCase()) ? c.label.length : 0)}`));
      await page.waitForSelector("[cmdk-item]");
      await page.fill("[cmdk-input]", "p");
      await settle(page);
      assert.deepEqual(await labels(page), ["Plain bread", "Plum jam"], "Apple pie and Tomato soup score 0");
      assert.equal(await lit(page), "Plain bread");
      await page.close();
    }
  });

  test("a scorer that changes while the menu is open: what is shown, its order and the lit row all follow the new scores at once", async () => {
    const { page } = await open(`${RECIPES}
const BY_START = (c, s) => (c.label.toLowerCase().startsWith(s) ? 2 : 0);
const BY_WORD = (c, s) => (c.label.toLowerCase().split(" ").some((w) => w.startsWith(s)) ? (c.id === "pie" ? 3 : 1) : 0);
function App() {
  const [search, setSearch] = React.useState("p");
  const [scorer, setScorer] = React.useState(() => BY_START);
  window.byWord = () => setScorer(() => BY_WORD);
  return <B.CommandMenu open onOpenChange={() => {}} groups={RECIPES} search={search} onSearchChange={setSearch} filter={scorer} />;
}
${render("<App />")}`);
    await page.waitForSelector("[cmdk-item]");
    await settle(page);
    assert.deepEqual(await labels(page), ["Plain bread", "Plum jam"]);
    assert.equal(await lit(page), "Plain bread");
    await page.evaluate(() => window.byWord());
    await settle(page);
    assert.deepEqual(await labels(page), ["Apple pie", "Plain bread", "Plum jam"], "Apple pie now matches, and scores highest");
    assert.equal(await lit(page), "Apple pie");
    await page.close();
  });

  test("an ordinary row closes the menu, then runs (an async handler too); a keepOpen row only runs", async () => {
    const { page } = await open(`${RECIPES}
function App() {
  const [shown, setShown] = React.useState(true);
  return <B.CommandMenu open={shown} onOpenChange={(next) => { window.log.push("open:" + next); setShown(next); }} groups={RECIPES} />;
}
${render("<App />")}`);
    const choose = async (label) => {
      await page.waitForSelector("[cmdk-item]");
      await page.evaluate(() => { window.log = []; });
      await page.locator("[cmdk-item]", { hasText: label }).click();
      await settle(page);
      return page.evaluate(() => ({ log: window.log, open: !!document.querySelector(".basalt-command[role='dialog']") }));
    };
    assert.deepEqual(await choose("Plain bread"), { log: ["ran:bread"], open: true }, "keepOpen");
    assert.deepEqual(await choose("Plum jam"), { log: ["open:false", "ran:jam"], open: false }, "closed first, then ran; its promise changes nothing");
    await page.close();
  });

  test("rows that arrive light the first row until the reader moves the light; a key that moves nothing is not a move; new words light it again", async () => {
    const { page } = await open(`
const BUILD = (names) => [{ label: "Builds", commands: names.map((n) => ({ id: n, label: n })) }];
function App() {
  const [names, setNames] = React.useState(["main #212", "main #211"]);
  window.arrive = (more) => setNames(more);
  return <B.CommandMenu open onOpenChange={() => {}} groups={BUILD(names)} filter={false} />;
}
${render("<App />")}`);
    await page.waitForSelector("[cmdk-item]");
    await settle(page);
    assert.equal(await lit(page), "main #212");
    // PageDown and Home here change nothing cmdk lights (Home is already on the first row): neither is the reader moving the light.
    await page.keyboard.press("PageDown");
    await page.keyboard.press("Home");
    await page.evaluate(() => window.arrive(["release #9", "main #212", "main #211"]));
    await settle(page);
    assert.equal(await lit(page), "release #9", "a row arriving above takes the light");
    await page.keyboard.press("ArrowDown");
    assert.equal(await lit(page), "main #212");
    await page.evaluate(() => window.arrive(["hotfix #3", "release #9", "main #212", "main #211"]));
    await settle(page);
    assert.equal(await lit(page), "main #212", "the reader's choice stays once they moved");
    await page.keyboard.type("m");
    await settle(page);
    await page.evaluate(() => window.arrive(["nightly #40", "hotfix #3", "release #9", "main #212", "main #211"]));
    await settle(page);
    assert.equal(await lit(page), "nightly #40", "new words hand the light back to the rows");
    await page.close();
  });

  const OPENER = (extra = "") => `${RECIPES}
function App() {
  const [shown, setShown] = React.useState(false);
  window.hold = false;
  return <>
    <input id="message" onBlur={(e) => { if (window.hold) e.target.focus(); }} onKeyDown={(e) => { if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setShown(true); } }} />
    <B.CommandMenu open={shown} onOpenChange={setShown} groups={RECIPES} ${extra} />
  </>;
}
${render("<App />")}`;
  const openFromMessage = async (page) => {
    await page.focus("#message");
    await page.keyboard.down("Control");
    await page.keyboard.press("k");
    await page.keyboard.up("Control");
  };

  test("keys typed between opening and the field taking focus go to the search, not the control that had focus", async () => {
    const { page } = await open(OPENER());
    await openFromMessage(page);
    // One burst after the shortcut, with no wait for the dialog to mount or move focus.
    await page.keyboard.type("pie", { delay: 0 });
    await page.waitForSelector("[cmdk-input]");
    await settle(page);
    assert.equal(await page.inputValue("#message"), "", "nothing reached the field that had focus");
    assert.equal(await page.inputValue(".basalt-command-input"), "pie");
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("basalt-command-input")), true);
    await page.close();
  });

  test("while focus is held at the opener, the keys still go to the search; once the menu's field has focus the capture is gone", async () => {
    const { page } = await open(OPENER());
    await page.evaluate(() => { window.hold = true; });
    await openFromMessage(page);
    await page.waitForSelector("[cmdk-input]");
    await page.keyboard.type("jam", { delay: 20 });
    assert.equal(await page.inputValue("#message"), "");
    assert.equal(await page.inputValue(".basalt-command-input"), "jam");
    await page.evaluate(() => { window.hold = false; });
    await page.focus(".basalt-command-input");
    await page.keyboard.type(" pot");
    assert.equal(await page.inputValue(".basalt-command-input"), "jam pot", "the field types for itself");
    await page.close();
  });

  test("a dialog opened from the menu types into its own field: the capture never takes its keys", async () => {
    const { page } = await open(`
function App() {
  const [shown, setShown] = React.useState(true);
  const [naming, setNaming] = React.useState(false);
  const groups = [{ label: "Builds", commands: [{ id: "tag", label: "Tag a build", keepOpen: true, onSelect: () => setNaming(true) }] }];
  return <>
    <B.CommandMenu open={shown} onOpenChange={setShown} groups={groups} />
    <B.Dialog open={naming} onOpenChange={setNaming}>
      <B.DialogContent><B.DialogTitle>Tag</B.DialogTitle><input id="tag-name" aria-label="Tag name" autoFocus /></B.DialogContent>
    </B.Dialog>
  </>;
}
${render("<App />")}`);
    await page.waitForSelector("[cmdk-item]");
    await page.keyboard.press("Enter");
    await page.waitForSelector("#tag-name");
    await page.focus("#tag-name");
    await page.keyboard.type("release-9");
    assert.equal(await page.inputValue("#tag-name"), "release-9");
    assert.equal(await page.inputValue(".basalt-command-input"), "", "the menu's search took none of it");
    await page.close();
  });
});

describe("Tray open and onOpenChange", () => {
  test("on a phone the app opens the sheet; Esc closes it and says so; the last waiting row leaving closes it by itself", async () => {
    const { page } = await open(`
function App() {
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState(["Sam asks to join the kitchen", "Lee asks to join the kitchen"]);
  window.said = [];
  window.openTray = () => setOpen(true);
  window.answerAll = () => setRows([]);
  return <B.Tray label="Waiting on you" summary={(n) => n + " waiting"} open={open} onOpenChange={(next) => { window.said.push(next); setOpen(next); }}>
    {rows.map((r) => <B.TrayRow key={r} actions={<B.Button size="sm">Let in</B.Button>}>{r}</B.TrayRow>)}
  </B.Tray>;
}
${render("<App />")}`, PHONE);
    await settle(page);
    assert.equal(await page.locator(".basalt-tray-sheet").count(), 0);
    await page.evaluate(() => window.openTray());
    await page.waitForSelector(".basalt-tray-sheet");
    await page.keyboard.press("Escape");
    await settle(page);
    assert.deepEqual(await page.evaluate(() => window.said), [false]);
    await page.evaluate(() => window.openTray());
    await page.waitForSelector(".basalt-tray-sheet");
    await page.evaluate(() => window.answerAll());
    await settle(page);
    assert.deepEqual(await page.evaluate(() => window.said), [false, false], "closed by itself, and said so");
    await page.close();
  });
});

describe("Callout heading", () => {
  test("the title is a heading of the level given, drawn exactly as the plain title", async () => {
    const { page } = await open(render(`<div style={{ width: 480 }}>
      <B.Callout id="plain" status="warning" title="The oven runs hot">Lower it by 10 degrees.</B.Callout>
      <B.Callout id="heading" status="warning" heading={3} title="The oven runs hot">Lower it by 10 degrees.</B.Callout>
    </div>`));
    const read = (id) => page.evaluate((id) => {
      const t = document.querySelector(`#${id} .basalt-callout-title`);
      const c = getComputedStyle(t);
      return { tag: t.tagName, h: t.getBoundingClientRect().height, font: c.font, margin: c.margin, box: document.getElementById(id).getBoundingClientRect().height };
    }, id);
    const plain = await read("plain");
    const heading = await read("heading");
    assert.equal(plain.tag, "DIV");
    assert.equal(heading.tag, "H3");
    assert.deepEqual({ ...heading, tag: "" }, { ...plain, tag: "" });
    await page.close();
  });
});

describe("NotificationEntry nodes", () => {
  test("a title and a line given as markup are drawn whole inside the entry", async () => {
    const { page } = await open(render(`<B.NotificationList entries={[{ id: "a", title: <>Build <span id="ref" style={{ whiteSpace: "nowrap" }}>web-212</span> passed</>, description: <code id="line">main</code>, time: "2m ago" }]} />`));
    assert.equal(await page.locator(".basalt-notification-title #ref").textContent(), "web-212");
    assert.equal(await page.locator(".basalt-notification-line #line").textContent(), "main");
    await page.close();
  });
});

describe("the toast stack by a column", () => {
  const fixture = (props, rootStyle = "") => `
function Show() {
  const toast = B.useToast();
  React.useEffect(() => { toast.show({ title: "Saved the recipe", timeout: 0 }); }, []);
  return null;
}
function App() {
  const column = React.useRef(null);
  return <div style={{ display: "flex" }}>
    <main ref={column} id="column" style={{ width: 600 }}>words</main>
    <aside style={{ flex: 1 }}>panel</aside>
    <B.ToastProvider ${props}><Show /></B.ToastProvider>
  </div>;
}
document.documentElement.style.cssText = ${JSON.stringify(rootStyle)};
${render("<App />")}`;
  const right = (page) => page.evaluate(() => ({ stack: document.querySelector(".basalt-toast-viewport").getBoundingClientRect().right, column: document.getElementById("column").getBoundingClientRect().right, window: document.documentElement.clientWidth }));
  test("without a column the stack keeps space-4 from the window's right edge, as before", async () => {
    const { page } = await open(fixture(""));
    await page.waitForSelector(".basalt-toast");
    const r = await right(page);
    assert.equal(r.window - r.stack, 16);
    await page.close();
  });
  test("column={ref} keeps space-4 inside the column's right edge, and follows the window", async () => {
    const { page } = await open(fixture("column={column}"));
    await page.waitForSelector(".basalt-toast");
    assert.equal((await right(page)).column - (await right(page)).stack, 16);
    await page.setViewportSize({ width: 900, height: 800 });
    await settle(page);
    const r = await right(page);
    assert.equal(r.column - r.stack, 16);
    await page.close();
  });
  test("--basalt-toast-right on the root says the same with no measure; under 720 the stack is the window's", async () => {
    const { page } = await open(fixture("", "--basalt-toast-right: 400px"));
    await page.waitForSelector(".basalt-toast");
    let r = await right(page);
    assert.equal(r.window - r.stack, 416);
    await page.setViewportSize({ width: 390, height: 844 });
    await settle(page);
    r = await right(page);
    assert.equal(r.window - r.stack, 16, "the phone's stack hangs full width from the bar");
    await page.close();
  });

  // A column the app swaps and slides: `which` picks the element the ref is on, `shift` slides it sideways at the same width, `late` mounts it after the toast.
  const moving = `
function Show() {
  const toast = B.useToast();
  React.useEffect(() => { toast.show({ title: "Saved the recipe", timeout: 0 }); }, []);
  return null;
}
function App() {
  const column = React.useRef(null);
  const [which, setWhich] = React.useState(window.__late ? "none" : "a");
  const [shift, setShift] = React.useState(0);
  window.use = setWhich;
  window.slide = setShift;
  return <div style={{ position: "relative" }}>
    {which === "a" ? <main ref={column} id="column" style={{ width: 600, marginLeft: shift }}>words</main> : null}
    {which === "b" ? <section ref={column} id="column" style={{ width: 420, marginLeft: 80 }}>other words</section> : null}
    <B.ToastProvider column={column}><Show /></B.ToastProvider>
  </div>;
}
${render("<App />")}`;
  const gap = (page) => page.evaluate(() => { const c = document.getElementById("column"); return c ? Math.round(c.getBoundingClientRect().right - document.querySelector(".basalt-toast-viewport").getBoundingClientRect().right) : null; });
  test("a column mounted after the provider is found, and the stack moves to it", async () => {
    const { page } = await open(`window.__late = true;${moving}`);
    await page.waitForSelector(".basalt-toast");
    const r = await right(page);
    assert.equal(r.window - r.stack, 16, "no column yet: the window's edge");
    await page.evaluate(() => window.use("a"));
    await settle(page);
    assert.equal(await gap(page), 16);
    await page.close();
  });
  test("a column replaced by another element is followed", async () => {
    const { page } = await open(moving);
    await page.waitForSelector(".basalt-toast");
    assert.equal(await gap(page), 16);
    await page.evaluate(() => window.use("b"));
    await settle(page);
    assert.equal(await gap(page), 16, "the new column's edge");
    await page.close();
  });
  test("a column that moves sideways at the same width is followed", async () => {
    const { page } = await open(moving);
    await page.waitForSelector(".basalt-toast");
    await page.evaluate(() => window.slide(200));
    await settle(page);
    assert.equal(await gap(page), 16);
    await page.close();
  });
});

describe("LoadingShape and ShareBar", () => {
  test("both bone layers clip to the region's box", async () => {
    const { page } = await open(render(`<B.LoadingShape loading shape={() => <p style={{ height: 400 }}>Proofing times</p>}>{() => null}</B.LoadingShape>`));
    await page.waitForSelector(".basalt-bones-layer");
    const layer = await page.evaluate(() => getComputedStyle(document.querySelector(".basalt-bones-layer")).overflow);
    assert.equal(layer, "clip");
    // The leaving layer is drawn for its fade only; its rule is read from the stylesheet.
    const leaving = await page.evaluate(() => { const el = document.createElement("div"); el.className = "basalt-bones-leaving"; document.body.append(el); const v = getComputedStyle(el).overflow; el.remove(); return v; });
    assert.equal(leaving, "clip");
    await page.close();
  });
  test("a narrow part's name never breaks inside a word, and its share stays on one line", async () => {
    const { page } = await open(render(`<div style={{ width: 360 }}><B.ShareBar size="md" parts={[{ name: "Waiting on the oven", value: 96 }, { name: "Working", value: 2 }, { name: "Queued", value: 2 }]} /></div>`));
    const lines = await page.evaluate(() => [...document.querySelectorAll(".basalt-share-part")].map((part) => {
      const name = part.querySelector(".basalt-share-name");
      const value = part.querySelector(".basalt-share-value");
      const line = Number.parseFloat(getComputedStyle(name).lineHeight);
      return { name: name.textContent, nameLines: Math.round(name.getBoundingClientRect().height / line), valueLines: Math.round(value.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(value).lineHeight)) };
    }));
    for (const part of lines.filter((p) => !p.name.includes(" "))) assert.equal(part.nameLines, 1, `${part.name} is one word on one line`);
    for (const part of lines) assert.equal(part.valueLines, 1, `${part.name}'s share is one line`);
    await page.close();
  });
});

describe("the stream's edge room", () => {
  test("a ghost Button edge=start in a message hangs into the gutter's gap, by its inset and never more than space-3", async () => {
    const { page } = await open(render(`<B.Stream style={{ width: 600, marginLeft: 40 }}>
      <B.StreamMessage author="Build server" time="09:12"><p id="words">Deploy finished.</p><B.Button id="hang" variant="ghost" size="sm" edge="start">Open the log</B.Button></B.StreamMessage>
    </B.Stream>`));
    const got = await page.evaluate(() => {
      const button = document.getElementById("hang");
      const px = Number.parseFloat(getComputedStyle(button).paddingInlineStart);
      return { hang: -Number.parseFloat(getComputedStyle(button).marginInlineStart), px, words: document.getElementById("words").getBoundingClientRect().left, label: button.getBoundingClientRect().left + px };
    });
    assert.equal(got.hang, Math.min(got.px, 12));
    assert.equal(got.label, got.words, "its words sit on the text column's line");
    await page.close();
  });
});

describe("Textarea autosize", () => {
  test("grows a line at a time from rows to maxRows, then scrolls; no resize handle", async () => {
    const { page } = await open(render(`<div style={{ width: 400 }}><B.Textarea id="t" aria-label="Method" autosize rows={2} maxRows={4} /></div>`));
    const height = () => page.evaluate(() => document.getElementById("t").getBoundingClientRect().height);
    const style = await page.evaluate(() => { const c = getComputedStyle(document.getElementById("t")); return { resize: c.resize, line: Number.parseFloat(c.lineHeight) }; });
    assert.equal(style.resize, "none");
    const start = await height();
    await page.focus("#t");
    await page.keyboard.type("Heat the pan");
    assert.equal(await height(), start, "one line fits the floor");
    for (const line of ["Add the oil", "Add the onion"]) { await page.keyboard.press("Shift+Enter"); await page.keyboard.type(line); }
    assert.equal(await height(), start + style.line, "three lines: one line taller");
    for (const line of ["Stir", "Season", "Serve"]) { await page.keyboard.press("Shift+Enter"); await page.keyboard.type(line); }
    assert.equal(await height(), start + 2 * style.line, "capped at four lines");
    assert.ok(await page.evaluate(() => { const t = document.getElementById("t"); return t.scrollHeight > t.clientHeight; }), "then it scrolls");
    await page.close();
  });
  test("in a browser that cannot size a field to its content, turning autosize off gives back the inline height the field had", async () => {
    const { page } = await open(`
// The measured fallback: this browser is told it has no field-sizing.
const supports = CSS.supports.bind(CSS);
CSS.supports = (...args) => (String(args[0]).includes("field-sizing") ? false : supports(...args));
function App() {
  const [auto, setAuto] = React.useState(true);
  window.setAuto = setAuto;
  return <div style={{ width: 400 }}><B.Textarea id="t" aria-label="Method" autosize={auto} rows={2} style={{ height: "123px" }} defaultValue={"Heat the pan\\nAdd the oil\\nAdd the onion"} /></div>;
}
${render("<App />")}`);
    assert.notEqual(await page.evaluate(() => document.getElementById("t").style.height), "123px", "measured while autosize is on");
    await page.evaluate(() => window.setAuto(false));
    await settle(page);
    assert.equal(await page.evaluate(() => document.getElementById("t").style.height), "123px");
    await page.close();
  });
  test("without autosize nothing changes: the resize handle and the rows given", async () => {
    const { page } = await open(render(`<B.Textarea id="t" aria-label="Notes" rows={3} />`));
    assert.deepEqual(await page.evaluate(() => { const t = document.getElementById("t"); return { resize: getComputedStyle(t).resize, auto: t.hasAttribute("data-autosize"), rows: t.rows }; }), { resize: "vertical", auto: false, rows: 3 });
    await page.close();
  });
});
