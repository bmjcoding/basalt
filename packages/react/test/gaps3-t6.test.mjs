// cimip-gaps-3, topic t6 (the council's decision, DECISIONS 385): CommandMenu's foot, count and empty slot, the app's match marks and a row that cannot run
// (in the modal and the list), the menu rows for the loop hold and single keys, the send and keyboard glyphs, Nav md's label, CodeBlock's line numbers and its
// sideways line, RichText and MenuText, with forced colours and more contrast. Driven in Chromium against the built package and its stylesheet. Synthetic data
// in two unlike domains (a recipe box and a build server). Written while tests are paused (DECISIONS 359): not yet run.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const DESKTOP = { viewport: { width: 1000, height: 800 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const open = async (body, options = DESKTOP, theme = "dark") => {
  const { page, errors } = await fixturePage(browser, body, { theme, ...options });
  await page.addStyleTag({ content: "body { background: var(--basalt-surface-page); color: var(--basalt-text-primary); margin: 0; } button, input { font: inherit; }" });
  return { page, errors };
};
const lit = (page) => page.evaluate(() => document.querySelector("[cmdk-item][data-selected='true'] .basalt-menu-item-label")?.textContent ?? null);
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] }, resultTypes: ["violations"] });
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
};

// A recipe box whose first row cannot run, and a build server's, for the two unlike domains.
const RECIPES = `
window.log = [];
const RECIPES = [{ label: "Recipes", commands: [
  { id: "share", label: "Share recipe", unavailable: "Sign in to share a recipe with another cook.", shortcut: "Mod+S", danger: true, onSelect: () => { window.log.push("ran:share"); } },
  { id: "soup", label: "Tomato soup", onSelect: () => { window.log.push("ran:soup"); } },
  { id: "pie", label: "Apple pie", description: "Bake for 45 minutes", onSelect: () => { window.log.push("ran:pie"); } },
] }];
`;
const BUILDS = `
window.log = [];
const BUILDS = [{ label: "Builds", commands: [
  { id: "deploy", label: "Deploy main", unavailable: "The last build failed, so there is nothing to deploy until a build passes.", onSelect: () => { window.log.push("ran:deploy"); } },
  { id: "retry", label: "Retry build", onSelect: () => { window.log.push("ran:retry"); } },
  { id: "logs", label: "Open logs", onSelect: () => { window.log.push("ran:logs"); } },
] }];
`;

