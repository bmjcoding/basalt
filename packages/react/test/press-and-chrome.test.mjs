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


// ---- Stylesheet walkers ----
//
// These run in the page (so they are self-contained). They visit every rule and recurse into every rule's `cssRules`, whether it
// is a grouping rule (@media, @supports, @layer) or a style rule with nested rules, and they carry the enclosing style rule's
// selector down so a nested `&:hover` is reported as `.basalt-menu &:hover`. A walker that stopped at a rule with a
// `selectorText` was blind to nesting, and one that read only `transform` was blind to the individual `scale` property.
// Declarations written after a nested rule (`.a { &:hover {} scale: .98; }`) become a `CSSNestedDeclarations` rule with a
// style and no selector of its own; the walkers read those too, under the enclosing rule's selector.

/** Every rule that sets a backdrop-filter (either spelling) or a filter, as `[kind, full selector]`. */
function filteredRules() {
  const found = [];
  const walk = (list, parent) => {
    for (const rule of list) {
      const selector = rule.selectorText ? (parent ? `${parent} ${rule.selectorText}` : rule.selectorText) : parent;
      if ((rule.selectorText || rule instanceof CSSNestedDeclarations) && rule.style) {
        const backdrop = rule.style.backdropFilter || rule.style.getPropertyValue("-webkit-backdrop-filter");
        if (backdrop && backdrop !== "none") found.push(["backdrop-filter", selector]);
        if (rule.style.filter && rule.style.filter !== "none") found.push(["filter", selector]);
      }
      if (rule.cssRules) walk(rule.cssRules, selector);
    }
  };
  for (const sheet of document.styleSheets) walk(sheet.cssRules, "");
  return found;
}

/** Every rule that sets a transform or an individual `scale` while `:active` (its own selector or an ancestor's). */
function scalingOnActive() {
  const found = [];
  const set = (v) => v && v !== "none";
  const walk = (list, parent) => {
    for (const rule of list) {
      const selector = rule.selectorText ? (parent ? `${parent} ${rule.selectorText}` : rule.selectorText) : parent;
      if ((rule.selectorText || rule instanceof CSSNestedDeclarations) && rule.style && /:active/.test(selector) && (set(rule.style.transform) || set(rule.style.scale))) found.push(selector);
      if (rule.cssRules) walk(rule.cssRules, selector);
    }
  };
  for (const sheet of document.styleSheets) walk(sheet.cssRules, "");
  return found;
}

