// Overlays and search (DECISIONS 155): the wide dialog, the sheet's head, body, foot and steps, the docked drawer, the search trigger and
// dialog, the listbox, the opening list and the notice bar. Driven in Chromium against the built package with the real stylesheet, in both themes.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const px = (value) => Number.parseFloat(value);
const style = (locator, ...props) => locator.evaluate((el, props) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]])), props);
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });

/** The colour a token resolves to, as getComputedStyle writes it. */
const resolve = (page, token, property = "backgroundColor") => page.evaluate(([token, property]) => {
  const probe = document.createElement("div");
  probe.style[property] = `var(--basalt-${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe)[property];
  probe.remove();
  return value;
}, [token, property]);

const axe = async (page) => {
  await page.evaluate(() => { document.title = "Overlays"; document.documentElement.lang = "en"; document.body.style.background = "var(--basalt-surface-page)"; });
  await settle(page);
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(() => window.axe.run(
    { exclude: [["[data-base-ui-focus-guard]"]] },
    { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] },
  ));
  return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => `${n.target.join(" ")} ${n.any.map((c) => c.message).join(" ")}`).slice(0, 3).join("; ")})`);
};

const open = (body, options) => fixturePage(browser, `createRoot(document.getElementById("root")).render(${body});`, options);

// ---- The wide dialog (D10a) ----

const WIDE = `<B.Dialog defaultOpen><B.DialogContent size="wide"><B.DialogTitle>Help</B.DialogTitle><B.DialogDescription>Keys and commands.</B.DialogDescription><button type="button" id="first">Try</button><B.DialogActions><B.DialogClose>Close</B.DialogClose></B.DialogActions></B.DialogContent></B.Dialog>`;

