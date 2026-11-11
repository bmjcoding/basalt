// The bar a visitor sees in the first paint is the bar they see after the script has run. The build finishes the header's markup
// (sites/header-markup.mjs), so the script only wires behaviour. Proved three ways, for the smoked, the solid and the clear bar, in both
// themes at 1440 and 390:
//  - a page whose script runs late (the page paints, then the script runs 700ms later) has the same header pixels before and after,
//    outside the theme toggle's box (the skill's own script draws the toggle's icon), and the same header DOM, apart from the behaviour
//    attributes listed below;
//  - at 1440 a page with scripts off has the same header pixels as one with scripts on, outside the toggle's box (the clear bar's fill and
//    line aside: with no script the bar is the smoked one, which is decided, so both pages have that fill and line taken off for the compare;
//    that it is smoked with no script, and clear with script, is asserted on its own);
//  - at 390 a page with scripts off shows the links in the bar instead of a Menu button nothing could open, and every link is reachable.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { buildPage } from "../build.mjs";
import { fixturesDir, HOST, launch } from "./support.mjs";

/** The attributes the script adds or changes as it wires behaviour: the clear bar's report, the glide's state. Nothing else may differ. */
const BEHAVIOUR = ["data-top", "data-jump", "data-glide", "data-keys", "data-hovered"];
const HIDE_TOGGLE = "<style>[data-theme-toggle] { visibility: hidden !important; }</style>";
// With no script the clear bar is the smoked one (decided), so for the pixel compare both pages have the bar's own fill and line off.
const NO_FILL = "<style>.basalt-site-header { background: transparent !important; border-bottom-color: transparent !important; -webkit-backdrop-filter: none !important; backdrop-filter: none !important; transition: none !important; }</style>";

let browser;
const variants = {};
before(async () => {
  browser = await launch();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-sites-paint-"));
  const make = (name, edit = (s) => s, from = name) => {
    const dir = path.join(out, name);
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, "index.body.html"), edit(fs.readFileSync(path.join(fixturesDir, from, "index.body.html"), "utf8")));
    return buildPage(path.join(dir, "index.body.html"), { siteDir: dir }).html;
  };
  variants["smoked (sample)"] = make("sample", undefined);
  variants["solid (sample, data-solid)"] = make("solid", (s) => s.replace('class="basalt-chrome basalt-site-header"', 'class="basalt-chrome basalt-site-header" data-solid'), "sample");
  variants["clear (stage)"] = make("stage", undefined);
  variants["solid, no links (brand)"] = make("brand", undefined);
});
after(async () => { await browser?.close(); });

const delayInit = (html) => { assert.ok(html.includes("<script>Basalt.init();</script>")); return html.replace("<script>Basalt.init();</script>", "<script>setTimeout(function () { Basalt.init(); }, 700);</script>"); };
const withStyle = (html, style) => html.replace("</head>", `${style}</head>`);

async function open(html, { scheme, width, javaScriptEnabled = true }) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: scheme, javaScriptEnabled });
  await context.route("**/*", (route) => (route.request().url() === HOST ? route.fulfill({ contentType: "text/html", body: html }) : route.abort()));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && errors.push(m.text()));
  await page.goto(HOST);
  return { page, context, errors };
}
const frames = (page, n = 2) => page.evaluate(async (count) => { for (let i = 0; i < count; i++) await new Promise((resolve) => requestAnimationFrame(resolve)); }, n);
const fontsReady = (page) => page.evaluate(() => document.fonts.ready.then(() => true));
/** The header's DOM, serialised with its attributes sorted, minus the behaviour attributes and the theme toggle's contents (the skill draws those). */
const serialise = (page, behaviour) => page.evaluate((skip) => {
  const walk = (node) => {
    if (node.nodeType === 3) return node.textContent.replace(/\s+/g, " ");
    if (node.nodeType !== 1) return "";
    const toggle = node.hasAttribute("data-theme-toggle");
    const attrs = [...node.attributes].filter((a) => !skip.includes(a.name) && !(toggle && ["aria-label", "type"].includes(a.name))).map((a) => `${a.name}="${a.value}"`).sort().join(" ");
    return `<${node.tagName.toLowerCase()} ${attrs}>${toggle ? "" : [...node.childNodes].map(walk).join("")}</${node.tagName.toLowerCase()}>`;
  };
  return walk(document.querySelector("header.basalt-site-header")).replace(/>\s+</g, "><");
}, behaviour);
const barShot = async (page) => {
  const box = await page.locator("header.basalt-site-header").evaluate((el) => { const r = el.getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top), width: innerWidth, height: r.height }; });
  return page.screenshot({ clip: box, animations: "disabled" });
};

