// The wording audit's W1, the sites' half (BACKLOG, "From the wording audit"): a brand file reaches a built page through the skill's one way (brandSvg), so the drawing is aria-hidden, not
// focusable, takes no pointer and carries no title build note, and the link round it is named for the product. sites/blacksand used to hide the files with a wrapper; it no longer does.
// The skill's half is tools/html-skill/test/words-fix-c12.test.mjs, React's packages/react/test/words-fix-c12.test.mjs. Each test fails on the commit before the batch.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { buildPage, buildSites } from "../build.mjs";
import { launch, openHtml, repoRoot, sitesDir } from "./support.mjs";

const siteDir = path.join(sitesDir, "blacksand");
let browser;
let built;
before(async () => {
  browser = await launch();
  built = buildPage(path.join(siteDir, "index.body.html"), { siteDir });
});
after(async () => { await browser?.close(); });

const brand = (...parts) => fs.readFileSync(path.join(repoRoot, "brand", ...parts), "utf8");
const TITLES = ["lockup-header-1x.svg", "lockup-header-2x.svg"].map((file) => /<title>([^<]+)<\/title>/.exec(brand("blacksand", file))[1]);

/** The accessible name Chrome computes for the content of an element, through a probe that `aria-labelledby` points at it. */
async function nameOf(page, selector) {
  await page.locator(selector).first().evaluate((el) => { el.id ||= "probe-target"; const probe = document.createElement("div"); probe.setAttribute("role", "group"); probe.id = "probe"; probe.setAttribute("aria-labelledby", el.id); document.body.append(probe); });
  const client = await page.context().newCDPSession(page);
  try {
    const { result } = await client.send("Runtime.evaluate", { expression: 'document.getElementById("probe")' });
    const { nodes } = await client.send("Accessibility.getPartialAXTree", { objectId: result.objectId, fetchRelatives: false });
    return nodes[0].name?.value ?? "";
  } finally { await client.detach(); }
}

describe("W1: the built Blacksand page's brand files carry no title and no name of their own", () => {
  test("the brand files have titles, and the built page has none of their words and no wrapper to hide them", () => {
    assert.ok(TITLES.length === 2 && TITLES.every((title) => title.length > 10), JSON.stringify(TITLES));
    for (const title of TITLES) assert.ok(!built.html.includes(title), `the page still carries the build note "${title}"`);
    assert.doesNotMatch(built.html, /class="lockup-[12]x" aria-hidden/, "the wrapper's aria-hidden is gone: the drawing hides itself");
    assert.doesNotMatch(built.html.match(/<header[\s\S]*?<\/header>/)[0], /<title/i, "no title element in the header");
  });

  test("a brand svg included through the build is finished by brandSvg, and a page's own svg and a brand .html are not touched", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-sites-w1-"));
    fs.mkdirSync(path.join(root, "a"), { recursive: true });
    fs.writeFileSync(path.join(root, "a", "own.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><title>Own picture</title><path d="M0 0h8v8z"/></svg>');
    fs.writeFileSync(path.join(root, "a", "index.body.html"), `<title>A</title>\n<h1>Hello</h1>\n<a href="#" aria-label="Home"><!-- @include brand/blacksand/lockup-header-1x.svg --></a>\n<!-- @include own.svg -->\n<!-- @include brand/blacksand/hero.html -->\n`);
    const [page] = buildSites({ root, outDir: path.join(root, "out") });
    const body = page.html.slice(page.html.indexOf("<body>"));
    assert.match(body, /<a href="#" aria-label="Home"><svg [^>]*aria-hidden="true" focusable="false" data-brand/);
    assert.ok(!body.includes(TITLES[0]), "the brand file's title is dropped");
    assert.ok(body.includes("<title>Own picture</title>"), "the page's own svg keeps its own");
    assert.ok(body.includes(brand("blacksand", "hero.html")), "hero.html is as it is");
  });

  for (const scheme of ["dark", "light"]) for (const [width, scale] of [[1440, 1], [1440, 2], [390, 1], [390, 2]]) {
    test(`${scheme}, ${width} at ${scale}x: the header's brand link is named "Blacksand home"; its drawing is hidden, unfocusable, takes no pointer and has no title`, async () => {
      const { page, context, errors } = await openHtml(browser, built.html, { scheme, width, deviceScaleFactor: scale });
      try {
        const out = await page.evaluate(() => {
          const link = document.querySelector("a.basalt-site-brand");
          const svgs = [...link.querySelectorAll("svg")];
          return {
            label: link.getAttribute("aria-label"), titles: link.querySelectorAll("title").length, titleAttributes: link.querySelectorAll("[title]").length, svgs: svgs.length,
            hidden: svgs.every((svg) => svg.getAttribute("aria-hidden") === "true" && svg.getAttribute("focusable") === "false"),
            wrappers: [...link.querySelectorAll("[aria-hidden]")].filter((el) => el.tagName !== "svg").length,
            pointer: svgs.map((svg) => getComputedStyle(svg).pointerEvents), text: link.textContent.trim(),
            shown: svgs.filter((svg) => svg.getBoundingClientRect().width > 0).length,
          };
        });
        assert.equal(out.label, "Blacksand home");
        assert.equal(out.titles, 0);
        assert.equal(out.titleAttributes, 0);
        assert.equal(out.svgs, 2, "the 1x and the 2x drawing");
        assert.ok(out.hidden, "each drawing is aria-hidden and focusable=false itself");
        assert.equal(out.wrappers, 0, "and no wrapper does it for them");
        assert.deepEqual(out.pointer, ["none", "none"]);
        assert.equal(out.text, "");
        assert.equal(out.shown, 1, "one of the two is drawn for the screen");
        assert.equal(await page.getByRole("link", { name: "Blacksand home", exact: true }).count(), 1);
        assert.equal(await nameOf(page, "a.basalt-site-brand"), "Blacksand home");
        assert.equal(await page.locator("a.basalt-site-brand").getByRole("img").count(), 0);
        assert.deepEqual(errors.filter((e) => !/Failed to load|net::/.test(e)), []);
      } finally { await context.close(); }
    });
  }
});
