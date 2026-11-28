// Micro-details m2 (text, type and locale; DECISIONS 419, micro-details/m2/decision.md): tabular figures on badges and times, balanced titles and pretty
// descriptions with the clamp kept, curly apostrophes in the five fixed sentences, no ligatures wherever the mono family is set, hanging quotes on block
// quotes only, the glue (U+00A0) the formatters write, formatNumber, formatAge's locale, DateAge's short seat in every language, NumberTicker's locale,
// translate="no" on code, keys and names, and the notification row's time. Node checks first (the sources and the built package), then Chromium against the
// built package and its stylesheet. Synthetic data in two unlike domains (a tide gauge and a bakery).
// Tests are paused (DECISIONS 359): written with the batch, not run.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, pkg, settle } from "./support.mjs";
import { ageSeat, formatAge, formatClock, formatCountdown, formatDay, formatElapsed, formatStatTime, formatUntil } from "../dist/time-format.js";
import { formatNumber, keptNumberFormats } from "../dist/number-format.js";
import { formatRunTime } from "../dist/run-format.js";
import { formatReleaseDate } from "../dist/release-date.js";

const NB = "\u00a0";
const read = (...p) => fs.readFileSync(path.join(...p), "utf8");
const repo = path.join(pkg, "..", "..");
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Every rule block of a sheet, as [selector, body], with @media and @layer opened (a nested block's own rules are listed, never the wrapper). */
function rules(css) {
  const out = [];
  const text = strip(css);
  const walk = (s) => {
    let i = 0;
    while (i < s.length) {
      const open = s.indexOf("{", i);
      if (open < 0) return;
      const head = s.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      while (j < s.length && depth) { if (s[j] === "{") depth += 1; else if (s[j] === "}") depth -= 1; j += 1; }
      const body = s.slice(open + 1, j - 1);
      if (head.startsWith("@") || /\{/.test(body)) walk(body);
      else out.push([head.replace(/^[;}\s]+/, ""), body]);
      i = j;
    }
  };
  walk(text);
  return out;
}
const setsMono = (body) => /(?:^|;)\s*font(?:-family)?\s*:[^;]*var\(--(?:basalt-font-family-mono|bh-[a-z]+-mono)\)/.test(body);

// ---- Node: the sources and the built package

describe("T5: every rule that sets the mono family also sets font-variant-ligatures: none", () => {
  const sheets = [
    path.join(pkg, "src", "styles", "components.css"),
    path.join(repo, "tools", "html-skill", "src", "core.css"),
    ...fs.readdirSync(path.join(repo, "tools", "html-skill", "src", "modules")).filter((f) => f.endsWith(".css")).map((f) => path.join(repo, "tools", "html-skill", "src", "modules", f)),
  ];
  for (const file of sheets) {
    test(path.relative(repo, file), () => {
      const missing = rules(read(file)).filter(([, body]) => setsMono(body) && !/font-variant-ligatures\s*:\s*none/.test(body.slice(body.search(/font(?:-family)?\s*:[^;]*-mono\)/)))).map(([sel]) => sel);
      assert.deepEqual(missing, [], "a rule sets the mono family without font-variant-ligatures: none after it");
    });
  }
  test("never font-feature-settings for ligatures or figures", () => {
    for (const file of sheets) assert.doesNotMatch(strip(read(file)), /font-feature-settings\s*:[^;]*(?:liga|calt|tnum)/, path.relative(repo, file));
  });
});

