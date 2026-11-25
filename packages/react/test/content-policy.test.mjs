// A page under a content policy (DECISIONS 265, batch B0): the head scripts as files, and Base UI's inline style turned off or given a nonce, with the open popup's
// box and its list's scrollbar measured the same. Each page is served from its own origin with a real `Content-Security-Policy` header, so Chromium enforces the policy and reports each refusal.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { bundleFixture, launch, pkg } from "./support.mjs";

const dist = path.join(pkg, "dist");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const ORIGIN = "http://policy.test";
const OPTIONS = [{ value: "s", label: "Small" }, { value: "m", label: "Medium" }, { value: "l", label: "Large" }];

// The fixture: `window.show(provider)` draws a Select inside `CSPProvider` with those props (or with no provider for `null`), and a probe element in Base UI's class.
const FIXTURE = `
window.show = (provider) => {
  const select = <B.Select aria-label="Size" options={${JSON.stringify(OPTIONS)}} />;
  createRoot(document.getElementById("root")).render(<>{provider ? <B.CSPProvider {...provider}>{select}</B.CSPProvider> : select}<div id="probe" className="base-ui-disable-scrollbar" style={{ width: 80, height: 40, overflow: "scroll" }}><div style={{ width: 400, height: 400 }} /></div></>);
};`;