describe("a row that cannot run (unavailable)", () => {
  test("first, it is lit and named by aria-activedescendant; Enter and a click run nothing, close nothing and say the reason, twice for two presses", async () => {
    const { page, errors } = await open(`${RECIPES}
function App() {
  const [shown, setShown] = React.useState(true);
  return <B.CommandMenu open={shown} onOpenChange={(next) => { window.log.push("open:" + next); setShown(next); }} groups={RECIPES} />;
}
${render("<App />")}`);
    await page.waitForSelector("[cmdk-item]");
    await settle(page);
    assert.equal(await lit(page), "Share recipe");
    const named = await page.evaluate(() => {
      const input = document.querySelector("[cmdk-input]");
      const row = document.getElementById(input.getAttribute("aria-activedescendant"));
      return { label: row?.querySelector(".basalt-menu-item-label")?.textContent, disabled: row?.getAttribute("aria-disabled"), keys: row?.hasAttribute("aria-keyshortcuts"), chip: !!row?.querySelector(".basalt-kbd"), danger: row?.hasAttribute("data-danger") };
    });
    assert.deepEqual(named, { label: "Share recipe", disabled: "true", keys: false, chip: false, danger: false }, "no chip, no aria-keyshortcuts, and unavailable wins over danger");
    const reasons = [];
    await page.exposeFunction("heard", (text) => reasons.push(text));
    await page.evaluate(() => {
      const line = [...document.querySelectorAll(".basalt-command [role='status']")].at(-1);
      new MutationObserver(() => { if (line.textContent) window.heard(line.textContent); }).observe(line, { childList: true, characterData: true, subtree: true });
    });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(50);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(50);
    assert.deepEqual(reasons, ["Sign in to share a recipe with another cook.", "Sign in to share a recipe with another cook."], "said at once, on every press");
    await page.locator("[cmdk-item]", { hasText: "Share recipe" }).click();
    await page.waitForTimeout(50);
    assert.equal(reasons.length, 3, "a click says it too");
    assert.deepEqual(await page.evaluate(() => window.log), [], "nothing ran and nothing closed");
    assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute("cmdk-input")), true, "focus stays in the field");
    assert.equal(await lit(page), "Share recipe", "the light stays");
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("the arrows, Home and End land on it in both directions and wrap", async () => {
    const { page } = await open(`${BUILDS}${render(`<B.CommandMenu open onOpenChange={() => {}} groups={BUILDS} />`)}`);
    await page.waitForSelector("[cmdk-item]");
    await settle(page);
    assert.equal(await lit(page), "Deploy main");
    await page.keyboard.press("ArrowUp");
    assert.equal(await lit(page), "Open logs", "up from the first wraps to the last");
    await page.keyboard.press("ArrowDown");
    assert.equal(await lit(page), "Deploy main", "down from the last wraps to the unavailable first row");
    await page.keyboard.press("ArrowDown");
    assert.equal(await lit(page), "Retry build");
    await page.keyboard.press("ArrowUp");
    assert.equal(await lit(page), "Deploy main", "up lands on it");
    await page.keyboard.press("End");
    assert.equal(await lit(page), "Open logs");
    await page.keyboard.press("Home");
    assert.equal(await lit(page), "Deploy main", "Home lands on it");
    await page.close();
  });

  test("typing while it stays first keeps it lit (cmdk's own first enabled row never takes the light)", async () => {
    const { page } = await open(`${BUILDS}${render(`<B.CommandMenu open onOpenChange={() => {}} groups={BUILDS} />`)}`);
    await page.waitForSelector("[cmdk-item]");
    await settle(page);
    for (const key of ["d", "e", "p"]) {
      await page.keyboard.type(key);
      await settle(page);
      assert.equal(await lit(page), "Deploy main", `after "${key}"`);
    }
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await settle(page);
    assert.equal(await lit(page), "Deploy main", "cleared, it is still the first row and lit");
    await page.close();
  });

  test("the pointer lights it, and its reason wraps at 390: the row grows and the reason is never cut", async () => {
    const { page } = await open(`${BUILDS}${render(`<B.CommandMenu open onOpenChange={() => {}} groups={BUILDS} />`)}`, PHONE);
    await page.waitForSelector("[cmdk-item]");
    await settle(page);
    const shape = await page.evaluate(() => {
      const row = [...document.querySelectorAll("[cmdk-item]")].find((el) => el.textContent.includes("Deploy main"));
      const reason = row.querySelector(".basalt-command-reason");
      const style = getComputedStyle(reason);
      return { cut: reason.scrollWidth > reason.clientWidth, wraps: style.whiteSpace, lines: Math.round(reason.getBoundingClientRect().height / parseFloat(style.lineHeight)), row: row.getBoundingClientRect().height, title: getComputedStyle(row).color };
    });
    assert.equal(shape.cut, false);
    assert.equal(shape.wraps, "normal");
    assert.ok(shape.lines >= 2, `the reason takes ${shape.lines} lines at 390`);
    // 62 for one line of reason (58 plate and 2 above and below), plus 18 a line; the coarse floor is the touch row's.
    assert.ok(shape.row >= 62 + 18 * (shape.lines - 1) - 0.5, `the row is ${shape.row} tall for ${shape.lines} lines`);
    await page.close();
  });

  test("in a list with a preview, the pane shows the reason and ↵ does not press the pane's button; in the push nothing is pushed", async () => {
    const fixture = (width) => `${BUILDS}
${render(`<div style={{ width: ${width} }}><B.CommandList label="Console" groups={BUILDS} detail={(c) => <section><h2>{c.label}</h2><button onClick={() => window.log.push("pane:" + c.id)}>Run it</button></section>} /></div>`)}`;
    {
      const { page } = await open(fixture(960));
      await page.waitForSelector("[cmdk-item]");
      await page.locator("[cmdk-input]").focus();
      await settle(page);
      assert.equal(await lit(page), "Deploy main");
      assert.equal(await page.locator(".basalt-command-pane-empty").textContent(), "The last build failed, so there is nothing to deploy until a build passes.");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(50);
      assert.deepEqual(await page.evaluate(() => window.log), [], "the pane has no button for it, and nothing was pressed");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      assert.deepEqual(await page.evaluate(() => window.log), ["pane:retry"], "an available row's pane still runs on ↵");
      await page.close();
    }
    {
      const { page } = await open(fixture(600));
      await page.waitForSelector("[cmdk-item]");
      await page.locator("[cmdk-input]").focus();
      await settle(page);
      await page.keyboard.press("Enter");
      await settle(page);
      assert.equal(await page.locator(".basalt-command-split").getAttribute("data-view"), "list", "nothing is pushed");
      await page.close();
    }
  });
});

