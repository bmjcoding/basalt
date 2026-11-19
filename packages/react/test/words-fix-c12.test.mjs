// The wording audit's Basalt items that change no design (BACKLOG, "From the wording audit": W1, W3, W5 and W8), as one batch.
// Driven in Chromium against the built package with the real stylesheet; each test fails on the commit before the batch. Synthetic data only, except the two
// header lockup files of brand/blacksand, which are read (never written) so the test proves the real files' `title` build notes are not exposed.
//
// W1  a brand file is inlined one way (BrandSvg, and a lockup given as the file's text): no title element, aria-hidden, not focusable, no pointer; the link's name is the product's.
// W3  a value and its unit (or its label) are two words to assistive technology: every pairing Basalt draws has a real word boundary in its text and its accessible name.
// W5  ToastHome takes "center"; "centre" stays as an alias and places the toast the same.
// W8  a dot-separated line reads "In design, Pilot planned" in its text and its name, and draws the dot as before.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, pkg } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const WIDTHS = [1440, 390];
const render = (jsx, before = "") => `${before}\ncreateRoot(document.getElementById("root")).render(${jsx});`;
const brand = (file) => fs.readFileSync(path.join(pkg, "..", "..", "brand", "blacksand", file), "utf8");
const text = (page, selector, n = 0) => page.locator(selector).nth(n).evaluate((el) => el.textContent);
const snapshot = (page, selector, n = 0) => page.locator(selector).nth(n).ariaSnapshot();
const words = (value) => value.replace(/\s+/g, " ").trim();
/**
 * The accessible name Chrome computes for the content of an element: a probe element is labelled by it (`aria-labelledby` reads the content of whatever it points at, whatever its role),
 * and the probe's name is read from the accessibility tree.
 */
async function nameOf(page, selector, n = 0) {
  await page.locator(selector).nth(n).evaluate((el) => { el.id ||= "probe-target-" + Math.random().toString(36).slice(2); const probe = document.createElement("div"); probe.setAttribute("role", "group"); probe.id = "probe"; probe.setAttribute("aria-labelledby", el.id); document.body.append(probe); });
  const client = await page.context().newCDPSession(page);
  try {
    const { result } = await client.send("Runtime.evaluate", { expression: 'document.getElementById("probe")' });
    const { nodes } = await client.send("Accessibility.getPartialAXTree", { objectId: result.objectId, fetchRelatives: false });
    return nodes[0].name?.value ?? "";
  } finally { await client.detach(); await page.evaluate(() => document.getElementById("probe")?.remove()); }
}

// ---- W1: one way to inline a brand file ----

const ONE = JSON.stringify(brand("lockup-header-1x.svg"));
const TWO = JSON.stringify(brand("lockup-header-2x.svg"));
const MARK = JSON.stringify(brand("mark.svg"));
const HEADER = render(`<B.SitePage><B.SiteHeader brandLabel="Blacksand home" lockup={{ x1: B.lockupDrawing(${ONE}), x2: B.lockupDrawing(${TWO}) }} links={[{ href: "#a", label: "Docs" }]} /><main>Body</main></B.SitePage>`);
const BRAND_SVG = render(`<main style={{ padding: 16 }}><B.SiteBrand label="Blacksand home" href="#top"><B.BrandSvg source={${MARK}} /></B.SiteBrand></main>`);