for (const theme of ["dark", "light"]) {
  describe(`the wide dialog (${theme})`, () => {
    test("is 992 wide, with Basalt's padding, radius and scroll, and shrinks to the viewport less 2 × 16", async () => {
      const { page } = await open(WIDE, { theme, viewport: { width: 1440, height: 900 } });
      await settle(page);
      const dialog = page.locator(".basalt-dialog");
      assert.equal((await box(dialog)).width, 992);
      const s = await style(dialog, "paddingTop", "borderTopLeftRadius", "overflowY");
      assert.deepEqual(s, { paddingTop: "24px", borderTopLeftRadius: "12px", overflowY: "auto" });
      await page.setViewportSize({ width: 390, height: 800 });
      await settle(page);
      assert.equal((await box(dialog)).width, 390 - 32);
      await page.close();
    });

    test("the first focus is the title, not the first button, so Enter on opening runs nothing; a dialog without size still focuses its first control", async () => {
      const { page } = await open(WIDE, { theme });
      await settle(page);
      assert.equal(await page.evaluate(() => document.activeElement?.className), "basalt-dialog-title");
      assert.equal(await page.locator(".basalt-dialog-title").getAttribute("tabindex"), "-1");
      assert.equal((await style(page.locator(".basalt-dialog-title"), "outlineStyle")).outlineStyle, "none", "a title nothing operates draws no ring");
      await page.close();
      const plain = await open(`<B.Dialog defaultOpen><B.DialogContent><B.DialogTitle>Plain</B.DialogTitle><button type="button" id="first">Try</button></B.DialogContent></B.Dialog>`, { theme });
      await settle(plain.page);
      assert.equal(await plain.page.evaluate(() => document.activeElement?.id), "first");
      await plain.page.close();
    });

    test("axe finds nothing", async () => {
      const { page } = await open(WIDE, { theme });
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  });
}

// ---- The sheet: head, body, foot and steps (D10b) ----

const CART = (side = "right") => `(() => {
  function Cart() {
    const [step, setStep] = React.useState("cart");
    return (
      <B.Sheet defaultOpen>
        <B.SheetContent side="${side}" step={step}>
          <B.SheetHeader closeLabel="Close cart"><B.SheetTitle>{step === "cart" ? "Your cart" : "Order summary"}</B.SheetTitle><B.SheetDescription>3 items</B.SheetDescription></B.SheetHeader>
          <B.SheetBody tabIndex={0}>{step === "cart" ? <ul>{Array.from({ length: 40 }, (_, i) => <li key={i}>Line {i}</li>)}</ul> : <p>The summary</p>}</B.SheetBody>
          <B.SheetFooter><button type="button" id="review" onClick={() => setStep(step === "cart" ? "summary" : "cart")}>Review order</button></B.SheetFooter>
        </B.SheetContent>
      </B.Sheet>
    );
  }
  return <Cart />;
})()`;

for (const theme of ["dark", "light"]) {
  describe(`the sheet's anatomy (${theme})`, () => {
    test("the sheet has no padding of its own; the head is 20/28 at 600 over a 13px count with a 44px close, on a divider; the foot is on a divider", async () => {
      const { page } = await open(CART(), { theme, viewport: { width: 1440, height: 900 } });
      await settle(page);
      assert.equal((await style(page.locator(".basalt-sheet"), "paddingTop", "paddingLeft")).paddingTop, "0px");
      const title = await style(page.locator(".basalt-sheet-head .basalt-dialog-title"), "fontSize", "lineHeight", "fontWeight", "letterSpacing");
      assert.deepEqual(title, { fontSize: "20px", lineHeight: "28px", fontWeight: "600", letterSpacing: "-0.3px" });
      const count = await style(page.locator(".basalt-sheet-head .basalt-dialog-description"), "fontSize", "lineHeight", "color");
      assert.equal(count.fontSize, "13px");
      assert.equal(count.lineHeight, "18px");
      assert.equal(count.color, await resolve(page, "text-tertiary", "color"));
      const close = await box(page.locator(".basalt-sheet-close"));
      assert.deepEqual([close.width, close.height], [44, 44], "44 at every pointer");
      assert.equal(await page.locator(".basalt-sheet-close").getAttribute("aria-label"), "Close cart");
      const head = await style(page.locator(".basalt-sheet-head"), "borderBottomWidth", "borderBottomColor", "paddingLeft", "paddingRight", "paddingTop");
      assert.deepEqual([head.borderBottomWidth, head.paddingLeft, head.paddingRight, head.paddingTop], ["1px", "20px", "12px", "12px"]);
      assert.equal(head.borderBottomColor, await resolve(page, "border-divider", "borderBottomColor"));
      const foot = await style(page.locator(".basalt-sheet-foot"), "borderTopWidth", "borderTopColor", "paddingTop", "paddingLeft", "paddingBottom");
      assert.deepEqual([foot.borderTopWidth, foot.paddingTop, foot.paddingLeft, foot.paddingBottom], ["1px", "16px", "20px", "20px"]);
      assert.equal(foot.borderTopColor, await resolve(page, "border-divider", "borderTopColor"));
      await page.close();
    });

    test("the body scrolls between the head and the foot, and neither moves", async () => {
      const { page } = await open(CART(), { theme, viewport: { width: 1440, height: 700 } });
      await settle(page);
      const head = await box(page.locator(".basalt-sheet-head"));
      const foot = await box(page.locator(".basalt-sheet-foot"));
      const sheet = await box(page.locator(".basalt-sheet"));
      assert.equal(foot.y + foot.height, sheet.y + sheet.height, "the foot is at the sheet's bottom");
      const scrolls = await page.locator(".basalt-sheet-body").evaluate((el) => { el.scrollTop = 100; return [el.scrollTop, el.scrollHeight > el.clientHeight]; });
      assert.deepEqual(scrolls, [100, true]);
      assert.deepEqual(await box(page.locator(".basalt-sheet-head")), head, "the head did not move while the body scrolled");
      assert.deepEqual(await box(page.locator(".basalt-sheet-foot")), foot, "nor the foot");
      await page.close();
    });

    test("changing the step moves focus to the title (inside the sheet), and scrolls the body to its top; the first step is not a change", async () => {
      const { page } = await open(CART(), { theme, viewport: { width: 1440, height: 700 } });
      await settle(page);
      assert.notEqual(await page.evaluate(() => document.activeElement?.className), "basalt-dialog-title", "opening focuses the first control, not the title");
      await page.locator(".basalt-sheet-body").evaluate((el) => { el.scrollTop = 300; });
      await page.locator("#review").click();
      await page.waitForFunction(() => document.activeElement?.classList.contains("basalt-dialog-title"));
      assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Order summary", "focus is on the new title, so it is read out");
      assert.equal(await page.locator(".basalt-sheet-body").evaluate((el) => el.scrollTop), 0);
      await page.locator("#review").click();
      await page.waitForFunction(() => document.activeElement?.textContent === "Your cart");
      await page.close();
    });

    test("the sheet's motion and its scrim are Basalt's: 300ms in, 225ms out, the scrim 80% black in dark and 40% in light, unblurred", async () => {
      const { page } = await open(CART(), { theme, viewport: { width: 1440, height: 700 } });
      await settle(page);
      assert.equal((await style(page.locator(".basalt-sheet"), "transitionDuration")).transitionDuration, "0.3s, 0.3s");
      const scrim = await style(page.locator(".basalt-sheet-backdrop"), "backgroundColor", "backdropFilter");
      assert.equal(scrim.backgroundColor, await resolve(page, "scrim"));
      assert.equal(scrim.backdropFilter, "none");
      await page.close();
    });

    test("axe finds nothing, and a left sheet and a bottom sheet take the same anatomy", async () => {
      for (const side of ["right", "left", "bottom"]) {
        const { page } = await open(CART(side), { theme });
        assert.deepEqual(await axe(page), [], side);
        assert.equal((await style(page.locator(".basalt-sheet"), "paddingBottom")).paddingBottom, "0px", `${side}: no sheet padding`);
        await page.close();
      }
    });
  });
}

// ---- The drawer (D10b) ----

const DRAWER = (extra = "") => `(() => {
  function Page() {
    const [open, setOpen] = React.useState(true);
    return (
      <main>
        <B.DrawerTrigger drawer="log" open={open} onClick={() => setOpen(!open)}>Session</B.DrawerTrigger>
        <B.Drawer id="log" label="The session and the sources" open={open} ${extra}>
          <B.DrawerSection title="Session" actions={<button type="button">replay</button>}><p>a line</p></B.DrawerSection>
          <B.DrawerSection title="Sources"><button type="button">refresh</button></B.DrawerSection>
        </B.Drawer>
      </main>
    );
  }
  return <Page />;
})()`;

for (const theme of ["dark", "light"]) {
  describe(`the drawer (${theme})`, () => {
    test("is in the flow: no portal, no scrim, no shadow, no fill, no rim, no corner; its one mark is a divider along its top", async () => {
      const { page } = await open(DRAWER(), { theme, viewport: { width: 1440, height: 900 } });
      await settle(page);
      const drawer = page.locator(".basalt-drawer");
      assert.equal(await drawer.evaluate((el) => el.parentElement?.tagName), "MAIN", "it is where it was put: no portal");
      assert.equal(await page.locator(".basalt-dialog-backdrop").count(), 0);
      const s = await style(drawer, "position", "boxShadow", "backgroundColor", "borderTopWidth", "borderTopColor", "borderBottomWidth", "borderLeftWidth", "borderTopLeftRadius", "paddingTop", "transform");
      assert.deepEqual([s.position, s.boxShadow, s.backgroundColor, s.borderTopWidth, s.borderBottomWidth, s.borderLeftWidth, s.borderTopLeftRadius, s.transform], ["static", "none", "rgba(0, 0, 0, 0)", "1px", "0px", "0px", "0px", "none"]);
      assert.equal(s.borderTopColor, await resolve(page, "border-divider", "borderTopColor"), "the divider, never brighter than the rim");
      assert.equal(await drawer.getAttribute("data-level"), null, "it has no level");
      await page.close();
    });

    test("is 13 rows of 24 tall, each half scrolls inside, and the page does not move when it opens and closes below it", async () => {
      const { page } = await open(DRAWER(), { theme, viewport: { width: 1440, height: 900 } });
      await settle(page);
      assert.equal((await box(page.locator(".basalt-drawer"))).height, 13 * 24);
      const bodies = await page.locator(".basalt-drawer-body").evaluateAll((els) => els.map((el) => getComputedStyle(el).overflowY));
      assert.deepEqual(bodies, ["auto", "auto"]);
      const trigger = await box(page.locator(".basalt-button").first());
      await page.locator(".basalt-button").first().click();
      assert.equal(await page.locator(".basalt-drawer").getAttribute("hidden"), "");
      assert.deepEqual(await box(page.locator(".basalt-button").first()), trigger, "what is above it does not move");
      await page.close();
      const rows = await open(DRAWER("rows={8}"), { theme });
      assert.equal((await box(rows.page.locator(".basalt-drawer"))).height, 8 * 24);
      await rows.page.close();
    });

    test("the trigger says which drawer it controls and whether it is open; the halves are named groups; the region is named", async () => {
      const { page } = await open(DRAWER(), { theme });
      const trigger = page.locator(".basalt-button").first();
      assert.equal(await trigger.getAttribute("aria-controls"), "log");
      assert.equal(await trigger.getAttribute("aria-expanded"), "true");
      await trigger.click();
      assert.equal(await trigger.getAttribute("aria-expanded"), "false");
      assert.equal(await page.locator("#log").count(), 1, "closed, it is still in the document, so aria-controls always points at it");
      await trigger.click();
      assert.equal(await page.locator("section#log").getAttribute("aria-label"), "The session and the sources");
      const names = await page.locator(".basalt-drawer-section").evaluateAll((els) => els.map((el) => document.getElementById(el.getAttribute("aria-labelledby")).textContent));
      assert.deepEqual(names, ["Session", "Sources"]);
      await page.close();
    });

    test("under 720 it is a page: its halves stack on a divider, it is as tall as its content, and Back appears (and is gone from 720)", async () => {
      const { page } = await open(DRAWER("onBack={() => {}}"), { theme, viewport: { width: 390, height: 800 } });
      await settle(page);
      const s = await style(page.locator(".basalt-drawer"), "display", "borderTopWidth");
      assert.deepEqual(s, { display: "block", borderTopWidth: "0px" });
      const [a, b] = await page.locator(".basalt-drawer-section").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
      assert.ok(b > a, "stacked");
      assert.equal((await style(page.locator(".basalt-drawer-section").nth(1), "borderTopWidth")).borderTopWidth, "1px");
      assert.ok((await box(page.locator(".basalt-drawer-back"))).height > 0, "Back is drawn");
      await page.setViewportSize({ width: 1000, height: 800 });
      assert.equal((await style(page.locator(".basalt-drawer-back"), "display")).display, "none");
      await page.close();
    });

    test("axe finds nothing", async () => {
      const { page } = await open(DRAWER(), { theme });
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  });
}

// ---- The drawer on a phone, as an app does it (D10b): open, it replaces the record; Back restores the record and returns focus to the trigger ----

const PHONE_APP = `(() => {
  const subscribe = (notify) => { const q = window.matchMedia("(max-width: 719px)"); q.addEventListener("change", notify); return () => q.removeEventListener("change", notify); };
  function App() {
    const [open, setOpen] = React.useState(true);
    const phone = React.useSyncExternalStore(subscribe, () => window.matchMedia("(max-width: 719px)").matches, () => false);
    const trigger = React.useRef(null);
    return (
      <main>
        <B.Card id="record" hidden={open && phone}><h2>The record</h2><p>Synthetic details.</p></B.Card>
        <B.DrawerTrigger ref={trigger} drawer="session" open={open} onClick={() => setOpen(!open)}>Session</B.DrawerTrigger>
        <B.Drawer id="session" label="The session" open={open} onBack={() => { setOpen(false); trigger.current?.focus(); }}>
          <B.DrawerSection title="Session"><button type="button">replay</button></B.DrawerSection>
          <B.DrawerSection title="Sources"><button type="button">refresh</button></B.DrawerSection>
        </B.Drawer>
      </main>
    );
  }
  return <App />;
})()`;

/** The names the browser exposes to assistive technology: every node that is not ignored. */
const exposed = async (page) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Accessibility.enable");
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  return nodes.filter((n) => !n.ignored).map((n) => n.name?.value).filter(Boolean);
};

for (const theme of ["dark", "light"]) {
  describe(`the drawer on a phone (${theme})`, () => {
    test("at 390 an open drawer replaces the record; Back closes it, shows the record again and puts focus on the trigger", async () => {
      const { page } = await open(PHONE_APP, { theme, viewport: { width: 390, height: 800 } });
      await settle(page);
      const trigger = page.getByRole("button", { name: "Session" });
      // Open: the record is not shown and not exposed; the drawer's page, with Back, is.
      assert.equal(await page.locator("#record").evaluate((el) => el.offsetHeight), 0, "the record is not drawn");
      let names = await exposed(page);
      assert.ok(!names.includes("The record"), "the record is out of the accessibility tree while the drawer is open");
      for (const name of ["The session", "Session", "Sources", "Back"]) assert.ok(names.includes(name), `${name} is exposed`);
      assert.equal(await trigger.getAttribute("aria-expanded"), "true");
      // Back: the drawer is closed, the record is back, focus is on the trigger.
      await page.getByRole("button", { name: "Back" }).focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.locator("#session").getAttribute("hidden"), "");
      assert.ok((await box(page.locator("#record"))).height > 0, "the record is drawn again");
      names = await exposed(page);
      assert.ok(names.includes("The record"), "and exposed again");
      assert.ok(!names.includes("Back") && !names.includes("Sources"), "the closed drawer is out of the tree");
      assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Session", "focus returned to the drawer's trigger");
      assert.equal(await trigger.getAttribute("aria-expanded"), "false");
      // Open it again: the record goes again, and the trigger still controls the drawer.
      await trigger.click();
      assert.equal(await page.locator("#record").evaluate((el) => el.offsetHeight), 0);
      assert.equal(await trigger.getAttribute("aria-controls"), "session");
      await page.close();
    });

    test("from 720 the drawer does not replace the record: both are shown and Back is not drawn", async () => {
      const { page } = await open(PHONE_APP, { theme, viewport: { width: 1000, height: 800 } });
      await settle(page);
      assert.ok((await box(page.locator("#record"))).height > 0);
      assert.equal((await style(page.locator(".basalt-drawer-back"), "display")).display, "none");
      const names = await exposed(page);
      assert.ok(names.includes("The record") && names.includes("Sources"));
      assert.ok(!names.includes("Back"), "Back is out of the tree where it is not drawn");
      await page.close();
    });

    test("axe finds nothing in either state at 390", async () => {
      const { page } = await open(PHONE_APP, { theme, viewport: { width: 390, height: 800 } });
      assert.deepEqual(await axe(page), []);
      await page.getByRole("button", { name: "Back" }).click();
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  });
}

// ---- The search trigger and the search dialog (D13a) ----

const TRIGGER = `<div style={{ padding: 16 }}><B.SearchTrigger /></div>`;

for (const theme of ["dark", "light"]) {
  describe(`the search trigger (${theme})`, () => {
    test("from 720 it is a 200 by 44 field-shaped button: a 1px input boundary, radius 8, the glyph and the word; the word is aria-hidden and the button is named", async () => {
      const { page } = await open(TRIGGER, { theme, viewport: { width: 1000, height: 600 } });
      const trigger = page.locator(".basalt-search-trigger");
      const size = await box(trigger);
      assert.deepEqual([size.width, size.height], [200, 44]);
      const s = await style(trigger, "borderTopWidth", "borderTopColor", "borderTopLeftRadius", "paddingLeft", "columnGap", "fontSize", "color");
      assert.deepEqual([s.borderTopWidth, s.borderTopLeftRadius, s.paddingLeft, s.columnGap, s.fontSize], ["1px", "8px", "14px", "10px", "16px"]);
      assert.equal(s.borderTopColor, await resolve(page, "border-input", "borderTopColor"));
      assert.equal(s.color, await resolve(page, "text-secondary", "color"));
      assert.equal(await trigger.getAttribute("aria-label"), "Search");
      assert.equal(await page.locator(".basalt-search-trigger-word").getAttribute("aria-hidden"), "true");
      assert.equal(await page.locator(".basalt-search-trigger-word").textContent(), "Search");
      await page.close();
    });

    test("hover lifts the word to primary and leaves the boundary where it is; focus is the control ring at +2", async () => {
      const { page } = await open(TRIGGER, { theme, viewport: { width: 1000, height: 600 } });
      const trigger = page.locator(".basalt-search-trigger");
      const before = await style(trigger, "borderTopColor", "backgroundColor");
      await trigger.hover();
      const hovered = await style(trigger, "borderTopColor", "color", "backgroundColor");
      assert.equal(hovered.color, await resolve(page, "text-primary", "color"));
      assert.equal(hovered.borderTopColor, before.borderTopColor, "the boundary is never fainter than the control boundary");
      assert.equal(hovered.backgroundColor, before.backgroundColor);
      await page.keyboard.press("Tab");
      const ring = await style(trigger, "outlineWidth", "outlineOffset", "outlineColor");
      assert.deepEqual([ring.outlineWidth, ring.outlineOffset], ["2px", "2px"]);
      assert.equal(ring.outlineColor, await resolve(page, "border-focus", "outlineColor"));
      await page.close();
    });

    test("under 720 it is a 44 by 44 icon button with no border and no word, and a hover wash; it is a button either way", async () => {
      const { page } = await open(TRIGGER, { theme, viewport: { width: 390, height: 600 } });
      const trigger = page.locator(".basalt-search-trigger");
      const size = await box(trigger);
      assert.deepEqual([size.width, size.height], [44, 44]);
      assert.equal((await style(trigger, "borderTopWidth")).borderTopWidth, "0px");
      assert.equal((await style(page.locator(".basalt-search-trigger-word"), "display")).display, "none");
      assert.equal(await trigger.evaluate((el) => el.tagName), "BUTTON");
      await page.close();
    });

    test("the trigger is the same height at both widths, so the header does not change height", async () => {
      const { page } = await open(TRIGGER, { theme, viewport: { width: 1000, height: 600 } });
      const wide = await box(page.locator(".basalt-search-trigger"));
      await page.setViewportSize({ width: 390, height: 600 });
      assert.equal((await box(page.locator(".basalt-search-trigger"))).height, wide.height);
      await page.close();
    });

    test("axe finds nothing", async () => {
      const { page } = await open(TRIGGER, { theme });
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  });
}

const PACKS = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];
const SEARCH = (initial = "whey") => `(() => {
  const picture = (c) => <span style={{ display: "block", width: "100%", height: "100%", background: c }} />;
  window.__submitted = [];
  function Search() {
    const [q, setQ] = React.useState(${JSON.stringify(initial)});
    const [open, setOpen] = React.useState(true);
    const words = q.trim().split(/\\s+/).filter(Boolean);
    const packs = words.length ? ${JSON.stringify(PACKS)}.slice(0, words[0] === "many" ? 5 : words[0] === "one" ? 1 : 2) : [];
    const brands = words.length && words[0] !== "none" ? ["Acme", "Bolt", "Core"].slice(0, words[0] === "many" ? 3 : 1) : [];
    const count = words.length ? (packs.length + brands.length ? packs.length + " products, " + brands.length + " brands" : "0 products") : "Or go straight to a brand.";
    return (
      <>
        <button id="opener" type="button" onClick={() => setOpen(true)}>Open</button>
        <B.SearchDialog open={open} onOpenChange={setOpen} title="Search the shop" label="Search products and brands" placeholder="A brand, whey, creatine" query={q} onQueryChange={setQ} onSubmit={(value) => { window.__submitted.push(value); }} count={count}>
          <B.SearchResults>
            {words.length ? brands.map((b) => <B.SearchResult key={b} href={"#/brand/" + b} media={picture("#777")} mediaShape="logo" detail="Brand" trailing="›">{b}</B.SearchResult>) : ["Acme", "Bolt"].map((b) => <B.SearchResult key={b} href={"#/brand/" + b}>{b}</B.SearchResult>)}
            {packs.map((p) => <B.SearchResult key={p} href={"#/p/" + p} media={picture("#555")} detail={"Acme · 2 lb"} trailing="$39.99">{p}</B.SearchResult>)}
            {packs.length > 4 ? <B.SearchResult href="#/shop" centered>See all 12</B.SearchResult> : null}
          </B.SearchResults>
        </B.SearchDialog>
      </>
    );
  }
  return <Search />;
})()`;

for (const theme of ["dark", "light"]) {
  describe(`the search dialog (${theme})`, () => {
    test("is a search form: a labelled field, a close button, a count and links; it is 560 wide, padding 0, radius 12, centred", async () => {
      const { page } = await open(SEARCH(), { theme, viewport: { width: 1440, height: 900 } });
      await settle(page);
      assert.equal(await page.getByRole("search").count(), 1);
      assert.equal(await page.getByRole("searchbox", { name: "Search products and brands" }).count(), 1);
      assert.equal(await page.getByRole("button", { name: "Close search" }).count(), 1);
      assert.equal(await page.getByRole("link").count(), 3, "rows are links");
      const dialog = page.locator(".basalt-dialog");
      const d = await box(dialog);
      assert.equal(d.width, 560);
      assert.ok(Math.abs(d.x + d.width / 2 - 720) < 1 && Math.abs(d.y + d.height / 2 - 450) < 1, "centred");
      const s = await style(dialog, "paddingTop", "borderTopLeftRadius");
      assert.deepEqual(s, { paddingTop: "0px", borderTopLeftRadius: "12px" });
      assert.equal(await page.getByRole("dialog", { name: "Search the shop" }).count(), 1);
      await page.close();
    });

    // DECISIONS 336, Q3: the top is held where a full result has it and the box ends under what it shows; the field and the count never move.
    test("nothing moves as you type: the field and the count keep their place, and the box ends under its rows, up to a full result", async () => {
      const { page } = await open(SEARCH(""), { theme, viewport: { width: 1440, height: 900 } });
      await settle(page);
      const measure = async () => ({
        dialog: await box(page.locator(".basalt-dialog")),
        form: await box(page.locator(".basalt-search-form")),
        count: await box(page.locator(".basalt-search-count")),
        results: await box(page.locator(".basalt-search-results")),
      });
      const rest = await measure();
      for (const query of ["none", "one", "whey", "many"]) {
        await page.locator(".basalt-search-input").fill(query);
        await settle(page);
        const now = await measure();
        assert.deepEqual([now.dialog.y, now.form.y, now.count.y], [rest.dialog.y, rest.form.y, rest.count.y], `after typing "${query}": the top, the field and the count hold`);
        assert.ok(now.results.height <= 14 + 3 * 60 + 5 * 72 + 48, "never taller than a full result");
        assert.ok(Math.abs(now.dialog.y + now.dialog.height - (now.results.y + now.results.height) - 1) <= 0.5, "the box ends under the results (its rim)");
      }
      await page.close();
    });

    test("a row is as tall as its picture with 6px above and below: 72 for a pack, 60 for a logo, 48 at least for a row with none", async () => {
      const { page } = await open(SEARCH("many"), { theme, viewport: { width: 1440, height: 900 } });
      await settle(page);
      const heights = await page.locator(".basalt-search-result").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
      assert.deepEqual(heights, [60, 60, 60, 72, 72, 72, 72, 72, 48]);
      const media = await box(page.locator(".basalt-search-media[data-shape=pack]").first());
      assert.deepEqual([media.width, media.height], [48, 60]);
      const logo = await box(page.locator(".basalt-search-media[data-shape=logo]").first());
      assert.deepEqual([logo.width, logo.height], [96, 48]);
      const rowStyle = await style(page.locator(".basalt-search-result").first(), "paddingTop", "paddingLeft", "columnGap", "borderTopLeftRadius");
      assert.deepEqual(rowStyle, { paddingTop: "6px", paddingLeft: "8px", columnGap: "12px", borderTopLeftRadius: "8px" });
      await page.locator(".basalt-search-input").fill("");
      await settle(page);
      assert.equal((await box(page.locator(".basalt-search-result").first())).height, 48, "a text-only row is the 48 floor");
      await page.close();
    });

    test("the results scroll inside a fixed area, and on a short window the dialog is the room it has, with the field and the count in place", async () => {
      const { page } = await open(SEARCH("many"), { theme, viewport: { width: 1440, height: 500 } });
      await settle(page);
      const dialog = await box(page.locator(".basalt-dialog"));
      assert.ok(dialog.height <= 500 - 32, "the dialog fits the window less 2 × 16");
      assert.equal(await page.locator(".basalt-search-results").evaluate((el) => el.scrollHeight > el.clientHeight), true);
      const form = await box(page.locator(".basalt-search-form"));
      await page.locator(".basalt-search-results").evaluate((el) => { el.scrollTop = 400; });
      assert.deepEqual(await box(page.locator(".basalt-search-form")), form);
      await page.close();
    });

    test("the field takes a real 2px outline at −2 round its band; a browser's own clear × is hidden, so the band has one ×", async () => {
      const { page } = await open(SEARCH(), { theme });
      await settle(page);
      await page.locator(".basalt-search-input").focus();
      const ring = await style(page.locator(".basalt-search-form"), "outlineStyle", "outlineWidth", "outlineOffset", "outlineColor");
      assert.deepEqual([ring.outlineStyle, ring.outlineWidth, ring.outlineOffset], ["solid", "2px", "-2px"]);
      assert.equal(ring.outlineColor, await resolve(page, "border-focus", "outlineColor"));
      assert.equal((await style(page.locator(".basalt-search-input"), "outlineStyle")).outlineStyle, "none", "the ring is the band's, drawn once");
      // Chromium does not report a ::-webkit pseudo's computed style, so the rule itself is read: the stylesheet hides the browser's × and its decoration.
      const hidden = await page.evaluate(() => {
        const found = [];
        const walk = (rules) => { for (const rule of rules) { if (rule.cssRules) walk(rule.cssRules); if (rule.selectorText?.includes(".basalt-search-input::-webkit-search-cancel-button")) found.push(rule.style.display); } };
        for (const sheet of document.styleSheets) walk(sheet.cssRules);
        return found;
      });
      assert.deepEqual(hidden, ["none"]);
      assert.equal(await page.locator(".basalt-search-input").getAttribute("type"), "search");
      assert.equal(await page.locator("button[aria-label]").count(), 1, "one close button, one ×");
      const field = await style(page.locator(".basalt-search-input"), "fontSize", "height");
      assert.deepEqual(field, { fontSize: "16px", height: "44px" }, "16, so a touch screen does not zoom");
      await page.close();
    });

    test("a result is a tab stop with the control ring at +2, 8px from the panel's edge; its hover wash runs to the panel's edges and no ink lifts", async () => {
      const { page } = await open(SEARCH("many"), { theme, viewport: { width: 1440, height: 900 } });
      await settle(page);
      await page.locator(".basalt-search-input").focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement?.tagName), "A", "Tab goes field, close, then the first result");
      const row = page.locator(".basalt-search-result").first();
      const ring = await style(row, "outlineWidth", "outlineOffset");
      assert.deepEqual(ring, { outlineWidth: "2px", outlineOffset: "2px" });
      const results = await box(page.locator(".basalt-search-results"));
      const rowBox = await box(row);
      assert.ok(rowBox.x - results.x >= 6, "the ring has at least 6px before the clipping edge");
      assert.equal(rowBox.x - results.x, 8);
      const rest = await style(row, "color");
      await page.mouse.move(0, 0);
      const wash = (r) => r.evaluate((el) => { const s = getComputedStyle(el, "::before"); return { start: s.insetInlineStart, end: s.insetInlineEnd, bg: s.backgroundColor }; });
      assert.deepEqual((await wash(row)).bg, "rgba(0, 0, 0, 0)");
      await row.hover();
      const hovered = await wash(row);
      assert.deepEqual([hovered.start, hovered.end], ["-8px", "-8px"], "the wash reaches the list's padding edge: full bleed, not a plate");
      assert.equal(hovered.bg, await resolve(page, "state-hover"));
      assert.equal((await style(row, "color")).color, rest.color, "no ink lifts");
      const detail = page.locator(".basalt-search-detail").first();
      assert.equal((await style(detail, "color")).color, await resolve(page, "text-tertiary", "color"), "nor does the detail's: tertiary holds 4.5:1 on the wash over the dialog's level (contrast test)");
      assert.equal((await style(row, "fontWeight")).fontWeight, "500");
      await page.close();
    });

    test("Enter in the field with no row chosen sends the trimmed query to the app; Enter on a link follows the link and sends nothing", async () => {
      const { page } = await open(SEARCH("  whey  "), { theme });
      await settle(page);
      await page.locator(".basalt-search-input").focus();
      await page.keyboard.press("Enter");
      assert.deepEqual(await page.evaluate(() => window.__submitted), ["whey"]);
      await page.locator(".basalt-search-input").fill("   ");
      await page.keyboard.press("Enter");
      assert.deepEqual(await page.evaluate(() => window.__submitted), ["whey"], "an empty query is not sent");
      await page.close();
    });

    test("the count is shown at once and spoken once: one status line, which holds the old words until the text has been still for 400ms", async () => {
      const { page } = await open(SEARCH("one"), { theme, clock: true });
      await page.waitForSelector("[role=status]");
      assert.equal(await page.locator("[role=status]").count(), 1);
      await page.locator(".basalt-search-input").fill("many");
      assert.equal(await page.locator(".basalt-search-count [aria-hidden=true]").textContent(), "5 products, 3 brands", "drawn at once");
      assert.equal(await page.locator("[role=status]").textContent(), "1 products, 1 brands", "not yet spoken");
      await page.clock.runFor(400);
      assert.equal(await page.locator("[role=status]").textContent(), "5 products, 3 brands");
      await page.close();
    });

    test("Escape closes it and focus goes back to what opened it; its name is hidden from the eye and read on opening", async () => {
      const { page } = await open(SEARCH(), { theme });
      await settle(page);
      assert.equal((await style(page.locator(".basalt-dialog-title"), "position")).position, "absolute", "the title is visually hidden");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector(".basalt-dialog"));
      await page.locator("#opener").click();
      await page.waitForFunction(() => document.activeElement?.classList.contains("basalt-search-input"));
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector(".basalt-dialog"));
      assert.equal(await page.evaluate(() => document.activeElement?.id), "opener");
      await page.close();
    });

    test("axe finds nothing, with a full result and with the lead links", async () => {
      for (const initial of ["many", ""]) {
        const { page } = await open(SEARCH(initial), { theme });
        assert.deepEqual(await axe(page), [], initial || "lead links");
        await page.close();
      }
    });
  });
}

// ---- The listbox (D13c) ----

const LISTBOX = (extra = "") => `(() => {
  window.__chosen = [];
  function Contents() {
    const [value, setValue] = React.useState("alpha");
    return (
      <>
        <button type="button" id="before" style={{ padding: "6px 12px" }}>before</button>
        <B.Card style={{ width: 320 }}>
          <B.Listbox label="Contents" value={value} onValueChange={(v) => { window.__chosen.push(v); setValue(v); }} ${extra}>
            <B.ListboxGroup label="Work">
              <B.ListboxOption value="alpha" detail="Where it stands" trailing="live">Alpha</B.ListboxOption>
              <B.ListboxOption value="beta" trailing="soon">Beta</B.ListboxOption>
              <B.ListboxOption value="skip" disabled>Skipped</B.ListboxOption>
            </B.ListboxGroup>
            <B.ListboxGroup label="Code"><B.ListboxOption value="gamma">Gamma</B.ListboxOption></B.ListboxGroup>
          </B.Listbox>
        </B.Card>
      </>
    );
  }
  return <Contents />;
})()`;

for (const theme of ["dark", "light"]) {
  describe(`the listbox (${theme})`, () => {
    test("is one listbox with one tab stop, named, with its groups named by their headers and its options selected one at a time", async () => {
      const { page } = await open(LISTBOX(), { theme });
      const list = page.getByRole("listbox", { name: "Contents" });
      assert.equal(await list.count(), 1);
      assert.equal(await list.getAttribute("tabindex"), "0");
      assert.equal(await page.getByRole("group").count(), 2);
      assert.equal(await page.getByRole("group", { name: "Work" }).count(), 1);
      assert.equal(await page.locator("[role=option][aria-selected=true]").count(), 1);
      const selected = await page.locator("[role=option][aria-selected=true]").getAttribute("id");
      assert.equal(await list.getAttribute("aria-activedescendant"), selected);
      assert.equal(await page.locator("[role=listbox] > [role=presentation]").count(), 0, "header rows are not presentation children of the listbox");
      await page.close();
    });

    test("↓ ↑ Home End move the choice (and aria-activedescendant) and skip a disabled option; clicking chooses; typing is not a key here", async () => {
      const { page } = await open(LISTBOX(), { theme });
      await page.locator("#before").focus();
      await page.keyboard.press("Tab");
      const list = page.getByRole("listbox", { name: "Contents" });
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("role")), "listbox");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      assert.deepEqual(await page.evaluate(() => window.__chosen), ["beta", "gamma"], "the disabled option is skipped");
      const active = await list.getAttribute("aria-activedescendant");
      assert.equal(await page.evaluate((id) => document.getElementById(id)?.textContent, active), "Gamma", "aria-activedescendant names the chosen option");
      await page.keyboard.press("ArrowDown");
      assert.deepEqual(await page.evaluate(() => window.__chosen.length), 2, "the end holds");
      await page.keyboard.press("Home");
      await page.keyboard.press("End");
      assert.deepEqual(await page.evaluate(() => window.__chosen.slice(2)), ["alpha", "gamma"]);
      await page.getByRole("option", { name: /Beta/ }).click();
      assert.equal(await page.evaluate(() => window.__chosen.at(-1)), "beta");
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("role")), "listbox", "focus stays on the list");
      await page.close();
    });

    test("an option is 24 tall (radius 6), a two-line option 48 (radius 8); the chosen one has a chevron in its gutter and primary ink, and no weight changes", async () => {
      const { page } = await open(LISTBOX(), { theme, viewport: { width: 800, height: 600 } });
      const beta = page.getByRole("option", { name: /Beta/ });
      const alpha = page.getByRole("option", { name: /Alpha/ });
      assert.equal((await box(beta)).height, 24);
      assert.equal((await style(beta, "borderTopLeftRadius")).borderTopLeftRadius, "6px");
      assert.equal((await box(alpha)).height, 48);
      assert.equal((await style(alpha, "borderTopLeftRadius")).borderTopLeftRadius, "8px");
      assert.equal(await alpha.locator(".basalt-listbox-gutter svg").count(), 1, "the chosen option has the chevron");
      assert.equal(await beta.locator(".basalt-listbox-gutter svg").count(), 0);
      const chosen = await style(alpha, "color", "fontWeight", "backgroundColor");
      const rest = await style(beta, "color", "fontWeight");
      assert.equal(chosen.color, await resolve(page, "text-primary", "color"));
      assert.equal(rest.color, await resolve(page, "text-secondary", "color"));
      assert.equal(chosen.fontWeight, rest.fontWeight, "weight stays 400");
      assert.equal(chosen.fontWeight, "400");
      await beta.click();
      assert.equal((await box(alpha)).height, 48, "choosing moves nothing");
      assert.equal((await box(beta)).height, 24);
      await page.close();
    });

    test("a touch screen makes an option 44 at least, radius 8", async () => {
      const { page } = await open(LISTBOX(), { theme, viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
      const beta = page.getByRole("option", { name: /Beta/ });
      assert.equal((await box(beta)).height, 44);
      assert.equal((await style(beta, "borderTopLeftRadius")).borderTopLeftRadius, "8px");
      await page.close();
    });

    test("focus is the control ring at +2 outside the list, and −2 inside where the list is flush with a clipping edge", async () => {
      const { page } = await open(LISTBOX(), { theme });
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      const ring = await style(page.getByRole("listbox"), "outlineStyle", "outlineWidth", "outlineOffset");
      assert.deepEqual(ring, { outlineStyle: "solid", outlineWidth: "2px", outlineOffset: "2px" });
      await page.close();
      const flush = await open(LISTBOX("flush"), { theme });
      await flush.page.keyboard.press("Tab");
      await flush.page.keyboard.press("Tab");
      assert.equal((await style(flush.page.getByRole("listbox"), "outlineOffset")).outlineOffset, "-2px");
      await flush.page.close();
    });

    test("axe finds nothing", async () => {
      const { page } = await open(LISTBOX(), { theme });
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  });
}

// ---- The listbox's focus: its active option is in view, and a list with no value names its first option (DECISIONS 157) ----

const TALL = (extra = "") => `(() => {
  window.__chosen = [];
  function Tall() {
    return (
      <>
        <button type="button" id="before" style={{ padding: "6px 12px" }}>before</button>
        <B.Listbox label="Long" ${extra} style={{ height: 120, width: 240 }} onValueChange={(v) => window.__chosen.push(v)}>
          {Array.from({ length: 30 }, (_, i) => <B.ListboxOption key={i} value={"o" + i} disabled={i === 0 && ${extra.includes("noValue") ? "true" : "false"}}>Option {i}</B.ListboxOption>)}
        </B.Listbox>
      </>
    );
  }
  return <Tall />;
})()`;

const inView = (page, text) => page.evaluate((text) => {
  const list = document.querySelector(".basalt-listbox").getBoundingClientRect();
  const option = [...document.querySelectorAll("[role=option]")].find((o) => o.textContent === text).getBoundingClientRect();
  return option.top >= list.top && option.bottom <= list.bottom;
}, text);

for (const theme of ["dark", "light"]) {
  describe(`the listbox's focus (${theme})`, () => {
    test("when the list takes focus its chosen option is scrolled into view, from below and from above, by Tab and by script", async () => {
      const { page } = await open(TALL(`defaultValue="o25"`), { theme });
      await settle(page);
      assert.equal(await inView(page, "Option 25"), false, "the chosen option starts out of view");
      await page.locator("#before").focus();
      await page.keyboard.press("Tab");
      assert.equal(await inView(page, "Option 25"), true, "Tab: it is brought into view");
      await page.close();
      const above = await open(TALL(`defaultValue="o2"`), { theme });
      await settle(above.page);
      await above.page.locator(".basalt-listbox-scroll").evaluate((el) => { el.scrollTop = el.scrollHeight; });
      assert.equal(await inView(above.page, "Option 2"), false);
      await above.page.locator(".basalt-listbox").focus();
      assert.equal(await inView(above.page, "Option 2"), true, "script focus: scrolled up to it");
      await above.page.close();
    });

    test("a list whose option is already in view does not scroll, and a press on an option does not scroll the list under the pointer", async () => {
      const { page } = await open(TALL(`defaultValue="o1"`), { theme });
      await settle(page);
      const top = () => page.locator(".basalt-listbox-scroll").evaluate((el) => el.scrollTop);
      assert.equal(await top(), 0);
      await page.locator("#before").focus();
      await page.keyboard.press("Tab");
      assert.equal(await top(), 0, "already in view: no scroll");
      await page.locator("#before").focus();
      await page.locator(".basalt-listbox-scroll").evaluate((el) => { el.scrollTop = 200; });
      const target = page.getByRole("option", { name: /Option 12$/ });
      await target.scrollIntoViewIfNeeded();
      const before = await top();
      await target.click();
      assert.equal(await top(), before, "the press focused the list without moving it");
      assert.equal(await page.evaluate(() => window.__chosen.at(-1)), "o12", "and chose the row that was pressed");
      await page.close();
    });

    test("a list with no value names its first enabled option while it holds focus, and nothing is chosen or drawn", async () => {
      const { page } = await open(TALL("noValue"), { theme });
      await settle(page);
      const list = page.getByRole("listbox", { name: "Long" });
      assert.equal(await list.getAttribute("aria-activedescendant"), null, "no focus: no active option");
      const picture = () => page.evaluate(() => [...document.querySelectorAll("[role=option]")].slice(0, 4).map((o) => { const s = getComputedStyle(o); const r = o.getBoundingClientRect(); return [s.color, s.backgroundColor, s.fontWeight, o.getAttribute("aria-selected"), o.querySelectorAll("svg").length, r.x, r.y, r.width, r.height]; }));
      const rest = await picture();
      await page.locator("#before").focus();
      await page.keyboard.press("Tab");
      const named = await list.getAttribute("aria-activedescendant");
      assert.equal(await page.evaluate((id) => document.getElementById(id)?.textContent, named), "Option 1", "the first option that is not disabled");
      assert.deepEqual(await picture(), rest, "the options are drawn as they were: no plate, no chevron, no ink step, nothing selected");
      assert.equal(await page.locator("[role=option][aria-selected=true]").count(), 0);
      assert.deepEqual(await page.evaluate(() => window.__chosen), [], "focus alone chooses nothing");
      // What a screen reader is given, from the browser's tree.
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Accessibility.enable");
      const { nodes } = await cdp.send("Accessibility.getFullAXTree");
      const node = nodes.find((n) => n.role?.value === "listbox");
      const active = node.properties.find((p) => p.name === "activedescendant");
      assert.ok(active, "the listbox's active descendant is in the accessibility tree");
      const target = nodes.find((n) => n.backendDOMNodeId === active.value.relatedNodes[0].backendDOMNodeId);
      assert.equal(target?.name?.value, "Option 1");
      await page.locator("#before").focus();
      assert.equal(await list.getAttribute("aria-activedescendant"), null, "blurred: none again");
      await page.close();
    });

    test("a key still chooses from none: ↓ chooses the first enabled option, and then the next", async () => {
      const { page } = await open(TALL("noValue"), { theme });
      await page.locator("#before").focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      assert.deepEqual(await page.evaluate(() => window.__chosen), ["o1", "o2"], "keys choose, and a disabled option is skipped");
      await page.close();
    });
  });
}

// ---- The listbox's ring: radius 8 on the list's own box (DECISIONS 159, the owner, on a 2 to 2 deadlock in DECISIONS 157, Q2) ----

const RING = (extra = "") => `<div style={{ padding: 24, width: 320 }}><B.Listbox label="Ring" defaultValue="o0" ${extra} style={{ height: 120 }}>{Array.from({ length: 30 }, (_, i) => <B.ListboxOption key={i} value={"o" + i}>Option {i}</B.ListboxOption>)}</B.Listbox></div>`;

/** The colours painted at `points` of the page as it is now, from a screenshot (one pixel to a CSS pixel). */
const painted = async (page, points) => {
  const png = (await page.screenshot()).toString("base64");
  return page.evaluate(async ([png, points]) => {
    const img = await new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.src = `data:image/png;base64,${png}`; });
    const canvas = document.createElement("canvas");
    canvas.width = img.width; canvas.height = img.height;
    const g = canvas.getContext("2d");
    g.drawImage(img, 0, 0);
    return points.map(([x, y]) => [...g.getImageData(Math.floor(x), Math.floor(y), 1, 1).data].slice(0, 3));
  }, [png, points]);
};
const apart = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 60;