describe("T1, T2, T5 and T6 in the sources", () => {
  const css = strip(read(pkg, "src", "styles", "components.css"));
  const core = strip(read(repo, "tools", "html-skill", "src", "core.css"));
  test("the badge, and a time in prose and rich text, take tabular figures; the skill's time, .badge and .status too", () => {
    assert.match(css, /\.basalt-badge\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
    assert.match(css, /\.basalt-prose :where\(time\), \.basalt-rich-text :where\(time\)\s*\{\s*font-variant-numeric:\s*tabular-nums/);
    assert.match(core, /(?:^|\})\s*time\s*\{\s*font-variant-numeric:\s*tabular-nums/);
    const status = strip(read(repo, "tools", "html-skill", "src", "modules", "status.css"));
    assert.match(status, /\.status\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
    assert.match(status, /\.badge\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
    assert.doesNotMatch(core, /\[data-tabular\]/, ".num stays the one opt-in class");
  });
  test("the clamp's base rule sets text-wrap: wrap and the one-line rule comes after it, in React and the skill", () => {
    const react = css.indexOf(".basalt-text[data-lines] { display: block; min-width: 0; overflow: hidden; text-wrap: wrap; }");
    assert.ok(react > 0 && react < css.indexOf('.basalt-text[data-lines="1"] {'));
    const skill = core.indexOf("[data-lines] { display: block; min-width: 0; overflow: hidden; text-wrap: wrap;");
    assert.ok(skill > 0 && skill < core.indexOf('[data-lines="1"] {'));
    assert.doesNotMatch(css + core, /text-wrap-style|text-wrap-mode/, "the shorthand only: the longhands are above the floor");
  });
  test("hanging punctuation is on block quotes only, never last, never a paragraph", () => {
    const hung = rules(css + core + strip(read(repo, "tools", "html-skill", "src", "modules", "rich-text.css"))).filter(([, b]) => /hanging-punctuation/.test(b)).map(([s]) => s).sort();
    assert.deepEqual(hung, [".basalt-rich-text :where(blockquote):not([data-lines])", ".basalt-stream-quote-text", ".prose blockquote", ".rich-text :where(blockquote)"].sort());
    assert.doesNotMatch(css + core, /hanging-punctuation\s*:[^;]*last/);
  });
  test("components.css sets no smoothing; the skill's core sets it by theme and keeps optimizeLegibility", () => {
    assert.doesNotMatch(css, /font-smoothing/);
    assert.match(core, /:where\(\[data-theme="dark"\], \.dark\)\s*\{\s*-webkit-font-smoothing:\s*antialiased;\s*-moz-osx-font-smoothing:\s*grayscale;\s*\}/);
    assert.match(core, /:where\(\[data-theme="light"\], \.light\)\s*\{\s*-webkit-font-smoothing:\s*auto;\s*-moz-osx-font-smoothing:\s*auto;\s*\}/);
    assert.match(core, /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\):not\(\.light\)\s*\{\s*-webkit-font-smoothing:\s*antialiased;/);
    assert.match(core, /text-rendering:\s*optimizeLegibility/);
  });
});

describe("T3: the five fixed sentences", () => {
  const SENTENCES = [
    ["packages/react/src/command.tsx", "Couldn’t load commands."],
    ["packages/react/src/command.tsx", "Still couldn’t load commands. Reloading the page usually fixes this."],
    ["tools/html-skill/src/modules/diagram-export.js", "This page’s security policy blocks the PNG. Download SVG still works."],
    ["packages/react/src/diagram-schedule.ts", "Finish to start, no lag, no calendar. A box’s width is not its length."],
    ["packages/react/src/diagram-core.ts", "in the author’s order"],
  ];
  for (const [file, sentence] of SENTENCES) {
    test(`${file}: "${sentence}"`, () => {
      assert.ok(sentence.includes("’") && !sentence.includes("'"));
      assert.ok(read(repo, file).includes(sentence), "the source writes it with U+2019");
      assert.ok(!read(repo, file).includes(sentence.replaceAll("’", "'")), "and never with U+0027");
    });
  }
  test("the composed skill writes the same sentences", () => {
    const parts = path.join(repo, ".agent", "skills", "basalt-html", "parts");
    assert.ok(read(parts, "diagram-export.js").includes(SENTENCES[2][1]));
    assert.ok(read(parts, "diagram-schedule.js").includes("A box’s width is not its length."));
    assert.ok(read(parts, "diagram.js").includes("in the author’s order`"));
  });
});

describe("T8: the glue", () => {
  const now = Date.UTC(2026, 10, 12, 12);
  test("formatDay and formatStatTime glue month and day; the space before a year and after a comma stays; dateTime does not change", () => {
    assert.deepEqual(formatDay(Date.UTC(2026, 10, 4), { now, timeZone: "UTC" }), { text: `Nov${NB}4`, dateTime: "2026-11-04" });
    assert.equal(formatDay(Date.UTC(2025, 0, 4), { now, timeZone: "UTC" }).text, `Jan${NB}4, 2025`);
    assert.equal(formatDay(Date.UTC(2026, 10, 4), { now, timeZone: "UTC", locale: "en-GB" }).text, `4${NB}Nov`);
    assert.deepEqual(formatStatTime(Date.UTC(2026, 10, 7, 8, 2), { now, timeZone: "UTC" }), { text: `Nov${NB}7, 8:02${NB}AM`, dateTime: "2026-11-07T08:02" });
    assert.equal(formatStatTime(Date.UTC(2025, 10, 7, 8, 2), { now, timeZone: "UTC" }).text, `Nov${NB}7, 2025, 8:02${NB}AM`);
  });
  test("under fr-FR, de-DE and ar-EG, Intl's own separators and marks are kept: only a breakable U+0020 between month and day is turned", () => {
    for (const locale of ["fr-FR", "de-DE", "ar-EG"]) {
      const at = new Date(Date.UTC(2025, 0, 4));
      const intl = new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).formatToParts(at);
      const ours = formatDay(at, { now, timeZone: "UTC", locale }).text;
      // Every character Intl wrote is there, in order, except a U+0020 between the month and the day, which is U+00A0.
      const expected = intl.map((p, i) => (p.type === "literal" && ["month", "day"].includes(intl[i - 1]?.type) && ["month", "day"].includes(intl[i + 1]?.type) ? p.value.replace(/ /g, NB) : p.value)).join("");
      assert.equal(ours, expected, locale);
      for (const mark of ["\u202f", "\u200f", "\u200e", ","]) assert.equal(ours.split(mark).length, intl.map((p) => p.value).join("").split(mark).length, `${locale} keeps ${JSON.stringify(mark)}`);
    }
  });
  test("an age's number is glued to its unit; just now is as it was", () => {
    assert.equal(formatAge(now - 11 * 86400_000, now), `11${NB}days ago`);
    assert.equal(formatAge(now - 30_000, now), "just now");
    assert.equal(formatAge(now - 11 * 86400_000, now, { short: true }), "11d");
  });
  test("a length glues each value to its unit, and the space between two pairs stays breakable", () => {
    assert.equal(formatElapsed(now - 65 * 60_000, now).text, `1${NB}hr 5${NB}min`);
    assert.equal(formatElapsed(now - 3 * 86400_000, now).text, `3${NB}days`);
    assert.equal(formatUntil(now + 12 * 60_000 + 41_000, now).text, `in 12${NB}min`);
    assert.equal(formatUntil(now + 30_000, now).text, `in under 1${NB}min`);
    assert.equal(formatUntil(now + 2 * 3600_000 + 15 * 60_000, now).text, `in 2${NB}hr 15${NB}min`);
    assert.equal(formatCountdown(now + 18 * 86400_000 + 9 * 3600_000 + 10 * 60_000 + 51_000, now).text, `18d${NB}09:10:51`);
    assert.equal(formatRunTime(12_345).text, `12.3${NB}s`);
    assert.equal(formatRunTime(754_000).text, `12${NB}min 34${NB}s`);
    assert.equal(formatRunTime(45_240_000).text, `12${NB}hr 34${NB}min`);
    assert.equal(formatRunTime(0, "minute").text, `<1${NB}min`);
    assert.equal(formatRunTime(0, "minute").spoken, "less than 1 minute", "spoken forms do not change");
  });
  test("a release date glues month and day, and keeps the year breakable", () => {
    assert.equal(formatReleaseDate("2026-11-23"), `Nov${NB}23, 2026`);
    assert.equal(formatReleaseDate("not a date"), "not a date");
  });
  test("a clock keeps its own glue (DECISIONS 208)", () => {
    assert.match(formatClock(Date.UTC(2026, 10, 7, 18, 42), { timeZone: "UTC" }).text, /^6:42\u00a0PM$/);
  });
});

describe("I3: formatNumber", () => {
  test("en-US by default, never the runtime's", () => {
    assert.equal(formatNumber(1234.5), "1,234.5");
    assert.equal(formatNumber(1234.5, { locale: "de-DE" }), "1.234,5");
  });
  test("a unit, a currency and a compact suffix are glued to the number; other separators are Intl's", () => {
    assert.equal(formatNumber(10, { style: "unit", unit: "megabyte" }), `10${NB}MB`);
    assert.equal(formatNumber(1200, { notation: "compact", compactDisplay: "long" }), `1.2${NB}thousand`);
    assert.equal(formatNumber(12, { style: "currency", currency: "USD", currencyDisplay: "code" }), `USD${NB}12.00`);
    assert.equal(formatNumber(12, { style: "currency", currency: "EUR", locale: "fr-FR" }), new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(12), "a U+202F Intl writes is kept");
  });
  test("the kept formatters are bounded at 64", () => {
    for (let i = 0; i < 200; i += 1) formatNumber(i, { minimumFractionDigits: i % 21 > 20 ? 0 : i % 21, maximumFractionDigits: 20, locale: i % 2 ? "en-US" : "en-GB" });
    assert.ok(keptNumberFormats() <= 64, `${keptNumberFormats()} kept`);
  });
});

describe("I3: formatAge's locale", () => {
  const now = Date.UTC(2026, 10, 12, 12);
  const ago = (s, options) => formatAge(now - s * 1000, now, options);
  test("en, en-GB and en-US write Basalt's own words", () => {
    for (const locale of ["en", "en-GB", "en-US", ["en-AU", "fr"]]) {
      assert.equal(ago(30, { locale }), "just now");
      assert.equal(ago(86400 * 11, { locale }), `11${NB}days ago`);
      assert.equal(ago(30, { locale, short: true }), "now");
      assert.equal(ago(86400 * 11, { locale, short: true }), "11d");
    }
  });
  test("fr and ru go through Intl.RelativeTimeFormat, long and narrow, with the same branches", () => {
    for (const locale of ["fr", "ru"]) {
      for (const short of [false, true]) {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: short ? "narrow" : "long" });
        const glue = (t) => t.replace(/(\p{Nd}) /u, `$1${NB}`);
        assert.equal(ago(30, { locale, short }), rtf.format(0, "second"));
        /** @type {Array<{ s: number, n: number, unit: Intl.RelativeTimeFormatUnit }>} */
        const CASES = [{ s: 120, n: 2, unit: "minute" }, { s: 7200, n: 2, unit: "hour" }, { s: 86400 * 11, n: 11, unit: "day" }, { s: 86400 * 100, n: 3, unit: "month" }, { s: 86400 * 365.25 * 5, n: 5, unit: "year" }, { s: 86400 * 21, n: 21, unit: "day" }, { s: 86400 * 365.25 * 22, n: 22, unit: "year" }];
        for (const { s, n, unit } of CASES) {
          assert.equal(ago(s, { locale, short }), glue(rtf.format(-n, unit)), `${locale} ${short ? "narrow" : "long"} ${n} ${unit}`);
        }
      }
    }
  });
  test("the non-English seat folds every digit to the locale's 8 and dedupes: a few dozen strings, ar-EG's own digits included", () => {
    const ar = ageSeat("ar-EG");
    assert.ok(ar.length < 60, `${ar.length} forms`);
    assert.ok(ar.every((f) => !/[0-79٠-٧٩]/.test(f)), "every digit is an 8");
    assert.ok(ageSeat("id-ID").some((f) => f.includes("888")), "three-digit years are held");
    assert.ok(ageSeat("fr-FR").some((f) => /8\u202f888/.test(f)), "the locale's grouping is held");
    assert.equal(ageSeat("ar-EG"), ar, "made once per locale and kept");
  });
});

// ---- Chromium

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const DESKTOP = { viewport: { width: 1000, height: 800 } };
const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const open = async (body, options = DESKTOP, theme = "dark") => {
  const { page, errors } = await fixturePage(browser, body, { theme, standards: true, ...options });
  await page.addStyleTag({ content: "body { background: var(--basalt-surface-page); color: var(--basalt-text-primary); margin: 0; padding: 24px; }" });
  await settle(page);
  return { page, errors };
};
const computed = (page, selector, prop) => page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s))[p], [selector, prop]);

