// Round 84: micro-details m2, text, type and locale, built from the council's decision as revised (micro-details/m2/decision.md, DECISIONS 419). Built by Opus;
// the implementation has not been reviewed; the browser tests are written and not run (DECISIONS 359).
//
// Every part that changes a shipped part's pixels leads with before and after. "Before" is main's look drawn again here: the same components, with the
// properties this round adds put back to main's values by a wrapper (`.r84-before`, unlayered review scaffolding, so it beats @layer basalt), or the words
// main wrote (a straight apostrophe, a plain space, "2m ago"). Synthetic content in two unlike domains: a bakery and a tide gauge.

import * as React from "react";

import {
  AppBrand,
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CodeBlock,
  DateAge,
  DescriptionItem,
  DescriptionList,
  EmptyState,
  formatAge,
  formatDay,
  formatElapsed,
  formatNumber,
  formatRunTime,
  formatUntil,
  Heading,
  InlineCode,
  Kbd,
  NotificationList,
  NumberTicker,
  Prose,
  RichText,
  StreamQuote,
  Text,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

declare const __SKILL_PAGES__: Record<string, string>;

const NOT_REVIEWED = "Built from the council's m2 decision as revised (DECISIONS 419); the implementation has not been reviewed. The browser tests are written and not run (DECISIONS 359).";
const label: React.CSSProperties = { margin: "0 0 var(--basalt-space-2)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-secondary)" };
const stack: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--basalt-space-4)", minWidth: 0 };

// Main's values for what this round adds, on everything inside `.r84-before`. Unlayered, so it wins over @layer basalt; review scaffolding only.
const BEFORE_CSS = `
.r84-pair { display: grid; gap: var(--basalt-space-6); grid-template-columns: minmax(0, 1fr); }
@media (min-width: 720px) { .r84-pair { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
.r84-before .basalt-badge, .r84-before .basalt-prose time, .r84-before .basalt-rich-text time { font-variant-numeric: normal; }
.r84-before :is(.basalt-heading, .basalt-app-section-title, .basalt-card-title, .basalt-dialog-title, .basalt-empty-state-title, .basalt-card-description, .basalt-dialog-description, .basalt-empty-state-description, .basalt-callout-text, .basalt-popover-description, p.basalt-text, .basalt-prose p, .basalt-prose li, .basalt-rich-text p, .basalt-rich-text li):not([data-display]) { text-wrap: wrap; }
.r84-before .basalt-rich-text blockquote, .r84-before .basalt-stream-quote-text { hanging-punctuation: none; }
.r84-before :is(code, pre, kbd, .basalt-code-pre, .basalt-inline-code, .basalt-kbd, [data-mono]) { font-variant-ligatures: normal; }
/* Smoothing. Main: a React page with base.css sets none (the system's own), and five controls force grayscale. This build: base.css sets grayscale in dark
   and the system's own in light, on the page, and no control sets its own. */
.r84-smooth-before { -webkit-font-smoothing: auto; }
.r84-smooth-before :is(.basalt-button, .basalt-input, .basalt-menu-item, .basalt-tab, .basalt-segment, .basalt-search-trigger) { -webkit-font-smoothing: antialiased; }
[data-theme="dark"] .r84-smooth-after { -webkit-font-smoothing: antialiased; }
[data-theme="light"] .r84-smooth-after { -webkit-font-smoothing: auto; }
.r84-narrow { width: 128px; padding: var(--basalt-space-2); border: 1px dashed var(--basalt-border-hairline); }
.r84-readout { font: var(--basalt-font-weight-regular) var(--basalt-text-xs-size) / var(--basalt-text-xs-line-height) var(--basalt-font-family-mono); color: var(--basalt-text-secondary); font-variant-numeric: tabular-nums; }
`;

function Css() {
  return <style>{BEFORE_CSS}</style>;
}

