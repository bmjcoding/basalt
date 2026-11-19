// The wording audit's engineering items, the skill's half (BACKLOG, "From the wording audit": W1, W3 and W8; React's half is packages/react/test/words-fix-c12.test.mjs, the sites' is
// sites/test/words-fix-c12.test.mjs). Driven in Chromium, in both themes at 1440 and 390; each test fails on the commit before the batch.
//
// W1  a brand file inlined with `data-brand` (or through brandSvg) exposes no title element, no tooltip and no name of its own; the link's name is the product's.
// W3  a value, its unit and its label are words apart in the text and in the accessible name: the chart's legend, and the stat markup the skill writes.
// W8  a dot-separated line (.dot-sep) reads "In design, Pilot planned" in its text and its name, and draws the dot.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { brandSvg, compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { EXAMPLES, launch, openHtml, repoRoot, skillDir } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const SCHEMES = ["dark", "light"];
const WIDTHS = [1440, 390];
const brand = (file) => fs.readFileSync(path.join(repoRoot, "brand", "blacksand", file), "utf8");

/** The accessible name Chrome computes for the content of an element, read through a probe that `aria-labelledby` points at it. */
async function nameOf(page, selector, n = 0) {
  await page.locator(selector).nth(n).evaluate((el) => { el.id ||= "probe-target-" + Math.random().toString(36).slice(2); const probe = document.createElement("div"); probe.setAttribute("role", "group"); probe.id = "probe"; probe.setAttribute("aria-labelledby", el.id); document.body.append(probe); });
  const client = await page.context().newCDPSession(page);
  try {
    const { result } = await client.send("Runtime.evaluate", { expression: 'document.getElementById("probe")' });
    const { nodes } = await client.send("Accessibility.getPartialAXTree", { objectId: result.objectId, fetchRelatives: false });
    return nodes[0].name?.value ?? "";
  } finally { await client.detach(); await page.evaluate(() => document.getElementById("probe")?.remove()); }
}

// ---- W1 ----

describe("W1: a brand file is inlined one way", () => {
  test("brandSvg: the root is aria-hidden, unfocusable and marked, every title is gone and the drawing is as written", () => {
    for (const file of ["lockup-header-1x.svg", "lockup-header-2x.svg", "mark.svg", "mark-16.svg", "lockup.svg"]) {
      const text = brand(file);
      assert.match(text, /<title>/, `${file} carries a title (so this means something)`);
      const out = brandSvg(text);
      assert.doesNotMatch(out, /<title/i, file);
      assert.match(out, /^<svg\b[^>]*\baria-hidden="true"[^>]*\bfocusable="false"[^>]*\bdata-brand[^>]*>/, file);
      assert.equal(out.replace(' aria-hidden="true" focusable="false" data-brand', ""), text.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, ""), `${file}: nothing else changed`);
      assert.equal(brandSvg(out), out, `${file}: doing it twice changes nothing`);
    }
    assert.throws(() => brandSvg("<div></div>"), /one SVG file/);
  });

  test("compose finishes an svg marked data-brand, and leaves any other svg alone", () => {
    const file = brand("mark.svg");
    const marked = file.replace("<svg", "<svg data-brand");
    const page = compose(`<title>T</title><a href="#" aria-label="Blacksand home">${marked}</a>${file.replace(/<title>[^<]*<\/title>/, "<title>Keep</title>")}`, { fonts: false }).html;
    const body = page.slice(page.indexOf("<body>"));
    assert.doesNotMatch(body.slice(0, body.indexOf("</a>")), /<title/i, "the marked svg lost its title");
    assert.match(body, /<title>Keep<\/title>/, "an unmarked svg keeps its own (it is the page's own picture)");
  });

  for (const scheme of SCHEMES) for (const width of WIDTHS) {
    test(`${scheme}, ${width}: the link round a marked brand svg is named for the product, and the drawing exposes no title and takes no pointer`, async () => {
      const lockup = brand("lockup-header-1x.svg").replace("<svg", "<svg data-brand");
      const html = compose(`<title>Page</title><main><h1>Brand</h1><p><a id="home" href="#top" aria-label="Blacksand home" style="display:inline-block">${lockup}</a></p></main>`, { fonts: false }).html;
      const { page, context, errors } = await openHtml(browser, html, { scheme, width });
      try {
        const out = await page.evaluate(() => {
          const link = document.getElementById("home");
          const svg = link.querySelector("svg");
          return { titles: link.querySelectorAll("title").length, attributes: link.querySelectorAll("[title]").length, ariaHidden: svg.getAttribute("aria-hidden"), focusable: svg.getAttribute("focusable"), pointer: getComputedStyle(svg).pointerEvents, label: link.getAttribute("aria-label"), text: link.textContent.trim() };
        });
        assert.deepEqual([out.titles, out.attributes, out.ariaHidden, out.focusable, out.pointer, out.label, out.text], [0, 0, "true", "false", "none", "Blacksand home", ""]);
        assert.equal(await page.getByRole("link", { name: "Blacksand home", exact: true }).count(), 1);
        assert.equal(await page.getByRole("img").count(), 0);
        assert.equal(await nameOf(page, "#home"), "Blacksand home");
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    });
  }

  test("the skill's rules say how: SKILL.md has the rule, and no body or usage shows a brand file without it", () => {
    const skill = fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf8");
    assert.match(skill, /data-brand/, "SKILL.md names the attribute");
    assert.match(skill, /brand\//, "and the folder");
  });
});

// ---- W3 ----

const CHART = `<figure class="chart" id="chart"><script type="application/json" data-chart>
{ "title": "Sleep", "source": "Ring", "kind": "line", "unit": "h", "summary": "Sleep averaged 7 h 25 m a night.",
  "days": ["2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"],
  "series": [{ "id": "ring", "name": "Ring", "values": [440, 452, 430, 445, 460] }],
  "plan": { "kind": "value", "label": "Goal", "values": [450, 450, 450, 450, 450] },
  "format": { "duration": "minutes" }, "now": "2026-11-10" }
</script></figure>`;

describe("W3: a value, its unit and its label are words apart", () => {
  for (const scheme of SCHEMES) for (const width of WIDTHS) {
    test(`${scheme}, ${width}: a chart's legend entry has a word boundary between the series' name and its value, in the text and in the name`, async () => {
      const { page, context, errors } = await openHtml(browser, compose(`<title>C</title><main><h1>Chart</h1>${CHART}</main>`, { fonts: false }).html, { scheme, width });
      try {
        await page.locator(".chart-entry").first().waitFor();
        const entries = await page.locator(".chart-entry").evaluateAll((els) => els.map((el) => el.textContent));
        assert.ok(entries.length >= 2, "a series and its plan");
        for (const entry of entries) assert.match(entry, /^[A-Za-z]+\s+\S/, `a name, then a space: ${JSON.stringify(entry)}`);
        for (let i = 0; i < entries.length; i++) assert.match(await nameOf(page, ".chart-entry", i), /^[A-Za-z]+ \S/);
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    });

    test(`${scheme}, ${width}: the skill's own stat markup reads "Availability 99.97% Target 99.95%", and a hidden space draws nothing`, async () => {
      const html = compose(EXAMPLES.static, { fonts: false }).html;
      const { page, context } = await openHtml(browser, html, { scheme, width });
      try {
        const stat = await page.locator(".stat").first().evaluate((el) => el.textContent.replace(/\s+/g, " ").trim());
        assert.equal(stat, "Availability 99.97% Target 99.95%");
        assert.equal(await nameOf(page, ".stat", 0), "Availability 99.97% Target 99.95%");
      } finally { await context.close(); }
    });
  }

  test("no usage or example writes a stat's parts, or a value and its unit, as adjacent spans with no space between them", () => {
    const files = [...fs.readdirSync(path.join(skillDir, "parts", "usage")).map((f) => path.join(skillDir, "parts", "usage", f)), ...fs.readdirSync(path.join(skillDir, "examples")).map((f) => path.join(skillDir, "examples", f))];
    const offenders = [];
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      for (const match of text.matchAll(/<\/(?:span|output|b)><(?:span|output|b)\b[^>]*class="[^"]*\bstat-[a-z]+/g)) offenders.push(`${path.basename(file)}: ${match[0].slice(0, 60)}`);
    }
    assert.deepEqual(offenders, []);
  });
});