for (const theme of ["dark", "light"]) {
  describe(`T1 and T2 computed (${theme})`, () => {
    test("tabular figures on a badge and on a time in Prose and RichText; a sentence keeps proportional figures", async () => {
      const { page } = await open(render(`<div>
        <B.Badge id="badge" status="success">11 loaves</B.Badge>
        <B.Prose><p id="prose-p">High tide at <time id="prose-time" dateTime="2026-11-04T06:42">6:42 AM</time>, 1.8 m.</p></B.Prose>
        <B.RichText><p>Proofed at <time id="rich-time" dateTime="2026-11-04T05:10">5:10 AM</time>.</p></B.RichText>
      </div>`), DESKTOP, theme);
      assert.equal(await computed(page, "#badge", "fontVariantNumeric"), "tabular-nums");
      assert.equal(await computed(page, "#prose-time", "fontVariantNumeric"), "tabular-nums");
      assert.equal(await computed(page, "#rich-time", "fontVariantNumeric"), "tabular-nums");
      assert.equal(await computed(page, "#prose-p", "fontVariantNumeric"), "normal");
      await page.close();
    });

    test("titles are balanced and descriptions pretty; a one-line cut in Prose and RichText stays nowrap and one line, a clamp is wrap; the opened peek is unchanged", async () => {
      const LONG = "Tide tables for the outer harbour and the north breakwater gauge, read every six minutes and kept for a year";
      const { page } = await open(render(`<div style={{ width: 360 }}>
        <B.Heading id="heading" level={2} size="lg">${LONG}</B.Heading>
        <B.Card><B.CardTitle id="card-title">${LONG}</B.CardTitle><B.CardDescription id="card-desc">${LONG}</B.CardDescription></B.Card>
        <h2 id="dialog-title" className="basalt-dialog-title">${LONG}</h2><p id="dialog-desc" className="basalt-dialog-description">${LONG}</p>
        <B.EmptyState title="${LONG}" description="${LONG}" />
        <B.Text id="para">${LONG}</B.Text>
        <B.Text id="mono" mono>${LONG}</B.Text>
        <B.Prose><B.Text id="prose-one" lines={1}>${LONG}</B.Text><p><span><B.Text as="span" id="prose-span-one" lines={1}>${LONG}</B.Text></span></p></B.Prose>
        <B.RichText><p><B.Text as="span" id="rich-one" lines={1}>${LONG}</B.Text></p><B.Text id="rich-three" lines={3}>${LONG} ${LONG}</B.Text></B.RichText>
        <B.Text id="three" lines={3}>${LONG} ${LONG}</B.Text>
      </div>`), DESKTOP, theme);
      for (const id of ["heading", "card-title", "dialog-title"]) assert.equal(await computed(page, `#${id}`, "textWrap"), "balance", id);
      assert.equal(await computed(page, ".basalt-empty-state-title", "textWrap"), "balance");
      for (const id of ["card-desc", "dialog-desc", "para"]) assert.equal(await computed(page, `#${id}`, "textWrap"), "pretty", id);
      assert.equal(await computed(page, ".basalt-empty-state-description", "textWrap"), "pretty");
      assert.equal(await computed(page, "#mono", "textWrap"), "wrap", "mono text keeps the browser's wrap");
      for (const id of ["prose-one", "prose-span-one", "rich-one"]) {
        assert.match(await computed(page, `#${id}`, "textWrap"), /^nowrap/, `${id} keeps nowrap`);
        const lines = await page.evaluate((s) => { const el = document.querySelector(s); return Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)); }, `#${id}`);
        assert.equal(lines, 1, `${id} is one line`);
      }
      for (const id of ["three", "rich-three"]) assert.equal(await computed(page, `#${id}`, "textWrap"), "wrap", `${id}: a clamp takes no balance or pretty`);
      await page.close();
    });

    test("U+00A0 and U+0020 measure the same in Geist and Geist Mono, so a seat written with the glue is the width it was", async () => {
      const { page } = await open(render(`<div><span id="sans">12 min 34 s</span></div>`), DESKTOP, theme);
      await page.evaluate(() => document.fonts.ready);
      const widths = await page.evaluate(() => {
        const c = document.createElement("canvas").getContext("2d");
        const out = {};
        for (const [name, family] of [["sans", "Geist"], ["mono", "Geist Mono"]]) for (const weight of [400, 500, 600]) {
          c.font = `${weight} 12px "${family}"`;
          out[`${name}${weight}`] = [c.measureText(" ").width, c.measureText("\u00a0").width];
        }
        return out;
      });
      for (const [key, [space, nb]] of Object.entries(widths)) assert.ok(Math.abs(space - nb) < 0.01, `${key}: ${space} and ${nb}`);
      await page.close();
    });
  });
}