/** A page served under `policy`, with the head files, the shipped sheet and the fixture as files of its own origin. `inline` is an inline script in the head. */
async function policyPage(policy, { inline = "", storage = {}, viewport = { width: 1440, height: 900 }, fixture = FIXTURE } = {}) {
  const context = await browser.newContext({ viewport });
  // Before any page script, and outside the policy: what a returning visitor has stored, and a log of every refusal.
  await context.addInitScript((stored) => {
    for (const [key, value] of Object.entries(stored)) localStorage.setItem(key, value);
    window.__refused = [];
    document.addEventListener("securitypolicyviolation", (event) => window.__refused.push(`${event.effectiveDirective} ${event.blockedURI}`));
  }, storage);
  const bundled = await bundleFixture(fixture);
  const files = {
    "/": ["text/html", `<!doctype html><html lang="en"><head><link rel="stylesheet" href="/styles.css"><script src="/head/theme.js"></script><script src="/head/loops.js"></script>${inline ? `<script>${inline}</script>` : ""}<script src="/fixture.js" defer></script></head><body><div id="root"></div></body></html>`],
    "/styles.css": ["text/css", fs.readFileSync(path.join(dist, "styles.css"), "utf8")],
    "/head/theme.js": ["text/javascript", fs.readFileSync(path.join(dist, "head", "theme.js"), "utf8")],
    "/head/loops.js": ["text/javascript", fs.readFileSync(path.join(dist, "head", "loops.js"), "utf8")],
    "/fixture.js": ["text/javascript", bundled],
  };
  await context.route(`${ORIGIN}/**`, (route) => {
    const file = files[new URL(route.request().url()).pathname];
    if (!file) return route.fulfill({ status: 404 });
    return route.fulfill({ status: 200, contentType: file[0], headers: { "content-security-policy": policy }, body: file[1] });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${ORIGIN}/`);
  await page.waitForFunction(() => typeof window.show === "function");
  return { page, context, errors };
}

const SELF = "default-src 'self'; script-src 'self'; style-src 'self'";
const refused = (page) => page.evaluate(() => window.__refused.slice());
const styleElements = (page) => page.evaluate(() => document.querySelectorAll("style").length);

async function openSelect(page) {
  await page.getByRole("combobox", { name: "Size" }).click();
  await page.getByRole("option", { name: "Medium" }).waitFor();
  // A frame for React to hoist the style element and for the policy to report it.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

describe("the head scripts as files", () => {
  test("each file is its exported string, character for character, and a package export", async () => {
    const { themeBootstrap } = await import(pathToFileURL(path.join(dist, "theme-bootstrap.js")).href);
    const { loopsBootstrap } = await import(pathToFileURL(path.join(dist, "loops-bootstrap.js")).href);
    assert.equal(fs.readFileSync(path.join(dist, "head", "theme.js"), "utf8"), themeBootstrap);
    assert.equal(fs.readFileSync(path.join(dist, "head", "loops.js"), "utf8"), loopsBootstrap);
    const manifest = JSON.parse(fs.readFileSync(path.join(pkg, "package.json"), "utf8"));
    assert.equal(manifest.exports["./head/theme.js"], "./dist/head/theme.js");
    assert.equal(manifest.exports["./head/loops.js"], "./dist/head/loops.js");
  });

  test("under script-src 'self' the files apply the stored theme and hold before the app's script, and the inline form is refused", async () => {
    const { themeBootstrap } = await import(pathToFileURL(path.join(dist, "theme-bootstrap.js")).href);
    const { page, context, errors } = await policyPage(SELF, { inline: themeBootstrap, storage: { "basalt-theme": "dark", "basalt-loops": "held" } });
    try {
      const root = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, choice: document.documentElement.dataset.themeChoice, loops: document.documentElement.dataset.loops }));
      assert.deepEqual(root, { theme: "dark", choice: "dark", loops: "held" });
      // The policy is really on: the same line inline is refused, and it is the only refusal.
      assert.deepEqual(await refused(page), ["script-src-elem inline"]);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });
});

describe("Base UI's inline style under style-src 'self'", () => {
  test("without the provider, opening a Select writes Base UI's style element and the policy refuses it (the case this exists for)", async () => {
    const { page, context } = await policyPage(SELF);
    try {
      await page.evaluate(() => window.show(null));
      await openSelect(page);
      assert.equal(await styleElements(page), 1);
      assert.deepEqual(await refused(page), ["style-src-elem inline"]);
    } finally {
      await context.close();
    }
  });

  test("with CSPProvider disableStyleElements, opening a Select writes no inline style, nothing is refused, and Basalt's sheet draws the class", async () => {
    const { page, context, errors } = await policyPage(SELF);
    try {
      await page.evaluate(() => window.show({ disableStyleElements: true }));
      await openSelect(page);
      assert.equal(await styleElements(page), 0, "no <style> element in the document");
      assert.deepEqual(await refused(page), []);
      // What Base UI's style drew: the marked element scrolls with no scrollbar (its client box is its whole box).
      const probe = await page.evaluate(() => { const el = document.getElementById("probe"); return { width: getComputedStyle(el).scrollbarWidth, client: el.clientWidth, offset: el.offsetWidth }; });
      assert.equal(probe.width, "none");
      assert.equal(probe.client, probe.offset, "no scrollbar takes room");
      await page.getByRole("option", { name: "Medium" }).click();
      assert.match(await page.getByRole("combobox", { name: "Size" }).textContent(), /Medium/);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });

  test("with CSPProvider nonce, Base UI's style element carries the nonce and the policy accepts it", async () => {
    const { page, context, errors } = await policyPage("default-src 'self'; script-src 'self'; style-src 'self' 'nonce-b0test'");
    try {
      await page.evaluate(() => window.show({ nonce: "b0test" }));
      await openSelect(page);
      assert.equal(await styleElements(page), 1);
      // A browser hides a nonce from the attribute once it is read; the property keeps it.
      assert.equal(await page.evaluate(() => document.querySelector("style").nonce), "b0test");
      assert.deepEqual(await refused(page), []);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });

  test("with the style element on and off, the open Select's popup has the same box, and its list the same scrollbar width and client width", async () => {
    const boxes = [];
    for (const provider of [null, { disableStyleElements: true }]) {
      const { page, context } = await policyPage("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
      try {
        await page.evaluate((p) => window.show(p), provider);
        await openSelect(page);
        // The popup's box once its entry has run: two frames after it opens it is still scaling in, by however far each page's frames got.
        await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished)));
        boxes.push(await page.evaluate(() => {
          const popup = document.querySelector(".basalt-select-popup");
          const r = popup.getBoundingClientRect();
          const list = popup.querySelector("[role='listbox']") ?? popup;
          return { x: r.x, y: r.y, width: r.width, height: r.height, scrollbar: getComputedStyle(list).scrollbarWidth, clientWidth: list.clientWidth };
        }));
      } finally {
        await context.close();
      }
    }
    assert.deepEqual(boxes[1], boxes[0]);
  });
});

// A diagram under a strict style-src (CIMIP's adoption, DECISIONS 365, item 1): the line labels were placed by a style attribute in the ink's HTML, which the
// policy refuses, so each landed in the drawing's corner, on the page and in the viewer. They are placed through the CSSOM now; a text sequence's transcript
// (its lines' indents are styles) is drawn as elements in React and put back as its own nodes in the skill.
const DIAGRAMS = `
const arch = { title: "Arch", summary: "Three parts.", legend: { main: "Request" },
  nodes: [{ id: "a", kind: "client", name: "Browser", col: 1, row: 1 }, { id: "b", kind: "service", name: "API", col: 2, row: 1 }, { id: "c", kind: "store", name: "Database", col: 3, row: 1 }],
  edges: [{ from: "a", to: "b", kind: "main", label: "HTTPS" }, { from: "b", to: "c", label: "SQL" }] };
const seq = { title: "Seq", summary: "A run.", variant: "text", participants: [{ id: "u", name: "User" }, { id: "s", name: "Service" }],
  steps: [{ from: "u", to: "s", label: "asks" }, { frame: "opt", label: "when cached", steps: [{ from: "s", to: "u", kind: "dashed", label: "answers" }] }] };
window.showDiagrams = () => createRoot(document.getElementById("root")).render(<>
  <div style={{ width: 1104 }}><B.ArchitectureDiagram id="arch" {...arch} /></div>
  <div style={{ width: 240 }}><B.SequenceDiagram id="seq" {...seq} /></div>
</>);`;
const DP = "basalt-diagram";
const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
/** Each label's box in its drawing, and each transcript line's indent: what the policy refused before. */
const placed = (page, root) => page.evaluate(({ P, root }) => {
  const fig = document.querySelector(root);
  const drawing = fig.querySelector(`.${P}-drawing`).getBoundingClientRect();
  return [...fig.querySelectorAll(`.${P}-ink > .${P}-label`)].map((el) => {
    const r = el.getBoundingClientRect();
    return { text: el.textContent, x: Math.round(r.left - drawing.left), y: Math.round(r.top - drawing.top), w: Math.round(r.width) };
  });
}, { P: DP, root });
const indents = (page) => page.evaluate((P) => [...document.querySelectorAll(`#seq .${P}-tx-line`)].map((el) => getComputedStyle(el).paddingInlineStart), DP);

describe("a diagram under style-src 'self'", () => {
  test("its line labels sit where an unrestricted page puts them, on the page and in the viewer, and the policy refuses nothing", async () => {
    const read = async (policy) => {
      const { page, context, errors } = await policyPage(policy, { fixture: DIAGRAMS });
      try {
        await page.evaluate(() => window.showDiagrams());
        await page.waitForSelector(`#arch[data-layout="drawn"] .${DP}-ink > .${DP}-label`);
        await frames(page);
        const onPage = await placed(page, "#arch");
        await page.locator(`#arch .${DP}-expand`).click();
        await page.waitForSelector(`dialog.${DP}-viewer[open] .${DP}[data-layout="drawn"] .${DP}-ink > .${DP}-label`);
        await frames(page);
        const inViewer = await placed(page, `dialog.${DP}-viewer .${DP}`);
        return { onPage, inViewer, refused: await refused(page), errors, indents: await indents(page) };
      } finally {
        await context.close();
      }
    };
    const strict = await read(SELF);
    const open = await read("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
    assert.deepEqual(strict.refused, []);
    assert.deepEqual(strict.errors, []);
    assert.equal(strict.onPage.length, 2);
    // Off the corner: each label is on its line, past the first card.
    for (const label of [...strict.onPage, ...strict.inViewer]) assert.ok(label.x > 100 && label.w > 0, `${label.text} is placed (${JSON.stringify(label)})`);
    assert.deepEqual(strict.onPage, open.onPage);
    assert.deepEqual(strict.inViewer, open.inViewer);
    // The transcript's lines keep their indents: a message's label hangs under its sender, as it does with the policy open.
    assert.ok(strict.indents.some((v) => Number.parseFloat(v) > 0), `indents ${strict.indents}`);
    assert.deepEqual(strict.indents, open.indents);
  });
});

// Every type under style-src 'self' (G15 of the console's log, cimip-gaps-3): a page of every diagram, the classic five (authored and placed
// automatically, a text sequence) and the nine of batch D, drawn at 1104 and at 480. The policy refuses nothing, no figure's label waits for a frame to
// be placed (each is placed as React commits, in the task that rendered it), and every label sits where an unrestricted page puts it. Written while
// tests are paused (DECISIONS 359): not yet run by the suite; the probe of cimip-gaps-3/diagrams ran the same page.
const EVERY = `
import a from "./test/fixtures/cimip-diagrams-b.json";
import d from "./test/fixtures/diagrams-d1.json";
const ALL = { ...a, ...d };
delete ALL.$comment;
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, "data-flow": B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram,
  gantt: B.GanttDiagram, kanban: B.KanbanDiagram, journey: B.JourneyDiagram, "service-blueprint": B.ServiceBlueprintDiagram, "story-map": B.StoryMapDiagram,
  schedule: B.ScheduleDiagram, timeline: B.TimelineDiagram, state: B.StateDiagram, deployment: B.DeploymentDiagram };
window.showEvery = (width) => {
  const root = createRoot(document.getElementById("root"));
  flushSync(() => root.render(<div style={{ display: "grid", gap: 64, width }}>{Object.entries(ALL).map(([k, { type, ...props }]) => { const X = C[type]; return <X key={k} id={"fig-" + k} {...props} />; })}</div>));
  // Before any frame has run: each label's place, as the layout effects left it.
  return [...document.querySelectorAll(".basalt-diagram-ink > .basalt-diagram-label")].map((el) => ({ fig: el.closest("figure").id, left: el.style.left, top: el.style.top }));
};`;
const seats = (page) => page.evaluate((P) => [...document.querySelectorAll(`.${P}-ink > .${P}-label`)].map((el) => {
  const d = el.closest(`.${P}-drawing`).getBoundingClientRect(), r = el.getBoundingClientRect();
  return `${el.closest("figure").id} ${el.textContent} ${Math.round(r.left - d.left)},${Math.round(r.top - d.top)},${Math.round(r.width)}`;
}), DP);

describe("every diagram type under style-src 'self' (G15)", () => {
  for (const width of [1104, 480]) {
    test(`at ${width}: the policy refuses nothing, every label is placed as React commits, and each sits where an open policy puts it`, async () => {
      const read = async (policy) => {
        const { page, context, errors } = await policyPage(policy, { fixture: EVERY, viewport: { width: width + 32, height: 900 } });
        try {
          const first = await page.evaluate((w) => window.showEvery(w), width);
          await frames(page, 6);
          await page.waitForFunction(() => [...document.querySelectorAll("figure")].every((f) => f.hasAttribute("data-layout")));
          await frames(page, 4);
          return { first, seats: await seats(page), refused: await refused(page), errors };
        } finally {
          await context.close();
        }
      };
      const strict = await read(SELF);
      const open = await read("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
      // No style is refused. (Under default-src 'self' the policy also refuses img-src data: for one thing: a sequence's `alt` divider, whose dashes are a
      // data: SVG mask in the sheet, so the divider is not drawn. Found by the probe of cimip-gaps-3/diagrams, before and after this branch alike; it is
      // the lead's to route, and this test does not hide it: the second assertion names it.)
      assert.deepEqual(strict.refused.filter((r) => r.startsWith("style-src")), []);
      assert.deepEqual([...new Set(strict.refused.map((r) => r.split(" ")[0]))].filter((d) => d !== "style-src-attr" && d !== "style-src-elem"), strict.refused.length ? ["img-src"] : []);
      assert.deepEqual(strict.errors, []);
      assert.ok(strict.first.length > 20, `the page draws labels in its first frame (${strict.first.length})`);
      assert.deepEqual(strict.first.filter((l) => !l.left || !l.top), [], "no label waits for a frame to be placed");
      assert.ok(strict.seats.length > 20, `${strict.seats.length} labels`);
      assert.deepEqual(strict.seats, open.seats);
    });
  }
});

// The PNG under a content policy (DECISIONS 365, item 2): a canvas draws the SVG through an image, which `img-src 'self'` refuses as a data: URL and as a
// blob: URL. Where the policy allows neither, diagramToPng rejects with an error that names the fix, and makes no file; with `blob:` allowed it draws.
const EXPORT = `${DIAGRAMS}
import { diagramToPng } from "./dist/diagram-export.js";
window.png = () => diagramToPng(document.getElementById("arch")).then(
  (blob) => createImageBitmap(blob).then((image) => ({ type: blob.type, width: image.width, height: image.height })),
  (error) => ({ error: error.message, name: error.name }));`;

describe("a diagram's PNG under img-src", () => {
  for (const [name, images, drawn] of [["'self'", "'self'", false], ["'self' blob:", "'self' blob:", true], ["'self' data:", "'self' data:", true]]) {
    test(`img-src ${name}: ${drawn ? "the PNG is drawn at 2x" : "it rejects with an error that names img-src, and makes no file"}`, async () => {
      const { page, context, errors } = await policyPage(`default-src 'self'; script-src 'self'; style-src 'self'; img-src ${images}`, { fixture: EXPORT });
      try {
        await page.evaluate(() => window.showDiagrams());
        await page.waitForSelector(`#arch[data-layout="drawn"] .${DP}-ink > .${DP}-label`);
        await frames(page);
        const got = await page.evaluate(() => window.png());
        const width = await page.evaluate(() => document.getElementById("arch").getBoundingClientRect().width);
        if (drawn) {
          assert.equal(got.type, "image/png");
          assert.ok(got.width >= 2 * width, `${got.width} is at 2x of ${width}`);
        } else {
          assert.match(got.error, /img-src 'self' blob:/);
          // Named, so the skill's note tells the policy from any other failure without reading the words (diagrams-cimip ruling 2).
          assert.equal(got.name, "DiagramPolicyError");
          assert.equal(got.width, undefined);
        }
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });
  }
});

// The skill's "Download PNG" refused (diagrams-cimip ruling 2), on a composed page served under `img-src 'self'`: the note under the foot's buttons, the
// button switched off in place, no second try on the page, spoken once; "Download SVG" still saves; the viewer's foot does the same; the note neither
// prints nor is in a file. Written while tests are paused (DECISIONS 359): not yet run. The ruling is the decider's alone (no draft, no check).
const REFUSED_WORDS = "This page's security policy blocks the PNG. Download SVG still works.";
async function skillPolicyPage() {
  const { compose } = await import(pathToFileURL(path.join(pkg, "..", "..", ".agent", "skills", "basalt-html", "compose.mjs")).href);
  const data = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams.json"), "utf8"));
  const figure = (id, d) => `<figure class="diagram" id="${id}"><script type="application/json" data-diagram>${JSON.stringify({ ...d, export: true })}</script></figure>`;
  const html = compose(`<title>Policy</title><main style="max-width:1104px;margin:0 auto;padding:16px;display:grid;gap:64px">${figure("one", data.architecture)}${figure("two", data.flowchart)}</main>`).html;
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    window.__refused = [];
    window.__saved = [];
    document.addEventListener("securitypolicyviolation", (event) => window.__refused.push(`${event.effectiveDirective} ${event.blockedURI}`));
    // The files the module saves, read where it hands them to an anchor (blob: and data: images are refused here; a blob URL for a download is not).
    const make = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => { window.__saved.push(blob); return make(blob); };
  });
  // Only images are held to the policy: the skill's page is inline script and style by design.
  await context.route(`${ORIGIN}/**`, (route) => route.fulfill({ status: 200, contentType: "text/html", headers: { "content-security-policy": "img-src 'self'" }, body: html }));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${ORIGIN}/`);
  await page.waitForSelector("#two .diagram-download");
  await page.evaluate(() => document.fonts.ready);
  return { page, context, errors };
}
const footOf = (id) => `#${id} > .diagram-foot`;
const pngIn = (scope) => `${scope} .diagram-download:has-text("Download PNG")`;
const svgIn = (scope) => `${scope} .diagram-download:has-text("Download SVG")`;

describe("the skill's Download PNG under img-src 'self' (ruling 2)", () => {
  test("a press leaves no file, shows the note with its words, switches the button off in place, keeps focus, and is spoken once", async () => {
    const { page, context, errors } = await skillPolicyPage();
    try {
      const png = page.locator(pngIn(footOf("one")));
      const before = await png.boundingBox();
      await png.focus();
      await png.press("Enter");
      await page.waitForSelector(`${footOf("one")} > .diagram-export-note`);
      await page.waitForTimeout(100);
      const got = await page.evaluate(() => {
        const foot = document.querySelector("#one > .diagram-foot"), note = foot.querySelector(":scope > .diagram-export-note");
        const png = [...foot.querySelectorAll(".diagram-download")].find((b) => b.textContent.includes("PNG"));
        const buttons = [...foot.querySelectorAll("button")];
        const cs = getComputedStyle(note);
        return {
          words: note.textContent, last: foot.lastElementChild === note, tag: note.tagName, disabled: png.getAttribute("aria-disabled"), describedBy: png.getAttribute("aria-describedby"), noteId: note.id,
          focused: document.activeElement === png, live: document.getElementById("basalt-live")?.textContent, saved: window.__saved.map((b) => b.type),
          under: note.getBoundingClientRect().top - Math.max(...buttons.map((b) => b.getBoundingClientRect().bottom)), size: cs.fontSize, weight: cs.fontWeight, wrap: cs.textWrap || cs.textWrapStyle,
        };
      });
      assert.equal(got.words, REFUSED_WORDS);
      assert.equal(got.tag, "P");
      assert.ok(got.last, "the note is the last thing in the foot");
      assert.equal(got.disabled, "true");
      assert.equal(got.describedBy, got.noteId);
      assert.ok(got.focused, "the button keeps focus");
      assert.equal(got.live, REFUSED_WORDS, "spoken through the page's announcer");
      assert.deepEqual(got.saved, [], "no file");
      assert.ok(got.under > 0, "under the last row of buttons");
      assert.equal(got.size, "12px");
      assert.equal(got.weight, "400");
      assert.match(String(got.wrap), /balance/);
      const after = await png.boundingBox();
      assert.deepEqual([after.x, after.width], [before.x, before.width], "the button keeps its seat and width");
      // A second press does nothing: no new refusal, no new words.
      const refusals = (await refused(page)).length;
      await page.evaluate(() => { document.getElementById("basalt-live").textContent = ""; });
      await png.click();
      await page.waitForTimeout(100);
      assert.equal((await refused(page)).length, refusals, "no second try");
      assert.equal(await page.evaluate(() => document.getElementById("basalt-live").textContent), "", "spoken once");
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });

  test("a second figure's first press answers at once with no new violation; Download SVG still saves; the note neither prints nor is in a file", async () => {
    const { page, context } = await skillPolicyPage();
    try {
      await page.locator(pngIn(footOf("one"))).click();
      await page.waitForSelector(`${footOf("one")} > .diagram-export-note`);
      const refusals = (await refused(page)).length;
      await page.locator(pngIn(footOf("two"))).click();
      await page.waitForSelector(`${footOf("two")} > .diagram-export-note`);
      assert.equal((await refused(page)).length, refusals, "the second figure did not try");
      assert.equal(await page.locator(pngIn(footOf("two"))).getAttribute("aria-disabled"), "true");
      await page.locator(svgIn(footOf("one"))).click();
      await page.waitForFunction(() => window.__saved.some((b) => b.type === "image/svg+xml"));
      const svg = await page.evaluate(() => window.__saved.find((b) => b.type === "image/svg+xml").text());
      assert.ok(!svg.includes("security policy"), "the note is in no file");
      assert.equal(await page.locator(`${footOf("one")} > .diagram-export-note`).textContent(), REFUSED_WORDS, "the refusal stays");
      await page.emulateMedia({ media: "print" });
      assert.equal(await page.locator(`${footOf("one")} > .diagram-export-note`).evaluate((el) => el.getClientRects().length), 0, "the note does not print");
    } finally {
      await context.close();
    }
  });

  test("the viewer's foot does the same: the note last in the controls' row, on the end edge, spoken through the viewer's status", async () => {
    const { page, context } = await skillPolicyPage();
    try {
      await page.locator("#one .diagram-expand").click();
      await page.waitForSelector("dialog.diagram-viewer[open] figure.diagram[data-layout]");
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
      await page.locator(pngIn("dialog.diagram-viewer[open] .diagram-viewer-end")).click();
      await page.waitForSelector("dialog.diagram-viewer[open] .diagram-viewer-row > .diagram-export-note");
      await page.waitForTimeout(100);
      const got = await page.evaluate(() => {
        const d = document.querySelector("dialog.diagram-viewer[open]"), row = d.querySelector(".diagram-viewer-row"), note = row.querySelector(":scope > .diagram-export-note");
        const png = [...d.querySelectorAll(".diagram-viewer-end .diagram-download")].find((b) => b.textContent.includes("PNG"));
        return { words: note.textContent, last: row.lastElementChild === note, align: getComputedStyle(note).textAlign, disabled: png.getAttribute("aria-disabled"), describedBy: png.getAttribute("aria-describedby") === note.id, status: d.querySelector('[role="status"]').textContent };
      });
      assert.deepEqual(got, { words: REFUSED_WORDS, last: true, align: "end", disabled: "true", describedBy: true, status: REFUSED_WORDS });
    } finally {
      await context.close();
    }
  });
});
