// The panels, art and parts port (DECISIONS 162): the skill's flat table and two-line cell, closing block, captioned columns, app tile and period stepper rendered beside React's
// in Chromium in both themes and compared by computed style, and the app tile by pixels; then the skill's own behaviour (the stepper's room and ends, the row under 640, forced colours, axe).
// Nothing waits a wall-clock time inside a transition.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import path from "node:path";
import { pathToFileURL } from "node:url";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { fixturePage, launch as launchReact, pkg } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const { checkHeadroom } = await import(pathToFileURL(path.join(pkg, "dist", "testing", "headroom.js")).href);
let browser;
let reactBrowser;
before(async () => { browser = await launch(); reactBrowser = await launchReact(); });
after(async () => { await browser?.close(); await reactBrowser?.close(); });

const THEMES = ["dark", "light"];
const BASE = "*, ::before, ::after { box-sizing: border-box; } body { margin: 0; background: var(--basalt-surface-page); color: var(--basalt-text-primary); font: 400 14px / 20px var(--basalt-font-family-sans); }";
const reactPage = async (body, options) => { const r = await fixturePage(reactBrowser, body, options); await r.page.addStyleTag({ content: BASE }); return r; };
const page = (body) => compose(`<title>Parity</title>${body}`, { fonts: false }).html;
const TYPE = ["fontSize", "fontWeight", "lineHeight", "letterSpacing", "color"];
const FLAT = ["borderTopWidth", "borderTopLeftRadius", "backgroundColor", "boxShadow"];

const measure = (p, selector, props) => p.evaluate(({ selector, props }) => {
  const el = document.querySelector(selector);
  if (!el) return null;
  const s = getComputedStyle(el);
  const out = {};
  for (const prop of props) out[prop] = ["width", "height", "x", "y"].includes(prop) ? `${Math.round(el.getBoundingClientRect()[prop] * 100) / 100}px` : s[prop];
  return out;
}, { selector, props });
async function compare(react, skill, [r, s], props, label) {
  const a = await measure(react, r, props);
  const b = await measure(skill, s, props);
  assert.ok(a && b, `${label}: both exist (${r} / ${s})`);
  assert.deepEqual(b, a, label);
}
async function audit(p) {
  await p.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await p.addScriptTag({ content: axeSource });
  const result = await p.evaluate(() => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] }));
  return result.violations.map((v) => `${v.id}: ${v.help}`);
}

// ---- the flat table and the two-line cell ----
const ROWS = [["Ana", "Hold the plan", "Nothing changes this week", "2 days"], ["Bo", "Lower Thursday's load", "A synthetic reason that wraps", "5 days"]];
const REACT_TABLE = `createRoot(document.getElementById("root")).render(<div style={{ width: 640 }}><B.Card><B.CardContent><B.TableContainer flat label="Queue"><B.Table columns={[{ width: 88 }, {}, { width: 84 }]} minWidth={280}><B.TableHeader><B.TableRow><B.TableHead>Athlete</B.TableHead><B.TableHead>Draft</B.TableHead><B.TableHead numeric>Waiting</B.TableHead></B.TableRow></B.TableHeader><B.TableBody>{${JSON.stringify(ROWS)}.map(([a, c, d, w]) => <B.TableRow key={a}><B.TableCell>{a}</B.TableCell><B.TableCell><B.TableCall call={c} detail={d} /></B.TableCell><B.TableCell numeric>{w}</B.TableCell></B.TableRow>)}</B.TableBody></B.Table></B.TableContainer></B.CardContent></B.Card></div>);`;
const SKILL_TABLE = `<div style="width: 640px"><div class="card panel-pad"><div class="table-wrap" data-flat role="region" aria-label="Queue"><table data-fixed style="min-width: 280px"><colgroup><col style="width: 88px"><col><col style="width: 84px"></colgroup><thead><tr><th scope="col">Athlete</th><th scope="col">Draft</th><th scope="col" data-numeric>Waiting</th></tr></thead><tbody>${ROWS.map(([a, c, d, w]) => `<tr><td>${a}</td><td><span class="table-call"><span class="table-call-main">${c}</span><span class="table-call-detail">${d}</span></span></td><td data-numeric>${w}</td></tr>`).join("")}</tbody></table></div></div></div>`;