describe("I3: DateAge's short seat never moves the text after it", () => {
  const MIN = 60_000;
  const HOUR = 3_600_000;
  const DAY = 86_400_000;
  const YEAR = 365.25 * DAY;
  // Each pair is the last of one form and the first of the next. `time` is fixed and `now` moves, so the date before it is the same text in a pair.
  const time = Date.UTC(2026, 0, 15, 12);
  const PAIRS = [
    ["89 to 90 min", [89 * MIN, 90 * MIN]],
    ["36 h to 2 days", [36 * HOUR - MIN, 36 * HOUR]],
    ["45 days to 1 month", [45 * DAY - HOUR, 45 * DAY]],
    ["18 months to 2 years", [548 * DAY - HOUR * 13, 548 * DAY]],
    ["99 to 100 years", [99 * YEAR, 100 * YEAR]],
    ["999 to 1,000 years", [999 * YEAR, 1000 * YEAR]],
  ];
  for (const locale of ["en-US", "fr-FR", "ru-RU", "ar-EG", "id-ID"]) {
    for (const precision of ["day", "minute"]) {
      test(`${locale}, ${precision}: the seat's width, the date's place and the following text's place stay put`, async () => {
        const rows = PAIRS.flatMap(([, ages], p) => ages.map((age, k) => `<div id="r${p}-${k}" style={{ display: "flex", alignItems: "baseline", gap: 8 }}><B.DateAge short locale="${locale}" precision="${precision}" timeZone="UTC" time={${time}} now={${time + age}} /><span className="after">Gauge 14</span></div>`)).join("");
        const { page } = await open(render(`<div>${rows}</div>`));
        await page.evaluate(() => document.fonts.ready);
        const measure = (id) => page.evaluate((s) => {
          const row = document.getElementById(s);
          return { date: row.querySelector("time").getBoundingClientRect().x, seat: row.querySelector(".basalt-date-age-seat").getBoundingClientRect().width, after: row.querySelector(".after").getBoundingClientRect().x };
        }, id);
        for (let p = 0; p < PAIRS.length; p += 1) {
          const [a, b] = [await measure(`r${p}-0`), await measure(`r${p}-1`)];
          assert.equal(b.date, a.date, `${PAIRS[p][0]}: the date does not move`);
          assert.equal(b.seat, a.seat, `${PAIRS[p][0]}: the seat holds (${a.seat} to ${b.seat})`);
          assert.equal(b.after, a.after, `${PAIRS[p][0]}: the text after it does not move`);
        }
        await page.close();
      });
    }
  }
  test("ar-EG's seat is a few dozen alternatives, not hundreds; English keeps its approved 548mo", async () => {
    const { page } = await open(render(`<div><B.DateAge id="ar" short locale="ar-EG" time={${time}} now={${time + 3 * DAY}} /><B.DateAge id="en" short time={${time}} now={${time + 3 * DAY}} /></div>`));
    const counts = await page.evaluate(() => [...document.querySelectorAll(".basalt-date-age-seat")].map((s) => [s.children.length, [...s.children].map((c) => c.textContent)]));
    assert.ok(counts[0][0] < 60, `${counts[0][0]} alternatives`);
    assert.deepEqual(counts[1], [2, ["3d", "548mo"]]);
    await page.close();
  });
});