for (const [mode, theme, forced] of [["dark", "dark", false], ["light", "light", false], ["forced colours", "dark", true]]) {
  describe(`the listbox's ring (${mode})`, () => {
    const focusedList = async (extra) => {
      const { page } = await open(RING(extra), { theme, viewport: { width: 500, height: 400 } });
      await page.evaluate(() => { document.body.style.background = "var(--basalt-surface-page)"; document.body.style.margin = "0"; });
      if (forced) await page.emulateMedia({ forcedColors: "active" });
      await settle(page);
      await page.locator(".basalt-listbox").focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      return page;
    };

    test("the ring is 2px at +2 with corners of radius 8: outside the rounded ring is the page, and the ring runs round the corner", async () => {
      const page = await focusedList();
      const list = page.locator(".basalt-listbox");
      assert.deepEqual(await style(list, "borderTopLeftRadius", "borderBottomRightRadius", "outlineWidth", "outlineOffset", "outlineStyle"), { borderTopLeftRadius: "8px", borderBottomRightRadius: "8px", outlineWidth: "2px", outlineOffset: "2px", outlineStyle: "solid" });
      const b = await box(list);
      const r = Math.SQRT1_2 * 11;
      const [bg, edge, outer, diagonal, outerFar] = await painted(page, [[b.x - 12, b.y - 12], [b.x + b.width / 2, b.y - 3], [b.x - 3.5, b.y - 3.5], [b.x + 8 - r, b.y + 8 - r], [b.x + b.width + 3.5, b.y + b.height + 3.5]]);
      assert.ok(apart(edge, bg), "the ring is painted along the top edge");
      assert.ok(!apart(outer, bg), "the outer corner of the ring's box is the page, not the ring: the ring is rounded");
      assert.ok(!apart(outerFar, bg), "and so is the bottom right");
      assert.ok(apart(diagonal, bg), "the ring is painted round the corner, on the 45° line");
      await page.close();
    });

    test("the flush ring keeps the same radius, drawn inside at −2: its outer curve is the box's corner, 8, and the page shows outside it", async () => {
      const page = await focusedList("flush");
      const list = page.locator(".basalt-listbox");
      assert.deepEqual(await style(list, "borderTopLeftRadius", "outlineOffset", "outlineWidth"), { borderTopLeftRadius: "8px", outlineOffset: "-2px", outlineWidth: "2px" });
      const b = await box(list);
      const r = Math.SQRT1_2 * 7;
      const [bg, corner, diagonal, edge] = await painted(page, [[b.x - 6, b.y - 6], [b.x + 0.5, b.y + 0.5], [b.x + 8 - r, b.y + 8 - r], [b.x + b.width / 2, b.y + 1]]);
      assert.ok(!apart(corner, bg), "the very corner is outside the rounded ring");
      assert.ok(apart(diagonal, bg), "the ring turns the corner inside the box");
      assert.ok(apart(edge, bg), "and runs along the edge");
      await page.close();
    });

    test("nothing at rest differs: unfocused, the list draws the same with radius 8 as with none, scrolled so a plate sits in the top corners, and has no fill, border or ring of its own", async () => {
      const { page } = await open(RING(), { theme, viewport: { width: 500, height: 400 } });
      await page.evaluate(() => { document.body.style.background = "var(--basalt-surface-page)"; document.body.style.margin = "0"; });
      if (forced) await page.emulateMedia({ forcedColors: "active" });
      await settle(page);
      await page.locator(".basalt-listbox-scroll").evaluate((el) => { el.scrollTop = 3; });
      const list = page.locator(".basalt-listbox");
      const own = await style(list, "backgroundColor", "borderTopWidth", "boxShadow", "outlineStyle");
      assert.match(own.backgroundColor, /, 0\)$/, "transparent");
      assert.deepEqual({ ...own, backgroundColor: "" }, { backgroundColor: "", borderTopWidth: "0px", boxShadow: "none", outlineStyle: "none" });
      const b = await box(list);
      const region = { x: b.x - 12, y: b.y - 12, width: b.width + 24, height: b.height + 24 };
      const grab = async () => (await page.screenshot({ clip: region })).toString("base64");
      const rounded = await grab();
      await list.evaluate((el) => { el.style.borderRadius = "0"; });
      const square = await grab();
      assert.equal(rounded, square, "0 pixels differ");
      // Rows pass under the corners as the list scrolls: the radius clips none of them, because the box that scrolls is inside the one that is rounded.
      assert.equal(await list.evaluate((el) => getComputedStyle(el).overflowY), "visible");
      assert.equal(await page.locator(".basalt-listbox-scroll").evaluate((el) => getComputedStyle(el).borderTopLeftRadius), "0px");
      await page.close();
    });

    test("the list still scrolls with the page keys now that the box that scrolls is inside the focused one", async () => {
      const page = await focusedList();
      const top = () => page.locator(".basalt-listbox-scroll").evaluate((el) => el.scrollTop);
      assert.equal(await top(), 0);
      await page.keyboard.press("PageDown");
      assert.ok((await top()) > 50, "PageDown scrolls the list");
      await page.keyboard.press("PageUp");
      assert.equal(await top(), 0);
      await page.close();
    });
  });
}

