// The diagram viewer opened from inside a modal (CIMIP's document reader, found adopting main 1890615e): written at the end of the body, the viewer sat outside
// the open Dialog, whose guard (modal-outside.ts) made every control added to the page later inert, so Close, the zoom, Fit, View as list and the app's
// actions were dead and only Esc closed it. Now it is written into the modal's popup (layers.ts, ModalHost). Here: every control works from a Dialog, a Sheet and
// an AlertDialog; Esc and a press on the viewer's scrim close the viewer alone; focus stays in it and goes back to Expand; the parent closing with the viewer
// open takes it away cleanly; on the page it is where it was, and in a modal it is drawn the same. In Chromium against the built package. Written while tests
// are paused (DECISIONS 359): not yet run.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, pkg } from "./support.mjs";

const P = "basalt-diagram";
const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;
const PAGE = `${FONTS} body{background:var(--basalt-surface-page);margin:0;padding:16px;box-sizing:border-box} #root{max-width:1104px;margin:0 auto}`;

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

// The host: `window.__show(where)` draws the architecture figure, with one action, on the page or in a closed Dialog, Sheet or AlertDialog opened by `#trigger`;
// `window.__close()` closes the modal from the app. Every press of the action is logged in `window.__log`.
const HOST = `
import data from "./test/fixtures/cimip-diagrams.json";
const { type, ...FIG } = data.architecture;
window.__log = [];
const actions = [{ label: "Copy link", onSelect: (ctx) => { window.__log.push({ viewer: ctx.viewer }); } }];
function Host() {
  const [where, setWhere] = React.useState(null);
  const [open, setOpen] = React.useState(false);
  window.__show = (w) => flushSync(() => { setWhere(w); setOpen(false); });
  window.__close = () => flushSync(() => setOpen(false));
  const fig = <B.ArchitectureDiagram id="fig" {...FIG} actions={actions} />;
  if (where === "page") return fig;
  if (where === "dialog") return (
    <B.Dialog open={open} onOpenChange={setOpen}>
      <B.DialogTrigger id="trigger">Open</B.DialogTrigger>
      <B.DialogContent form id="parent"><B.SheetHeader closeLabel="Close document"><B.DialogTitle>Document</B.DialogTitle></B.SheetHeader><B.SheetBody>{fig}</B.SheetBody></B.DialogContent>
    </B.Dialog>
  );
  if (where === "sheet") return (
    <B.Sheet open={open} onOpenChange={setOpen}>
      <B.SheetTrigger id="trigger">Open</B.SheetTrigger>
      <B.SheetContent side="right" id="parent"><B.SheetHeader closeLabel="Close document"><B.SheetTitle>Document</B.SheetTitle></B.SheetHeader><B.SheetBody>{fig}</B.SheetBody></B.SheetContent>
    </B.Sheet>
  );
  if (where === "alert") return (
    <B.AlertDialog open={open} onOpenChange={setOpen}>
      <B.AlertDialogTrigger id="trigger">Open</B.AlertDialogTrigger>
      <B.AlertDialogContent id="parent"><B.AlertDialogTitle>Document</B.AlertDialogTitle>{fig}<B.AlertDialogActions><B.AlertDialogCancel>Cancel</B.AlertDialogCancel></B.AlertDialogActions></B.AlertDialogContent>
    </B.AlertDialog>
  );
  return null;
}
createRoot(document.getElementById("root")).render(<Host />);`;

const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
const settled = (page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));

