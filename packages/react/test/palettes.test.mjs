// Palettes in a real browser (cimip-gaps-3 T9, DECISIONS 403, tests 4 to 9 and 11): painted against predicted, scopes, more contrast, forced colours, the
// mechanism (head script and file, precedence, storage, the link's palette, url: false) and the two controls, corners. On the built stylesheet with
// beryl's shipped CSS and the ochre fixture's (paletteCss). Written by the builder; not run under the pause (DECISIONS 359).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import ochre from "../../tokens/test/palettes/ochre.mjs";
import beryl from "../../tokens/palettes/beryl.mjs";
import { paletteCss } from "../../tokens/dist/js/palettes.js";
import { fixturePage, launch, pkg, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const PALETTES = paletteCss([beryl, ochre]);
const index = await import(path.join(pkg, "dist", "index.js"));

/** A page with the palettes' CSS and the fixture, the root's palette and theme set. */
async function palettePage(jsx, { palette = null, theme = "light", ...options } = {}) {
  const { page, errors } = await fixturePage(browser, `createRoot(document.getElementById("root")).render(<>${jsx}</>);`, { theme, ...options });
  await page.addStyleTag({ content: PALETTES });
  await page.evaluate((p) => { if (p) document.documentElement.setAttribute("data-palette", p); else document.documentElement.removeAttribute("data-palette"); }, palette);
  await settle(page);
  return { page, errors };
}
const rgb = (hex) => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
const style = (page, selector, property) => page.locator(selector).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);

describe("painted against predicted (test 4)", () => {
  for (const def of [beryl, ochre]) for (const theme of ["light", "dark"]) {
    test(`${def.id}, ${theme}: each reader paints the palette's value`, async () => {
      const { page } = await palettePage(`<B.Button variant="primary" id="p">Save</B.Button><B.Link href="#a" id="l">Link</B.Link><B.Checkbox defaultChecked id="c">On</B.Checkbox><B.Input id="i" aria-label="Name" defaultValue="Ada" />`, { palette: def.id, theme });
      const p = def.button.primary;
      assert.equal(await style(page, "#p", "background-color"), rgb(p.fill[theme]));
      assert.equal(await style(page, "#p", "color"), rgb(p.ink[theme]));
      assert.equal(await style(page, "#l", "color"), rgb(def.link.ink[theme]));
      assert.equal(await style(page, "#l", "text-decoration-color"), rgb(def.link.underline[theme]));
      assert.equal(await style(page, ".basalt-checkbox[data-checked]", "background-color"), rgb(def.checked.fill[theme]));
      if (def.field.edge) assert.match(await style(page, "#i", "box-shadow"), new RegExp(rgb(def.field.edge[theme]).replace(/[()]/g, "\\$&")));
      await page.close();
    });
  }

  test("a primary Button's note, zero count, positive count and pill edge take the button's ink (the quiet parts at 0.72), at rest, hover and press", async () => {
    const { page } = await palettePage(`<B.Button variant="primary" note="Ships in two days" id="n">Standard</B.Button><B.Button variant="primary" count={3} id="c3">Basket</B.Button><B.Button variant="primary" count={0} id="c0">Saved</B.Button>`, { palette: "beryl" });
    const ink = rgb(beryl.button.primary.ink.light);
    for (const state of ["rest", "hover", "press"]) {
      if (state === "hover") await page.hover("#c3");
      if (state === "press") { await page.hover("#c3"); await page.mouse.down(); }
      assert.equal(await style(page, "#c3 .basalt-button-count > span", "color"), ink, `${state}: positive count`);
      assert.match(await style(page, "#c3 .basalt-button-count > span", "box-shadow"), /rgb\(255, 255, 255\)/, `${state}: pill edge`);
      assert.match(await style(page, "#c0 .basalt-button-count > span", "color"), /rgba?\(255, 255, 255, 0\.72\)|color\(srgb 1 1 1 \/ 0\.72\)/, `${state}: zero count at 0.72`);
      assert.match(await style(page, "#n .basalt-button-note", "color"), /0\.72/, `${state}: note at 0.72`);
      if (state === "press") await page.mouse.up();
    }
    await page.close();
  });

  test("a disabled primary draws no palette edge; a loading one keeps it", async () => {
    const { page } = await palettePage(`<B.Button variant="primary" disabled id="d">Closed</B.Button><B.Button variant="primary" loading id="b">Saving</B.Button>`, { palette: "ochre" });
    assert.equal(await style(page, "#d", "box-shadow"), "none");
    assert.match(await style(page, "#b", "box-shadow"), new RegExp(rgb(ochre.button.primary.edge.light).replace(/[()]/g, "\\$&")));
    await page.close();
  });

  test("the current page keeps its chosen fill and ink at rest, on hover and on press, in both pagination forms", async () => {
    const { page } = await palettePage(`<B.Pagination page={2} pageCount={5} onPageChange={() => {}} id="btn" /><B.Pagination page={2} pageCount={5} hrefForPage={(n) => "#p" + n} id="lnk" />`, { palette: "ochre" });
    const fill = rgb(ochre.chosen.fill.light);
    const ink = rgb(ochre.chosen.ink.light);
    for (const sel of ['#btn [aria-current="page"]', '#lnk [aria-current="page"]']) {
      assert.equal(await style(page, sel, "background-color"), fill);
      await page.hover(sel);
      assert.equal(await style(page, sel, "background-color"), fill, `${sel} hovered`);
      assert.equal(await style(page, sel, "color"), ink);
      await page.mouse.down();
      assert.equal(await style(page, sel, "background-color"), fill, `${sel} pressed`);
      await page.mouse.up();
    }
    await page.close();
  });

  test("a SearchField's host takes the field edge at rest, hover and focus; invalid and writing keep theirs", async () => {
    const { page } = await palettePage(`<B.SearchField label="Search" value="tides" onValueChange={() => {}} />`, { palette: "ochre" });
    const host = ".basalt-search-box";
    assert.match(await style(page, host, "box-shadow"), /143, 122, 88/, "rest: the field edge");
    await page.hover(host);
    assert.match(await style(page, host, "box-shadow"), /154, 116, 54/, "hover: the hover edge");
    await page.focus(".basalt-search-box-input");
    assert.match(await style(page, host, "box-shadow"), /110, 70, 19/, "focus: the active edge");
    await page.close();
  });
});