describe("W1: the brand files' titles are not exposed", () => {
  test("the files really carry a title (so the tests below mean something)", () => {
    for (const file of ["lockup-header-1x.svg", "lockup-header-2x.svg", "mark.svg"]) assert.match(brand(file), /<title>[^<]+<\/title>/, file);
  });
  for (const theme of THEMES) for (const width of WIDTHS) for (const [name, fixture] of [["the header's lockup, read from the files' text", HEADER], ["BrandSvg inside SiteBrand", BRAND_SVG]]) {
    test(`${theme}, ${width}: ${name} exposes no title, no tooltip and no name of its own; the link is named for the product`, async () => {
      const { page, errors } = await fixturePage(browser, fixture, { theme, viewport: { width, height: 700 } });
      try {
        const out = await page.evaluate(() => {
          const link = document.querySelector("a.basalt-site-brand");
          const svgs = [...link.querySelectorAll("svg")];
          const drawn = svgs.filter((svg) => !svg.matches(".basalt-lockup-sprite"));
          return {
            titles: link.querySelectorAll("title").length,
            titleAttributes: [link, ...link.querySelectorAll("*")].filter((el) => el.hasAttribute("title")).length,
            tooltips: document.querySelectorAll("a.basalt-site-brand title, a.basalt-site-brand svg > title").length,
            html: link.innerHTML.includes("build note") || /header lockup|1x fit|2x fit|drawing, /i.test(link.textContent),
            svgs: svgs.length,
            hidden: svgs.every((svg) => svg.getAttribute("aria-hidden") === "true" && svg.getAttribute("focusable") === "false"),
            pointer: drawn.map((svg) => getComputedStyle(svg).pointerEvents),
            label: link.getAttribute("aria-label"),
            text: link.textContent,
          };
        });
        assert.equal(out.titles, 0, "no title element in the link");
        assert.equal(out.titleAttributes, 0, "no title attribute");
        assert.equal(out.tooltips, 0);
        assert.equal(out.html, false, "no build note in the link's words");
        assert.ok(out.svgs >= 1);
        assert.ok(out.hidden, "every svg is aria-hidden and focusable=false");
        assert.ok(out.pointer.length >= 1 && out.pointer.every((value) => value === "none"), `no pointer: ${out.pointer}`);
        assert.equal(out.label, "Blacksand home");
        assert.equal(out.text.trim(), "", "nothing in the link is text");
        assert.equal(await page.getByRole("link", { name: "Blacksand home", exact: true }).count(), 1, "the accessible name is the product name, once");
        assert.match(await snapshot(page, "a.basalt-site-brand"), /link "Blacksand home"/);
        assert.equal(await page.getByRole("img").count(), 0, "the drawing is not an image to a screen reader");
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });
  }

  test("BrandSvg keeps the drawing: the file's viewBox and size, and its paths as written", async () => {
    const { page } = await fixturePage(browser, BRAND_SVG, { theme: "dark" });
    try {
      const out = await page.evaluate(() => { const svg = document.querySelector(".basalt-brand-svg"); return { viewBox: svg.getAttribute("viewBox"), width: svg.getAttribute("width"), height: svg.getAttribute("height"), paths: svg.querySelectorAll("path").length }; });
      const file = brand("mark.svg");
      assert.equal(out.viewBox, /viewBox="([^"]+)"/.exec(file)[1]);
      assert.equal(out.paths, (file.match(/<path\b/g) ?? []).length);
      assert.equal(Number(out.width) > 0 && Number(out.height) > 0, true);
    } finally { await page.close(); }
  });
});

// ---- W3: a value and its unit are two words ----

const CHART = `import { sleepData, hm } from "./test/fixtures/chart-data.ts";
const data = sleepData(28);
`;
const PAIRS = render(`<main style={{ padding: 16, width: 700 }}>
  <div id="chart"><B.TimeChart title="Sleep" source="Ring" kind="line" days={data.days} series={[data.series[0]]} format={hm} step={60} formatTick={(v) => String(v / 60)} unit="a night" headline now={Date.UTC(2026, 10, 10, 12)} /></div>
  <div id="legend"><B.TimeChart title="Sleep" source="Ring" kind="line" days={data.days} series={data.series} format={hm} step={60} formatTick={(v) => String(v / 60)} unit="h" now={Date.UTC(2026, 10, 10, 12)} /></div>
  <B.Stats id="stats"><B.Stat label="Weight" value="81.4 kg" note="−0.6 kg this week" source="Scale" time={new Date("2026-11-10T04:41:00Z")} now={new Date("2026-11-10T12:00:00Z")} timeZone="UTC" locale="en-US" /></B.Stats>
  <div id="range"><B.RangeMeter label="Loss" value={0.6} min={0} max={2} plan={[0.5, 1]} unit="lb a week" /></div>
  <div id="meter"><B.Meter label="Build minutes" value={1240} max={2000} unit="min" /></div>
  <div id="share"><B.ShareBar parts={[{ name: "Protein", value: 40 }, { name: "Fat", value: 25 }, { name: "Carbs", value: 35 }]} /></div>
</main>`, CHART);

