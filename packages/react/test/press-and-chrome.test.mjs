// The owner's two decisions after council round 2, driven in Chromium against the built package:
//   - Press: Button and IconButton scale to .98 while pressed (100ms, ease-out, with the colour step), and nothing else does.
//   - Glass: the sticky header bar (`basalt-chrome`) is the one smoked surface; every overlay stays solid, so a viewport
//     holds at most one backdrop-filter.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { bundleFixture, fixturePage, launch, pkg, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const PRESSED = "matrix(0.98, 0, 0, 0.98, 0, 0)";

/** What the browser resolves a colour token to, as getComputedStyle writes it, so two colours compare as strings. */
const resolve = (page, token, property = "backgroundColor") => page.evaluate(([token, property]) => {
  const probe = document.createElement("div");
  probe.style[property] = `var(--basalt-${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe)[property];
  probe.remove();
  return value;
}, [token, property]);

/** Hold the pointer down on `locator`, wait for the transition to land, read a computed style, release. */
async function pressed(page, locator, ...props) {
  const box = await locator.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await settle(page);
  const style = await locator.evaluate((el, props) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]])), props);
  await page.mouse.up();
  return style;
}

const buttons = `<div style={{ display: "flex", gap: 24, padding: 24 }}>
  <B.Button variant="primary" data-name="primary">Deploy</B.Button>
  <B.Button data-name="secondary">Cancel</B.Button>
  <B.Button variant="ghost" data-name="ghost">Preview</B.Button>
  <B.Button variant="danger" data-name="danger">Delete</B.Button>
  <B.IconButton icon={B.Icon} label="Copy" data-name="icon" />
  <B.Button variant="primary" disabled data-name="disabled">Disabled</B.Button>
  <B.Button variant="primary" loading data-name="loading">Saving</B.Button>
  <B.Card data-name="card" style={{ padding: 16 }}>A card</B.Card>
</div>`;
// IconButton needs a real icon component; a tiny one is enough to be a square button.
const fixture = `const Dot = () => <svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="4" fill="currentColor" /></svg>;
${render(buttons.replace("icon={B.Icon}", "icon={Dot}"))}`;

for (const theme of ["dark", "light"]) {
  describe(`press (${theme})`, () => {
    test("Button and IconButton scale to .98 while pressed, in every variant, with the colour step kept", async () => {
      const { page } = await fixturePage(browser, fixture, { theme });
      await settle(page);
      for (const name of ["primary", "secondary", "ghost", "danger", "icon"]) {
        const button = page.locator(`[data-name="${name}"]`);
        assert.equal(await button.evaluate((el) => getComputedStyle(el).transform), "none", `${name} rests at scale 1`);
        const style = await pressed(page, button, "transform", "backgroundColor");
        assert.equal(style.transform, PRESSED, `${name} is scaled to .98 while pressed`);
        const step = await resolve(page, name === "primary" ? "action-primary-press" : "state-selected");
        assert.equal(style.backgroundColor, step, `${name} also takes its colour step`);
        await settle(page);
        assert.equal(await button.evaluate((el) => getComputedStyle(el).transform), "none", `${name} returns to scale 1`);
      }
      await page.close();
    });

    test("the scale is 100ms on Basalt's ease-out, and it is part of the button's own transition", async () => {
      const { page } = await fixturePage(browser, fixture, { theme });
      const t = await page.locator('[data-name="primary"]').evaluate((el) => {
        const s = getComputedStyle(el);
        return { properties: s.transitionProperty.split(", "), duration: s.transitionDuration, timing: s.transitionTimingFunction };
      });
      assert.ok(t.properties.includes("transform"), `transform is transitioned (${t.properties})`);
      assert.equal(t.duration, "0.1s", "duration-fast");
      assert.equal(t.timing, await page.evaluate(() => { const p = document.createElement("div"); p.style.transitionTimingFunction = "var(--basalt-ease-out)"; document.body.append(p); const v = getComputedStyle(p).transitionTimingFunction; p.remove(); return v; }));
      assert.equal(t.timing, "cubic-bezier(0.16, 1, 0.3, 1)");
      await page.close();
    });

    test("reduced motion keeps the colour step and drops the scale", async () => {
      const { page } = await fixturePage(browser, fixture, { theme });
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const name of ["primary", "secondary", "icon"]) {
        const style = await pressed(page, page.locator(`[data-name="${name}"]`), "transform", "backgroundColor");
        assert.equal(style.transform, "none", `${name} does not scale under reduced motion`);
        assert.equal(style.backgroundColor, await resolve(page, name === "primary" ? "action-primary-press" : "state-selected"), `${name} keeps its colour step`);
      }
      await page.close();
    });

    test("a disabled button and a loading button never scale", async () => {
      const { page } = await fixturePage(browser, fixture, { theme });
      for (const name of ["disabled", "loading"]) {
        const style = await pressed(page, page.locator(`[data-name="${name}"]`), "transform");
        assert.equal(style.transform, "none", `${name} stays at scale 1 when pressed`);
      }
      await page.close();
    });

    test("a menu row, a card and a command row never scale", async () => {
      const { page } = await fixturePage(browser, fixture, { theme });
      await settle(page);
      assert.equal((await pressed(page, page.locator('[data-name="card"]'), "transform")).transform, "none", "a card");
      await page.close();
      // An open menu is modal, so the rows get a page of their own.
      const menu = await fixturePage(browser, render(`<B.Menu defaultOpen><B.MenuTrigger>Actions</B.MenuTrigger><B.MenuContent><B.MenuItem data-name="row">Duplicate</B.MenuItem></B.MenuContent></B.Menu>`), { theme });
      await menu.page.locator('[data-name="row"]').waitFor();
      await settle(menu.page);
      assert.equal((await pressed(menu.page, menu.page.locator('[data-name="row"]'), "transform")).transform, "none", "a menu row");
      await menu.page.close();
      const command = await fixturePage(browser, `createRoot(document.getElementById("root")).render(<B.CommandMenu open onOpenChange={() => {}} groups={[{label:"Go",commands:[{id:"a",label:"Open sandbox",onSelect(){}}]}]} />);`, { theme });
      const row = command.page.locator(".basalt-command .basalt-menu-item").first();
      await row.waitFor();
      await settle(command.page);
      assert.equal((await pressed(command.page, row, "transform")).transform, "none", "a command row");
      await command.page.close();
    });

    test("nothing else in the stylesheet scales on :active, and there is no basalt-press utility", async () => {
      const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
      assert.ok(!/basalt-press/.test(css), "a basalt-press utility exists");
      const { page } = await fixturePage(browser, fixture, { theme });
      const scaling = await page.evaluate(() => {
        const found = [];
        const walk = (rules) => {
          for (const rule of rules) {
            if (rule.cssRules && !rule.selectorText) walk(rule.cssRules);
            else if (rule.selectorText && /:active/.test(rule.selectorText) && /scale|transform/.test(rule.style.transform || rule.style.scale || "")) {
              if (rule.style.transform && rule.style.transform !== "none") found.push(rule.selectorText);
            }
          }
        };
        for (const sheet of document.styleSheets) walk(sheet.cssRules);
        return found;
      });
      assert.deepEqual(scaling, [".basalt-button:active:not([data-disabled]):not([data-loading])"], "the one :active rule that scales");
      await page.close();
    });
  });
}

// ---- The smoked header ----

const headerPage = (extra = "") => `
  createRoot(document.getElementById("root")).render(
    <div style={{ height: 2400 }}>
      <header className="basalt-chrome" data-name="chrome" style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 24px", height: 56 }}>
        <B.Text weight="medium">Basalt</B.Text>
        <B.Text tone="secondary" size="sm">Secondary</B.Text>
        <B.Text tone="tertiary" size="sm" data-name="tertiary">Tertiary</B.Text>
        <B.Button variant="ghost" size="sm">Docs</B.Button>
      </header>
      <main style={{ padding: 24 }}><B.Heading level={1}>Page</B.Heading>${extra}</main>
    </div>);`;

for (const theme of ["dark", "light"]) {
  describe(`the smoked header (${theme})`, () => {
    const chrome = (page) => page.locator('[data-name="chrome"]');
    const read = (page, ...props) => chrome(page).evaluate((el, props) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]])), props);

    test("it is sticky, filled with surface-glass-chrome, blurred 12px with nothing else, and ruled below by the divider", async () => {
      const { page, errors } = await fixturePage(browser, headerPage(), { theme });
      await settle(page);
      const s = await read(page, "position", "top", "zIndex", "backgroundColor", "backdropFilter", "borderBottomColor", "borderBottomWidth", "borderBottomStyle", "color", "borderTopWidth");
      assert.equal(s.position, "sticky");
      assert.equal(s.top, "0px");
      assert.equal(s.zIndex, "100", "layer-sticky");
      assert.equal(s.backgroundColor, await resolve(page, "surface-glass-chrome"));
      assert.equal(s.backdropFilter, "blur(12px)", "blur-chrome, with no saturate and no brightness");
      // Chromium folds the prefixed property into the standard one, so the prefix is proved in the shipped source.
      const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
      const rule = css.match(/\.basalt-chrome \{[^}]*\}/)?.[0] ?? "";
      assert.match(rule, /-webkit-backdrop-filter: blur\(var\(--basalt-blur-chrome\)\);\s*backdrop-filter: blur\(var\(--basalt-blur-chrome\)\);/);
      assert.ok(!/saturate|brightness/.test(css.match(/backdrop-filter:[^;]*;/g).join("")), "no saturate or brightness in any backdrop-filter");
      assert.equal(s.borderBottomWidth, "1px");
      assert.equal(s.borderBottomStyle, "solid");
      assert.equal(s.borderBottomColor, await resolve(page, "border-divider", "borderBottomColor"));
      assert.equal(s.borderTopWidth, "0px", "only a bottom line");
      assert.equal(s.color, await resolve(page, "text-primary", "color"), "the class sets primary ink");
      assert.deepEqual(errors, []);
      await page.close();
    });

    test("it sticks while the page scrolls under it", async () => {
      const { page } = await fixturePage(browser, headerPage(), { theme });
      await page.evaluate(() => window.scrollTo(0, 1200));
      const y = await top(page);
      assert.equal(y, 0, "the bar stays at the top of the viewport");
      await page.close();
    });

    test("tertiary text inside the bar is promoted to secondary, so only primary and secondary ink sits on it", async () => {
      const { page } = await fixturePage(browser, headerPage(), { theme });
      const ink = await page.locator('[data-name="tertiary"]').evaluate((el) => getComputedStyle(el).color);
      assert.equal(ink, await resolve(page, "text-secondary", "color"));
      await page.close();
    });

    test("it is opaque surface-page, with no filter, when the browser has no backdrop-filter", async () => {
      // Make the @supports test fail the way it does in a browser without the property, by renaming the property it probes.
      const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
      const probe = /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)/;
      assert.ok(probe.test(css), "the @supports fallback is in the stylesheet");
      const page = await browser.newPage();
      await page.setContent(`<html data-theme="${theme}"><head><style>${css.replace(probe, "@supports not ((x-backdrop-filter: blur(1px)) or (-webkit-x-backdrop-filter: blur(1px)))")}</style></head><body><div id="root"></div></body></html>`);
      await page.addScriptTag({ content: await bundleFixture(headerPage()) });
      const bg = await fill(page);
      assert.equal(bg, await resolve(page, "surface-page"), "opaque page colour");
      await page.close();
    });

    test("prefers-reduced-transparency: opaque surface-page and no filter", async () => {
      const { page } = await fixturePage(browser, headerPage(), { theme });
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
      assert.ok(await page.evaluate(() => matchMedia("(prefers-reduced-transparency: reduce)").matches), "the query is emulated");
      const s = await read(page, "backgroundColor", "backdropFilter");
      assert.equal(s.backgroundColor, await resolve(page, "surface-page"));
      assert.equal(s.backdropFilter, "none");
      await page.close();
    });

    test("forced colours: Canvas and CanvasText, a real border, no filter", async () => {
      const { page } = await fixturePage(browser, headerPage(), { theme });
      await page.emulateMedia({ forcedColors: "active" });
      const s = await read(page, "backgroundColor", "color", "backdropFilter", "borderBottomStyle", "borderBottomWidth", "borderBottomColor");
      const canvas = await page.evaluate(() => { const p = document.createElement("div"); p.style.cssText = "background: Canvas; color: CanvasText"; document.body.append(p); const v = [getComputedStyle(p).backgroundColor, getComputedStyle(p).color]; p.remove(); return v; });
      assert.equal(s.backgroundColor, canvas[0]);
      assert.equal(s.color, canvas[1]);
      assert.equal(s.borderBottomColor, canvas[1]);
      assert.equal(s.borderBottomStyle, "solid");
      assert.equal(s.borderBottomWidth, "1px");
      assert.equal(s.backdropFilter, "none");
      await page.close();
    });

    test("print: opaque surface-page and no filter", async () => {
      const { page } = await fixturePage(browser, headerPage(), { theme });
      await page.emulateMedia({ media: "print" });
      const s = await read(page, "backgroundColor", "backdropFilter");
      assert.equal(s.backgroundColor, await resolve(page, "surface-page"));
      assert.equal(s.backdropFilter, "none");
      await page.close();
    });
  });
}

async function top(page) {
  return page.locator('[data-name="chrome"]').evaluate((el) => Math.round(el.getBoundingClientRect().top));
}
async function fill(page) {
  return page.locator('[data-name="chrome"]').evaluate((el) => getComputedStyle(el).backgroundColor);
}

// ---- At most one backdrop-filter in a viewport ----

const overlays = `function Show(){const t=B.useToast();React.useEffect(()=>{t.show({title:"Saved",timeout:0})},[t]);return null}
  const commands=[{label:"Go",commands:[{id:"a",label:"Open",onSelect(){}}]}];
  createRoot(document.getElementById("root")).render(
    <B.ToastProvider><B.TooltipProvider>
      <header className="basalt-chrome" data-name="chrome" style={{ height: 56 }}>Basalt</header>
      <B.Card style={{ margin: 24 }}>
        <B.Menu defaultOpen><B.MenuTrigger>Actions</B.MenuTrigger><B.MenuContent data-overlay="menu"><B.MenuItem>Duplicate</B.MenuItem></B.MenuContent></B.Menu>
        <B.Popover defaultOpen><B.PopoverTrigger>Details</B.PopoverTrigger><B.PopoverContent data-overlay="popover">A popover</B.PopoverContent></B.Popover>
        <B.Tooltip defaultOpen content="Tip"><B.Button>Hover</B.Button></B.Tooltip>
        <B.Select aria-label="Region" defaultOpen options={[{value:"a",label:"Alpha"}]} />
        <B.Combobox aria-label="Zone" defaultOpen options={[{value:"x",label:"X-ray"}]} />
      </B.Card>
      <B.Dialog defaultOpen><B.DialogContent data-overlay="dialog"><B.DialogTitle>Dialog</B.DialogTitle><B.DialogDescription>Held</B.DialogDescription></B.DialogContent></B.Dialog>
      <B.AlertDialog defaultOpen><B.AlertDialogContent data-overlay="alert"><B.AlertDialogTitle>Delete?</B.AlertDialogTitle><B.AlertDialogDescription>Gone</B.AlertDialogDescription><B.AlertDialogActions><B.AlertDialogCancel>Cancel</B.AlertDialogCancel></B.AlertDialogActions></B.AlertDialogContent></B.AlertDialog>
      <B.Sheet defaultOpen><B.SheetContent data-overlay="sheet"><B.SheetTitle>Sheet</B.SheetTitle><B.SheetDescription>Side</B.SheetDescription></B.SheetContent></B.Sheet>
      <B.CommandMenu open onOpenChange={() => {}} groups={commands} />
      <Show />
    </B.TooltipProvider></B.ToastProvider>);`;

for (const theme of ["dark", "light"]) {
  describe(`one backdrop-filter per viewport (${theme})`, () => {
    test("with a Dialog, an AlertDialog, a Sheet, the command menu, a Menu, a Popover, a Select, a Combobox, a Tooltip and a Toast open, only the header is filtered", async () => {
      const { page, errors } = await fixturePage(browser, overlays, { theme });
      // Each modal inerts the ones below it, so they are found by what they are, not by role.
      for (const selector of ['[data-overlay="dialog"]', '[data-overlay="alert"]', '[data-overlay="sheet"]', '[data-overlay="menu"]', '[data-overlay="popover"]', ".basalt-toast", ".basalt-tooltip", ".basalt-command"]) {
        await page.locator(selector).first().waitFor({ state: "attached" });
      }
      await settle(page);
      const found = await page.evaluate(() => {
        const filtered = [];
        const label = (el, pseudo) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : ""}${pseudo}`;
        for (const el of document.querySelectorAll("*")) {
          for (const pseudo of ["", "::before", "::after"]) {
            const s = getComputedStyle(el, pseudo || null);
            const value = s.backdropFilter || s.getPropertyValue("-webkit-backdrop-filter");
            if (value && value !== "none") filtered.push(label(el, pseudo));
          }
        }
        return { filtered, backdrops: document.querySelectorAll(".basalt-backdrop, [class*='basalt-'][class*='backdrop']").length };
      });
      assert.deepEqual(found.filtered, ["header.basalt-chrome"], "the header is the only element with a backdrop-filter");
      assert.ok(found.backdrops > 0, "the modals' scrims are in the page, and unfiltered");
      assert.deepEqual(errors, []);
      await page.close();
    });

    test("no Basalt rule other than .basalt-chrome sets a backdrop-filter, and none sets a filter on an overlay", async () => {
      const { page } = await fixturePage(browser, headerPage(), { theme });
      const rules = await page.evaluate(() => {
        const found = [];
        const walk = (list) => {
          for (const rule of list) {
            if (rule.selectorText) {
              const v = rule.style.backdropFilter || rule.style.getPropertyValue("-webkit-backdrop-filter");
              if (v && v !== "none") found.push(rule.selectorText);
              if (rule.style.filter && rule.style.filter !== "none") found.push(`filter: ${rule.selectorText}`);
            } else if (rule.cssRules) walk(rule.cssRules);
          }
        };
        for (const sheet of document.styleSheets) walk(sheet.cssRules);
        return found;
      });
      assert.deepEqual([...new Set(rules)], [".basalt-chrome"]);
      await page.close();
    });
  });
}