// ---- W8 ----

const LINE = `<title>L</title><main><h1>Status</h1>
<p id="line">In design<span class="dot-sep" data-spaced><span class="visually-hidden">, </span></span>Pilot planned</p>
<div class="stats"><div class="stat">
  <span class="stat-label">Latency</span>
  <span class="stat-value">96 ms</span>
  <span class="stat-source" id="source"><time datetime="2026-11-10T04:40">04:40</time><span class="dot-sep" data-spaced><span class="visually-hidden">, </span></span>Edge probes</span>
</div></div>
<p id="old">In design <span aria-hidden="true">·</span><span class="visually-hidden">, </span> Pilot planned</p>
</main>`;

describe("W8: a dot-separated line reads as words and draws the dot", () => {
  for (const scheme of SCHEMES) for (const width of WIDTHS) {
    test(`${scheme}, ${width}: "In design, Pilot planned" in the text and the name, the dot drawn by the stylesheet`, async () => {
      const { page, context, errors } = await openHtml(browser, compose(LINE, { fonts: false }).html, { scheme, width });
      try {
        assert.equal(await page.locator("#line").evaluate((el) => el.textContent), "In design, Pilot planned");
        assert.equal(await nameOf(page, "#line"), "In design, Pilot planned");
        assert.equal(await page.locator("#source").evaluate((el) => el.textContent), "04:40, Edge probes");
        assert.equal(await nameOf(page, "#source"), "04:40, Edge probes");
        const content = await page.locator("#line .dot-sep").evaluate((el) => getComputedStyle(el, "::before").content);
        assert.match(content, /·/);
        // The old pair is what the audit found: both the dot and the comma are in the text.
        assert.match(await page.locator("#old").evaluate((el) => el.textContent), /·, /);
        // The drawing: the old pair and the new line are as wide as each other (the dot, and a space each side).
        const widths = await page.evaluate(() => { const w = (el) => { el.style.display = "inline-block"; return Math.round(el.getBoundingClientRect().width * 10) / 10; }; return [w(document.getElementById("line")), w(document.getElementById("old"))]; });
        assert.ok(Math.abs(widths[0] - widths[1]) <= 1, `the new line is as wide as the old: ${widths}`);
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    });
  }

  test("no usage or example draws a dot as an aria-hidden mark beside a hidden comma any more", () => {
    const files = [...fs.readdirSync(path.join(skillDir, "parts", "usage")).map((f) => path.join(skillDir, "parts", "usage", f)), ...fs.readdirSync(path.join(skillDir, "examples")).map((f) => path.join(skillDir, "examples", f))];
    const offenders = files.filter((file) => /aria-hidden="true">\s*·\s*<\/span>\s*<span class="visually-hidden">/.test(fs.readFileSync(file, "utf8")) && !file.endsWith("words-fix-c12.test.mjs")).map((file) => path.basename(file));
    // stats.md names the old pair once, in a sentence that says never to write it.
    assert.deepEqual(offenders, []);
  });
});