describe("the modal's foot, count and empty slot", () => {
  test("the count at rest, while filtering, at zero and with filter={false}; `count` replaces it; the foot is always there and 36px or taller", async () => {
    const { page } = await open(`${RECIPES}
function App() {
  const [search, setSearch] = React.useState("");
  const [mode, setMode] = React.useState("own");
  window.mode = setMode;
  return <B.CommandMenu open onOpenChange={() => {}} groups={RECIPES} search={search} onSearchChange={setSearch} filter={mode === "app" ? false : undefined} count={mode === "count" ? "About 40 recipes" : undefined} noun="recipe" />;
}
${render("<App />")}`);
    await page.waitForSelector("[cmdk-item]");
    const count = () => page.locator(".basalt-dialog .basalt-command-count > span[aria-hidden='true']").textContent();
    assert.equal(await count(), "3 recipes");
    await page.fill("[cmdk-input]", "pie");
    await settle(page);
    assert.equal(await count(), "1 of 3");
    await page.fill("[cmdk-input]", "zzq");
    await settle(page);
    assert.equal(await count(), "0 of 3");
    assert.ok((await page.locator(".basalt-dialog .basalt-command-foot").boundingBox()).height >= 36, "the foot keeps its height with nothing shown");
    await page.evaluate(() => window.mode("app"));
    await settle(page);
    assert.equal(await count(), "3 recipes", "the app's order shows every row, whatever is typed");
    await page.evaluate(() => window.mode("count"));
    await settle(page);
    assert.equal(await count(), "About 40 recipes");
    assert.equal(await page.locator(".basalt-command-footer").count(), 0, "the old footer is retired");
    await page.close();
  });

  test("nothing is spoken on opening; a change is spoken once after 400ms", async () => {
    const { page } = await open(`${RECIPES}
window.spoken = [];
new MutationObserver(() => {
  const line = document.querySelector(".basalt-dialog .basalt-command-count [role='status']");
  if (line && !line.__watched) { line.__watched = true; window.initial = line.textContent; new MutationObserver(() => window.spoken.push(line.textContent)).observe(line, { childList: true, characterData: true, subtree: true }); }
}).observe(document.body, { subtree: true, childList: true });
${render(`<B.CommandMenu open onOpenChange={() => {}} groups={RECIPES} />`)}`);
    await page.waitForSelector("[cmdk-item]");
    await page.waitForTimeout(700);
    assert.deepEqual(await page.evaluate(() => window.spoken), [], "the line's text at mount is the page's, not news");
    await page.keyboard.type("soup");
    await page.waitForTimeout(700);
    assert.deepEqual(await page.evaluate(() => window.spoken.filter(Boolean)), ["1 of 3"]);
    await page.close();
  });

  test("hints draw the legend at the foot's end: ↵ Run and Esc Close, aria-hidden and still the field's description", async () => {
    const { page } = await open(`${RECIPES}${render(`<B.CommandMenu open onOpenChange={() => {}} groups={RECIPES} hints />`)}`);
    await page.waitForSelector("[cmdk-item]");
    const legend = await page.evaluate(() => {
      const hints = document.querySelector(".basalt-dialog .basalt-command-foot .basalt-command-hints");
      const input = document.querySelector("[cmdk-input]");
      return { words: [...hints.children].map((el) => el.textContent.trim()), hidden: hints.getAttribute("aria-hidden"), hint: hints.hasAttribute("data-kbd-hint"), described: input.getAttribute("aria-describedby") === hints.id };
    });
    assert.deepEqual(legend, { words: ["↵ Run", "Esc Close"], hidden: "true", hint: true, described: true });
    await page.close();
  });

  for (const surface of ["modal", "list"]) {
    test(`${surface}: Enter on Clear search and on a link in \`empty\` activates it; the block sits outside the listbox`, async () => {
      const tree = (empty) => surface === "modal"
        ? `<B.CommandMenu open onOpenChange={() => {}} groups={BUILDS} ${empty} />`
        : `<B.CommandList label="Console" groups={BUILDS} ${empty} />`;
      {
        const { page } = await open(`${BUILDS}${render(tree(""))}`);
        await page.waitForSelector("[cmdk-item]");
        await page.locator("[cmdk-input]").focus();
        await page.keyboard.type("zzq");
        await settle(page);
        assert.equal(await page.locator(".basalt-command-none:not(.basalt-command-none-sizer) p").textContent(), "Nothing matches “zzq”.");
        assert.equal(await page.evaluate(() => !!document.querySelector("[cmdk-list] .basalt-command-none")), false, "outside the listbox");
        await page.keyboard.press("Tab");
        assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Clear search");
        await page.keyboard.press("Enter");
        await settle(page);
        assert.equal(await page.locator("[cmdk-input]").inputValue(), "", "Enter on the button cleared the search");
        assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute("cmdk-input")), true, "and focused the field");
        await page.close();
      }
      {
        const { page } = await open(`${BUILDS}${render(tree(`empty={({ search, clear }) => <><p>No build is called {search}.</p><a href="#all" onClick={(e) => { e.preventDefault(); window.log.push("link"); }}>See every build</a><button type="button" onClick={clear}>Start again</button></>}`))}`);
        await page.waitForSelector("[cmdk-item]");
        await page.locator("[cmdk-input]").focus();
        await page.keyboard.type("zzq");
        await settle(page);
        assert.equal(await page.locator(".basalt-command-none:not(.basalt-command-none-sizer) p").textContent(), "No build is called zzq.");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Enter");
        assert.deepEqual(await page.evaluate(() => window.log), ["link"], "the link's own Enter is not eaten by cmdk's root");
        await page.close();
      }
    });
  }

  test("with no words and no rows: Nothing to show., no button", async () => {
    const { page } = await open(render(`<B.CommandMenu open onOpenChange={() => {}} groups={[]} />`));
    await page.waitForSelector(".basalt-command-none");
    assert.equal(await page.locator(".basalt-command-none").textContent(), "Nothing to show.");
    assert.equal(await page.locator(".basalt-command-none button").count(), 0);
    await page.close();
  });

  test("the modal's field takes the −2 ring only while the empty block holds a stop", async () => {
    const { page } = await open(`${BUILDS}${render(`<B.CommandMenu open onOpenChange={() => {}} groups={BUILDS} />`)}`);
    await page.waitForSelector("[cmdk-item]");
    const ring = () => page.locator(".basalt-dialog .basalt-command-search").evaluate((el) => ({ style: getComputedStyle(el).outlineStyle, offset: getComputedStyle(el).outlineOffset }));
    assert.equal((await ring()).style, "none", "rows shown: the field is the modal's only stop");
    await page.keyboard.type("zzq");
    await settle(page);
    assert.deepEqual(await ring(), { style: "solid", offset: "-2px" }, "the block's Clear search is a second stop");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await settle(page);
    assert.equal((await ring()).style, "none");
    await page.close();
  });
});