describe("W3: a value and its unit are two words in the text and in the accessible name", () => {
  for (const theme of THEMES) for (const width of WIDTHS) {
    test(`${theme}, ${width}: every value-unit pairing Basalt draws is separated`, async () => {
      const { page, errors } = await fixturePage(browser, PAIRS, { theme, viewport: { width, height: 900 } });
      try {
        // The chart's headline: the number and its unit are two elements with no space between them.
        const head = await text(page, "#chart .basalt-chart-headline");
        assert.match(head, /\d\s+a night$/, `headline: ${JSON.stringify(head)}`);
        assert.match(await nameOf(page, "#chart .basalt-chart-headline"), /\d a night$/, "its accessible name");
        // The legend: a series' name and its value.
        const entry = await text(page, "#legend .basalt-chart-entry");
        assert.match(entry, /^\S+\s+\S/, `a legend entry: ${JSON.stringify(entry)}`);
        const legend = await nameOf(page, "#legend .basalt-chart-entry");
        assert.match(legend, /^\S+ \d/, `its accessible name: ${legend}`);
        // Stat: the label, the figure and the note.
        const stat = words(await text(page, "#stats .basalt-stat"));
        assert.match(await text(page, "#stats .basalt-stat"), /Weight\s+81\.4 kg\s+−0\.6 kg this week/, `stat: ${JSON.stringify(stat)}`);
        assert.match(await nameOf(page, "#stats .basalt-stat"), /^Weight 81\.4 kg −0\.6 kg this week/, "the stat's accessible name");
        // The meters: the reading and its unit, the foot's words.
        assert.match(await text(page, "#range .basalt-meter-reading"), /^0\.6\s+lb a week$/);
        assert.match(await text(page, "#meter .basalt-meter-now"), /^1,240\s+of\s+2,000\s+min$/);
        assert.match(await text(page, "#meter .basalt-meter-reading"), /min\s+1,240/, "the unseen wording is not run into the seen one");
        assert.equal(await nameOf(page, "#meter .basalt-meter-reading"), "1,240 of 2,000 min", "and the name has the seen wording only");
        assert.match(await text(page, "#meter .basalt-meter-left"), /^760\s+min\s+left$/);
        // The share bar: a part's share, then its name.
        const part = await text(page, "#share .basalt-share-part");
        assert.match(part, /^40%\s+Protein$/, `share part: ${JSON.stringify(part)}`);
        assert.equal(await nameOf(page, "#share .basalt-share-part"), "40% Protein");
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });
  }

  test("the boundary draws nothing: the headline's number and unit sit where they sat, and no part is wider for it", async () => {
    const { page } = await fixturePage(browser, PAIRS, { theme: "dark", viewport: { width: 1440, height: 900 } });
    try {
      const gaps = await page.evaluate(() => [...document.querySelectorAll(".basalt-visually-hidden")].filter((el) => el.closest("#chart, #stats, #share, #legend")).map((el) => { const r = el.getBoundingClientRect(); return [r.width, r.height]; }));
      assert.ok(gaps.length > 0);
      assert.ok(gaps.every(([w, h]) => w <= 1 && h <= 1), `the hidden words take no room: ${JSON.stringify(gaps)}`);
    } finally { await page.close(); }
  });
});

// ---- W5: ToastHome, "center" with "centre" as an alias ----

const TOASTS = render(`<B.ToastProvider><Demo /></B.ToastProvider>`, `function Demo() { const t = B.useToast(); React.useEffect(() => { window.t = t; }, [t]); return <main style={{ padding: 16 }}>Page</main>; }`);
const show = (page, options) => page.evaluate((o) => { if (o.action) o.action.onClick = () => {}; return window.t.show(o); }, options);

describe("W5: ToastHome takes \"center\"; \"centre\" is an alias", () => {
  for (const theme of THEMES) {
    test(`${theme}: both place the toast the same: it keeps its clock and an action is allowed to time out`, async () => {
      const lives = {};
      for (const home of ["center", "centre", ["center"], ["centre"], undefined]) {
        const { page } = await fixturePage(browser, TOASTS, { theme, clock: true });
        try {
          await show(page, home === undefined ? { title: "Sandbox deleted" } : { title: "Sandbox deleted", action: { label: "Undo" }, home });
          await page.locator(".basalt-toast").waitFor();
          lives[JSON.stringify(home) ?? "none"] = await page.locator(".basalt-toast").first().evaluate((el) => { const drain = el.querySelector(".basalt-toast-drain"); return drain ? drain.style.animationDuration : null; });
        } finally { await page.close(); }
      }
      assert.deepEqual(lives, { '"center"': "5000ms", '"centre"': "5000ms", '["center"]': "5000ms", '["centre"]': "5000ms", none: null });
    });
  }

  test("the types and the words name \"center\" and keep \"centre\"", () => {
    const toast = fs.readFileSync(path.join(pkg, "src", "toast.tsx"), "utf8");
    assert.match(toast, /export type ToastHome = [^;]*"center"[^;]*;/);
    assert.match(toast, /export type ToastHome = [^;]*"centre"[^;]*;/, "the alias stays in the type");
    assert.match(toast, /notification center/);
    assert.doesNotMatch(toast.replace(/export type ToastHome[^;]*;/, "").replace(/\/\/ alias[^\n]*/g, ""), /notification centre/i);
    const types = fs.readFileSync(path.join(pkg, "dist", "toast.d.ts"), "utf8");
    assert.match(types, /"center"/);
    assert.match(types, /"centre"/);
  });
});

// ---- W8: a dot-separated line reads as words ----

const LINE = render(`<main style={{ padding: 16, width: 600 }}>
  <p id="line"><B.DotLine>{"In design"}{null}{"Pilot planned"}</B.DotLine></p>
  <p id="line3"><B.DotLine><span>One</span>{null}<span>Two</span>{false}<span>Three</span></B.DotLine></p>
  <B.Stats><B.Stat label="Latency" value="96 ms" source="Edge probes" time={new Date("2026-11-10T04:40:00Z")} now={new Date("2026-11-10T12:00:00Z")} timeZone="UTC" locale="en-US" /></B.Stats>
  <p id="age"><B.DateAge time={new Date("2026-11-01T12:00:00Z")} now={new Date("2026-11-12T12:00:00Z")} timeZone="UTC" locale="en-US" /></p>
  <div id="chips"><B.OptionChips legend="Flavor" value="a" onValueChange={() => {}} options={[{ value: "a", label: "Vanilla" }, { value: "b", label: "Berry", unavailable: "Out of stock" }]} /></div>
</main>`);

describe("W8: a dot-separated line reads as words, and draws the dot", () => {
  for (const theme of THEMES) for (const width of WIDTHS) {
    test(`${theme}, ${width}: the text and the accessible name are "In design, Pilot planned"; the dot is drawn and not in either`, async () => {
      const { page, errors } = await fixturePage(browser, LINE, { theme, viewport: { width, height: 700 } });
      try {
        assert.equal(await text(page, "#line"), "In design, Pilot planned");
        assert.equal(await nameOf(page, "#line"), "In design, Pilot planned");
        assert.equal(await text(page, "#line3"), "One, Two, Three", "an empty child draws no separator");
        assert.equal(await nameOf(page, ".basalt-stat-source"), "4:40\u00a0AM, Edge probes");
        // The chip's label and note are flex items, and Chrome puts a space between two boxes: "Berry , Out of stock", the comma a pause either way.
        assert.equal((await nameOf(page, "#chips [data-unavailable]")).replace(/\s+,/g, ","), "Berry, Out of stock");
        for (const [selector, expected] of [[".basalt-stat-source", /^4:40\u00a0AM, Edge probes$/], ["#age", /^Nov 1, 11 days ago$/], ["#chips [data-unavailable]", /^Berry, Out of stock$/]]) {
          const value = await text(page, selector);
          assert.match(value, expected, `${selector}: ${JSON.stringify(value)}`);
          assert.doesNotMatch(value, /·/, `${selector} has no stray dot in its text`);
        }
        const drawn = await page.evaluate(() => [...document.querySelectorAll(".basalt-dot-sep")].map((el) => ({ content: getComputedStyle(el, "::before").content, aria: el.getAttribute("aria-hidden") })));
        assert.ok(drawn.length >= 5, `the separators: ${drawn.length}`);
        for (const sep of drawn) assert.match(sep.content, /·/, "the dot is drawn by the stylesheet");
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });
  }

  test("the drawing is unchanged: the dot sits where it sat, with the same gaps (a stat's source line, the date's age, a chip's note)", async () => {
    const { page } = await fixturePage(browser, LINE, { theme: "dark", viewport: { width: 1440, height: 700 } });
    try {
      // The old markup (the dot aria-hidden, a visually hidden comma, the spaces where the line had them) is rebuilt beside the new one, and the two are measured:
      // the words' width, and the position of the first letter after the dot.
      const out = await page.evaluate(() => {
        // The element as wide as its words (a generated dot is not in a range's contents, so the element's own box is measured).
        const run = (el) => { el.style.display = "inline-block"; el.style.width = "max-content"; const r = el.getBoundingClientRect(); return { width: Math.round(r.width * 100) / 100, height: Math.round(r.height * 100) / 100 }; };
        const old = (what) => {
          const mark = (text) => { const span = document.createElement("span"); span.setAttribute("aria-hidden", "true"); span.textContent = text; return span; };
          const hidden = () => { const span = document.createElement("span"); span.className = "basalt-visually-hidden"; span.textContent = ", "; return span; };
          const space = () => document.createTextNode(" ");
          return { stat: [space(), mark("·"), hidden(), space()], age: [mark("·"), hidden()], chip: [mark(" · "), hidden()] }[what];
        };
        const compare = (selector, what) => {
          const live = document.querySelector(selector);
          const clone = live.cloneNode(true);
          const sep = clone.querySelector(".basalt-dot-sep");
          if (what === "age") sep.before(...old(what)), sep.previousSibling.previousSibling.style.marginInlineEnd = "var(--basalt-space-2)";
          else sep.before(...old(what));
          sep.remove();
          live.after(clone);
          const result = { now: run(live), before: run(clone) };
          clone.remove();
          return result;
        };
        return { stat: compare(".basalt-stat-source", "stat"), age: compare("#age .basalt-date-age-age", "age"), chip: compare("#chips [data-unavailable] .basalt-option-chip-note", "chip") };
      });
      for (const [name, result] of Object.entries(out)) {
        assert.ok(Math.abs(result.now.width - result.before.width) <= 0.5, `${name}: ${JSON.stringify(result)}`);
        assert.ok(Math.abs(result.now.height - result.before.height) <= 0.5, `${name}: ${JSON.stringify(result)}`);
      }
    } finally { await page.close(); }
  });
});