function Pair({ before, after, names = ["Before (main)", "After (this build)"] }: { before: React.ReactNode; after: React.ReactNode; names?: [string, string] }) {
  return (
    <div className="r84-pair">
      <Css />
      <div className="r84-before" style={stack}><p style={label}>{names[0]}</p>{before}</div>
      <div style={stack}><p style={label}>{names[1]}</p>{after}</div>
    </div>
  );
}

// ---- 1. Tabular figures ----

function Figures() {
  const body = (
    <div style={stack}>
      <div style={{ display: "grid", gap: "var(--basalt-space-2)", justifyItems: "start" }}>
        <Badge status="success">11 loaves</Badge>
        <Badge status="success">88 loaves</Badge>
        <Badge status="warning">14 of 19 proofed</Badge>
        <Badge status="neutral">Gauge 11</Badge>
        <Badge status="neutral">Gauge 88</Badge>
      </div>
      <Prose>
        <p>High tide at <time dateTime="2026-11-04T06:11">6:11&nbsp;AM</time>, low at <time dateTime="2026-11-04T12:48">12:48&nbsp;PM</time>, 1.8&nbsp;m.</p>
      </Prose>
      <RichText>
        <p>The rye went in at <time dateTime="2026-11-04T04:11">4:11&nbsp;AM</time> and came out at <time dateTime="2026-11-04T05:18">5:18&nbsp;AM</time>.</p>
      </RichText>
    </div>
  );
  return <Pair before={body} after={body} />;
}

// ---- 2. Wrapping ----

const LONG_TITLE = "Tide tables for the outer harbour and the north breakwater gauge";
const LONG_BODY = "Readings are taken every six minutes and kept for a year, and a reading the gauge could not take says so in the table instead of a zero.";

function Wrapping() {
  const body = (
    <div style={{ ...stack, maxWidth: 340 }}>
      <Heading level={3} size="lg">{LONG_TITLE}</Heading>
      <Card>
        <CardHeader>
          <CardTitle>Overnight rye, the long cold proof in the walk-in room</CardTitle>
          <CardDescription>Twelve loaves, shaped at nine and baked at four, for the market stall that opens at seven on Saturday.</CardDescription>
        </CardHeader>
      </Card>
      <div>
        <h2 className="basalt-dialog-title">Rename the north breakwater gauge before the next reading</h2>
        <p className="basalt-dialog-description">{LONG_BODY}</p>
      </div>
      <EmptyState title="No readings from the north gauge since the storm surge on Tuesday" description="The gauge is back online when its first new reading arrives; nothing here needs to be done." />
      <Text>{LONG_BODY}</Text>
    </div>
  );
  return <Pair before={body} after={body} />;
}

function Clamp() {
  return (
    <div style={{ ...stack, maxWidth: 340 }}>
      <Prose>
        <p style={label}>A one-line cut inside Prose, inside a pretty paragraph</p>
        <p><Text as="span" lines={1}>{LONG_TITLE}, and the south gauge too</Text></p>
        <p style={label}>A three-line clamp inside RichText</p>
      </Prose>
      <RichText><Text lines={3}>{LONG_BODY} {LONG_BODY}</Text></RichText>
    </div>
  );
}

// ---- 3. Punctuation ----

function Punctuation() {
  const lines = (apostrophe: string) => (
    <div style={stack}>
      <p className="basalt-command-empty" style={{ margin: 0 }}>{`Couldn${apostrophe}t load commands.`}</p>
      <p className="basalt-command-empty" style={{ margin: 0 }}>{`Still couldn${apostrophe}t load commands. Reloading the page usually fixes this.`}</p>
      <Text size="sm" tone="secondary">{`Finish to start, no lag, no calendar. A box${apostrophe}s width is not its length.`}</Text>
      <Text size="sm" tone="secondary">{`Arrow keys move to the next or the previous task, in the author${apostrophe}s order.`}</Text>
      <Text size="sm" tone="secondary">{`This page${apostrophe}s security policy blocks the PNG. Download SVG still works.`}</Text>
    </div>
  );
  return <Pair before={lines("'")} after={lines("’")} />;
}