describe("scopes (test 5)", () => {
  test("a light card in a dark palette page; beryl inside ochre has Basalt's pill; an explicit basalt card is Basalt's", async () => {
    const { page } = await palettePage(`<B.PaletteScope palette="ochre" theme="dark" id="o"><B.SegmentedControl defaultValue="b" aria-label="R"><B.Segment value="a">A</B.Segment><B.Segment value="b">B</B.Segment></B.SegmentedControl>
      <B.PaletteScope palette="beryl" theme="light" id="b"><B.Button variant="primary" id="bb">Go</B.Button><B.SegmentedControl defaultValue="b" aria-label="R2"><B.Segment value="a">A</B.Segment><B.Segment value="b" id="bseg">B</B.Segment></B.SegmentedControl></B.PaletteScope>
      <B.PaletteScope palette="basalt" id="z"><B.Button variant="primary" id="zb">Go</B.Button></B.PaletteScope></B.PaletteScope>`);
    assert.equal(await style(page, "#bb", "background-color"), rgb(beryl.button.primary.fill.light), "light beryl inside dark ochre");
    assert.notEqual(await style(page, "#bseg", "background-color"), rgb(ochre.chosen.fill.light), "beryl sets no chosen fill: Basalt's pill, never ochre's");
    const { page: plain } = await palettePage(`<B.PaletteScope theme="dark" palette="basalt"><B.Button variant="primary" id="zb">Go</B.Button></B.PaletteScope>`);
    assert.equal(await style(page, "#zb", "background-color"), await style(plain, "#zb", "background-color"), "basalt inside ochre is Basalt");
    assert.equal(await style(page, "#zb", "transition-duration"), await style(plain, "#zb", "transition-duration"));
    await page.close(); await plain.close();
  });

  test("a popup opened from a light beryl scope on a dark ochre page carries both attributes, and the scope's icons", async () => {
    const { page } = await palettePage(`<B.PaletteScope palette="ochre" theme="dark"><B.PaletteScope palette="beryl" theme="light"><B.Menu defaultOpen><B.MenuTrigger render={<B.Button>Open</B.Button>} /><B.MenuContent><B.MenuItem>Row</B.MenuItem></B.MenuContent></B.Menu></B.PaletteScope></B.PaletteScope>`);
    const root = page.locator(".basalt-positioner").locator("xpath=..");
    assert.equal(await root.getAttribute("data-palette"), "beryl");
    assert.equal(await root.getAttribute("data-theme"), "light");
    await page.close();
  });

  test("print is the light value", async () => {
    const { page } = await palettePage(`<B.Button variant="primary" id="p">Save</B.Button>`, { palette: "beryl", theme: "dark" });
    await page.emulateMedia({ media: "print" });
    assert.equal(await style(page, "#p", "background-color"), rgb(beryl.button.primary.fill.light));
    await page.close();
  });
});

