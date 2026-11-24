// Reserved room across every component (DECISIONS 328, 329, 336): what can be checked without a browser. The stylesheets, read as text: no physical
// sides, the edge rule written once with the same expressions in React and in the skill, every head that hangs a control declaring its room, no
// hand-written hang left, the side insets read by direction. The markup, by renderToStaticMarkup against the built package: where `edge` lands, the
// filter's head order, the composer's row, the count's seat, the command list's room. The legend's reserved forms, and the copy's glyph seat.
// Node only: nothing here starts a browser.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import * as B from "../dist/index.js";
import { legendForms } from "../dist/chart.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
/** CSS with its comments blanked out (kept as spaces, so line numbers hold). */
const code = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
const REACT = code(read("packages/react/src/styles/components.css"));
const SKILL_DIR = "tools/html-skill/src/modules";
const SKILL_FILES = ["tools/html-skill/src/core.css", ...fs.readdirSync(path.join(root, SKILL_DIR)).filter((f) => f.endsWith(".css")).map((f) => `${SKILL_DIR}/${f}`)];
const SKILL = Object.fromEntries(SKILL_FILES.map((f) => [f, code(read(f))]));
const SKILL_ALL = Object.values(SKILL).join("\n");

/** A value's parts at the top level (spaces inside a function stay). */
function parts(value) {
  const out = [];
  let depth = 0;
  let now = "";
  for (const ch of value.trim()) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (/\s/.test(ch) && depth === 0) {
      if (now) out.push(now);
      now = "";
    } else now += ch;
  }
  if (now) out.push(now);
  return out;
}

/** Every rule as { selector, body }, nested at-rules flattened (the selector is the innermost one). */
function rules(css) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) out.push({ selector: m[1].trim().replace(/\s+/g, " "), body: m[2] });
  return out;
}
const decl = (body, property) => {
  const m = new RegExp(`(?:^|[;\\s])${property.replace(/[-[\]]/g, "\\$&")}\\s*:\\s*([^;]+)`).exec(body);
  return m ? m[1].trim().replace(/\s+/g, " ") : null;
};
const ruleFor = (css, selector) => rules(css).filter((r) => r.selector === selector);

describe("No physical sides", () => {
  const SHEETS = [["components.css", REACT], ...Object.entries(SKILL)];
  test("no padding or margin shorthand has unequal inline sides, in React and in every skill stylesheet", () => {
    const found = [];
    for (const [name, css] of SHEETS) {
      for (const m of css.matchAll(/(?<![-\w])(padding|margin)\s*:\s*([^;{}]+);/g)) {
        const p = parts(m[2].replace(/!important/, ""));
        if (p.length === 4 && p[1] !== p[3]) found.push(`${name}: ${m[1]}: ${m[2].trim()}`);
      }
    }
    assert.deepEqual(found, []);
  });
  test("no padding-left, padding-right, margin-left or margin-right", () => {
    const found = [];
    for (const [name, css] of SHEETS) for (const m of css.matchAll(/(?<![-\w])(?:padding|margin)-(?:left|right)\s*:/g)) found.push(`${name}: ${m[0]}`);
    assert.deepEqual(found, []);
  });
  test("R-11's ten rules are written with logical sides", () => {
    for (const selector of [".basalt-chip", ".basalt-switch-row", ".basalt-option-chip", ".basalt-select-trigger", ".basalt-toast-content", ".basalt-notifications-head", ".basalt-sheet-head", ".basalt-search-form", ".basalt-tray-row"]) {
      const base = ruleFor(REACT, selector)[0];
      assert.ok(base, `${selector} exists`);
      assert.equal(decl(base.body, "padding"), null, `${selector} has no padding shorthand`);
      assert.ok(decl(base.body, "padding-inline"), `${selector} writes padding-inline`);
    }
    const copy = ruleFor(REACT, ".basalt-code-title .basalt-code-copy")[0];
    assert.equal(decl(copy.body, "margin-inline"), "0");
  });
  test("the untitled block's corner copy is placed by inset-inline-end, not right", () => {
    const corner = ruleFor(REACT, ".basalt-code-copy")[0];
    assert.ok(decl(corner.body, "inset-inline-end"));
    assert.equal(decl(corner.body, "right"), null);
  });
});