// ---- 4. Code and quotes ----

const CODE = ["const ready = loaves >= 12 && oven !== null;", "gauge.read((r) => r.level <= 1.8 ? \"low\" : \"high\");", "// --> proofed, =/= burnt, www"].join("\n");

function CodeAndQuotes() {
  const body = (
    <div style={stack}>
      <CodeBlock title="proof.ts" code={CODE} language="ts" copyable={false} />
      <p style={{ margin: 0 }}>Run <InlineCode>gauge --since=-6h</InlineCode> and press <Kbd>Mod+K</Kbd>.</p>
      <RichText>
        <blockquote><p>“The rye proves overnight in the cold room, and the gauge reads every six minutes.”</p></blockquote>
      </RichText>
      <StreamQuote cite="Dana asked">“Can the tide table show the north gauge’s last good reading?”</StreamQuote>
    </div>
  );
  return <Pair before={body} after={body} />;
}

// ---- 5. Smoothing ----

function Specimen() {
  return (
    <div style={stack}>
      {[12, 13, 14, 16, 20].map((size) => (
        <div key={size} style={{ display: "flex", gap: "var(--basalt-space-4)", flexWrap: "wrap", fontSize: size, lineHeight: 1.4 }}>
          {[400, 500, 600].map((weight) => <span key={weight} style={{ fontWeight: weight }}>Rye {weight} at {size}</span>)}
        </div>
      ))}
      <Text size="xs" tone="secondary">Secondary at 12: high tide at 6:11&nbsp;AM, 1.8&nbsp;m.</Text>
      <Text size="sm" tone="tertiary">Tertiary at 13: shaped at nine and baked at four.</Text>
      <Text mono size="sm">gauge --since=-6h</Text>
      <div style={{ display: "flex", gap: "var(--basalt-space-2)", flexWrap: "wrap", alignItems: "center" }}>
        <Button variant="primary">Bake the rye</Button>
        <Button>Read the gauge</Button>
        <Text as="span" size="base">Beside a button</Text>
      </div>
    </div>
  );
}

function Smoothing() {
  return (
    <div className="r84-pair">
      <Css />
      <div className="r84-smooth-before" style={stack}><p style={label}>Before (main, with base.css): the system's own, and grayscale on controls only</p><Specimen /></div>
      <div className="r84-smooth-after" style={stack}><p style={label}>After (base.css): grayscale in dark, the system's own in light, controls as the text beside them</p><Specimen /></div>
    </div>
  );
}

// ---- 6. The glue ----

const NOW = Date.UTC(2026, 10, 12, 12);
const plain = (text: string) => text.replace(/\u00a0/g, " ");

function Glue() {
  const samples = [
    formatDay(Date.UTC(2026, 10, 4), { now: NOW, timeZone: "UTC" }).text,
    formatDay(Date.UTC(2025, 0, 4), { now: NOW, timeZone: "UTC" }).text,
    formatAge(NOW - 11 * 86_400_000, NOW),
    formatElapsed(NOW - 65 * 60_000, NOW)?.text ?? "",
    formatUntil(NOW + 2 * 3_600_000 + 15 * 60_000, NOW)?.text ?? "",
    formatRunTime(754_000).text,
    formatNumber(10, { style: "unit", unit: "megabyte" }),
  ];
  const column = (glued: boolean) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--basalt-space-2)" }}>
      {samples.map((s, i) => (
        <div key={i} className="r84-narrow">
          <Text size="sm">Proofed {glued ? s : plain(s)} for the stall</Text>
        </div>
      ))}
    </div>
  );
  return <Pair before={column(false)} after={column(true)} names={["Before (main): plain spaces, so a line can part a value from its unit", "After: the value and its unit, and the month and day, are glued"]} />;
}

