// The motion rules as the docs say them (DECISIONS 136 and 139): docs/foundations.md, docs/motion.md and AGENTS.md carry the one sentence for loops, the three
// tokens, each new section with its status line, and no longer say "nothing loops except spinners". foundations wins where the files disagree.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const flat = (text) => text.replace(/\s+/g, " ");
const foundations = flat(read("docs/foundations.md"));
const motion = flat(read("docs/motion.md"));
const agents = flat(read("AGENTS.md"));

const SENTENCE = "Two kinds of thing loop, and nothing else: a mark that says work is running (the ring, braille, a busy Button's ring, a busy TextButton's underline, the indeterminate Progress bar, Sparkline's loading line, Skeleton's pulse and a written field's fill), and a page's one ambient loop, opacity only, in its art; `data-loops=\"held\"` stops both.";

test("the one sentence for loops is in foundations and in AGENTS.md, and the three older wordings are gone", () => {
  assert.ok(foundations.includes(SENTENCE), "foundations");
  assert.ok(agents.includes(SENTENCE), "AGENTS.md");
  for (const [name, text] of [["foundations", foundations], ["motion", motion], ["AGENTS.md", agents]]) {
    assert.ok(!/Nothing loops except spinners/.test(text), `${name}: the old sentence`);
    assert.ok(!/Nothing overshoots or loops, except spinners/.test(text), `${name}: the old sentence`);
    assert.ok(!/no shimmer \(nothing loops\)/.test(text), `${name}: the old framed-art wording`);
    assert.ok(!/stage art never animates/.test(text), `${name}: the old stage-art wording`);
  }
});

test("the three tokens are in the tables, with their reduced-motion values", () => {
  for (const [name, text] of [["foundations", foundations], ["motion", motion]]) {
    assert.ok(text.includes("| `duration-figure` | 600ms |"), `${name}: duration-figure`);
    assert.ok(/`duration-stagger` is 22ms/.test(text), `${name}: duration-stagger`);
    assert.ok(/`duration-loop-ambient` 6000ms/.test(text), `${name}: duration-loop-ambient`);
    assert.ok(/`duration-figure` are 100ms/.test(text) && /`duration-stagger` is 0/.test(text), `${name}: reduced motion`);
  }
  assert.ok(/\| `ease-in-out` \|[^|]*\|[^|]*traveller crossing a figure/.test(foundations) && /traveller crossing a figure/.test(motion), "the curve row");
});

test("each new section says what the council decided and the owner approved, and that the build hasn't been reviewed", () => {
  const status = "Status: decided by the council (DECISIONS 136) and approved by the owner (DECISIONS 139); the implementation hasn't been reviewed.";
  for (const lead of ["**The entrance.**", "**Travel.**", "**An ambient loop.**", "**Items that move to their places.**", "**A number beside a figure**"]) {
    const at = foundations.indexOf(lead);
    assert.ok(at >= 0, `foundations has ${lead}`);
    assert.ok(foundations.slice(at, at + 3000).includes(status), `${lead} carries its status line`);
  }
  for (const heading of ["## Items that move to their places", "## The entrance", "## Travel", "## The ambient loop"]) {
    const at = motion.indexOf(heading);
    assert.ok(at >= 0, `motion has ${heading}`);
    assert.ok(motion.slice(at, at + 4000).includes(status), `${heading} carries its status line`);
  }
});

test("the rules say what was decided: the leg lengths, the 48-item bound, the hold, the control's name and its description", () => {
  for (const text of [foundations, motion]) {
    assert.ok(/a leg is `duration-slower` up to 150px, 2ms a pixel above(?: that)?, and `duration-figure` from 300px/.test(text));
    assert.ok(/past 48/.test(text));
    assert.ok(/third lands the oldest at once/.test(text));
    assert.ok(/100ms fade/.test(text));
  }
  assert.ok(foundations.includes("Moving art and spinners hold still. Your work keeps running."));
  assert.ok(!foundations.includes("Spinners hold still and timers show when work started. Your work keeps running."));
  assert.ok(/`LoopsToggle`, in the form the place needs, with the fixed name "Pause animations"/.test(foundations));
  assert.ok(/The first paint is at rest, unless the chart is its page's one entrance/.test(foundations));
  assert.ok(/unless it is its page's one entrance/.test(motion));
  assert.ok(/A number beside a chart \| At its real value from the first frame/.test(motion));
});

test("the amendment (DECISIONS 143) is in the docs: the menu row, the page change, the hold and print, the bound counting movers, the travel limit", () => {
  assert.ok(!/not drawn again in the narrow menu/.test(foundations), "the old line is gone");
  assert.ok(/the next row, below the band and before the links, is `LoopsToggle`'s Button form/.test(foundations));
  assert.ok(/A page change without a reload counts as a load/.test(foundations) && /markPageChange\(\)/.test(foundations) && /Basalt\.pageChange\(\)/.test(foundations));
  assert.ok(/the hold or printing that arrives while it runs settles it at once/.test(foundations) && /settles it at once, with no new animation/.test(motion));
  assert.ok(/an item that stays where it was is not one/.test(foundations) && /an item that stays where it was is not one/.test(motion));
  assert.ok(/more than 17 legs, 16 stops/.test(foundations) && /more than 17 legs, 16 stops/.test(motion));
  assert.ok(/glides every mark from where it is drawn when a new data set arrives mid-entrance/.test(foundations));
  assert.ok(/The hold or printing settles a running entrance at once, and a page change without a reload counts as a load/.test(agents));
});

test("the second amendment (DECISIONS 148) is in the docs: beforeprint, and the skill's menu row", () => {
  assert.ok(/the browser's own `beforeprint`/.test(foundations) && /the browser's own `beforeprint`/.test(motion));
  assert.ok(/The HTML skill's narrow menu has the same row/.test(foundations));
  assert.ok(/a line along its drawn path and its markers from their drawn centres/.test(motion));
});