describe("I3: NumberTicker's locale", () => {
  test("de-DE rolls its ASCII digits and draws . and , still; ar-EG draws its digits still; a selection copies the number once", async () => {
    const { page } = await open(render(`<p id="line">Flour used: <B.NumberTicker value={1234.5} locale="de-DE" /> kg, loaves: <B.NumberTicker value={1234} locale="ar-EG" />.</p>`));
    const tickers = await page.evaluate(() => [...document.querySelectorAll(".basalt-ticker")].map((t) => ({ text: t.querySelector(".basalt-ticker-text").textContent, digits: t.querySelectorAll(".basalt-ticker-digit").length, marks: [...t.querySelectorAll(".basalt-ticker-char")].map((c) => c.dataset.ch) })));
    assert.deepEqual(tickers[0], { text: "1.234,5", digits: 5, marks: [".", ","] });
    assert.equal(tickers[1].text, new Intl.NumberFormat("ar-EG").format(1234));
    assert.equal(tickers[1].digits, 0, "no Arabic-Indic digit rolls");
    assert.equal(tickers[1].marks.join(""), tickers[1].text, "each is a still mark");
    const copied = await page.evaluate(() => { const r = document.createRange(); r.selectNodeContents(document.getElementById("line")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return s.toString(); });
    assert.equal(copied.split("1.234,5").length - 1, 1, copied);
    await page.close();
  });
  test("a format given wins over the locale; the default is en-US", async () => {
    const { page } = await open(render(`<div><B.NumberTicker value={1234.5} /><B.NumberTicker value={1234.5} locale="de-DE" format={(v) => v.toFixed(1)} /></div>`));
    const texts = await page.evaluate(() => [...document.querySelectorAll(".basalt-ticker-text")].map((t) => t.textContent));
    assert.deepEqual(texts, ["1,234.5", "1234.5"]);
    await page.close();
  });
  test("under reduced motion it is plain text", async () => {
    const { page } = await open(render(`<p><B.NumberTicker value={1234.5} locale="de-DE" /></p>`), { ...DESKTOP, reducedMotion: "reduce" });
    assert.equal(await computed(page, ".basalt-ticker-visual", "display"), "none");
    assert.notEqual(await computed(page, ".basalt-ticker-text", "color"), "rgba(0, 0, 0, 0)");
    await page.close();
  });
});

describe('I3: translate="no"', () => {
  test("on code, the transcript, inline code, the command, each key chip, the product's name and a mono value; never the spoken words or the missing words", async () => {
    const { page } = await open(render(`<div>
      <B.CodeBlock title="Proof the dough" code="bake --loaves 12" language="text" />
      <B.Terminal title="Tide gauge" lines={[{ kind: "command", text: "gauge read --station 14" }]} />
      <B.InlineCode id="inline">--resume</B.InlineCode>
      <B.InlineCode id="inline-yes" translate="yes">--resume</B.InlineCode>
      <B.CommandBlock id="cmd" command="oven set 220" status="allowed" />
      <B.Kbd id="kbd">Mod+K</B.Kbd>
      <B.Kbd id="kbd-node"><span>Esc</span></B.Kbd>
      <B.AppBrand id="brand" mark={<span />} title="Harbour Gauge" subtitle="North breakwater" />
      <table><tbody><tr><B.TableCell id="cell" mono>gauge-14</B.TableCell><B.TableCell id="cell-missing" mono notObserved /><B.TableCell id="cell-yes" mono translate="yes">gauge-15</B.TableCell></tr></tbody></table>
      <B.DescriptionList><B.DescriptionItem id="dd" term="Station" mono>gauge-14</B.DescriptionItem><B.DescriptionItem id="dd-missing" term="Probe" mono missing /></B.DescriptionList>
    </div>`));
    const attr = (s) => page.evaluate((sel) => document.querySelector(sel)?.getAttribute("translate") ?? null, s);
    assert.equal(await attr(".basalt-code .basalt-code-pre"), "no");
    assert.equal(await attr(".basalt-code .basalt-code-title"), null, "the caption translates");
    assert.equal(await attr(".basalt-terminal .basalt-code-pre, figure:has(.basalt-terminal-hint) pre, .basalt-code-pre[aria-label$='transcript']"), "no");
    assert.equal(await attr("#inline"), "no");
    assert.equal(await attr("#inline-yes"), "yes", "a caller's translate wins");
    assert.equal(await attr("#cmd .basalt-command-block-command"), "no");
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll("#kbd .basalt-kbd-key, #kbd-node .basalt-kbd-key")].map((k) => k.getAttribute("translate"))).then((v) => [...new Set(v)]), ["no"]);
    assert.equal(await attr("#kbd"), null, "the outer kbd translates, so its spoken words do");
    assert.equal(await attr("#kbd .basalt-visually-hidden"), null);
    assert.equal(await attr("#brand .basalt-app-lockup-title"), "no");
    assert.equal(await attr("#brand .basalt-app-lockup-subtitle"), null, "the subtitle translates");
    assert.equal(await attr("#cell"), "no");
    assert.equal(await attr("#cell-missing"), null, "Not observed translates");
    assert.equal(await attr("#cell-yes"), "yes");
    assert.equal(await attr("#dd .basalt-description-details"), "no");
    assert.equal(await attr("#dd-missing .basalt-description-details"), null);
    await page.close();
  });
});