// ---- 7. The notification row's time ----

function Notifications() {
  const entries = (absolute: boolean) => [
    { id: "a", title: "Overnight rye finished proofing", description: "Walk-in room, rack two", time: absolute ? "4:41\u00a0AM" : "2m ago", dateTime: "2026-11-12T04:41", status: "success" as const, unread: true },
    { id: "b", title: "North gauge read low after the surge", description: "Outer harbour", time: absolute ? "3:10\u00a0AM" : "1h ago", dateTime: "2026-11-12T03:10", status: "warning" as const, unread: true },
    { id: "c", title: "Flour delivery booked", time: absolute ? "Nov\u00a07" : "5d ago", dateTime: "2026-11-07" },
  ];
  return (
    <Pair
      names={["Before (doc examples): a relative age alone", "After: absolute, as a stat's source is: the clock today, the date another day"]}
      before={<div style={{ maxWidth: 400 }}><NotificationList head={false} label="Kitchen and gauge" entries={entries(false)} /></div>}
      after={<div style={{ maxWidth: 400 }}><NotificationList head={false} label="Kitchen and gauge" entries={entries(true)} /></div>}
    />
  );
}

// ---- 8. DateAge in other languages, and its seat ----

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const YEAR = 365.25 * DAY;
const SEAT_TIME = Date.UTC(2026, 0, 15, 12);
const CROSSINGS: [string, number][] = [["89 min", 89 * MIN], ["90 min", 90 * MIN], ["36 h", 36 * HOUR - MIN], ["2 days", 36 * HOUR], ["45 days", 45 * DAY - HOUR], ["1 month", 45 * DAY], ["18 months", 548 * DAY - 13 * HOUR], ["2 years", 548 * DAY], ["99 years", 99 * YEAR], ["100 years", 100 * YEAR], ["999 years", 999 * YEAR], ["1,000 years", 1000 * YEAR]];
const LOCALES = ["en-US", "fr-FR", "ru-RU", "ar-EG", "id-ID"];

/** Measures each row's seat and the text after it, live, so the shot carries the proof: one width per locale and precision when the seat holds. */
function SeatReadout({ id }: { id: string }) {
  const [out, setOut] = React.useState("");
  React.useEffect(() => {
    let alive = true;
    void document.fonts.ready.then(() => {
      if (!alive) return;
      const root = document.getElementById(id);
      if (!root) return;
      const lines: string[] = [];
      for (const group of root.querySelectorAll<HTMLElement>("[data-group]")) {
        const seats = [...group.querySelectorAll<HTMLElement>(".basalt-date-age-seat")].map((s) => s.getBoundingClientRect().width.toFixed(2));
        // The text after each age, measured from its own item's start (the items wrap, so a page position would differ by design).
        const afters = [...group.querySelectorAll<HTMLElement>(".r84-after-text")].map((s) => (s.getBoundingClientRect().left - (s.parentElement?.getBoundingClientRect().left ?? 0)).toFixed(2));
        const one = (list: string[]) => new Set(list).size === 1;
        // Each crossing is a pair (the last of one form, the first of the next) with the same date before it: the text after must not move within a pair.
        const moved = CROSSINGS.filter((_, i) => i % 2 === 1 && afters[i] !== afters[i - 1]).map(([name]) => name);
        lines.push(`${group.dataset.group}: seat ${one(seats) ? `${seats[0]}px, held` : `MOVES ${[...new Set(seats)].join(" / ")}`}; text after ${moved.length ? `MOVES at ${moved.join(", ")}` : "held across each crossing"}`);
      }
      setOut(lines.join("\n"));
    });
    return () => { alive = false; };
  }, [id]);
  return <pre className="r84-readout" style={{ margin: 0, whiteSpace: "pre-wrap" }}>{out || "measuring…"}</pre>;
}