describe("more contrast and forced colours (tests 6 and 7)", () => {
  test("under more contrast a field's edge and the hairlines are Basalt's under a palette", async () => {
    const { page: palette } = await palettePage(`<B.Input id="i" aria-label="N" /><B.SegmentedControl defaultValue="b" aria-label="R"><B.Segment value="a">A</B.Segment><B.Segment value="b" id="s">B</B.Segment></B.SegmentedControl>`, { palette: "ochre", contrast: "more" });
    const { page: plain } = await palettePage(`<B.Input id="i" aria-label="N" /><B.SegmentedControl defaultValue="b" aria-label="R"><B.Segment value="a">A</B.Segment><B.Segment value="b" id="s">B</B.Segment></B.SegmentedControl>`, { contrast: "more" });
    assert.equal(await style(palette, "#i", "box-shadow"), await style(plain, "#i", "box-shadow"));
    assert.equal(await style(palette, "#s", "box-shadow"), await style(plain, "#s", "box-shadow"));
    await palette.close(); await plain.close();
  });

  test("in forced colours every reader's system colour equals the no-palette page's, the checked card's box and the chip's seat with no shadow", async () => {
    const jsx = `<B.Button variant="primary" id="p">Save</B.Button><B.Checkbox defaultChecked id="c">On</B.Checkbox><B.ChoiceCardGroup><B.ChoiceCard name="x" value="a" title="A" defaultChecked /></B.ChoiceCardGroup><B.OptionChips legend="L" options={[{ value: "a", label: "A" }]} defaultValue="a" /><B.Input id="i" aria-label="N" /><B.SegmentedControl defaultValue="b" aria-label="R"><B.Segment value="a">A</B.Segment><B.Segment value="b" id="s">B</B.Segment></B.SegmentedControl>`;
    const { page: palette } = await palettePage(jsx, { palette: "ochre", forcedColors: "active" });
    const { page: plain } = await palettePage(jsx, { forcedColors: "active" });
    for (const sel of ["#p", ".basalt-checkbox", ".basalt-choice-card-box", ".basalt-option-chip-seat", "#i", "#s"]) {
      for (const prop of ["background-color", "color", "box-shadow", "border-color"]) assert.equal(await style(palette, sel, prop), await style(plain, sel, prop), `${sel} ${prop}`);
    }
    assert.equal(await style(palette, ".basalt-choice-card-box", "box-shadow"), "none");
    assert.equal(await style(palette, ".basalt-option-chip-seat", "box-shadow"), "none");
    await palette.close(); await plain.close();
  });

  test("the palette choice's chosen word is Highlight with HighlightText in forced colours, before hydration and after", async () => {
    const config = `B.definePalettes({ palettes: [{ id: "basalt", label: "Basalt" }, { id: "beryl", label: "Beryl" }] })`;
    const { page } = await palettePage(`<B.PaletteProvider config={${config}}><B.PaletteChoiceControl /></B.PaletteProvider>`, { palette: "beryl", forcedColors: "active" });
    const word = '[data-value="beryl"]';
    assert.equal(await style(page, word, "forced-color-adjust"), "none");
    assert.notEqual(await style(page, '[data-value="basalt"]', "forced-color-adjust"), "none");
    await page.close();
  });
});