describe("The edge rule is one rule", () => {
  const reactEdge = (tail) => ruleFor(REACT, `.basalt-button[data-variant="ghost"]${tail}`);
  const skillEnd = ':is([data-edge="end"], :is(.panel-head, .section-head) > :last-child)';
  const skillAny = ":is([data-edge], :is(.panel-head, .section-head) > :last-child)";
  const skillEdge = (tail) => ruleFor(SKILL["tools/html-skill/src/core.css"], `.btn[data-variant="ghost"]${tail}`);
  const pairs = [
    ["[data-edge]", skillAny, "--_inset"],
    ["[data-icon-only][data-edge]", `[data-icon-only]${skillAny}`, "--_inset"],
    ['[data-edge="start"]', '[data-edge="start"]', "--_hang"],
    ['[data-edge="start"]', '[data-edge="start"]', "margin-inline-start"],
    ['[data-edge="end"]', skillEnd, "--_hang"],
    ['[data-edge="end"]', skillEnd, "margin-inline-end"],
    ['[data-edge="start"]:focus-visible', '[data-edge="start"]:focus-visible', "outline-offset"],
    ['[data-edge="end"]:focus-visible', `${skillEnd}:focus-visible`, "outline-offset"],
    ["[data-edge]:not([data-icon-only])", `${skillAny}:not([data-icon-only])`, "--_miss"],
    ["[data-edge]:not([data-icon-only])", `${skillAny}:not([data-icon-only])`, "min-width"],
    ["[data-edge]:not([data-icon-only])::before", `${skillAny}:not([data-icon-only])::before`, "inset-block"],
    ['[data-edge="end"]:not([data-icon-only])::before', `${skillEnd}:not([data-icon-only])::before`, "--_out"],
    ['[data-edge="end"]:not([data-icon-only])::before', `${skillEnd}:not([data-icon-only])::before`, "inset-inline"],
    ['[data-edge="start"]:not([data-icon-only])::before', '[data-edge="start"]:not([data-icon-only])::before', "--_out"],
    ['[data-edge="start"]:not([data-icon-only])::before', '[data-edge="start"]:not([data-icon-only])::before', "inset-inline"],
  ];
  for (const [react, skill, property] of pairs) {
    test(`${property} on ${react} is the same expression on both sides`, () => {
      const a = reactEdge(react).map((r) => decl(r.body, property)).filter(Boolean);
      const b = skillEdge(skill).map((r) => decl(r.body, property)).filter(Boolean);
      assert.equal(a.length, 1, `React writes ${property} once on ${react}`);
      assert.equal(b.length, 1, `the skill writes ${property} once on ${skill}`);
      assert.equal(b[0], a[0]);
    });
  }
  test("the hang is min(inset, room), and the room falls back to nothing", () => {
    assert.equal(decl(reactEdge('[data-edge="end"]')[0].body, "--_hang"), "min(var(--_inset), var(--basalt-edge-room-end, var(--basalt-edge-room, var(--basalt-space-0))))");
    assert.equal(decl(reactEdge("[data-icon-only][data-edge]")[0].body, "--_inset"), "calc((var(--_drawn) - var(--_glyph)) / 2)");
  });
  test("--_drawn is the button's own size, raised to the tap size in the touch block, on both sides", () => {
    assert.equal(decl(ruleFor(REACT, ".basalt-button").find((r) => decl(r.body, "--_drawn") === "var(--_h)").body, "--_glyph"), "var(--basalt-size-icon-sm)");
    assert.ok(ruleFor(REACT, ".basalt-button").some((r) => decl(r.body, "--_drawn") === "max(var(--_h), var(--basalt-size-tap-min))"));
    const core = SKILL["tools/html-skill/src/core.css"];
    assert.ok(ruleFor(core, ".btn").some((r) => decl(r.body, "--_drawn") === "var(--_h)"));
    assert.ok(ruleFor(core, ".btn").some((r) => decl(r.body, "--_drawn") === "max(var(--_h), var(--basalt-size-tap-min))"));
  });
  test("a glyph drawn at another size sets --_glyph in the same rule", () => {
    assert.equal(decl(ruleFor(REACT, '.basalt-button[data-size="xl"]').find((r) => decl(r.body, "--_glyph")).body, "--_glyph"), "var(--basalt-size-icon-md)");
    assert.equal(decl(ruleFor(SKILL[`${SKILL_DIR}/links.css`], '.links[data-size="20"] .btn')[0].body, "--_glyph"), "var(--basalt-size-icon-md)");
  });

  const ROOMS = {
    react: [
      [".basalt-sheet-head", "--basalt-edge-room-end"],
      [".basalt-search-form", "--basalt-edge-room"],
      [":is(.basalt-site-header, .basalt-app-header, .basalt-site-menu-band)", "--basalt-edge-room-end"],
      [".basalt-status-bar", "--basalt-edge-room"],
      [".basalt-code-title", "--basalt-edge-room"],
      [".basalt-tabbar-sheet-head", "--basalt-edge-room-end"],
      [".basalt-notifications > :is(.basalt-notifications-head, .basalt-notifications-foot)", "--basalt-edge-room"],
      [".basalt-filter-foot", "--basalt-edge-room"],
      [".basalt-card-content > .basalt-social-links[data-icon-only]", "--basalt-edge-room"],
    ],
    skill: [
      [".sheet-head", "--basalt-edge-room-end"],
      [".search-form", "--basalt-edge-room"],
      [":is(.topbar, .app-header)", "--basalt-edge-room-end"],
      [".sheet-band", "--basalt-edge-room-end"],
      [".code-head", "--basalt-edge-room"],
      [".tab-bar-sheet-head", "--basalt-edge-room-end"],
      [".notifications-head", "--basalt-edge-room"],
      [".notifications-foot", "--basalt-edge-room"],
      [".filter-foot", "--basalt-edge-room"],
      [".panel-head", "--basalt-edge-room"],
      [".page > .section > .section-head", "--basalt-edge-room"],
      [".card > .links[data-icon-only]", "--basalt-edge-room"],
    ],
  };
  for (const [selector, property] of ROOMS.react) {
    test(`React's ${selector} declares ${property}`, () => {
      assert.ok(ruleFor(REACT, selector).some((r) => decl(r.body, property)), `${selector} { ${property}: … }`);
    });
  }
  for (const [selector, property] of ROOMS.skill) {
    test(`the skill's ${selector} declares ${property}`, () => {
      assert.ok(ruleFor(SKILL_ALL, selector).some((r) => decl(r.body, property)), `${selector} { ${property}: … }`);
    });
  }
  test("a head that hangs a control has the same padding on both sides, apart from its insets", () => {
    for (const selector of [".basalt-search-form", ".basalt-filter-foot", ".basalt-notifications-head", ".basalt-notifications-foot"]) {
      const r = ruleFor(REACT, selector)[0];
      assert.equal(parts(decl(r.body, "padding-inline")).length, 1, `${selector}: one inline padding`);
    }
    assert.equal(decl(ruleFor(REACT, ".basalt-sheet-head")[0].body, "padding-inline"), "max(var(--basalt-space-5), var(--_inset-start)) max(var(--basalt-space-5), var(--_inset-end))");
  });

  // Hand-written hangs on a button that are not the edge rule's. The two named here are not the decision's: the drawer's Back (start) and the
  // release's copy (#128, after the decision was measured). They are reported for a ruling and left as they were.
  const NOT_RULED = new Set([".basalt-drawer-back"]);
  test("no component rule hangs a button by a negative inline margin of its own (the terminal's four are gone)", () => {
    const found = [];
    for (const r of rules(REACT)) {
      const named = r.selector.replace(/:not\([^)]*\)/g, "");
      if (!/basalt-button|basalt-terminal-copy|basalt-code-copy|basalt-sheet-close|basalt-search-close/.test(named) || /\[data-edge/.test(r.selector)) continue;
      if (NOT_RULED.has(r.selector)) continue;
      for (const p of ["margin-inline", "margin-inline-end", "margin-inline-start", "margin"]) {
        const v = decl(r.body, p);
        if (v && /calc\(\s*-1|\/\s*-2|-var\(/.test(v)) found.push(`${r.selector} { ${p}: ${v} }`);
      }
    }
    assert.deepEqual(found, []);
    for (const gone of [".basalt-terminal-actions:has(.basalt-button)", ".basalt-terminal-head:has(.basalt-terminal-time) .basalt-terminal-copy"]) {
      assert.ok(ruleFor(REACT, gone).every((r) => !decl(r.body, "margin-inline-end")), `${gone} writes no margin`);
    }
    assert.ok(!/basalt-terminal-copy-compact[^{]*\{[^}]*margin-inline-end/.test(REACT), "the compact copy has no margin of its own");
    assert.ok(ruleFor(SKILL[`${SKILL_DIR}/terminal.css`], ".terminal-actions:has(.btn)").length === 0, "the skill's terminal hang is gone");
  });

  test("the side insets are read by direction: left and right only in the root's own mapping", () => {
    const reads = (css, name) => (css.match(new RegExp(`var\\(${name}\\)`, "g")) ?? []).length;
    assert.equal(reads(REACT, "--_inset-left"), 2, "--_inset-left: the mapping and its right-to-left swap");
    assert.equal(reads(REACT, "--_inset-right"), 2, "--_inset-right: the mapping and its right-to-left swap");
    assert.equal(reads(REACT, "--_pad-left") + reads(REACT, "--_pad-right"), 0, "no --_pad-left or --_pad-right");
    assert.equal(reads(SKILL_ALL, "--bh-inset-left"), 2);
    assert.equal(reads(SKILL_ALL, "--bh-inset-right"), 2);
    assert.equal(reads(SKILL_ALL, "--bh-pad-left") + reads(SKILL_ALL, "--bh-pad-right"), 0);
    assert.ok(/:root:dir\(rtl\)\s*\{\s*--_inset-start:\s*var\(--_inset-right\);\s*--_inset-end:\s*var\(--_inset-left\);/.test(REACT));
    assert.ok(!/env\(safe-area-inset-(?:left|right)/.test(REACT.replace(/--_inset-(?:left|right):\s*env\(safe-area-inset-(?:left|right)[^;]*;/g, "").replace(/\.basalt-toast-viewport\s*\{[^}]*\}/, "")), "every other read of a side inset goes through start and end");
  });
});

describe("Markup", () => {
  const html = (element) => renderToStaticMarkup(element);
  test("MultiSelect's chips head is label, Clear, count, and the count describes the group", () => {
    const out = html(h(B.MultiSelect, { label: "Status", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] }));
    const head = out.match(/<div class="basalt-filter-head">([\s\S]*?)<\/div>/)[1];
    const at = (needle) => head.indexOf(needle);
    assert.ok(at("basalt-filter-label") < at("basalt-filter-clear") && at("basalt-filter-clear") < at("basalt-filter-count"), "label, Clear, count");
    const countId = head.match(/id="([^"]+)" class="basalt-filter-count"/)[1];
    assert.ok(out.includes(`aria-describedby="${countId}"`), "the count is the group's description");
  });
  test("Composer renders its status inside the actions row, and the live region with no status", () => {
    const none = html(h(B.Composer, { label: "Message", onSend() {} }));
    assert.match(none, /<div class="basalt-composer-actions"><div class="basalt-composer-start"><p class="basalt-composer-status" aria-live="polite"><\/p><\/div>/);
    const typing = html(h(B.Composer, { label: "Message", onSend() {}, status: "Ada is typing", actions: h(B.IconButton, { icon: B.PlusGlyph ?? (() => null), label: "Attach" }) }));
    assert.match(typing, /<div class="basalt-composer-start"><div class="basalt-composer-extra">[\s\S]*?<\/div><p class="basalt-composer-status" aria-live="polite">Ada is typing<\/p><\/div>/);
  });
  test("Button with count renders the seat and the pill", () => {
    assert.match(html(h(B.Button, { count: 3 }, "Cart")), /<span class="basalt-button-count" aria-hidden="true"><span>3<\/span><\/span>/);
  });
  test("Button edge on a non-ghost variant renders no data-edge and warns once", () => {
    const warn = console.warn;
    const said = [];
    console.warn = (message) => said.push(message);
    try {
      const out = html(h(B.Button, { variant: "secondary", edge: "end" }, "Go"));
      html(h(B.Button, { variant: "primary", edge: "start" }, "Go"));
      assert.ok(!out.includes("data-edge"));
      assert.equal(said.filter((m) => String(m).includes("`edge`")).length, 1);
    } finally {
      console.warn = warn;
    }
    assert.match(html(h(B.Button, { variant: "ghost", edge: "end" }, "Go")), /data-edge="end"/);
  });
  test("CodeBlock's titled copy, Terminal's copies, SheetHeader's Close, SiteHeader's Menu and SocialLinks' first mark carry data-edge", () => {
    assert.match(html(h(B.CodeBlock, { code: "x", title: "config" })), /data-edge="end"[^>]*class="basalt-button"|class="basalt-code-copy"><button[^>]*data-edge="end"/);
    assert.ok(!html(h(B.CodeBlock, { code: "x" })).includes("data-edge"), "the untitled corner copy is not hung");
    const terminal = html(h(B.Terminal, { title: "Deploy", lines: [{ kind: "command", text: "ls" }] }));
    assert.match(terminal, /data-edge="end" class="basalt-button basalt-terminal-copy"/);
    assert.match(terminal, /data-edge="end" class="basalt-button basalt-terminal-copy-compact"/);
    assert.match(html(h(B.Sheet, { open: true }, h(B.SheetHeader, { closeLabel: "Close" }, "Cart"))), /data-edge="end" class="basalt-button basalt-sheet-close"/);
    assert.match(html(h(B.SiteHeader, { brand: "Orbit", links: [{ href: "/", label: "Home" }] })), /data-edge="end" class="basalt-dialog-trigger basalt-button basalt-site-menu-trigger"/);
    const social = html(h(B.SocialLinks, { iconOnly: true, "aria-label": "Elsewhere" }, h(B.SocialLink, { service: "github", href: "#a" }, "GitHub"), h(B.SocialLink, { service: "github", href: "#b" }, "Mirror")));
    assert.equal((social.match(/data-edge="start"/g) ?? []).length, 1, "only the first mark is hung");
  });
  test("the popups that cannot render on a server hang their controls in source: the search's Close, the notification popup, the checklist foot, the More sheet", () => {
    const src = (file) => read(`packages/react/src/${file}`);
    assert.match(src("search.tsx"), /label=\{closeLabel\} edge="end" className="basalt-search-close"/);
    const notifications = src("notifications.tsx");
    assert.match(notifications, /<MarkAllRead unread=\{unread\} onMarkAllRead=\{onMarkAllRead\} edge="end" \/>/);
    assert.match(notifications, /<ClearAll count=\{entries.length\} onClearAll=\{onClearAll\} edge="start" \/>/);
    assert.match(notifications, /data-size="sm" data-edge="end" href=\{viewAllHref\}/);
    assert.match(src("filter.tsx"), /clear: clearAt\("end"\)/);
    assert.match(src("tab-bar.tsx"), /label=\{`Close \$\{label.toLowerCase\(\)\}`\} edge="end"/);
  });
  test("StatusBar hangs a ghost first in start (or in sources with no start) and last in end, in both layouts' markup", () => {
    const ghost = (words) => h(B.Button, { variant: "ghost", size: "sm" }, words);
    const both = html(h(B.StatusBar, { start: ghost("run 4f2a"), sources: ghost("2 sources"), end: ghost("Theme") }));
    assert.deepEqual(both.match(/data-edge="\w+"/g), ['data-edge="start"', 'data-edge="end"']);
    const noSources = html(h(B.StatusBar, { start: ghost("run 4f2a"), end: ghost("Theme") }));
    assert.deepEqual(noSources.match(/data-edge="\w+"/g), ['data-edge="start"', 'data-edge="end"'], "the markup is the same; under 720 the stylesheet gives end no room");
    assert.ok(/\.basalt-status-bar:not\(:has\(> \.basalt-status-bar-sources\)\) > \.basalt-status-bar-end \{ --basalt-edge-room: initial; --basalt-edge-room-end: initial; \}/.test(REACT));
    const sourcesFirst = html(h(B.StatusBar, { sources: ghost("2 sources") }));
    assert.match(sourcesFirst, /data-edge="start"/);
    const drawn = html(h(B.StatusBar, { start: h(B.Button, { variant: "secondary", size: "sm" }, "run") }));
    assert.ok(!drawn.includes("data-edge"), "a drawn button sits on the line with its edge");
  });
  test("CommandList holds room only on the open page: a level-1 panel with reserve", () => {
    const groups = [{ label: "Run", commands: [{ id: "a", label: "Deploy" }] }];
    assert.match(html(h(B.CommandList, { label: "Console", groups })), /class="basalt-command-host" data-reserve=""/);
    assert.ok(!html(h(B.CommandList, { label: "Console", groups, reserve: false })).includes("data-reserve"));
    assert.ok(!html(h(B.Card, null, h(B.CardContent, null, h(B.CommandList, { label: "Console", groups })))).includes("data-reserve"), "inside a card (level 2) it holds no room");
  });
});

describe("The legend's forms", () => {
  const text = (v) => `${v} min`;
  test("a series that can be missing reserves 'Not observed' and never a reason", () => {
    const forms = legendForms([12, null, 140], 3, text);
    assert.ok(forms.includes("Not observed"));
    assert.ok(forms.every((f) => !f.includes("·")), "no form carries a reason");
    assert.deepEqual(forms, ["00 min", "000 min", "Not observed"]);
  });
  test("a series with every day observed does not reserve 'Not observed'", () => {
    assert.ok(!legendForms([1, 2, 3], 3, text).includes("Not observed"));
  });
});

describe("The copy", () => {
  test("Terminal's words form keeps its words and draws its glyph through the same seat as the icon-only form", () => {
    const out = renderToStaticMarkup(h(B.Terminal, { title: "Deploy", lines: [{ kind: "command", text: "ls" }] }));
    const words = out.match(/<button[^>]*basalt-terminal-copy"[^>]*>([\s\S]*?)<\/button>/)[1];
    const compact = out.match(/<button[^>]*basalt-terminal-copy-compact"[^>]*>([\s\S]*?)<\/button>/)[1];
    assert.match(words, /class="basalt-button-swap"/, "the words form has the done seat");
    assert.match(compact, /class="basalt-button-swap"/, "the icon-only form has the same seat");
    assert.match(words, /Copy commands/);
    assert.ok(!words.includes("Copied"), "no 'Copied' in the button: the words hold");
  });
  test("CopyButton of words alone is unchanged: both words in one Reserve cell", () => {
    const out = renderToStaticMarkup(h(B.CopyButton, { text: "x" }, "Copy address"));
    assert.match(out, /class="basalt-reserve basalt-copy-words"/);
  });
  test("the skill's copy timers read the confirm token, and the glyph form keeps its words", () => {
    const copy = read(`${SKILL_DIR}/copy.js`);
    assert.ok(!/\b1600\b/.test(copy), "no hand-written 1600");
    assert.equal((copy.match(/%duration-confirm%/g) ?? []).length, 2);
    assert.ok(!/'Copy failed' \+ '<\/span>'|'<span>' \+ \(ok \? 'Copied'/.test(copy), "the words are not replaced");
    const terminal = read(`${SKILL_DIR}/terminal.js`);
    assert.ok(!terminal.includes("swap('Copy commands'"), "the terminal's copy words are not a swap cell");
    assert.match(terminal, /'Copy failed'/);
  });
});