function Seats() {
  return (
    <div id="r84-seats" style={stack}>
      <Css />
      {LOCALES.map((locale) => (["day", "minute"] as const).map((precision) => (
        <div key={`${locale}-${precision}`} data-group={`${locale}, ${precision}`} style={{ display: "grid", gap: "var(--basalt-space-0-5)" }}>
          <p style={label}>{locale}, {precision}, short: the last of one form, then the first of the next</p>
          <div style={{ display: "flex", flexWrap: "wrap", columnGap: "var(--basalt-space-4)", rowGap: "var(--basalt-space-0-5)" }}>
            {CROSSINGS.map(([name, age]) => (
              <span key={name} style={{ display: "inline-flex", alignItems: "baseline", gap: "var(--basalt-space-1-5)" }} title={name}>
                <DateAge short locale={locale} precision={precision} timeZone="UTC" time={SEAT_TIME} now={SEAT_TIME + age} />
                <span className="r84-after-text" style={{ color: "var(--basalt-text-tertiary)", fontSize: "var(--basalt-text-xs-size)" }}>|</span>
              </span>
            ))}
          </div>
        </div>
      )))}
      <SeatReadout id="r84-seats" />
    </div>
  );
}

function Languages() {
  return (
    <div style={stack}>
      {LOCALES.map((locale) => (
        <div key={locale} style={{ display: "grid", gap: "var(--basalt-space-0-5)" }}>
          <p style={label}>{locale}</p>
          <DateAge locale={locale} timeZone="UTC" time={Date.UTC(2026, 10, 1)} now={NOW} />
          <DateAge locale={locale} timeZone="UTC" precision="minute" time={NOW - 19 * MIN} now={NOW} />
        </div>
      ))}
    </div>
  );
}

// ---- 9. NumberTicker and formatNumber ----

function Ticker() {
  const [value, setValue] = React.useState(1234.5);
  return (
    <div style={stack}>
      <p style={{ margin: 0, fontSize: 20, lineHeight: "28px" }}>Flour: <NumberTicker value={value} locale="de-DE" glide /> kg</p>
      <p style={{ margin: 0, fontSize: 20, lineHeight: "28px" }}>Loaves: <NumberTicker value={Math.round(value)} locale="ar-EG" /></p>
      <p style={{ margin: 0, fontSize: 20, lineHeight: "28px" }}>Level: <NumberTicker value={value / 1000} /> m</p>
      <div><Button onClick={() => setValue((v) => (v === 1234.5 ? 8876.5 : 1234.5))}>Change the figures</Button></div>
      <Text size="sm" tone="secondary">formatNumber: {formatNumber(1234.5)} · {formatNumber(1234.5, { locale: "de-DE" })} · {formatNumber(10, { style: "unit", unit: "megabyte" })} · {formatNumber(1200, { notation: "compact", compactDisplay: "long" })}</Text>
    </div>
  );
}

// ---- 10. translate="no" ----

function Translate() {
  const [rows, setRows] = React.useState<string[]>([]);
  React.useEffect(() => {
    const read = (selector: string) => document.querySelector(`#r84-translate ${selector}`)?.getAttribute("translate") ?? "(none)";
    setRows([
      `CodeBlock's code: ${read(".basalt-code-pre")}`,
      `InlineCode: ${read(".basalt-inline-code")}`,
      `Kbd's key chips: ${read(".basalt-kbd-key")}; its spoken words: ${read(".basalt-kbd .basalt-visually-hidden")}`,
      `AppBrand's name: ${read(".basalt-app-lockup-title")}; its subtitle: ${read(".basalt-app-lockup-subtitle")}`,
      `A mono value: ${read(".basalt-description-details[data-mono]")}; a missing one: ${read(".basalt-description-details[data-missing]")}`,
    ]);
  }, []);
  return (
    <div id="r84-translate" style={stack}>
      <AppBrand mark={<span style={{ display: "block", width: 20, height: 20, borderRadius: 4, background: "var(--basalt-text-primary)" }} />} title="Harbour Gauge" subtitle="North breakwater" />
      <p style={{ margin: 0 }}>Run <InlineCode>gauge --since=-6h</InlineCode>, or press <Kbd>Mod+K</Kbd>.</p>
      <DescriptionList><DescriptionItem term="Station" mono>gauge-14</DescriptionItem><DescriptionItem term="Probe" mono missing /></DescriptionList>
      <CodeBlock code="bake --loaves 12" language="text" copyable={false} />
      <pre className="r84-readout" style={{ margin: 0, whiteSpace: "pre-wrap" }}>{rows.join("\n")}</pre>
    </div>
  );
}