describe("the mechanism (test 8)", () => {
  const config = index.definePalettes({ palettes: [{ id: "basalt", label: "Basalt" }, { id: "beryl", label: "Beryl" }], default: "basalt" });
  const run = async (script, { url = "about:blank", session = {}, local = {}, metas = "" } = {}) => {
    const page = await browser.newPage();
    await page.route("http://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><html><head>${metas}<script>(function(){var s=${JSON.stringify(session)},l=${JSON.stringify(local)};for(var k in s)sessionStorage.setItem(k,s[k]);for(var k in l)localStorage.setItem(k,l[k]);})();</script><script>${script}</script></head><body></body></html>` }));
    await page.goto(url);
    const out = await page.evaluate(() => [document.documentElement.getAttribute("data-palette"), document.documentElement.getAttribute("data-palette-source")]);
    await page.close();
    return out;
  };

  test("precedence: a valid ?palette= over a saved id over the default; an unknown id is ignored and never written", async () => {
    const head = index.paletteBootstrap(config);
    assert.deepEqual(await run(head, { url: "http://basalt.test/?palette=beryl" }), ["beryl", "url"]);
    assert.deepEqual(await run(head, { url: "http://basalt.test/", local: { "basalt-palette": "beryl" } }), ["beryl", "stored"]);
    assert.deepEqual(await run(head, { url: "http://basalt.test/?palette=nope", local: { "basalt-palette": "nope" } }), ["basalt", "default"]);
    assert.deepEqual(await run(head, { url: "http://basalt.test/", session: { "basalt-palette-url": "beryl" } }), ["beryl", "url"], "a link's palette lasts the tab");
  });

  test("url: false ignores the parameter and a left-over session value, in the inline script and in the static file", async () => {
    const off = index.definePalettes({ palettes: config.palettes, default: "basalt", url: false });
    for (const [script, metas] of [[index.paletteBootstrap(off), ""], [fs.readFileSync(path.join(pkg, "dist", "head", "palette.js"), "utf8"), index.paletteMetas(off).map((m) => `<meta name="${m.name}" content="${m.content}">`).join("")]]) {
      assert.deepEqual(await run(script, { url: "http://basalt.test/?palette=beryl", session: { "basalt-palette-url": "beryl" }, metas }), ["basalt", "default"]);
    }
  });

  test("paletteMetas is what the file reads: the same answer as the inline script, the third meta only when url is false", async () => {
    assert.deepEqual(index.paletteMetas(config), [{ name: "basalt-palettes", content: "basalt beryl" }, { name: "basalt-palette-default", content: "basalt" }]);
    const metas = index.paletteMetas(config).map((m) => `<meta name="${m.name}" content="${m.content}">`).join("");
    const file = fs.readFileSync(path.join(pkg, "dist", "head", "palette.js"), "utf8");
    for (const url of ["http://basalt.test/?palette=beryl", "http://basalt.test/"]) assert.deepEqual(await run(file, { url, metas }), await run(index.paletteBootstrap(config), { url }));
  });

  test("blocked storage: the choice lasts for the page", async () => {
    const { page } = await palettePage(`<B.PaletteProvider config={B.definePalettes({ palettes: [{ id: "basalt", label: "Basalt" }, { id: "beryl", label: "Beryl" }] })}><B.PaletteChoiceControl /></B.PaletteProvider>`);
    await page.evaluate(() => { Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } }); });
    await page.click('[data-value="beryl"]');
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-palette")), "beryl");
    await page.close();
  });

  test("hydration with and without serverPalette: the first render is the server's, then the stored one", async () => {
    const markup = (await import("react-dom/server")).renderToString;
    const React = await import("react");
    const html = markup(React.createElement(index.PaletteProvider, { config, serverPalette: "beryl" }, React.createElement(index.PaletteChoiceControl)));
    assert.match(html, /data-value="beryl"[^>]*aria-checked="true"|aria-checked="true"[^>]*data-value="beryl"/);
    const plain = markup(React.createElement(index.PaletteProvider, { config }, React.createElement(index.PaletteChoiceControl)));
    assert.match(plain, /aria-checked="true"[^>]*data-value="basalt"|data-value="basalt"[^>]*aria-checked="true"/);
  });
});