describe("the flat table, against React's", () => {
  for (const theme of THEMES) {
    test(`the frame, the band, a cell and a two-line cell match in ${theme}`, async () => {
      const react = await reactPage(REACT_TABLE, { theme, viewport: { width: 700, height: 500 } });
      const skill = await openHtml(browser, page(SKILL_TABLE), { scheme: theme, width: 700 });
      await compare(react.page, skill.page, [".basalt-table-container", ".table-wrap"], [...FLAT, "paddingTop"], "frame");
      await compare(react.page, skill.page, [".basalt-table th", "th"], ["backgroundColor", "fontSize", "fontWeight", "color", "height", "paddingLeft"], "band");
      await compare(react.page, skill.page, ["tbody td", "tbody td"], ["paddingTop", "paddingBottom", "paddingLeft", "height"], "cell");
      await compare(react.page, skill.page, [".basalt-table-call", ".table-call"], ["display", "rowGap", "width", "height"], "call");
      await compare(react.page, skill.page, [".basalt-table-call-main", ".table-call-main"], TYPE, "call main");
      await compare(react.page, skill.page, [".basalt-table-call-detail", ".table-call-detail"], TYPE, "call detail");
      assert.deepEqual(skill.errors, []);
    });
  }
});

// ---- the closing block ----
const REACT_CLOSING = `createRoot(document.getElementById("root")).render(<div><main style={{ height: 120 }} /><B.Stage closing art={<svg viewBox="0 0 10 10" preserveAspectRatio="none"><rect width="10" height="10" fill="var(--basalt-art-field)" /><B.AmbientMark index={0} style={{ left: 40, top: 40 }} /></svg>} style={{ ["--basalt-stage-room"]: "40px" }}><div style={{ height: 100 }} /></B.Stage></div>);`;
const SKILL_CLOSING = `<div><main style="height: 120px"></main><section class="stage" data-closing style="--basalt-stage-room: 40px"><div class="stage-content"><div style="height: 100px"></div></div><div class="stage-art" aria-hidden="true"><svg viewBox="0 0 10 10" preserveAspectRatio="none"><rect width="10" height="10" fill="var(--basalt-art-field)"/></svg><span class="ambient-mark" data-ambient style="left: 40px; top: 40px"></span></div></section></div>`;

describe("the closing block, against React's", () => {
  for (const theme of THEMES) {
    for (const width of [1440, 800, 390]) {
      test(`the section gap, the bottom room and the held mark match at ${width} in ${theme}`, async () => {
        const react = await reactPage(REACT_CLOSING, { theme, viewport: { width, height: 900 } });
        const skill = await openHtml(browser, page(SKILL_CLOSING), { scheme: theme, width });
        await compare(react.page, skill.page, [".basalt-stage", ".stage"], ["marginTop", "paddingTop", "paddingBottom", "backgroundColor", "borderTopWidth", "boxShadow", "height", "y"], "block");
        await compare(react.page, skill.page, ["[data-ambient]", "[data-ambient]"], ["animationName", "opacity"], "mark");
        assert.deepEqual(skill.errors, []);
      });
    }
  }

  test("forced colours and print: the art is not drawn and the bottom padding is space-16", async () => {
    for (const media of ["forced", "print"]) {
      const skill = await openHtml(browser, page(SKILL_CLOSING), { scheme: "dark", width: 1440 });
      if (media === "forced") await skill.page.emulateMedia({ forcedColors: "active" }); else await skill.page.emulateMedia({ media: "print" });
      const s = await skill.page.evaluate(() => { const st = document.querySelector(".stage"); return { art: getComputedStyle(st.querySelector(".stage-art")).display, pad: getComputedStyle(st).paddingBottom, top: getComputedStyle(st).paddingTop }; });
      assert.equal(s.art, "none", media);
      assert.equal(s.pad, "64px", media);
      assert.equal(s.top, "128px", `${media}: the gaps stay`);
    }
  });
});