describe("matched words (matches)", () => {
  test("ranges land on the string shown, a reason included; a row without matches renders as it does today", async () => {
    const { page } = await open(`
const ROWS = [{ label: "Recipes", commands: [
  { id: "pie", label: "Apple pie", description: "Bake for 45 minutes", matches: { label: [[0, 5]], description: [[9, 11]] } },
  { id: "share", label: "Share recipe", unavailable: "Sign in to share", matches: { unavailable: [[11, 16]], description: [[0, 3]] }, description: "Send to a friend" },
  { id: "soup", label: "Tomato soup" },
] }];
${render(`<B.CommandMenu open onOpenChange={() => {}} groups={ROWS} filter={false} />`)}`);
    await page.waitForSelector("[cmdk-item]");
    const marks = await page.evaluate(() => [...document.querySelectorAll("[cmdk-item]")].map((row) => [...row.querySelectorAll("mark.basalt-search-match")].map((m) => m.textContent)));
    assert.deepEqual(marks, [["Apple", "45"], ["share"], []], "the reason is marked from its own ranges, never the description's offsets");
    const ink = await page.evaluate(() => {
      const share = [...document.querySelectorAll("[cmdk-item]")][1];
      const mark = share.querySelector("mark");
      return { weight: getComputedStyle(mark).fontWeight, background: getComputedStyle(mark).backgroundColor };
    });
    assert.deepEqual(ink, { weight: "600", background: "rgba(0, 0, 0, 0)" });
    // The name is unchanged by the marks: title then the second line.
    assert.equal(await page.evaluate(() => [...document.querySelectorAll("[cmdk-item]")][2].textContent), "Tomato soup");
    await page.close();
  });
});