// ---- The opening list (D13c) ----

const OPEN_LIST = (off = "[]") => `(() => {
  const rows = [["alpha", "Alpha", "design", "live", "One line about it", "record"], ["beta", "Beta", "data", "soon", "", "record"], ["gamma", "Gamma", "web", "live", "Another line", "page"], ["delta", "Delta", "web", "soon", "", "page"]];
  window.__open = [];
  function Work() {
    const [off, setOff] = React.useState(${off});
    window.__setOff = setOff;
    return (
      <>
        <button type="button" id="before" style={{ padding: "6px 12px" }}>before</button>
        <B.Card style={{ width: 640 }}>
          <B.OpenList label="Work">
            <B.OpenListGroup label="Work">
              {rows.map(([id, name, part, state, detail, opens]) => <B.OpenListRow key={id} id={id} name={name} part={part} state={state} detail={detail || undefined} opens={opens} off={off.includes(id)} onOpen={() => window.__open.push(id)} />)}
            </B.OpenListGroup>
          </B.OpenList>
        </B.Card>
        <button type="button" id="after" style={{ padding: "6px 12px" }}>after</button>
      </>
    );
  }
  return <Work />;
})()`;

for (const theme of ["dark", "light"]) {
  describe(`the opening list (${theme})`, () => {
    test("one row holds the one tab stop; Tab enters it and leaves it; Enter opens; the name says what it opens into", async () => {
      const { page } = await open(OPEN_LIST(), { theme });
      await settle(page);
      const stops = await page.locator("[data-open-button]").evaluateAll((els) => els.map((el) => el.tabIndex));
      assert.deepEqual(stops, [0, -1, -1, -1]);
      await page.locator("#before").focus();
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Alpha: opens its record");
      await page.keyboard.press("Enter");
      assert.deepEqual(await page.evaluate(() => window.__open), ["alpha"]);
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "after", "Tab leaves the list");
      await page.close();
    });

    test("↓ ↑, j k, Home g, End G move the cursor and focus, and the tab stop follows it", async () => {
      const { page } = await open(OPEN_LIST(), { theme });
      await settle(page);
      const at = () => page.evaluate(() => document.activeElement?.textContent.split(":")[0]);
      await page.locator("[data-open-button]").first().focus();
      for (const [key, expected] of [["ArrowDown", "Beta"], ["j", "Gamma"], ["ArrowUp", "Beta"], ["k", "Alpha"], ["End", "Delta"], ["g", "Alpha"], ["G", "Delta"], ["Home", "Alpha"], ["ArrowUp", "Alpha"]]) {
        await page.keyboard.press(key);
        assert.equal(await at(), expected, key);
      }
      await page.keyboard.press("ArrowDown");
      const stops = await page.locator("[data-open-button]").evaluateAll((els) => els.map((el) => el.tabIndex));
      assert.deepEqual(stops, [-1, 0, -1, -1], "the tab stop is on the cursor");
      await page.close();
    });

    test("the cursor row shows a chevron, a ↵ chip (one, aria-hidden) and keyshortcuts; no other row does", async () => {
      const { page } = await open(OPEN_LIST(), { theme });
      await settle(page);
      assert.equal(await page.locator(".basalt-open-gutter svg").count(), 1);
      assert.equal(await page.locator(".basalt-open-into kbd").first().getAttribute("data-shortcut"), "");
      const drawn = await page.locator(".basalt-open-into .basalt-kbd").evaluateAll((els) => els.filter((el) => getComputedStyle(el).visibility === "visible").length);
      assert.equal(drawn, 1, "one chip drawn in the list; every row holds its seat, so the cursor moving moves no column");
      assert.equal(await page.locator(".basalt-open-into").first().getAttribute("aria-hidden"), "true");
      assert.equal(await page.locator("[data-open-button]").first().getAttribute("aria-keyshortcuts"), "Enter");
      assert.equal(await page.locator("[aria-keyshortcuts]").count(), 1);
      await page.close();
    });

    test("filtering leaves every row where it is: a row that does not match takes the disabled ink, hides its cells and second line, and the cursor skips it; 0px moves", async () => {
      const { page } = await open(OPEN_LIST(), { theme, viewport: { width: 900, height: 700 } });
      await settle(page);
      const rects = () => page.locator(".basalt-open-row").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
      const cells = () => page.locator(".basalt-open-part").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().x));
      const before = await rects();
      const beforeCells = await cells();
      await page.evaluate(() => window.__setOff(["beta", "alpha"]));
      await settle(page);
      assert.deepEqual(await rects(), before, "no row moved or changed size");
      assert.deepEqual(await cells(), beforeCells, "no column moved");
      const alpha = page.locator("[data-open-row=alpha]");
      assert.equal((await style(alpha.locator(".basalt-open-button"), "color")).color, await resolve(page, "text-disabled", "color"), "unavailable to every input (DECISIONS 168): the disabled ink");
      assert.equal((await style(alpha.locator(".basalt-open-part"), "visibility")).visibility, "hidden");
      assert.equal((await style(alpha.locator(".basalt-open-detail"), "visibility")).visibility, "hidden");
      assert.equal(await alpha.locator(".basalt-open-gutter svg").count(), 0, "the cursor left it");
      const stops = await page.locator("[data-open-button]").evaluateAll((els) => els.map((el) => el.tabIndex));
      assert.deepEqual(stops, [-1, -1, 0, -1], "the cursor is the first row that matches");
      await page.locator("[data-open-button]").nth(2).focus();
      await page.keyboard.press("k");
      assert.equal(await page.evaluate(() => document.activeElement?.textContent.split(":")[0]), "Gamma", "k skips the rows that do not match");
      await page.keyboard.press("g");
      assert.equal(await page.evaluate(() => document.activeElement?.textContent.split(":")[0]), "Gamma");
      await page.close();
    });

    test("a row is 24 (radius 6), two lines 48 (radius 8); the whole row presses; focus is the control ring at +2 outside the row, with 6px before the list's edge", async () => {
      const { page } = await open(OPEN_LIST(), { theme, viewport: { width: 900, height: 700 } });
      await settle(page);
      const heights = await page.locator(".basalt-open-row").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
      assert.deepEqual(heights, [48, 24, 48, 24]);
      assert.equal((await style(page.locator("[data-open-row=beta]"), "borderTopLeftRadius")).borderTopLeftRadius, "6px");
      assert.equal((await style(page.locator("[data-open-row=alpha]"), "borderTopLeftRadius")).borderTopLeftRadius, "8px");
      const row = await box(page.locator("[data-open-row=gamma]"));
      await page.mouse.click(row.x + row.width - 30, row.y + 5);
      assert.deepEqual(await page.evaluate(() => window.__open), ["gamma"], "a press anywhere on the row opens it");
      await page.keyboard.press("Tab");
      await page.locator("#before").focus();
      await page.keyboard.press("Tab");
      const ring = await style(page.locator("[data-open-row=gamma]"), "outlineWidth", "outlineOffset", "outlineStyle");
      assert.deepEqual(ring, { outlineWidth: "2px", outlineOffset: "2px", outlineStyle: "solid" }, "the cursor is gamma after the press");
      const list = await box(page.locator(".basalt-open-list"));
      const gamma = await box(page.locator("[data-open-row=gamma]"));
      assert.equal(gamma.x - list.x, 6, "6px before the list's edge, where the ring has room");
      assert.equal(list.x + list.width - (gamma.x + gamma.width), 6);
      await page.close();
    });

    test("the cells line up down the list, and the hover wash runs full bleed with no lift in ink", async () => {
      const { page } = await open(OPEN_LIST(), { theme, viewport: { width: 900, height: 700 } });
      await settle(page);
      const xs = await page.locator(".basalt-open-part").evaluateAll((els) => [...new Set(els.map((el) => Math.round(el.getBoundingClientRect().x)))]);
      assert.equal(xs.length, 1, `one column: ${xs}`);
      const row = page.locator("[data-open-row=delta]");
      const button = row.locator(".basalt-open-button");
      const rest = await style(button, "color");
      await row.hover();
      const wash = await row.evaluate((el) => { const s = getComputedStyle(el, "::before"); return { start: s.insetInlineStart, bg: s.backgroundColor }; });
      assert.equal(wash.start, "-6px");
      assert.equal(wash.bg, await resolve(page, "state-hover"));
      assert.equal((await style(button, "color")).color, rest.color);
      await page.close();
    });

    test("axe finds nothing, with rows left in place by a filter", async () => {
      const { page } = await open(OPEN_LIST(`["beta"]`), { theme });
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  });
}