// The closing block's quiet zones (return 1), the skill's and React's, read by the same `checkHeadroom` (`stage` names the block; the skill's content class is hidden with `hide`).
// The marks are pixels from the block's top, inside the top padding: a percentage of the height lands on the words when they wrap taller on a phone.
const STARS = [[12, 20], [30, 36], [47, 24], [63, 40], [81, 28], [90, 44]];
const SKILL_CLOSING_ZONES = (marks, unit) => `<div><main style="height: 80px"></main><section class="stage" data-closing style="--basalt-stage-room: 48px"><div class="stage-content"><div style="display: flex; flex-direction: column; align-items: flex-start; gap: 16px; padding-inline: var(--basalt-gutter)"><h2 data-quiet="line" style="margin: 0; font: 600 var(--basalt-text-4xl-size) / var(--basalt-text-4xl-line-height) var(--basalt-font-family-sans)">Words in a quiet zone.</h2><p data-quiet="lead" style="margin: 0; max-width: var(--basalt-size-prose-width)">The closing block is the stage's second form: level 0 on art-field, no headroom and no pull-up. Its art is behind the words and held still.</p><div data-quiet="actions"><button class="btn" data-variant="primary" type="button">Start</button></div></div></div><div class="stage-art" aria-hidden="true"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><rect width="100" height="100" fill="var(--basalt-art-field)"/><path d="M0 78 C25 66 45 84 70 72 S92 70 100 76 V100 H0Z" fill="var(--basalt-art-tone-1)"/><path d="M0 90 C20 82 50 94 75 86 S95 84 100 88 V100 H0Z" fill="var(--basalt-art-tone-2)"/></svg>${marks.map(([x, y], i) => `<span class="ambient-mark" data-ambient style="left: ${x}%; top: ${y}${unit}"></span>`).join("")}</div></section></div>`;
const skillLoader = (html) => async (p, run) => {
  await p.setContent(html);
  await p.evaluate(() => document.fonts.ready);
};

describe("the closing block keeps its art out of its quiet zones, the skill's as React's", () => {
  test("the skill's block passes at 390, 720 and 1440 in both themes, with no mark in a zone", async () => {
    const skill = await checkHeadroom(browser, { load: skillLoader(page(SKILL_CLOSING_ZONES(STARS, "px"))), stage: ".stage[data-closing]", hide: [".stage-content", ".topbar"], widths: [390, 720, 1440] });
    assert.equal(skill.runs, 12);
    assert.ok(skill.checked > 0);
    assert.ok(skill.ok, JSON.stringify(skill.failures.slice(0, 3), null, 2));
  });

  test("the control fails in the skill too: marks placed by a percentage of the height land on the words at 390", async () => {
    const result = await checkHeadroom(browser, { load: skillLoader(page(SKILL_CLOSING_ZONES([[12, 18], [30, 10], [47, 22], [63, 12], [81, 20], [90, 38]], "%"))), stage: ".stage[data-closing]", hide: [".stage-content", ".topbar"], widths: [390], themes: ["dark", "light"], scales: [1] });
    assert.equal(result.ok, false);
    assert.ok(result.failures.every((f) => ["line", "lead", "actions"].includes(f.zone)));
  });
});

// ---- captioned columns ----
const ITEMS = [["First", "A synthetic sentence that says what follows."], ["Second", "Another one."], ["Third", "A third, a little longer than the others are."], ["Fourth", "The last."]];
describe("captioned columns, against React's", () => {
  for (const theme of THEMES) {
    for (const [size, columns] of [["large", 3], ["small", 2]]) {
      test(`${size} with ${columns} columns matches in ${theme}`, async () => {
        const react = await reactPage(`createRoot(document.getElementById("root")).render(<div style={{ width: 960 }}><B.CaptionedColumns size="${size}" columns={${columns}}>{${JSON.stringify(ITEMS)}.map(([h, b]) => <B.CaptionedColumn key={h} head={h}>{b}</B.CaptionedColumn>)}</B.CaptionedColumns></div>);`, { theme, viewport: { width: 1000, height: 600 } });
        const skill = await openHtml(browser, page(`<div style="width: 960px"><dl class="captioned" data-size="${size}" data-columns="${columns}">${ITEMS.map(([h, b]) => `<div><dt>${h}</dt><dd>${b}</dd></div>`).join("")}</dl></div>`), { scheme: theme, width: 1000 });
        await compare(react.page, skill.page, [".basalt-captioned", ".captioned"], ["gridTemplateColumns", "columnGap", "rowGap", "borderTopWidth", "borderTopColor", "paddingTop", "height"], "list");
        await compare(react.page, skill.page, [".basalt-captioned-item", ".captioned > div"], ["paddingTop", "paddingBottom", "borderTopWidth", "borderTopColor", "height", "width"], "item");
        await compare(react.page, skill.page, [".basalt-captioned-head", ".captioned dt"], [...TYPE, "marginBottom", "height"], "head");
        await compare(react.page, skill.page, [".basalt-captioned-body", ".captioned dd"], [...TYPE, "height"], "body");
        assert.deepEqual(skill.errors, []);
      });
    }
  }
});