async function hostPage(where, { theme = "dark", width = 1440, height = 900, touch = false } = {}) {
  const { page, errors } = await fixturePage(browser, HOST, { theme, standards: true, viewport: { width, height }, hasTouch: touch, isMobile: touch });
  if (touch) await page.evaluate(() => { const meta = document.createElement("meta"); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1"; document.head.append(meta); });
  await page.addStyleTag({ content: PAGE });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((w) => window.__show(w), where);
  if (where !== "page") {
    if (touch) await page.locator("#trigger").tap(); else await page.locator("#trigger").click();
    await page.waitForSelector("#parent[data-open]");
    await settled(page);
  }
  await page.waitForSelector(`#fig .${P}-foot .${P}-action`);
  await frames(page, 4);
  return { page, errors };
}

/** Opens the viewer from the figure's Expand and waits until its figure is laid out and its entrance has ended. */
async function openViewer(page, { tap = false } = {}) {
  const expand = page.locator(`#fig .${P}-expand`);
  await expand.scrollIntoViewIfNeeded();
  if (tap) await expand.tap(); else await expand.click();
  await page.waitForSelector(`dialog.${P}-viewer[open] .${P}[data-layout]`);
  await settled(page);
  await frames(page, 3);
}
const viewer = (page) => page.locator(`dialog.${P}-viewer`);
const level = async (page) => (await viewer(page).locator(`.${P}-level > span`).textContent()).trim();
const parentOpen = (page) => page.evaluate(() => Boolean(document.querySelector("#parent[data-open]")));
const focusIn = (page, selector) => page.evaluate((s) => Boolean(document.activeElement?.closest(s)), selector);

for (const where of ["dialog", "sheet", "alert"]) {
  describe(`from ${where === "alert" ? "an AlertDialog" : `a ${where === "dialog" ? "Dialog" : "Sheet"}`}`, () => {
    test("the viewer is written into the modal's popup, nothing in it is inert, and Zoom in, Fit, View as list, the action and Close all work", async () => {
      const { page, errors } = await hostPage(where);
      await openViewer(page);
      const placed = await page.evaluate((P) => {
        const d = document.querySelector(`dialog.${P}-viewer`);
        return { inParent: Boolean(d.closest("#parent")), inert: d.querySelectorAll("[inert]").length + (d.closest("[inert]") ? 1 : 0) };
      }, P);
      assert.deepEqual(placed, { inParent: true, inert: 0 });
      assert.equal(await focusIn(page, `dialog.${P}-viewer`), true, "focus opens in the viewer");

      const before = await level(page);
      await viewer(page).getByRole("button", { name: "Zoom in" }).click();
      assert.notEqual(await level(page), before, "a zoom step lands");
      await viewer(page).getByRole("button", { name: "Fit" }).click();
      assert.equal(await viewer(page).getByRole("button", { name: "Fit" }).getAttribute("aria-disabled"), "true", "Fit lands at Fit");
      await viewer(page).getByRole("button", { name: "View as list" }).click();
      await viewer(page).getByRole("button", { name: "Hide the list" }).click();
      await viewer(page).getByRole("button", { name: "Copy link" }).click();
      assert.deepEqual(await page.evaluate(() => window.__log), [{ viewer: true }]);
      assert.equal(await parentOpen(page), true, "no press in the viewer closes the modal");

      await viewer(page).getByRole("button", { name: "Close", exact: true }).click();
      await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
      assert.equal(await parentOpen(page), true, "Close leaves the modal open");
      assert.equal(await page.evaluate((P) => document.activeElement?.matches(`#fig .${P}-expand`), P), true, "focus is back on Expand");
      assert.deepEqual(errors, []);
      await page.close();
    });
  });
}

describe("dismissal and focus, from a Dialog", () => {
  test("Esc closes the viewer alone and returns focus to Expand; a second Esc closes the Dialog", async () => {
    const { page, errors } = await hostPage("dialog");
    await openViewer(page);
    await page.keyboard.press("Escape");
    await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
    assert.equal(await parentOpen(page), true, "the Dialog is still open");
    assert.equal(await page.evaluate((P) => document.activeElement?.matches(`#fig .${P}-expand`), P), true);
    // The Dialog works after the viewer: its own Esc still closes it.
    await page.keyboard.press("Escape");
    await page.waitForSelector("#parent", { state: "detached" });
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("a press on the viewer's scrim closes the viewer and leaves the Dialog open", async () => {
    const { page, errors } = await hostPage("dialog", { width: 1440, height: 900 });
    await openViewer(page);
    // From 720 the viewer is the window less space-4 on every side: the top-left corner, 4px in, is its scrim.
    await page.mouse.click(4, 4);
    await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
    assert.equal(await parentOpen(page), true);
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("Tab and Shift+Tab cycle inside the viewer and never reach the Dialog behind it", async () => {
    const { page, errors } = await hostPage("dialog");
    await openViewer(page);
    const count = await viewer(page).evaluate((d) => d.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])').length);
    for (let i = 0; i < count + 2; i += 1) {
      await page.keyboard.press("Tab");
      assert.equal(await focusIn(page, `dialog.${P}-viewer`), true, `Tab ${i + 1} stays in the viewer`);
    }
    for (let i = 0; i < count + 2; i += 1) {
      await page.keyboard.press("Shift+Tab");
      assert.equal(await focusIn(page, `dialog.${P}-viewer`), true, `Shift+Tab ${i + 1} stays in the viewer`);
    }
    assert.equal(await parentOpen(page), true);
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("at 390 on touch a tap on Zoom in and on Close works", async () => {
    const { page, errors } = await hostPage("dialog", { width: 390, height: 844, touch: true });
    await openViewer(page, { tap: true });
    const before = await level(page);
    await viewer(page).getByRole("button", { name: "Zoom in" }).tap();
    assert.notEqual(await level(page), before);
    await viewer(page).getByRole("button", { name: "Close", exact: true }).tap();
    await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
    assert.equal(await parentOpen(page), true);
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("the scroll lock: while the viewer is open the page does not scroll; after it closes the Dialog's lock holds; after the Dialog closes the page scrolls", async () => {
    const { page, errors } = await hostPage("dialog");
    const overflow = () => page.evaluate(() => getComputedStyle(document.documentElement).overflow);
    const lockedWithDialog = await overflow();
    await openViewer(page);
    assert.equal(await overflow(), "hidden");
    await viewer(page).getByRole("button", { name: "Close", exact: true }).click();
    await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
    assert.equal(await overflow(), lockedWithDialog, "the Dialog's own lock is as it was");
    await page.keyboard.press("Escape");
    await page.waitForSelector("#parent", { state: "detached" });
    await frames(page, 2);
    assert.notEqual(await overflow(), "hidden");
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("the Dialog closing with the viewer open takes the viewer with it: no open dialog is left, the page is not inert, and focus is back on the trigger", async () => {
    const { page, errors } = await hostPage("dialog");
    await openViewer(page);
    await page.evaluate(() => window.__close());
    await page.waitForSelector("#parent", { state: "detached" });
    await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
    await frames(page, 2);
    const after = await page.evaluate(() => ({
      open: document.querySelectorAll("dialog[open]").length,
      inert: document.querySelectorAll("[inert]").length,
      focus: document.activeElement?.id ?? null,
    }));
    assert.deepEqual(after, { open: 0, inert: 0, focus: "trigger" });
    await page.locator("#trigger").click();
    await page.waitForSelector("#parent[data-open]");
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe("on the page and in a modal", () => {
  test("on the page the viewer is the body's own child, as before", async () => {
    const { page, errors } = await hostPage("page");
    await openViewer(page);
    assert.equal(await viewer(page).evaluate((d) => d.parentElement === document.body), true);
    await page.keyboard.press("Escape");
    await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("the viewer is drawn the same in a Dialog as on the page: every element's box and computed style, in both themes", async () => {
    const read = (page) => viewer(page).evaluate((d) => {
      const PROPS = ["color", "background-color", "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "text-align", "white-space", "border-top-color", "border-top-width", "border-radius", "box-shadow", "opacity", "padding-left", "padding-top", "gap", "visibility", "pointer-events", "cursor"];
      return [d, ...d.querySelectorAll("*")].map((el) => {
        const cs = getComputedStyle(el), r = el.getBoundingClientRect();
        return [el.tagName, el.className?.baseVal ?? el.className, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), ...PROPS.map((p) => cs.getPropertyValue(p))].join("|");
      });
    });
    for (const theme of ["dark", "light"]) {
      const onPage = await hostPage("page", { theme });
      await openViewer(onPage.page);
      const a = await read(onPage.page);
      await onPage.page.close();
      const inDialog = await hostPage("dialog", { theme });
      await openViewer(inDialog.page);
      const b = await read(inDialog.page);
      await inDialog.page.close();
      assert.equal(b.length, a.length);
      const differ = a.flatMap((line, i) => (line === b[i] ? [] : [`${line}\n${b[i]}`]));
      assert.deepEqual(differ, [], `${theme}: the viewer in a Dialog differs from the viewer on the page`);
      assert.deepEqual([...onPage.errors, ...inDialog.errors], []);
    }
  });
});