describe("the menu rows for the loop hold and single keys", () => {
  for (const key of ["Enter", "Space", "click"]) {
    test(`${key}: one store write, the menu stays open, and a switch on the page stays in step`, async () => {
      const { page } = await open(`
window.writes = [];
const set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
Storage.prototype.setItem = function (k, v) { window.writes.push(k + "=" + v); return set.call(this, k, v); };
Storage.prototype.removeItem = function (k) { window.writes.push(k + "-"); return remove.call(this, k); };
${render(`<><B.LoopsToggle form="switch" /><B.SingleKeysSwitch /><B.Menu><B.MenuTrigger render={<B.Button>Options</B.Button>} /><B.MenuContent><B.LoopsToggleMenuItem /><B.SingleKeysMenuItem /></B.MenuContent></B.Menu></>`)}`);
      await page.getByRole("button", { name: "Options" }).click();
      await page.waitForSelector("[role='menuitemcheckbox']");
      const row = page.getByRole("menuitemcheckbox", { name: /Pause animations/ });
      if (key === "click") await row.click();
      else { await row.focus(); await page.keyboard.press(key); }
      await settle(page);
      assert.equal(await row.getAttribute("aria-checked"), "true");
      assert.equal(await page.locator(".basalt-menu").count(), 1, "the menu stays open");
      assert.equal(await page.getByRole("switch", { name: "Pause animations" }).isChecked(), true, "the switch follows");
      assert.deepEqual((await page.evaluate(() => window.writes)).filter((w) => w.startsWith("basalt-loops")), ["basalt-loops=held"], "one write");
      const keys = page.getByRole("menuitemcheckbox", { name: "Single-key shortcuts" });
      assert.equal(await keys.getAttribute("aria-checked"), "true", "single keys are on by default");
      if (key === "click") await keys.click();
      else { await keys.focus(); await page.keyboard.press(key); }
      await settle(page);
      assert.equal(await keys.getAttribute("aria-checked"), "false");
      assert.equal(await page.getByRole("switch", { name: "Single-key shortcuts" }).isChecked(), false);
      assert.equal((await page.evaluate(() => window.writes)).filter((w) => w.startsWith("basalt-keys")).length, 1);
      await page.close();
    });
  }

  test("the loop row's description is the switch's, wraps, and `false` gives one line", async () => {
    const { page } = await open(render(`<B.Menu defaultOpen><B.MenuTrigger render={<B.Button>Options</B.Button>} /><B.MenuContent><B.LoopsToggleMenuItem /><B.LoopsToggleMenuItem description={false} /></B.MenuContent></B.Menu>`));
    await page.waitForSelector("[role='menuitemcheckbox']");
    const rows = await page.locator("[role='menuitemcheckbox']").evaluateAll((els) => els.map((el) => ({ described: el.hasAttribute("data-described"), text: el.querySelector(".basalt-menu-item-description")?.textContent ?? null })));
    assert.deepEqual(rows, [{ described: true, text: "Moving art and spinners hold still. Your work keeps running." }, { described: false, text: null }]);
    await page.close();
  });
});

describe("glyphs", () => {
  test("the source lint passes, and the generated modules and the skill's glyph table carry send and keyboard", async () => {
    const source = await import("../glyphs/source.mjs");
    assert.deepEqual(source.lint(), []);
    assert.ok(source.NAMES.includes("send") && source.NAMES.includes("keyboard"));
    assert.equal(source.GLYPHS.send.family, "rich");
    assert.equal(source.GLYPHS.send.seam, undefined, "send has no seam and no morph pair");
    assert.deepEqual(source.GLYPHS.keyboard.seam, [1, "start"]);
    const B = await import("../dist/index.js");
    assert.equal(typeof B.SendGlyph, "function");
    assert.equal(typeof B.KeyboardGlyph, "function");
    const table = JSON.parse(fs.readFileSync(new URL("../../../.agent/skills/basalt-html/parts/glyphs.json", import.meta.url), "utf8"));
    assert.ok(table.send && table.keyboard, "the skill's glyph table draws both");
  });
});

