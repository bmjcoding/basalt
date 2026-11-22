// Engineering inside the decided design (DECISIONS 265, batch B0): CommandMenu's search for the app to read or control, and the ellipsis on a link in a still
// table's row head (a cut cell keeps its ellipsis, wherever the link sits).
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const frames = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

// Two unlike lists: a shared document's commands, and a support inbox's. The app's last row carries the words typed.
const MENU = (domain, controlled) => `
const DOMAINS = {
  docs: { label: "Document", commands: [{ id: "share", label: "Share document" }, { id: "export", label: "Export as PDF" }, { id: "history", label: "Version history" }], find: (s) => "Search this document for “" + s + "”" },
  inbox: { label: "Inbox", commands: [{ id: "assign", label: "Assign to me" }, { id: "close", label: "Close ticket" }, { id: "snooze", label: "Snooze for a day" }], find: (s) => "Search all tickets for “" + s + "”" },
};
const D = DOMAINS[${JSON.stringify(domain)}];
window.heard = [];
function App() {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const change = (s) => { window.heard.push(s); setSearch(s); };
  const groups = [{ label: D.label, commands: D.commands }, ...(search ? [{ label: "Search", commands: [{ id: "find", label: D.find(search), keywords: [search], onSelect: () => { window.found = search; } }] }] : [])];
  return <><button id="trigger" onClick={() => setOpen(true)}>Commands</button><B.CommandMenu open={open} onOpenChange={(o) => { setOpen(o); ${controlled ? 'if (!o) setSearch("");' : ""} }} groups={groups} ${controlled ? "search={search}" : ""} onSearchChange={change} /></>;
}
createRoot(document.getElementById("root")).render(<App />);`;

const rows = (page) => page.evaluate(() => [...document.querySelectorAll("[cmdk-item]")].map((row) => row.textContent));