/** The selectors of every rule that sets `color` to text-tertiary, nested rules included. */
function tertiaryInk() {
  const found = [];
  const walk = (list, parent) => {
    for (const rule of list) {
      const selector = rule.selectorText ? (parent ? `${parent} ${rule.selectorText}` : rule.selectorText) : parent;
      if ((rule.selectorText || rule instanceof CSSNestedDeclarations) && rule.style && /text-tertiary/.test(rule.style.getPropertyValue("color"))) found.push(selector);
      if (rule.cssRules) walk(rule.cssRules, selector);
    }
  };
  for (const sheet of document.styleSheets) walk(sheet.cssRules, "");
  return found;
}

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

    test("the parts of a field (NumberField steppers, the Combobox trigger) keep the colour step, never scale, and have no pressed hit-area extension", async () => {
      // Council, 4-0. A plain IconButton is the control: it scales and has the extension.
      const { page } = await fixturePage(browser, `const Dot = () => <svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="4" fill="currentColor" /></svg>;
        ${render(`<div style={{ display: "flex", gap: 24, padding: 24 }}>
          <B.NumberField aria-label="Count" defaultValue={3} decrementLabel="Fewer" incrementLabel="More" />
          <B.Combobox aria-label="Zone" options={[{ value: "x", label: "X-ray" }]} />
          <B.IconButton icon={Dot} label="Plain" data-name="plain" />
        </div>`)}`, { theme });
      await settle(page);
      const parts = { Fewer: page.getByRole("button", { name: "Fewer" }), More: page.getByRole("button", { name: "More" }), "Show options": page.locator(".basalt-combobox-trigger") };
      const step = await resolve(page, "state-selected");
      const after = (el) => getComputedStyle(el, "::after").content;
      for (const [name, button] of Object.entries(parts)) {
        const held = await pressed(page, button, "transform", "backgroundColor");
        assert.equal(held.transform, "none", `${name} does not scale while pressed`);
        assert.equal(held.backgroundColor, step, `${name} keeps its colour step`);
        // The pseudo-element is read while the button is held, since the extension exists only on :active.
        const box = await button.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await settle(page);
        assert.equal(await button.evaluate(after), "none", `${name} has no pressed hit-area extension`);
        await page.mouse.up();
        await settle(page);
      }
      const plain = page.locator('[data-name="plain"]');
      assert.equal((await pressed(page, plain, "transform")).transform, PRESSED, "the control: a plain IconButton still scales");
      const box = await plain.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await settle(page);
      assert.equal(await plain.evaluate(after), '""', "and still has the extension");
      await page.mouse.up();
      await page.close();
    });

    test("a pressed ghost Button in the header takes primary ink on touch (hover: none), with the wash kept; outside the header it keeps secondary ink", async () => {
      // Council, 3-1. Where hover is unavailable the press is the only state, and secondary ink on the wash is 4.42:1 in dark.
      const { page } = await fixturePage(browser, `${render(`<div>
        <header className="basalt-chrome" style={{ display: "flex", alignItems: "center", padding: "0 24px", height: 56 }}><B.Button variant="ghost" data-name="in-bar">Docs</B.Button></header>
        <main style={{ padding: 24 }}><B.Button variant="ghost" data-name="outside">Docs</B.Button></main>
      </div>`)}`, { theme, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      await settle(page);
      assert.equal(await page.evaluate(() => matchMedia("(hover: none)").matches), true, "hover is unavailable");
      const primary = await resolve(page, "text-primary", "color");
      const secondary = await resolve(page, "text-secondary", "color");
      const wash = await resolve(page, "state-selected");
      const rest = await page.locator('[data-name="in-bar"]').evaluate((el) => getComputedStyle(el).color);
      assert.equal(rest, secondary, "a ghost rests at secondary ink");
      const inBar = await pressed(page, page.locator('[data-name="in-bar"]'), "color", "backgroundColor");
      assert.equal(inBar.color, primary, "pressed in the header: primary ink");
      assert.equal(inBar.backgroundColor, wash, "the wash stays");
      const outside = await pressed(page, page.locator('[data-name="outside"]'), "color", "backgroundColor");
      assert.equal(outside.color, secondary, "pressed outside the header: unchanged");
      assert.equal(outside.backgroundColor, wash);
      await page.close();
    });

    test("a disabled or loading ghost Button in the header does not take the pressed ink", async () => {
      const { page } = await fixturePage(browser, render(`<header className="basalt-chrome" style={{ display: "flex", gap: 24, alignItems: "center", padding: "0 24px", height: 56 }}>
        <B.Button variant="ghost" disabled data-name="disabled">Docs</B.Button><B.Button variant="ghost" loading data-name="loading">Docs</B.Button></header>`), { theme, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      await settle(page);
      const primary = await resolve(page, "text-primary", "color");
      for (const name of ["disabled", "loading"]) {
        const held = await pressed(page, page.locator(`[data-name="${name}"]`), "color");
        assert.notEqual(held.color, primary, `a ${name} ghost keeps its own ink when pressed`);
      }
      await page.close();
    });

    test("nothing else in the stylesheet scales on :active, and there is no basalt-press utility", async () => {
      const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
      assert.ok(!/basalt-press/.test(css), "a basalt-press utility exists");
      const { page } = await fixturePage(browser, fixture, { theme });
      assert.deepEqual(await page.evaluate(scalingOnActive), [".basalt-button:active:not([data-disabled]):not([data-loading])"], "the one :active rule that scales");
      await page.close();
    });

    test("the :active guard catches a card that scales by the individual scale property, and a nested :active transform", async () => {
      const { page } = await fixturePage(browser, fixture, { theme });
      await page.addStyleTag({ content: ".basalt-card:active { scale: .98; }" });
      await page.addStyleTag({ content: ".basalt-menu-item { &:active { transform: scale(.98); } }" });
      const found = await page.evaluate(scalingOnActive);
      assert.ok(found.includes(".basalt-card:active"), `scale on a card slipped past the guard: ${found}`);
      assert.ok(found.includes(".basalt-menu-item &:active"), `a nested :active transform slipped past the guard: ${found}`);
      assert.notDeepEqual(found, [".basalt-button:active:not([data-disabled]):not([data-loading])"]);
      // and the mutation is real, not only visible to the walker: a card really shrinks
      const held = await pressed(page, page.locator('[data-name="card"]'), "scale");
      assert.equal(held.scale, "0.98", "the injected rule really scales the card");
      await page.close();
    });

    test("the guards catch declarations written after a nested rule, which have no selector of their own", async () => {
      const { page } = await fixturePage(browser, fixture, { theme });
      await page.addStyleTag({ content: ".basalt-card { &:hover { color: var(--basalt-text-primary); } backdrop-filter: blur(var(--basalt-blur-chrome)); }" });
      await page.addStyleTag({ content: ".basalt-card:active { &:hover { color: var(--basalt-text-primary); } scale: .98; }" });
      const filtered = (await page.evaluate(filteredRules)).map(([kind, selector]) => `${kind}: ${selector}`);
      assert.ok(filtered.includes("backdrop-filter: .basalt-card"), `a trailing backdrop-filter slipped past the guard: ${filtered}`);
      const scaling = await page.evaluate(scalingOnActive);
      assert.ok(scaling.includes(".basalt-card:active"), `a trailing scale slipped past the guard: ${scaling}`);
      // and both mutations are real: the card is blurred, and it shrinks while held
      const card = page.locator('[data-name="card"]');
      assert.equal(await card.evaluate((el) => getComputedStyle(el).backdropFilter), "blur(12px)", "the injected rule really blurs the card");
      const held = await pressed(page, card, "scale");
      assert.equal(held.scale, "0.98", "the injected rule really scales the card");
      await page.close();
    });

    test("a loading button never takes the press colour or the scale, in all four variants", async () => {
      const { page } = await fixturePage(browser, render(`<div style={{ display: "flex", gap: 24, padding: 24 }}>
        <B.Button variant="primary" loading data-name="primary">Saving</B.Button>
        <B.Button variant="secondary" loading data-name="secondary">Saving</B.Button>
        <B.Button variant="ghost" loading data-name="ghost">Saving</B.Button>
        <B.Button variant="danger" loading data-name="danger">Saving</B.Button>
      </div>`), { theme });
      await settle(page);
      for (const name of ["primary", "secondary", "ghost", "danger"]) {
        const button = page.locator(`[data-name="${name}"]`);
        // The pointer is over the button either way, so the fill to compare with is the hovered one, not the rest one.
        const box = await button.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await settle(page);
        const hovered = await button.evaluate((el) => getComputedStyle(el).backgroundColor);
        const held = await pressed(page, button, "backgroundColor", "transform");
        assert.equal(held.backgroundColor, hovered, `a loading ${name} button keeps its hovered fill when pressed`);
        assert.equal(held.transform, "none", `a loading ${name} button does not scale`);
        const step = await resolve(page, name === "primary" ? "action-primary-press" : "state-selected");
        assert.notEqual(held.backgroundColor, step, `a loading ${name} button does not take the press colour`);
      }
      await page.close();
    });

    test("a press keeps the button's full rest hit area: a press 1px inside the edge of a 342px button still clicks", async () => {
      const { page } = await fixturePage(browser, render(`<B.Button variant="primary" data-name="wide" style={{ width: 342 }} onClick={() => { window.clicks = (window.clicks || 0) + 1; }}>Continue</B.Button>`), { theme });
      await settle(page);
      const button = page.locator('[data-name="wide"]');
      const box = await button.boundingBox();
      assert.equal(box.width, 342);
      let expected = 0;
      for (const x of [box.x + 1, box.x + box.width - 1]) {
        await page.mouse.move(x, box.y + box.height / 2);
        await page.mouse.down();
        await settle(page);
        assert.equal(await button.evaluate((el) => getComputedStyle(el).transform), PRESSED, "the button is scaled while held");
        await page.mouse.up();
        expected += 1;
        assert.equal(await page.evaluate(() => window.clicks), expected, `a press ${x === box.x + 1 ? "1px inside the left edge" : "1px inside the right edge"} fires its click`);
        await settle(page);
      }
      await page.close();
    });

    for (const density of ["default", "compact"]) {
      test(`on touch (${density} density) a pressed Button and IconButton keep their full 44px target`, async () => {
        const { page } = await fixturePage(browser, `const Dot = () => <svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="4" fill="currentColor" /></svg>;
          ${render(`<div style={{ display: "flex", gap: 24, padding: 24 }}><B.Button variant="primary" size="sm" data-name="primary">Deploy</B.Button><B.IconButton icon={Dot} label="Copy" size="xs" data-name="icon" /></div>`)}`, { theme, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
        await page.evaluate((density) => { document.documentElement.dataset.density = density; }, density);
        await settle(page);
        assert.equal(await page.evaluate(() => matchMedia("(pointer: coarse)").matches), true, "the pointer is coarse");
        for (const name of ["primary", "icon"]) {
          const button = page.locator(`[data-name="${name}"]`);
          const rest = await button.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
          assert.ok(rest.width >= 44 && rest.height >= 44, `${name} rests at ${rest.width}x${rest.height}`);
          await page.mouse.move(rest.x + rest.width / 2, rest.y + rest.height / 2);
          await page.mouse.down();
          await settle(page);
          assert.equal(await button.evaluate((el) => getComputedStyle(el).transform), PRESSED, `${name} is scaled while held`);
          // Every corner and edge midpoint of the rest box, a tenth of a pixel inside, must still hit the pressed button.
          const inset = 0.1;
          const points = [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0], [0.5, 1], [0, 0.5], [1, 0.5]].map(([fx, fy]) => [rest.x + inset + fx * (rest.width - 2 * inset), rest.y + inset + fy * (rest.height - 2 * inset)]);
          const missed = await page.evaluate(([points, name]) => points.filter(([x, y]) => !document.elementFromPoint(x, y)?.closest(`[data-name="${name}"]`)), [points, name]);
          await page.mouse.up();
          assert.deepEqual(missed, [], `${name} (${density}) loses part of its 44px target while pressed`);
          await settle(page);
        }
        await page.close();
      });
    }

    test("a live switch to reduced motion while a button is held does not animate the scale back", async () => {
      const { page } = await fixturePage(browser, fixture, { theme });
      await settle(page);
      const button = page.locator('[data-name="primary"]');
      const box = await button.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await settle(page);
      assert.equal(await button.evaluate((el) => getComputedStyle(el).transform), PRESSED);
      await page.emulateMedia({ reducedMotion: "reduce" });
      const after = await button.evaluate((el) => ({
        transform: getComputedStyle(el).transform,
        properties: getComputedStyle(el).transitionProperty.split(", "),
        running: el.getAnimations().filter((a) => a.transitionProperty === "transform").length,
      }));
      await page.mouse.up();
      assert.equal(after.transform, "none", "the scale is gone at once");
      assert.ok(!after.properties.includes("transform"), `transform is out of the transition list (${after.properties})`);
      assert.equal(after.running, 0, "no transform transition runs");
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
        <span className="basalt-preview-kicker" data-name="kicker">Kicker</span>
        <B.Button variant="ghost" size="sm">Docs</B.Button>
      </header>
      <main style={{ padding: 24 }}><B.Heading level={1}>Page</B.Heading><span className="basalt-preview-kicker" data-name="kicker-outside">Kicker</span>${extra}</main>
    </div>);`;

for (const theme of ["dark", "light"]) {
  describe(`the smoked header (${theme})`, () => {
    const chrome = (page) => page.locator('[data-name="chrome"]');
    const read = (page, ...props) => chrome(page).evaluate((el, props) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]])), props);

    test("it is sticky, filled with surface-chrome, blurred 12px with nothing else, and ruled below by the hairline", async () => {
      const { page, errors } = await fixturePage(browser, headerPage(), { theme });
      await settle(page);
      const s = await read(page, "position", "top", "zIndex", "backgroundColor", "backdropFilter", "borderBottomColor", "borderBottomWidth", "borderBottomStyle", "color", "borderTopWidth");
      assert.equal(s.position, "sticky");
      assert.equal(s.top, "0px");
      assert.equal(s.zIndex, "100", "layer-sticky");
      assert.equal(s.backgroundColor, await resolve(page, "surface-chrome"));
      assert.equal(s.backdropFilter, "blur(12px)", "blur-chrome, with no saturate and no brightness");
      // Chromium folds the prefixed property into the standard one, so the prefix is proved in the shipped source.
      const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
      const rule = css.match(/\.basalt-chrome \{[^}]*\}/)?.[0] ?? "";
      assert.match(rule, /-webkit-backdrop-filter: blur\(var\(--basalt-blur-chrome\)\);\s*backdrop-filter: blur\(var\(--basalt-blur-chrome\)\);/);
      assert.ok(!/saturate|brightness/.test(css.match(/backdrop-filter:[^;]*;/g).join("")), "no saturate or brightness in any backdrop-filter");
      assert.equal(s.borderBottomWidth, "1px");
      assert.equal(s.borderBottomStyle, "solid");
      assert.equal(s.borderBottomColor, await resolve(page, "border-hairline", "borderBottomColor"), "the bar's line is the hairline");
      assert.equal(s.borderTopWidth, "0px", "only a bottom line");
      assert.equal(s.color, await resolve(page, "text-primary", "color"), "the class sets primary ink");
      assert.deepEqual(errors, []);
      await page.close();
    });

    test("the bar's bottom line is white 14.5% in dark and black 8% in light, brighter than a divider in dark and the same in light", async () => {
      // Council, 3-1: the exception to "a divider is never brighter than the rim", because the bar has no rim.
      const { page } = await fixturePage(browser, headerPage(), { theme });
      const line = (await read(page, "borderBottomColor")).borderBottomColor;
      const divider = await resolve(page, "border-divider", "borderBottomColor");
      // Chromium writes the token as oklab(L a b / alpha): L 1 is white and L 0 is black, both with no chroma.
      const [r, g, b, a] = line.match(/[\d.]+/g).map(Number);
      if (theme === "dark") {
        assert.deepEqual([r, g, b], [1, 0, 0]);
        assert.ok(Math.abs(a - 0.145) < 0.01, `white at 14.5% (${line})`);
        assert.notEqual(line, divider, "brighter than the divider in dark");
      } else {
        assert.deepEqual([r, g, b], [0, 0, 0]);
        assert.ok(Math.abs(a - 0.08) < 0.01, `black at 8% (${line})`);
        assert.equal(line, divider, "light is the same either way");
      }
      await page.close();
    });

    test("under a dialog's scrim the bar is still filtered, and it is the only filtered element", async () => {
      // Council, 4-0: nothing built for this; it is what is built.
      const { page } = await fixturePage(browser, `createRoot(document.getElementById("root")).render(<div><header className="basalt-chrome" data-name="chrome" style={{ height: 56 }}>Basalt</header><B.Dialog defaultOpen><B.DialogContent><B.DialogTitle>Dialog</B.DialogTitle><B.DialogDescription>Held</B.DialogDescription></B.DialogContent></B.Dialog></div>);`, { theme });
      await page.locator(".basalt-dialog").waitFor();
      await settle(page);
      assert.equal((await read(page, "backdropFilter")).backdropFilter, "blur(12px)");
      const scrim = await page.locator(".basalt-dialog-backdrop").evaluate((el) => getComputedStyle(el).backdropFilter);
      assert.equal(scrim, "none", "the scrim is unblurred");
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

    test("a preview kicker inside the bar is promoted too, and outside the bar it stays tertiary", async () => {
      const { page } = await fixturePage(browser, headerPage(), { theme });
      const ink = (name) => page.locator(`[data-name="${name}"]`).evaluate((el) => getComputedStyle(el).color);
      assert.equal(await ink("kicker"), await resolve(page, "text-secondary", "color"), "promoted inside the bar");
      assert.equal(await ink("kicker-outside"), await resolve(page, "text-tertiary", "color"), "unchanged outside it");
      await page.close();
    });

    test("every part that draws tertiary ink is either promoted inside the bar or sits on a fill of its own", async () => {
      const { page } = await fixturePage(browser, headerPage(), { theme });
      const found = [...new Set(await page.evaluate(tertiaryInk))].sort();
      // Promoted by the bar: it has no fill of its own.
      const promoted = [".basalt-preview-kicker", ".basalt-sparkline-axis", '.basalt-text[data-tone="tertiary"]'];
      // Draws tertiary ink only on a fill of its own (an input, a select trigger, the command menu's panel and its level-2
      // input band, and the group labels of a popup, which sit on the popup's own level fill, and the group labels of a navigation, a sidebar
      // that sits on the page and never inside the bar).
      const ownFill = [".basalt-command [cmdk-group-heading]", ".basalt-command-input::placeholder", ".basalt-command-search", ".basalt-command-slot", ".basalt-input::placeholder", ".basalt-menu-group-label", ".basalt-nav-group-label", ".basalt-select-value[data-placeholder]"];
      assert.deepEqual(found, [...promoted, ...ownFill].sort(), "a part draws tertiary ink that is neither promoted in the bar nor on a fill of its own: promote it in .basalt-chrome or list it here with the reason");
      const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
      const list = css.match(/(?:\.basalt-chrome [^{;]*,\s*)+\.basalt-chrome [^{;]*\{\s*color: var\(--basalt-text-secondary\);/)?.[0] ?? "";
      for (const selector of promoted) assert.ok(list.includes(`.basalt-chrome ${selector}`), `${selector} is promoted in the bar`);
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
      const rules = await page.evaluate(filteredRules);
      assert.deepEqual([...new Set(rules.map(([kind, selector]) => `${kind}: ${selector}`))], ["backdrop-filter: .basalt-chrome"]);
      await page.close();
    });

    test("the filter guard catches a backdrop-filter nested in another rule, and a filter on an overlay", async () => {
      const { page } = await fixturePage(browser, headerPage(), { theme });
      await page.addStyleTag({ content: ".basalt-menu { &:hover { backdrop-filter: blur(var(--basalt-blur-chrome)); } }" });
      await page.addStyleTag({ content: "@media (min-width: 1px) { .basalt-dialog { filter: blur(1px); } }" });
      const found = (await page.evaluate(filteredRules)).map(([kind, selector]) => `${kind}: ${selector}`);
      assert.ok(found.includes("backdrop-filter: .basalt-menu &:hover"), `a nested backdrop-filter slipped past the guard: ${found}`);
      assert.ok(found.includes("filter: .basalt-dialog"), `a filter inside @media slipped past the guard: ${found}`);
      assert.notDeepEqual([...new Set(found)], ["backdrop-filter: .basalt-chrome"]);
      await page.close();
    });
  });
}