describe("Nav md's label", () => {
  test("the md label is 18/26; the pill, glyph and rail measure as before; becoming current moves 0px", async () => {
    const { page } = await open(`
function App() {
  const [current, setCurrent] = React.useState("a");
  window.go = setCurrent;
  return <B.Nav aria-label="Main"><B.NavItem href="#a" icon={B.HomeGlyph} current={current === "a"}>Recipes</B.NavItem><B.NavItem href="#b" icon={B.SearchGlyph} current={current === "b"}>Pantry</B.NavItem></B.Nav>;
}
${render("<App />")}`);
    await settle(page);
    const read = () => page.evaluate(() => [...document.querySelectorAll(".basalt-nav-item")].map((item) => {
      const label = item.querySelector(".basalt-nav-label");
      const pill = item.querySelector(".basalt-nav-pill").getBoundingClientRect();
      const glyph = item.querySelector(".basalt-nav-pill svg").getBoundingClientRect();
      return { size: getComputedStyle(label).fontSize, line: getComputedStyle(label).lineHeight, pill: [pill.height, pill.right], glyph: glyph.width };
    }));
    const before = await read();
    for (const item of before) {
      assert.equal(item.size, "18px");
      assert.equal(item.line, "26px");
      assert.equal(item.pill[0], 48);
      assert.equal(item.glyph, 24);
    }
    await page.evaluate(() => window.go("b"));
    await settle(page);
    const after = await read();
    assert.deepEqual(after.map((i) => i.pill), before.map((i) => i.pill), "the pill's far edge never moves when the page changes");
    await page.close();
  });

  test("the rail's circle is still 48", async () => {
    const { page } = await open(render(`<B.Nav aria-label="Main" collapsed><B.NavItem href="#a" icon={B.HomeGlyph} current>Recipes</B.NavItem></B.Nav>`));
    await settle(page);
    const pill = await page.locator(".basalt-nav-pill").boundingBox();
    assert.deepEqual([pill.width, pill.height], [48, 48]);
    await page.close();
  });
});

describe("CodeBlock line numbers and the sideways line", () => {
  const block = (props) => render(`<div style={{ width: 360 }}><B.CodeBlock ${props} /></div>`);
  const numbers = (page) => page.locator(".basalt-code-number").allTextContents();

  test("every source line: CRLF, blank lines inside, no number for a final newline; startLine; a continued line keeps its number", async () => {
    const { page } = await open(block(`code={"make bread\\r\\n\\r\\nrest dough \\\\\\n  --hours 2\\n"} lineNumbers startLine={40}`));
    await settle(page);
    assert.deepEqual(await numbers(page), ["40", "41", "42", "43"]);
    const style = await page.locator(".basalt-code-number").first().evaluate((el) => ({ select: getComputedStyle(el).userSelect, hidden: el.getAttribute("aria-hidden"), align: getComputedStyle(el).textAlign, pad: getComputedStyle(el).paddingInlineEnd }));
    assert.deepEqual(style, { select: "none", hidden: "true", align: "end", pad: "16px" });
    await page.close();
  });

  test("a selection and Copy carry no number", async () => {
    const { page } = await open(block(`code={"bake 20\\nrest 10"} lineNumbers`), { ...DESKTOP, permissions: ["clipboard-read", "clipboard-write"] });
    await settle(page);
    const selected = await page.evaluate(() => { const range = document.createRange(); range.selectNodeContents(document.querySelector(".basalt-code-pre")); getSelection().removeAllRanges(); getSelection().addRange(range); return getSelection().toString(); });
    assert.equal(/[12]\s*bake|^1/.test(selected), false, `the selection is ${JSON.stringify(selected)}`);
    await page.getByRole("button", { name: "Copy code" }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "bake 20\nrest 10");
    await page.close();
  });

  test("with prompt: the numbers' column, then the prompt's, then the text; with wrap the number sits on the first row", async () => {
    const { page } = await open(block(`code={"deploy --region north --replicas 3 --wait-for-healthy-checks"} lineNumbers prompt="$" wrap`));
    await settle(page);
    const order = await page.locator(".basalt-code-line").first().evaluate((line) => [...line.children].map((el) => el.className));
    assert.deepEqual(order, ["basalt-code-number", "basalt-code-gutter", "basalt-code-text"]);
    const rows = await page.evaluate(() => {
      const n = document.querySelector(".basalt-code-number").getBoundingClientRect();
      const text = document.querySelector(".basalt-code-text").getBoundingClientRect();
      return { first: Math.round(n.top) === Math.round(text.top), wrapped: text.height > 20 };
    });
    assert.deepEqual(rows, { first: true, wrapped: true });
    await page.close();
  });

  test("the sideways line shows only while the code overflows, and does not change as it scrolls", async () => {
    const { page } = await open(`
function App() {
  const [code, setCode] = React.useState("short");
  window.code = setCode;
  return <div style={{ width: 360 }}><B.CodeBlock code={code} /></div>;
}
${render("<App />")}`);
    await settle(page);
    const hint = page.locator(".basalt-code-hint");
    assert.equal(await hint.isVisible(), false);
    await page.evaluate(() => window.code("curl --request POST https://builds.example.com/api/v2/pipelines/main/trigger --data '{}'"));
    await settle(page);
    assert.equal(await hint.isVisible(), true);
    assert.equal(await hint.textContent(), "Scroll sideways to see the long lines");
    assert.equal(await hint.getAttribute("aria-hidden"), "true");
    const box = await hint.boundingBox();
    await page.locator(".basalt-code-pre").evaluate((el) => { el.scrollLeft = 200; });
    await settle(page);
    assert.deepEqual(await hint.boundingBox(), box, "nothing moves while it scrolls");
    assert.equal(await hint.textContent(), "Scroll sideways to see the long lines");
    await page.emulateMedia({ media: "print" });
    assert.equal(await hint.isVisible(), false, "absent in print");
    await page.close();
  });
});