describe("CommandMenu exposes what is typed", () => {
  for (const [domain, word, label] of [["docs", "budget", "Search this document for “budget”"], ["inbox", "refund", "Search all tickets for “refund”"]]) {
    test(`a controlled search: the app hears each change, a row carries the words, and the app clears it on close (${domain})`, async () => {
      const { page, errors } = await fixturePage(browser, MENU(domain, true));
      await page.click("#trigger");
      await page.waitForSelector("[cmdk-item]");
      await page.keyboard.type(word);
      await frames(page);
      assert.equal(await page.locator(".basalt-command-input").inputValue(), word);
      assert.equal((await page.evaluate(() => window.heard)).at(-1), word);
      assert.deepEqual(await rows(page), [label], "the app's row carries the words and is what matches");
      await page.keyboard.press("Enter");
      assert.equal(await page.evaluate(() => window.found), word, "the row runs with the words");
      await settle(page);
      await page.click("#trigger");
      await page.waitForSelector("[cmdk-item]");
      assert.equal(await page.locator(".basalt-command-input").inputValue(), "", "cleared by the app's onOpenChange");
      assert.deepEqual(errors, []);
      await page.close();
    });
  }

  test("a menu that keeps its own search tells the app once it has closed, so the next opening starts empty and in step", async () => {
    const { page, errors } = await fixturePage(browser, MENU("docs", false));
    await page.click("#trigger");
    await page.waitForSelector("[cmdk-item]");
    await page.keyboard.type("pdf");
    await frames(page);
    assert.deepEqual(await page.evaluate(() => window.heard), ["p", "pd", "pdf"]);
    assert.ok((await rows(page)).includes("Search this document for “pdf”"));
    await page.keyboard.press("Escape");
    await settle(page);
    assert.equal((await page.evaluate(() => window.heard)).at(-1), "", "told the search is empty once the menu has closed");
    await page.click("#trigger");
    await page.waitForSelector("[cmdk-item]");
    assert.equal(await page.locator(".basalt-command-input").inputValue(), "");
    assert.equal((await rows(page)).some((row) => row.startsWith("Search this document")), false);
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("the list does not change on its way out: the closing menu keeps the filtered rows", async () => {
    const { page } = await fixturePage(browser, MENU("inbox", false));
    await page.click("#trigger");
    await page.waitForSelector("[cmdk-item]");
    await page.keyboard.type("snooze");
    await frames(page);
    const before = await rows(page);
    await page.keyboard.press("Escape");
    await frames(page);
    const during = await rows(page);
    assert.ok(during.length === 0 || JSON.stringify(during) === JSON.stringify(before), `rows while closing: ${JSON.stringify(during)}`);
    await page.close();
  });
});

// A still table with a pinned row head that holds a link, at 390: the link is cut with an ellipsis, as a link in a data cell is. Two unlike tables: a build
// pipeline's jobs and a shared folder's documents.
const TABLE = (rows) => `
createRoot(document.getElementById("root")).render(
  <B.Table columns={[{ width: 120 }, { width: 140 }, { width: 140 }, {}]} minWidth={660} pinned={1} aria-label="Items">
    <B.TableHeader><B.TableRow><B.TableHead>Name</B.TableHead><B.TableHead>Opens in a new tab</B.TableHead><B.TableHead>Owner</B.TableHead><B.TableHead>Note</B.TableHead></B.TableRow></B.TableHeader>
    <B.TableBody>${rows.map(([name, owner, note]) => `<B.TableRow><B.TableRowHead><a className="basalt-link" href="#x">${name}</a></B.TableRowHead><B.TableRowHead><B.Link href="#z" target="_blank">${name}</B.Link></B.TableRowHead><B.TableCell><a className="basalt-link" href="#y">${owner}</a></B.TableCell><B.TableCell>${note}</B.TableCell></B.TableRow>`).join("")}</B.TableBody>
  </B.Table>,
);`;

describe("a link in a still table's row head keeps its ellipsis", () => {
  for (const [domain, rows] of [
    ["pipeline", [["integration-tests-linux-arm64", "release-engineering-team", "Waiting for a runner"], ["lint", "web-platform", "Passed"]]],
    ["documents", [["Quarterly planning notes and budget draft", "finance-and-operations", "Shared with 4 people"], ["Readme", "docs", "Edited today"]]],
  ]) {
    for (const theme of THEMES) {
      test(`at 390, a cut link in the pinned th ends in an ellipsis, as one in a td does, and a short one is whole (${domain}, ${theme})`, async () => {
        const { page, errors } = await fixturePage(browser, TABLE(rows), { theme, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
        await settle(page);
        const links = await page.evaluate(() => [...document.querySelectorAll("tbody tr")].map((row) => [...row.querySelectorAll(":scope > :is(th, td) > a")].map((a) => {
          const cs = getComputedStyle(a);
          return { cell: a.parentElement.tagName, display: cs.display, overflow: cs.overflowX, ellipsis: cs.textOverflow, cut: a.scrollWidth > a.clientWidth, sticky: getComputedStyle(a.parentElement).position };
        })));
        const [longRow, shortRow] = links;
        assert.equal(longRow[0].cell, "TH");
        assert.equal(longRow[0].sticky, "sticky", "the row head is pinned");
        for (const link of [longRow[0], longRow[2]]) {
          assert.deepEqual({ display: link.display, overflow: link.overflow, ellipsis: link.ellipsis }, { display: "block", overflow: "hidden", ellipsis: "ellipsis" }, `${link.cell} > a`);
          assert.ok(link.cut, `the long ${link.cell} link is cut (so its ellipsis shows)`);
        }
        assert.equal(shortRow[0].cut, false, "a short name is whole");
        // A new-tab link in a row head (the case that was cut hard: its label and arrow are a row of their own): the label truncates and the arrow stays whole.
        const newTab = await page.evaluate(() => {
          const a = document.querySelector("tbody tr:first-child > th:nth-child(2) > a[data-new-tab]");
          const label = a.querySelector(".basalt-link-label");
          const arrow = a.querySelector(".basalt-external");
          const cell = a.parentElement.getBoundingClientRect();
          const cs = getComputedStyle(label);
          return { display: getComputedStyle(a).display, ellipsis: cs.textOverflow, cut: label.scrollWidth > label.clientWidth, arrowInside: arrow.getBoundingClientRect().right <= cell.right + 0.5 };
        });
        assert.deepEqual(newTab, { display: "flex", ellipsis: "ellipsis", cut: true, arrowInside: true });
        // The link is the cell's one stop, as a link in a data cell is: the cell is not made a second one.
        assert.equal(await page.locator("tbody tr:first-child > th:nth-child(1)").getAttribute("tabindex"), null);
        assert.deepEqual(errors, []);
        await page.close();
      });
    }
  }
});

// The README's pattern for a menu trigger that is off for now: a Button with `disabled` and `focusableWhenDisabled`, and a controlled open state. Proven here so
// the docs say what happens.
const OFF_TRIGGER = `
function App() {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(0);
  const off = selected === 0;
  return <>
    <button id="before">Before</button>
    <B.Menu open={open && !off} onOpenChange={(next) => setOpen(next && !off)}>
      <B.MenuTrigger render={<B.Button size="sm" disabled={off} focusableWhenDisabled>Move to</B.Button>} />
      <B.MenuContent><B.MenuItem>Archive</B.MenuItem><B.MenuItem>Shared folder</B.MenuItem></B.MenuContent>
    </B.Menu>
    <button id="choose" onClick={() => setSelected(1)}>Choose one</button>
  </>;
}
createRoot(document.getElementById("root")).render(<App />);`;

describe("a menu trigger that is off for now", () => {
  test("it stays in the Tab order and keeps focus, says it is off, opens on neither a key nor a press, and opens once it is on", async () => {
    const { page, errors } = await fixturePage(browser, OFF_TRIGGER);
    await page.focus("#before");
    await page.keyboard.press("Tab");
    const trigger = page.getByRole("button", { name: "Move to" });
    assert.equal(await trigger.evaluate((el) => el === document.activeElement), true, "Tab reaches it");
    assert.equal(await trigger.getAttribute("aria-disabled"), "true");
    for (const key of ["Enter", " ", "ArrowDown"]) {
      await page.keyboard.press(key);
      await frames(page);
      assert.equal(await page.getByRole("menu").count(), 0, `${JSON.stringify(key)} opens nothing`);
      assert.equal(await trigger.evaluate((el) => el === document.activeElement), true, "focus stays on it");
    }
    await trigger.click({ force: true });
    await frames(page);
    assert.equal(await page.getByRole("menu").count(), 0, "a press opens nothing");
    await page.click("#choose");
    await trigger.click();
    await page.getByRole("menuitem", { name: "Archive" }).waitFor();
    assert.deepEqual(errors, []);
    await page.close();
  });
});