const NAMES = ["smoked (sample)", "solid (sample, data-solid)", "clear (stage)", "solid, no links (brand)"];
describe("the first paint is the final bar: a late script changes no pixel and no markup in it", () => {
  for (const name of NAMES) for (const scheme of ["dark", "light"]) for (const width of [1440, 390]) {
    test(`${name}, ${scheme}, ${width}`, async () => {
      const { page, context, errors } = await open(withStyle(delayInit(variants[name]), HIDE_TOGGLE), { scheme, width });
      await fontsReady(page);
      await frames(page, 3);
      assert.equal(await page.locator("[data-theme-toggle] svg").count(), 0, "this is before the script ran: the toggle has no icon yet");
      const before = { shot: await barShot(page), dom: await serialise(page, BEHAVIOUR) };
      await page.waitForFunction(() => document.querySelector("[data-theme-toggle] svg"), null, { timeout: 5000 });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))))));
      const after = { shot: await barShot(page), dom: await serialise(page, BEHAVIOUR) };
      assert.equal(after.dom, before.dom, "the header's DOM is the same before and after the script, but for the behaviour attributes");
      assert.ok(before.shot.equals(after.shot), "the header's pixels are the same before and after the script");
      assert.deepEqual(errors, []);
      await context.close();
    });
  }
});

describe("with scripts off", () => {
  for (const name of NAMES) for (const scheme of ["dark", "light"]) {
    test(`${name} at 1440 is the bar a script would have made, ${scheme}`, async () => {
      const off = await open(withStyle(withStyle(variants[name], HIDE_TOGGLE), NO_FILL), { scheme, width: 1440, javaScriptEnabled: false });
      const on = await open(withStyle(withStyle(variants[name], HIDE_TOGGLE), NO_FILL), { scheme, width: 1440 });
      await fontsReady(on.page);
      await frames(on.page, 4);
      assert.equal(await off.page.evaluate(() => matchMedia("(scripting: none)").matches), true, "scripting is off");
      assert.ok((await barShot(off.page)).equals(await barShot(on.page)), "the header's pixels are the same with and without the script (the bar's fill and line aside)");
      assert.equal(await serialise(off.page, BEHAVIOUR), await serialise(on.page, BEHAVIOUR), "and so is its DOM");
      await off.context.close();
      await on.context.close();
    });
  }

  test("a page with a stage and no script has the smoked bar (decided); with script the clear one", async () => {
    const alpha = (page) => page.evaluate(() => { const s = getComputedStyle(document.querySelector("header.basalt-site-header")); const c = document.createElement("canvas").getContext("2d"); c.fillStyle = s.backgroundColor; c.fillRect(0, 0, 1, 1); return { alpha: c.getImageData(0, 0, 1, 1).data[3], filter: s.backdropFilter }; });
    const off = await open(variants["clear (stage)"], { scheme: "dark", width: 1440, javaScriptEnabled: false });
    const smoked = await alpha(off.page);
    assert.ok(smoked.alpha > 0 && /blur/.test(smoked.filter), `smoked: ${JSON.stringify(smoked)}`);
    const on = await open(variants["clear (stage)"], { scheme: "dark", width: 1440 });
    await frames(on.page, 3);
    assert.deepEqual(await alpha(on.page), { alpha: 0, filter: "none" }, "clear");
    await off.context.close();
    await on.context.close();
  });

  for (const name of ["smoked (sample)", "solid (sample, data-solid)", "clear (stage)"]) for (const scheme of ["dark", "light"]) {
    test(`${name} at 390 shows the links in the bar, not a Menu button nothing could open, and every link is reachable (${scheme})`, async () => {
      const { page, context } = await open(variants[name], { scheme, width: 390, javaScriptEnabled: false });
      assert.equal(await page.evaluate(() => matchMedia("(scripting: none)").matches), true);
      const state = await page.evaluate(() => {
        const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
        const links = [...document.querySelectorAll(".basalt-site-link")].map((a) => { const r = a.getBoundingClientRect(); return { text: a.textContent.trim(), visible: visible(a), w: Math.round(r.width), h: Math.round(r.height), inView: r.left >= 0 && r.right <= innerWidth }; });
        return { trigger: visible(document.querySelector(".basalt-site-menu-trigger")), links, action: visible(document.querySelector(".basalt-site-action")), overflow: document.documentElement.scrollWidth - innerWidth, brand: visible(document.querySelector(".basalt-site-brand")) };
      });
      assert.equal(state.trigger, false, "no Menu button");
      assert.deepEqual(state.links.map((l) => l.text), ["Overview", "Guides", "Pricing"]);
      for (const link of state.links) assert.ok(link.visible && link.inView && link.h >= 44, `${link.text} is in the bar, in view and 44 tall: ${JSON.stringify(link)}`);
      assert.equal(state.action, true, "the action is beside the toggle");
      assert.ok(state.overflow <= 0, "no sideways scroll");
      await context.close();
    });
  }
});
