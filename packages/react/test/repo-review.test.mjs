// The repo-wide review of 23 Nov 2026 (slices B and D): engineering fixes that restore documented behaviour, each tested by the component it is about.
// No pixel changes. Server renders run in Node; the rest in Chromium against the built package with the real stylesheet. Synthetic data only.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import * as React from "react";
import { renderToString } from "react-dom/server";

import * as B from "../dist/index.js";
import { takeClick } from "../dist/wait.js";
import { fixturePage, launch, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const h = React.createElement;
const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;

describe("Select", () => {
  test("a numeric Select with no options renders its placeholder (the widest label of none is no width, not a thrown RangeError)", () => {
    const html = renderToString(h(B.Select, { numeric: true, options: [], placeholder: "Pick", "aria-label": "Count" }));
    assert.match(html, /Pick/);
    assert.doesNotMatch(html, /data-widest/, "no reservation for an empty list");
    assert.match(renderToString(h(B.Select, { numeric: true, options: [{ value: "1", label: "10" }, { value: "2", label: "200" }], "aria-label": "Count" })), /data-widest="888"/, "a list keeps its widest label's width");
  });
});

describe("Field required", () => {
  test("a Textarea, a Select and a Combobox in a required Field carry required, and an explicit required={false} wins", () => {
    const inField = (control) => renderToString(h(B.Field, { label: "Notes", required: true }, control));
    assert.match(inField(h(B.Textarea, {})), /<textarea[^>]*required/);
    assert.match(inField(h(B.Select, { options: [{ value: "a", label: "A" }], name: "pick" })), /<input[^>]*required/, "the Select's form input is required");
    assert.match(inField(h(B.Combobox, { options: [{ value: "a", label: "A" }] })), /<input[^>]*required/);
    assert.doesNotMatch(inField(h(B.Textarea, { required: false })), /<textarea[^>]*required/);
    assert.doesNotMatch(renderToString(h(B.Field, { label: "Notes" }, h(B.Textarea, {}))), /<textarea[^>]*required/, "an optional field's control is not required");
  });
});

describe("Chart", () => {
  test("values too large for a padded scale draw in finite time (the step search and the gridlines are bounded, not counted by an infinite exponent)", () => {
    const started = Date.now();
    for (const values of [[1.7e308, 1.7e308], [-1.7e308, 1.7e308], [5e307, 1.79e308]]) {
      for (const kind of ["line", "bar"]) renderToString(h(B.TimeChart, { kind, title: "Huge", days: ["2026-11-01", "2026-11-02"], series: [{ name: "Load", values }], format: String, spoken: String, now: Date.UTC(2026, 10, 3) }));
    }
    assert.ok(Date.now() - started < 5000);
  });
});

describe("takeClick", () => {
  test("when both handlers return promises the press waits for both to settle, and the first failure is raised after", async () => {
    let finishOwn;
    let failGiven;
    const given = h("button", { onClick: () => new Promise((_, reject) => { failGiven = reject; }) });
    const [, press] = takeClick(given, () => new Promise((resolve) => { finishOwn = resolve; }));
    let settled = false;
    const result = Promise.resolve(press({})).then(() => "fulfilled", (error) => error.message).finally(() => { settled = true; });
    failGiven(new Error("given failed"));
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(settled, false, "one rejection does not free the press while the other is still running");
    finishOwn("done");
    assert.equal(await result, "given failed");
  });
});

describe("MenuItem", () => {
  test("a render element's own promise holds the menu as the item's does: the trigger is busy and the menu does not open again until the answer", async () => {
    const { page } = await fixturePage(browser, `window.calls = 0; window.answers = [];
      const ask = () => { window.calls++; return new Promise((resolve) => window.answers.push(resolve)); };
      ${render(`<B.Menu><B.MenuTrigger render={<B.Button data-testid="trigger">Send to</B.Button>} /><B.MenuContent>
        <B.MenuItem data-testid="item" render={<div onClick={ask} />}>Copy the summary</B.MenuItem></B.MenuContent></B.Menu>`)}`);
    try {
      const trigger = page.getByTestId("trigger");
      await trigger.click({ force: true });
      await page.getByTestId("item").click({ force: true });
      await settle(page);
      assert.equal(await trigger.getAttribute("aria-busy"), "true");
      await trigger.click({ force: true });
      await page.waitForTimeout(150);
      assert.equal(await page.getByTestId("item").count(), 0, "the menu does not open while the answer is to come");
      assert.equal(await page.evaluate(() => window.calls), 1);
      await page.evaluate(() => window.answers.shift()());
      await page.waitForFunction(() => document.querySelector("[data-testid=trigger]")?.getAttribute("aria-busy") === null);
    } finally { await page.close(); }
  });
});

describe("LinkTabs", () => {
  test("under 720 the Select does not send the page to a script URL that React refuses in the row's anchor: nothing runs, and it says why", async () => {
    const { page } = await fixturePage(browser, render(`<B.LinkTabs aria-label="Sections"><B.LinkTab href="/one" current>One</B.LinkTab><B.LinkTab href={"javascript:window.ran=1"}>Two</B.LinkTab></B.LinkTabs>`), { viewport: { width: 390, height: 800 } });
    const logged = [];
    page.on("console", (message) => { if (message.type() === "error") logged.push(message.text()); });
    try {
      await page.locator(".basalt-link-tabs-select .basalt-select-trigger").click();
      await page.getByRole("option", { name: "Two" }).click();
      await settle(page);
      assert.equal(await page.evaluate(() => window.ran), undefined, "the script URL did not run");
      assert.ok(logged.some((text) => /will not navigate/.test(text)), logged.join("\n"));
    } finally { await page.close(); }
  });
});

describe("CommandList", () => {
  test("mounting under Strict Mode leaves focus where it was (the replayed effect is not taken for Back)", async () => {
    const { page } = await fixturePage(browser, `const GROUPS = [{ heading: "Go", items: [{ id: "a", label: "Alpha", onSelect: () => {} }, { id: "b", label: "Beta", onSelect: () => {} }] }];
      function App() { const [shown, setShown] = React.useState(false); window.show = () => setShown(true);
        return <React.StrictMode><button id="held">Held</button>{shown ? <B.CommandList label="Commands" groups={GROUPS} detail={(c) => <h3>{c.label}</h3>} /> : null}</React.StrictMode>; }
      ${render("<App />")}`);
    try {
      await page.locator("#held").focus();
      await page.evaluate(() => window.show());
      await page.locator(".basalt-command-split, .basalt-command").first().waitFor();
      await settle(page);
      assert.equal(await page.evaluate(() => document.activeElement?.id), "held");
    } finally { await page.close(); }
  });
});

describe("scroll stops", () => {
  test("a drawer body whose only button is hidden is still a keyboard stop, and becomes one again when the button is hidden later", async () => {
    const LONG = `Array.from({ length: 40 }, (_, i) => <p key={i} style={{ margin: 0 }}>Log line {i}</p>)`;
    const { page } = await fixturePage(browser, render(`<main style={{ padding: 16 }}>
      <B.Drawer id="drawer" label="Logs" rows={13}>
        <B.DrawerSection title="Session"><div>{[...${LONG}, <button key="h" id="gone" style={{ display: "none" }}>Hidden</button>]}</div></B.DrawerSection>
        <B.DrawerSection title="Sources"><div>{[...${LONG}, <button key="v" id="shown">Shown</button>]}</div></B.DrawerSection>
      </B.Drawer></main>`), { viewport: { width: 1440, height: 900 } });
    try {
      await page.locator(".basalt-drawer-body").first().waitFor();
      await settle(page);
      assert.deepEqual(await page.locator(".basalt-drawer-body").evaluateAll((els) => els.map((el) => el.getAttribute("tabindex"))), ["0", null]);
      await page.evaluate(() => { document.getElementById("shown").style.visibility = "hidden"; });
      await page.waitForFunction(() => document.querySelectorAll(".basalt-drawer-body")[1].getAttribute("tabindex") === "0");
    } finally { await page.close(); }
  });
});

describe("DialogContent", () => {
  test("a control a live region holds outside the dialog stays inert when the dialog's ref changes, and one that mounts there later is made inert too", async () => {
    const { page } = await fixturePage(browser, `function App() {
        const [n, setN] = React.useState(0); const [more, setMore] = React.useState(false);
        window.bump = () => setN((x) => x + 1); window.more = () => setMore(true);
        const ref = React.useCallback((el) => { window.popup = el; }, [n]);
        return <><div aria-live="polite"><button id="live">Undo</button>{more ? <button id="later">Redo</button> : null}</div>
          <B.Dialog defaultOpen><B.DialogContent ref={ref}><B.DialogTitle>Settings</B.DialogTitle><button id="inside">Save</button></B.DialogContent></B.Dialog></>; }
      ${render("<App />")}`);
    try {
      await page.locator("#inside").waitFor();
      await page.waitForFunction(() => document.getElementById("live").hasAttribute("inert"));
      await page.evaluate(() => window.bump());
      await settle(page);
      assert.equal(await page.evaluate(() => document.getElementById("live").hasAttribute("inert")), true, "a new ref keeps the guard");
      assert.equal(await page.evaluate(() => window.popup?.isConnected), true, "the new ref has the popup");
      await page.evaluate(() => window.more());
      await page.waitForFunction(() => document.getElementById("later")?.hasAttribute("inert"));
      assert.equal(await page.evaluate(() => document.getElementById("inside").hasAttribute("inert")), false);
    } finally { await page.close(); }
  });
});