describe("RichText", () => {
  const BODY = `<div style={{ width: 358 }}><B.Prose><B.RichText>
    <p>Run <code>buildServerPipelineTriggerForTheMainBranchWithEveryCheckAndEveryArtifactKept</code> after the bake.</p>
    <p>Send it to <a href="mailto:someone-with-a-very-long-address-for-a-recipe-box@example-kitchen-domain.example">the kitchen</a> or https://builds.example.com/api/v2/pipelines/main/trigger/with/a/very/long/path</p>
    <ul><li>Two loaves</li><li>One jar<ul><li>Plum</li></ul></li></ul>
    <h2>Notes</h2><blockquote><p>Rest the dough.</p></blockquote><hr /><pre><code>make bread --long-flag-that-runs-past-the-column-edge</code></pre>
  </B.RichText></B.Prose></div>`;
  for (const theme of ["dark", "light"]) {
    test(`${theme}: an 80-character identifier and a long address keep the column's width at 390; a pre scrolls; axe finds nothing`, async () => {
      const { page } = await open(render(BODY), PHONE, theme);
      await settle(page);
      const widths = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, view: document.documentElement.clientWidth, text: document.querySelector(".basalt-rich-text").scrollWidth, box: document.querySelector(".basalt-rich-text").clientWidth, pre: getComputedStyle(document.querySelector(".basalt-rich-text pre")).overflowWrap }));
      assert.equal(widths.page, widths.view, "the page never scrolls sideways");
      assert.equal(widths.text, widths.box, "nothing widens the column");
      assert.equal(widths.pre, "normal", "block code keeps scrolling sideways");
      const type = await page.evaluate(() => {
        const css = (sel, p) => getComputedStyle(document.querySelector(`.basalt-rich-text ${sel}`))[p];
        return { body: [css("p", "fontSize"), css("p", "lineHeight")], h2: [css("h2", "fontSize"), css("h2", "fontWeight")], code: css("p code", "fontFamily").includes("Mono"), quote: css("blockquote", "paddingInlineStart") };
      });
      assert.deepEqual(type, { body: ["14px", "20px"], h2: ["14px", "600"], code: true, quote: "16px" });
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }
});