// ---- The notice bar (D16) ----

const NOTICE = `<><B.NoticeBar label="Preview notice" title="Preview.">Prices are the brands' own list prices. Prices, stock and which products are carried are to be confirmed.</B.NoticeBar><main><h1>The page</h1></main></>`;

for (const theme of ["dark", "light"]) {
  describe(`the notice bar (${theme})`, () => {
    test("is a named region, not a live region, with no icon, rim or radius; the level-1 fill with a divider under it, edge to edge", async () => {
      const { page } = await open(NOTICE, { theme, viewport: { width: 1440, height: 800 } });
      await page.evaluate(() => { document.body.style.margin = "0"; });
      const bar = page.getByRole("region", { name: "Preview notice" });
      assert.equal(await bar.count(), 1);
      assert.equal(await page.locator("[aria-live], [role=status], [role=alert]").count(), 0);
      assert.equal(await page.locator(".basalt-notice-bar svg").count(), 0);
      const s = await style(bar, "backgroundColor", "borderBottomWidth", "borderBottomColor", "borderTopWidth", "borderLeftWidth", "borderTopLeftRadius", "boxShadow");
      assert.equal(s.backgroundColor, await resolve(page, "surface-raised"));
      assert.deepEqual([s.borderBottomWidth, s.borderTopWidth, s.borderLeftWidth, s.borderTopLeftRadius, s.boxShadow], ["1px", "0px", "0px", "0px", "none"]);
      assert.equal(s.borderBottomColor, await resolve(page, "border-divider", "borderBottomColor"));
      const b = await box(bar);
      assert.deepEqual([b.x, b.width], [0, 1440], "full bleed");
      await page.close();
    });

    test("the line is text-sm in secondary ink, its first words primary at 600; 4px above and below from 720, and 6px more above under it", async () => {
      const wide = await open(NOTICE, { theme, viewport: { width: 1440, height: 800 } });
      const text = wide.page.locator(".basalt-notice-bar-text");
      const t = await style(text, "fontSize", "lineHeight", "color");
      assert.deepEqual([t.fontSize, t.lineHeight], ["13px", "18px"]);
      assert.equal(t.color, await resolve(wide.page, "text-secondary", "color"));
      const title = await style(wide.page.locator(".basalt-notice-bar-title"), "color", "fontWeight");
      assert.deepEqual(title, { color: await resolve(wide.page, "text-primary", "color"), fontWeight: "600" });
      assert.equal((await box(wide.page.locator(".basalt-notice-bar"))).height, 4 + 18 + 4 + 1, "one line: 4 above, 4 below and the divider");
      await wide.page.close();
      const narrow = await open(NOTICE, { theme, viewport: { width: 390, height: 800 } });
      const bar = await box(narrow.page.locator(".basalt-notice-bar"));
      const p = await box(narrow.page.locator(".basalt-notice-bar-text"));
      assert.equal(p.y - bar.y, 6, "under 720 the notice keeps its extra 6px on top");
      assert.equal(p.height, 4 + 18 * 3 + 4, "and wraps");
      await narrow.page.close();
    });

    test("axe finds nothing", async () => {
      const { page } = await open(NOTICE, { theme });
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  });
}

// ---- What a screen reader is given: the browser's own accessibility tree ----

describe("accessible names, read from the browser's accessibility tree", () => {
  test("a listbox option, an opening-list row's button and a search result each have a name whose parts are separate words", async () => {
    const { page } = await open(`<>
      <B.Listbox label="Contents" defaultValue="alpha"><B.ListboxGroup label="Work"><B.ListboxOption value="alpha" detail="A line about it" trailing="live">Alpha</B.ListboxOption><B.ListboxOption value="beta" trailing="soon">Beta</B.ListboxOption></B.ListboxGroup></B.Listbox>
      <B.OpenList label="Work"><B.OpenListGroup label="Work"><B.OpenListRow id="a" name="Alpha" part="design" state="live" detail="A line" opens="record" onOpen={() => {}} /></B.OpenListGroup></B.OpenList>
      <ul><B.SearchResult href="#a" media={<span />} detail="Brand · 2 lb" trailing="$39">Whey</B.SearchResult></ul>
    </>`, { theme: "dark" });
    await settle(page);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Accessibility.enable");
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");
    const names = (role) => nodes.filter((n) => n.role?.value === role).map((n) => n.name?.value);
    assert.deepEqual(names("option"), ["Alpha live A line about it", "Beta soon"], "the name, the trailing word, then the second line, each its own word");
    assert.deepEqual(names("link"), ["Whey Brand · 2 lb $39"]);
    assert.deepEqual(names("button"), ["Alpha : opens its record"]);
    await page.close();
  });
});

// ---- Forced colours and reduced motion ----

describe("forced colours and reduced motion", () => {
  test("in forced colours the search dialog keeps its border and ring, a result keeps its focus ring and the listbox's chosen option keeps its chevron", async () => {
    const { page } = await open(SEARCH("many"), { theme: "dark", viewport: { width: 1000, height: 900 } });
    await page.emulateMedia({ forcedColors: "active" });
    await settle(page);
    assert.equal((await style(page.locator(".basalt-dialog"), "borderTopWidth")).borderTopWidth, "1px");
    await page.locator(".basalt-search-input").focus();
    assert.equal((await style(page.locator(".basalt-search-form"), "outlineStyle")).outlineStyle, "solid");
    await page.close();
    const list = await open(LISTBOX(), { theme: "dark" });
    await list.page.emulateMedia({ forcedColors: "active" });
    assert.equal(await list.page.getByRole("option", { name: /Alpha/ }).locator("svg").count(), 1);
    await list.page.close();
  });

  test("under reduced motion the sheet fades without a slide, and nothing in the list, the trigger or the notice moves", async () => {
    const { page } = await open(CART(), { theme: "dark", reducedMotion: "reduce" });
    await settle(page);
    assert.equal((await style(page.locator(".basalt-sheet"), "transitionProperty")).transitionProperty, "opacity");
    await page.close();
  });
});