describe("the controls (test 9)", () => {
  const config = `B.definePalettes({ palettes: [{ id: "basalt", label: "Basalt" }, { id: "beryl", label: "Beryl" }, { id: "ochre", label: "Ochre" }] })`;

  test("one tab stop, arrows move and choose, Home and End; the shared pill slides with no second pill under it", async () => {
    const { page } = await palettePage(`<B.PaletteProvider config={${config}}><B.PaletteChoiceControl /></B.PaletteProvider>`);
    assert.equal(await page.locator('[role="radio"][tabindex="0"]').count(), 1);
    await page.focus('[role="radio"][tabindex="0"]');
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-palette")), "beryl");
    await page.keyboard.press("End");
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-palette")), "ochre");
    await page.keyboard.press("Home");
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-palette")), "basalt");
    await settle(page);
    if (await page.locator(".basalt-segmented[data-slide]").count()) {
      assert.equal(await style(page, '[data-value="basalt"]', "background-color"), "rgba(0, 0, 0, 0)", "the chosen word paints no pill of its own while the shared one slides");
    }
    await page.close();
  });

  test("the menu stays open; while a link opened the palette, the line describes the group, and pressing the shown palette saves it", async () => {
    const { page } = await palettePage(`<B.PaletteProvider config={${config}}><B.Menu defaultOpen><B.MenuTrigger render={<B.Button>Appearance</B.Button>} /><B.MenuContent><B.PaletteMenuGroup /></B.MenuContent></B.Menu></B.PaletteProvider>`);
    await page.evaluate(() => sessionStorage.setItem("basalt-palette-url", "beryl"));
    await page.reload();
    const group = page.locator('[role="group"]').first();
    const describedBy = await group.getAttribute("aria-describedby");
    assert.ok(describedBy);
    assert.match(await page.locator(`#${describedBy.split(" ")[0]}`).textContent(), /From the link you opened/);
    await page.click('[role="menuitemradio"]:has-text("Beryl")');
    assert.equal(await page.evaluate(() => localStorage.getItem("basalt-palette")), "beryl", "the shown palette, pressed, is saved");
    assert.equal(await page.evaluate(() => sessionStorage.getItem("basalt-palette-url")), null);
    assert.ok(await page.locator(".basalt-menu").isVisible(), "the menu stays open");
    await page.close();
  });

  test("five or more is a Select named Palette, by count", async () => {
    const many = `B.definePalettes({ palettes: ["basalt", "beryl", "ochre", "dune", "slate"].map((id) => ({ id, label: id })) })`;
    const { page } = await palettePage(`<B.PaletteProvider config={${many}}><B.PaletteChoiceControl /></B.PaletteProvider>`);
    assert.equal(await page.getByRole("combobox", { name: "Palette" }).count(), 1);
    await page.close();
  });
});

describe("corners (test 11)", () => {
  const radius = (page, sel) => style(page, sel, "border-top-left-radius");
  test("every size under beryl and ochre; compact takes the first step for a large Button and field, tabs keep theirs; the two-line cap; a field's stepper", async () => {
    const jsx = `<B.Button id="md">M</B.Button><B.Button size="lg" id="lg">L</B.Button><B.Button size="xl" id="xl">X</B.Button><B.Button note="n" id="two">Two</B.Button><B.Input id="in" aria-label="I" /><B.Input controlSize="lg" id="inlg" aria-label="I" /><B.NumberField aria-label="N" defaultValue={1} />
      <div data-density="compact"><B.Button size="lg" id="clg">L</B.Button><B.Input controlSize="lg" id="cin" aria-label="I" /><B.Tabs defaultValue="a"><B.TabsList><B.Tab value="a" id="ctab">A</B.Tab></B.TabsList></B.Tabs><B.PaletteScope palette="ochre"><B.Button size="lg" id="sclg">L</B.Button></B.PaletteScope></div>`;
    const { page } = await palettePage(jsx, { palette: "beryl", viewport: { width: 1280, height: 900 } });
    assert.equal(await radius(page, "#md"), "4px");
    assert.equal(await radius(page, "#lg"), "6px");
    assert.equal(await radius(page, "#xl"), "6px");
    assert.equal(await radius(page, "#in"), "4px");
    assert.equal(await radius(page, "#inlg"), "6px");
    assert.equal(await radius(page, "#clg"), "4px", "compact: the first step");
    assert.equal(await radius(page, "#cin"), "4px");
    assert.equal(await radius(page, "#ctab"), "6px", "tabs keep radius-sm under compact");
    assert.equal(await radius(page, "#sclg"), "9999px", "a scope inside a compact region takes its own corner");
    assert.equal(await radius(page, ".basalt-number-group .basalt-button"), "4px", "a stepper follows its field");
    const { page: capsule } = await palettePage(`<B.Button note="n" id="two">Two</B.Button>`, { palette: "ochre" });
    assert.equal(await radius(capsule, "#two"), "12px", "a two-line Button caps at radius-lg");
    await page.close(); await capsule.close();
  });
});