// ---- 11. The HTML skill ----

function useTheme() {
  const read = () => (typeof document === "undefined" ? "dark" : document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
  return React.useSyncExternalStore((change) => { const watch = new MutationObserver(change); watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); return () => watch.disconnect(); }, read, () => "dark");
}

function SkillFrame({ which }: { which: "before" | "after" }) {
  const theme = useTheme();
  const source = React.useMemo(() => (__SKILL_PAGES__[`84-${which}`] ?? "").replace("__THEME__", theme), [which, theme]);
  return (
    // sink: a page compose.mjs built at review-build time from this round's synthetic body (round84-skill.mjs); the frame runs the page's own script
    // oxlint-disable-next-line react/iframe-missing-sandbox -- a page compose.mjs built at review-build time from a synthetic body; the frame runs the page's own script
    <iframe title={`The HTML skill, ${which}`} srcDoc={source} style={{ width: "100%", height: 760, border: 0, display: "block" }} />
  );
}

function Skill() {
  return <Pair before={<SkillFrame which="before" />} after={<SkillFrame which="after" />} />;
}

export const ROUND_84: Round = {
  id: "84",
  title: "Micro-details m2: text, type and locale",
  reviewed: false,
  summary:
    "The council's m2 decision, built in React and the HTML skill: tabular figures on badges and times; balanced titles and pretty descriptions, with the clamp kept; curly apostrophes in five shipped sentences and the rules for quotes and the ellipsis; no ligatures wherever Basalt sets Geist Mono, and a block quote's mark hung into its padding (Safari); smoothing by theme in the opt-in page base and the skill's core, never in a component; values glued to their units; formatNumber, formatAge's locale, DateAge's short seat in every language, NumberTicker's locale; translate=\"no\" on code, keys and names; and an absolute time in a notification row. Each changed part leads with before and after.",
  steps: [
    {
      id: "figures",
      name: "Before and after: tabular figures on badges and times",
      intro: "A badge's count and a time in prose or a renderer's text now take tabular figures, so \"11\" and \"88\" are one width and a column of times lines up. A sentence keeps proportional figures.",
      decisions: ["Never font-feature-settings: it replaces an element's whole feature list.", "A change in digit count (\"9\" to \"10\") still widens the box unless its seat holds the widest form.", NOT_REVIEWED],
      tryIt: ["Compare the two \"loaves\" badges on each side: on the right their words start and end together."],
      widths: [1440, 390],
      height: 420,
      demo: () => <Figures />,
    },
    {
      id: "wrapping",
      name: "Before and after: balanced titles, pretty descriptions",
      intro: "A heading, a card's, a dialog's and an empty state's title balance their lines; a paragraph of Text and the descriptions under those titles avoid a lone last word. At 390 the difference is in where the lines break.",
      decisions: ["RichText's headings, h5 and h6, mono text, table cells, spans and divs keep the browser's wrap.", "The shorthand text-wrap only; the longhand is above the floor.", NOT_REVIEWED],
      tryIt: ["Narrow the window: the right-hand titles keep lines of similar length."],
      widths: [1440, 390],
      height: 900,
      heights: { "default@390": 1480 },
      demo: () => <Wrapping />,
    },
    {
      id: "clamp",
      name: "The clamp keeps its wrap",
      intro: "text-wrap inherits, so a cut text's base rule sets wrap and the one-line rule's nowrap comes after it: a one-line cut inside a pretty paragraph is still one line with an ellipsis, and a three-line clamp takes no balance or pretty.",
      decisions: ["The same guard in the skill's core, on [data-lines].", NOT_REVIEWED],
      tryIt: ["Hover the one-line cut: its whole text opens on the plate, as before."],
      widths: [1440, 390],
      height: 300,
      demo: () => <Clamp />,
    },
    {
      id: "punctuation",
      name: "Before and after: the apostrophe",
      intro: "Five sentences Basalt ships now use ’ (U+2019): the command menu's two error lines, a schedule's default assumptions, the keys sentence's \"author’s order\" and the skill's PNG note. The rules for words gain the quotes, the one-character ellipsis and \"…\" on an item that asks for more before it acts.",
      decisions: ["Developer-facing text (warnings, thrown errors, comments) stays ASCII.", "No word is rewritten.", NOT_REVIEWED],
      tryIt: ["Compare \"Couldn't\" and \"Couldn’t\" at 2x."],
      widths: [1440, 390],
      height: 380,
      demo: () => <Punctuation />,
    },
    {
      id: "code-quotes",
      name: "Before and after: code ligatures and the hung quote",
      intro: "Every rule that sets Geist Mono now sets font-variant-ligatures: none. Geist Mono ships no ligatures, so these shots are the same pixels: the rule protects a fallback mono before Geist loads and an app's own mono font. A block quote's opening mark hangs into the quote's own padding in Safari; Chromium, which draws these shots, sets it flush, as before.",
      decisions: ["Never on a paragraph: it has no padding to hang into, and an overflow: hidden ancestor would clip the mark.", "Never \"last\": Basalt never justifies.", NOT_REVIEWED],
      tryIt: ["Open the page in Safari: the quote's “ sits in the padding, and the words line up with the quote's edge."],
      widths: [1440, 390],
      height: 520,
      heights: { "default@390": 980 },
      demo: () => <CodeAndQuotes />,
    },
    {
      id: "smoothing",
      name: "Before and after: smoothing by theme",
      intro: "In dark, the system's subpixel smoothing makes 400 read close to 500 and runs 500 into 600; grayscale separates the three weights. In light, grayscale thins 12 and 13px secondary ink, so light keeps the system's. Set by base.css and the skill's core, never by a component: a control now matches the text beside it. macOS only; other systems ignore it.",
      decisions: ["No colour or contrast value changes, and there is no print rule.", "Headless Chromium may draw both sides the same; the owner's look is on a Mac at 2x.", NOT_REVIEWED],
      tryIt: ["On a Mac, compare Rye 400 and Rye 500 at 14 in dark on each side."],
      widths: [1440, 390],
      height: 520,
      heights: { "default@390": 1000 },
      demo: () => <Smoothing />,
    },
    {
      id: "glue",
      name: "Before and after: a value glued to its unit",
      intro: "Basalt's formatters join a value and its unit, and a short month and its day, with a no-break space (U+00A0), so a narrow column never leaves \"12\" at a line's end and \"min\" at the next's start. The space between two pairs and before a year stays breakable; a separator Intl writes is kept.",
      decisions: ["formatDay, formatStatTime, formatAge, formatElapsed, formatUntil, formatCountdown, formatRunTime, formatReleaseDate and formatNumber.", "U+00A0 and U+0020 are the same width in Geist and Geist Mono, so RunTimer's seat does not change.", NOT_REVIEWED],
      tryIt: ["Each dashed box is 128px wide: on the left a value can sit at a line's end with its unit on the next."],
      widths: [1440, 390],
      height: 520,
      heights: { "default@390": 680 },
      demo: () => <Glue />,
    },
    {
      id: "notifications",
      name: "Before and after: the notification row's time",
      intro: "The time in a notification row is absolute, as a stat's source line is: the clock for today, the date for another day. The app writes it; the doc comment and the skill's usage now say so. A relative age is written only beside its date, so an app writes one in the row only when the entry opens a view that shows the absolute time.",
      decisions: ["No title on the time: a title shows for neither touch nor keyboard, and the time stays in the row's one name.", NOT_REVIEWED],
      tryIt: ["Tab to a row: its name ends with the time."],
      states: ["forced-colours"],
      widths: [1440, 390],
      touch: true,
      height: 380,
      heights: { "default@390": 640, "forced-colours@390": 640 },
      demo: () => <Notifications />,
    },
    {
      id: "seats",
      name: "DateAge's short seat in five languages",
      intro: "Short, the age stands in a seat that never moves the text after it. English keeps its approved widest form, \"548mo\". Any other language reserves every short form it can show: now, 1 to 99 of each unit, and years at every digit count a date can reach, each digit folded to the locale's 8 and deduplicated. The readout under the rows is measured live.",
      decisions: ["formatAge writes Basalt's words in any English locale and Intl.RelativeTimeFormat's in any other, with the same branches.", "The set is made once per locale and kept: about 900 formats on first use, a few dozen strings after the fold.", NOT_REVIEWED],
      tryIt: ["Read the readout: each line says the seat and the text after it are held."],
      widths: [1440, 390],
      height: 1100,
      heights: { "default@390": 2400 },
      demo: () => <Seats />,
    },
    {
      id: "languages",
      name: "DateAge's words in five languages",
      intro: "The long form in each language, at day and minute precision, with its number glued to its unit. It wraps and keeps no seat, as before.",
      decisions: ["en-US stays the default everywhere, so a server render and the browser agree. An app that localizes passes the reader's language, never their place.", NOT_REVIEWED],
      tryIt: [],
      widths: [1440, 390],
      height: 520,
      demo: () => <Languages />,
    },
    {
      id: "ticker",
      name: "NumberTicker's locale",
      intro: "locale (default en-US) writes the default format through formatNumber. Only the ASCII digits 0 to 9 roll: German's . and , and every Arabic-Indic digit are still marks. The number a selection copies is in the sentence once. Under reduced motion it is plain text.",
      decisions: ["A format the app passes still wins.", NOT_REVIEWED],
      tryIt: ["Press Change the figures: the German digits roll, the separators stay; the Arabic digits change in place."],
      states: ["reduced-motion"],
      widths: [1440, 390],
      height: 340,
      demo: () => <Ticker />,
    },
    {
      id: "translate",
      name: "translate=\"no\" on code, keys and names",
      intro: "A page translator leaves code, a key chip, an identifier and a product's name as written. No pixel changes: the readout shows the attribute on each part, and that the spoken key words, the subtitle and a missing value's words still translate.",
      decisions: ["Set before the caller's props, so a caller can change it.", NOT_REVIEWED],
      tryIt: ["Translate the page in the browser: the name, the code and the keys stay."],
      widths: [1440, 390],
      height: 460,
      demo: () => <Translate />,
    },
    {
      id: "skill",
      name: "Before and after: the HTML skill",
      intro: "The same rules in the skill: a time, .badge and .status in tabular figures; the dialog's, popover's and callout's title balanced and their bodies pretty; the date and its age; the glue; code with no ligatures; and smoothing by theme, so a light page draws the system's own (heavier) and a dark page is unchanged.",
      decisions: ["\"Before\" is the same composed page with main's smoothing (grayscale on every page) and the new properties put back.", "The core's cap is 41,450 (from 40,900), measured, with the reason recorded; budgets are soft.", NOT_REVIEWED],
      tryIt: ["Compare the light shots: the right is slightly heavier."],
      widths: [1440, 390],
      height: 800,
      heights: { "default@390": 1600 },
      demo: () => <Skill />,
    },
  ],
};