// ---- the app tile ----
const STAND_IN = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#c33"/></svg>`)}`;
/** The tile's own pixels: a screenshot of its box and a pixel's margin, as rows of [r, g, b, a] read through a canvas. */
async function tilePixels(p, selector, scale) {
  const shot = await p.locator(selector).screenshot({ animations: "disabled" });
  return p.evaluate(async (data) => {
    const img = new Image();
    img.src = data;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    return { width: img.width, height: img.height, data: [...ctx.getImageData(0, 0, img.width, img.height).data] };
  }, `data:image/png;base64,${shot.toString("base64")}`).then((r) => ({ ...r, scale }));
}

describe("the app tile, against React's", () => {
  for (const theme of THEMES) {
    test(`the box, the clip and the hairline match by pixel at every size in ${theme}`, async () => {
      for (const size of [20, 32, 36, 40, 44, 48, 52]) {
        const react = await reactPage(`createRoot(document.getElementById("root")).render(<div style={{ padding: 8 }}><B.AppTile size={${size}} src={${JSON.stringify(STAND_IN)}} /></div>);`, { theme, viewport: { width: 200, height: 200 } });
        const skill = await openHtml(browser, page(`<div style="padding: 8px"><span class="app-tile" data-size="${size}" aria-hidden="true" id="t"><img src="${STAND_IN}" alt="" draggable="false"></span></div>`), { scheme: theme, width: 200 });
        for (const p of [react.page, skill.page]) await p.waitForFunction(() => document.querySelector(".basalt-app-tile img, .app-tile img").complete);
        await compare(react.page, skill.page, [".basalt-app-tile", ".app-tile"], ["width", "height", "boxShadow", "userSelect", "display"], `box at ${size}`);
        const a = await tilePixels(react.page, ".basalt-app-tile");
        const b = await tilePixels(skill.page, ".app-tile");
        assert.deepEqual([b.width, b.height], [a.width, a.height]);
        // The clip is the same polygon and the hairline the same outline: a pixel may differ by anti-aliasing at the edge, and only there.
        let differing = 0;
        let worst = 0;
        for (let i = 0; i < a.data.length; i += 4) {
          const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]), Math.abs(a.data[i + 3] - b.data[i + 3]));
          if (d > 24) differing += 1;
          worst = Math.max(worst, d);
        }
        const edge = Math.ceil(size * 4 * 0.5);
        assert.ok(differing <= edge, `${size}px in ${theme}: ${differing} pixels differ by more than 24 levels (worst ${worst}); the shape's edge is about ${edge} pixels long`);
        await react.page.close();
        await skill.context.close();
      }
    });
  }

  test("forced colours: not drawn", async () => {
    const skill = await openHtml(browser, page(`<span class="app-tile" data-size="40" aria-hidden="true" id="t"><img src="${STAND_IN}" alt=""></span> Name`), { scheme: "dark", width: 400 });
    await skill.page.emulateMedia({ forcedColors: "active" });
    assert.equal(await skill.page.evaluate(() => getComputedStyle(document.getElementById("t")).display), "none");
  });

  test("with no size it is as wide as its box and square; its box does not move when the picture fails (0px)", async () => {
    const skill = await openHtml(browser, page(`<div style="display: flex; gap: 8px; align-items: center"><span class="app-tile" data-size="48" aria-hidden="true" id="t"><img src="data:image/png;base64,AAAA" alt=""></span><span id="name">Name</span></div><div style="width: 44px"><span class="app-tile" id="u"><img src="${STAND_IN}" alt=""></span></div>`), { scheme: "dark", width: 400 });
    const rects = () => skill.page.evaluate(() => ["t", "name", "u"].map((id) => { const r = document.getElementById(id).getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
    const first = await rects();
    await skill.page.waitForFunction(() => document.querySelector("#t img").complete);
    assert.deepEqual(await rects(), first);
    assert.deepEqual(first[0].slice(2), [48, 48]);
    assert.deepEqual(first[2].slice(2), [44, 44]);
  });
});

// ---- the period stepper ----
const REACT_STEPPER = (props = "") => `createRoot(document.getElementById("root")).render(<div style={{ padding: 8 }}><B.PeriodStepper label="28 Sept to 4 Oct" spokenPrefix="Week 8, build, " previousLabel="The week before" nextLabel="The week after" ${props} /></div>);`;
const SKILL_STEPPER = (attrs = "", end = "") => `<div style="padding: 8px"><div class="period" role="group" aria-label="Week" ${attrs}><button class="btn" type="button" data-variant="ghost" data-icon-only aria-label="The week before"><span data-glyph="chevron-left"></span></button><p class="period-label" aria-live="polite"><span class="visually-hidden">Week 8, build, </span>28 Sept to 4 Oct</p><button class="btn" type="button" data-variant="ghost" data-icon-only aria-label="The week after" ${end}><span data-glyph="chevron-right"></span></button></div></div>`;

describe("the period stepper, against React's", () => {
  for (const theme of THEMES) {
    test(`the group, the buttons and the label match in ${theme}`, async () => {
      const react = await reactPage(REACT_STEPPER(), { theme, viewport: { width: 500, height: 200 } });
      const skill = await openHtml(browser, page(SKILL_STEPPER()), { scheme: theme, width: 500 });
      await compare(react.page, skill.page, [".basalt-period-stepper", ".period"], ["display", "columnGap", "alignItems", "width", "height"], "group");
      await compare(react.page, skill.page, [".basalt-period-label", ".period-label"], [...TYPE, "fontVariantNumeric", "minWidth", "textAlign", "whiteSpace", "width", "height", "x"], "label");
      for (const [r, s] of [[".basalt-period-stepper .basalt-button:first-child", ".period .btn:first-child"], [".basalt-period-stepper .basalt-button:last-child", ".period .btn:last-child"]]) await compare(react.page, skill.page, [r, s], ["width", "height", "borderTopLeftRadius", "color", "backgroundColor", "x"], "button");
      assert.deepEqual(skill.errors, []);
    });
  }

  test("the whole span hides both buttons and keeps their room (0px); the ends keep focus", async () => {
    const week = await openHtml(browser, page(SKILL_STEPPER()), { scheme: "dark", width: 500 });
    const whole = await openHtml(browser, page(SKILL_STEPPER("data-whole")), { scheme: "dark", width: 500 });
    const boxes = (p) => p.evaluate(() => [...document.querySelectorAll(".period .btn, .period-label")].map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
    assert.deepEqual(await boxes(whole.page), await boxes(week.page));
    assert.deepEqual(await whole.page.evaluate(() => [...document.querySelectorAll(".period .btn")].map((b) => getComputedStyle(b).visibility)), ["hidden", "hidden"]);
    const end = await openHtml(browser, page(SKILL_STEPPER("", 'aria-disabled="true"')), { scheme: "dark", width: 500 });
    await end.page.locator(".period .btn:last-child").focus();
    assert.equal(await end.page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "The week after");
  });

  test("it takes its own row under 640px of its container, and not from 640", async () => {
    for (const [width, row] of [[639, true], [640, false]]) {
      const skill = await openHtml(browser, page(`<div style="width: ${width}px; container-type: inline-size"><div id="bar" style="display: flex; flex-wrap: wrap; justify-content: space-between; min-height: 56px"><div id="tabs">Tabs</div>${SKILL_STEPPER().replace('<div style="padding: 8px">', "<div style=\"display: contents\">")}</div></div>`), { scheme: "dark", width: 1000 });
      const s = await skill.page.evaluate(() => { const p = document.querySelector(".period"); const c = getComputedStyle(p); const r = p.getBoundingClientRect(); const b = document.getElementById("bar").getBoundingClientRect(); const first = p.querySelector(".btn").getBoundingClientRect(); return { rule: c.borderTopWidth, full: Math.abs(r.width - b.width) < 1, tall: r.height, btn: [first.width, first.height], justify: c.justifyContent }; });
      assert.equal(s.rule === "1px", row, `${width}`);
      assert.equal(s.full, row, `${width}: full width`);
      if (row) { assert.ok(s.tall >= 52 && s.tall < 53); assert.ok(s.btn[0] >= 44 && s.btn[1] >= 44); assert.equal(s.justify, "space-between"); }
    }
  });
});

describe("axe finds nothing in the new parts", () => {
  for (const theme of THEMES) {
    test(`the five parts on one page (${theme})`, async () => {
      const body = `<div style="width: 700px">${SKILL_STEPPER()}${SKILL_TABLE}<div style="display: flex; gap: 8px; align-items: center"><span class="app-tile" data-size="32" aria-hidden="true"><img src="${STAND_IN}" alt=""></span><span>Company</span></div><dl class="captioned" data-size="small" data-columns="2">${ITEMS.map(([h, b]) => `<div><dt>${h}</dt><dd>${b}</dd></div>`).join("")}</dl>${SKILL_CLOSING}</div>`;
      const skill = await openHtml(browser, page(body), { scheme: theme, width: 800 });
      assert.deepEqual(await audit(skill.page), []);
    });
  }
});