describe("MenuText", () => {
  test("skipped by the arrows and type-ahead; it describes its group in the accessibility tree", async () => {
    const { page } = await open(render(`<B.Menu><B.MenuTrigger render={<B.Button>Sort</B.Button>} /><B.MenuContent>
      <B.MenuGroup><B.MenuGroupLabel>Order</B.MenuGroupLabel><B.MenuText>Pinned builds stay at the top whatever the order.</B.MenuText>
        <B.MenuItem>Newest first</B.MenuItem><B.MenuItem>Oldest first</B.MenuItem></B.MenuGroup>
    </B.MenuContent></B.Menu>`));
    await page.getByRole("button", { name: "Sort" }).focus();
    await page.keyboard.press("ArrowDown");
    await page.waitForSelector(".basalt-menu-text");
    const highlighted = () => page.evaluate(() => document.querySelector("[data-highlighted]")?.textContent ?? null);
    assert.equal(await highlighted(), "Newest first", "the first row, not the text");
    await page.keyboard.press("ArrowUp");
    assert.equal(await highlighted(), "Oldest first", "wraps past the text");
    await page.keyboard.type("P");
    assert.notEqual(await highlighted(), "Pinned builds stay at the top whatever the order.", "type-ahead never lands on it");
    const tree = await page.evaluate(() => {
      const text = document.querySelector(".basalt-menu-text");
      const group = text.closest("[role='group']");
      return { described: group.getAttribute("aria-describedby") === text.id, focusable: text.tabIndex, role: text.getAttribute("role") };
    });
    assert.deepEqual(tree, { described: true, focusable: -1, role: null });
    const snapshot = await page.locator("[role='group']").ariaSnapshot();
    assert.match(snapshot, /Pinned builds stay at the top/);
    const style = await page.locator(".basalt-menu-text").evaluate((el) => ({ size: getComputedStyle(el).fontSize, line: getComputedStyle(el).lineHeight, weight: getComputedStyle(el).fontWeight }));
    assert.deepEqual(style, { size: "13px", line: "18px", weight: "400" });
    await page.close();
  });
});

describe("forced colours and more contrast", () => {
  test("forced colours: an unavailable row at rest is GrayText with its reason CanvasText; lit, all of it is HighlightText; the scroll line and MenuText are system text", async () => {
    const { page } = await open(`${BUILDS}${render(`<><B.CommandMenu open onOpenChange={() => {}} groups={BUILDS} /><div style={{ width: 300 }}><B.CodeBlock code={"curl --request POST https://builds.example.com/api/v2/pipelines/main/trigger"} /></div></>`)}`, { ...DESKTOP, forcedColors: "active" });
    await page.waitForSelector("[cmdk-item]");
    await settle(page);
    const system = (value) => page.evaluate((v) => { const p = document.createElement("div"); p.style.color = v; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; }, value);
    const parts = () => page.evaluate(() => {
      const row = [...document.querySelectorAll("[cmdk-item]")].find((el) => el.textContent.includes("Deploy main"));
      return { title: getComputedStyle(row.querySelector(".basalt-menu-item-label")).color, reason: getComputedStyle(row.querySelector(".basalt-command-reason")).color };
    });
    assert.deepEqual(await parts(), { title: await system("HighlightText"), reason: await system("HighlightText") }, "lit: every part is HighlightText");
    await page.keyboard.press("ArrowDown");
    assert.deepEqual(await parts(), { title: await system("GrayText"), reason: await system("CanvasText") }, "at rest");
    const hint = await page.locator(".basalt-code-hint").evaluate((el) => ({ color: getComputedStyle(el).color, border: getComputedStyle(el).borderTopColor }));
    assert.deepEqual(hint, { color: await system("CanvasText"), border: await system("CanvasText") });
    await page.close();
  });

  test("more contrast: the reason at rest, the numbers, the scroll line and MenuText step tertiary to secondary", async () => {
    const { page } = await open(`${BUILDS}${render(`<><B.CommandMenu open onOpenChange={() => {}} groups={BUILDS} /><div style={{ width: 300 }}><B.CodeBlock code={"curl --request POST https://builds.example.com/api/v2/pipelines/main/trigger"} lineNumbers /></div></>`)}`, { ...DESKTOP, contrast: "more" });
    await page.waitForSelector("[cmdk-item]");
    await page.keyboard.press("ArrowDown");
    await settle(page);
    const colours = await page.evaluate(() => {
      const probe = document.createElement("div"); probe.style.color = "var(--basalt-text-secondary)"; document.body.append(probe); const secondary = getComputedStyle(probe).color; probe.remove();
      const row = [...document.querySelectorAll("[cmdk-item]")].find((el) => el.textContent.includes("Deploy main"));
      return { secondary, reason: getComputedStyle(row.querySelector(".basalt-command-reason")).color, number: getComputedStyle(document.querySelector(".basalt-code-number")).color, hint: getComputedStyle(document.querySelector(".basalt-code-hint")).color };
    });
    assert.equal(colours.reason, colours.secondary);
    assert.equal(colours.number, colours.secondary);
    assert.equal(colours.hint, colours.secondary);
    await page.close();
  });
});