describe("I3: the notification row's time", () => {
  test("an absolute time in the row, in its one name, and never a title", async () => {
    const { page } = await open(render(`<B.NotificationCentre defaultOpen entries={[{ id: "a", title: "Proofing finished", description: "Rye, oven two", time: "4:41\\u00a0AM", dateTime: "2026-11-04T04:41", unread: true }, { id: "b", title: "Tide gauge read", time: "Nov\\u00a07", dateTime: "2026-11-07" }]} />`));
    await page.waitForSelector(".basalt-notification-time");
    const times = await page.evaluate(() => [...document.querySelectorAll(".basalt-notification-time")].map((t) => ({ text: t.textContent, title: t.getAttribute("title"), inName: (t.closest("a, button")?.textContent ?? "").includes(t.textContent) })));
    assert.deepEqual(times, [{ text: "4:41\u00a0AM", title: null, inName: true }, { text: "Nov\u00a07", title: null, inName: true }]);
    await page.close();
  });
  test("the doc comment and the skill's usage write absolute times, never \"2m ago\"", () => {
    assert.doesNotMatch(read(pkg, "src", "notifications.tsx"), /"2m ago"/);
    assert.doesNotMatch(read(repo, "tools", "html-skill", "src", "usage", "notifications.md"), /2m ago/);
  });
});
