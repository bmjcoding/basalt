// Round 40: the charts port batch of the components stream (DECISIONS 153): the lit marks, the headline frame, the lit trend line, the phase chart with its lane, the share bar, the
// coverage strip, the marks row and the range meter. Ported from the owner's approved site prototypes (the kit's lit figures, N1's dashboard, the personal site's tally) with the council's
// changes; every vote is in the step it concerns. The small bar plot (vote 10, a four-way split) is held for the owner and is not built. The design panel has not reviewed this
// implementation. Every colour is neutral: N1's and the kit's own colours stay with the sites. Every word and number is synthetic.
//
// Each step prints what the decision turned on, measured live in this page (a width that must not change, a movement that must be 0px). The readouts and the layout around the parts are
// this review page's own: Basalt draws none of them.

import * as React from "react";

import { CoverageStrip, MarksRow, PhaseChart, RangeMeter, ShareBar, Text, TimeChart, trailingMean } from "../../packages/react/src/index";
import { calls, coverageDays, lb, marksData, MARKS_CAP, weightData } from "../../packages/react/test/fixtures/figure-data";
import { lastDays } from "../../packages/react/test/fixtures/chart-data";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 24 };
const mono: React.CSSProperties = { margin: 0, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--basalt-border-input)", background: "var(--basalt-surface-1)", color: "var(--basalt-text-primary)", fontFamily: "var(--basalt-font-family-mono)", fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" };
const caption = (text: string) => <Text size="sm" tone="secondary">{text}</Text>;
const NOW = Date.UTC(2026, 10, 10, 12);
const frames = (n = 2) => new Promise<void>((resolve) => { const step = (k: number) => (k <= 0 ? resolve() : requestAnimationFrame(() => step(k - 1))); step(n); });
const rect = (el: Element | null) => { const r = el?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null; };
const px = (n: number) => `${Math.round(n * 100) / 100}px`;
const same = (a: ReturnType<typeof rect>, b: ReturnType<typeof rect>) => (a && b ? Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.w - b.w), Math.abs(a.h - b.h)) : NaN);

/** A readout of measurements taken in this page, once the figure has drawn. The harness waits for it (`__BASALT_READY__`). */
function Probe({ root, run, state }: { root: React.RefObject<HTMLElement | null>; run: (root: HTMLElement) => Promise<string[]>; state: string }) {
  const [lines, setLines] = React.useState<string[]>(["measuring…"]);
  React.useEffect(() => {
    let live = true;
    const done = (async () => {
      await document.fonts.ready;
      await frames(4);
      const el = root.current;
      if (!el) return;
      const out = await run(el);
      if (live) setLines(out);
      await frames(2);
    })();
    const w = window as unknown as { __BASALT_READY__?: Promise<unknown> };
    w.__BASALT_READY__ = Promise.all([w.__BASALT_READY__, done]);
    return () => { live = false; };
  }, [state]);
  return <pre style={mono}>{lines.join("\n")}</pre>;
}

/** The focused state: focus a day (or a control) of the figure, so the control ring shows. */
function useFocusState(root: React.RefObject<HTMLElement | null>, state: string, selector: string, nth = -4) {
  React.useEffect(() => {
    if (state !== "focus") return;
    let live = true;
    (async () => {
      await frames(6);
      const items = root.current?.querySelectorAll<HTMLElement>(selector);
      if (!live || !items?.length) return;
      items[(items.length + nth) % items.length]?.focus({ preventScroll: true });
    })();
    return () => { live = false; };
  }, [state, selector, nth, root]);
}

const w28 = weightData(28);
const w84 = weightData(84);
const stepsDays = lastDays(14);
const stepsValues = marksData("columns", 14);
const steps = (v: number) => String(Math.round(v));

// ---- 1. the lit marks ----

function LitDemo({ state }: { state: string }) {
  const root = React.useRef<HTMLDivElement>(null);
  useFocusState(root, state, ".basalt-chart-day", -3);
  return (
    <div ref={root} style={col} data-wt-hover>
      {caption("Flat, as every chart is by default: chart-observed.")}
      <TimeChart title="Steps, flat" kind="bar" days={stepsDays} series={[{ id: "s", name: "Steps", values: stepsValues }]} format={steps} unit="steps" summary="Steps over fourteen days; one day not observed." now={NOW} />
      {caption("Lit: one vertical gradient in the plot's own coordinates, three neutral stops, the top of the plot the lightest.")}
      <TimeChart title="Steps, lit" kind="bar" lit days={stepsDays} series={[{ id: "s", name: "Steps", values: stepsValues }]} format={steps} unit="steps" summary="Steps over fourteen days; one day not observed." now={NOW} />
      <Probe
        root={root} state={state}
        run={async (el) => {
          const figures = el.querySelectorAll("figure");
          const lit = figures[1]!;
          const stops = [...lit.querySelectorAll("linearGradient stop")].map((s) => getComputedStyle(s).stopColor);
          const gradient = lit.querySelector("linearGradient");
          const bars = [...lit.querySelectorAll("svg.basalt-chart-svg .basalt-chart-bar")];
          const fills = new Set(bars.map((b) => getComputedStyle(b).fill));
          const root = getComputedStyle(document.documentElement);
          return [
            `gradient: ${stops.length} stops, ${gradient?.getAttribute("gradientUnits")}, y ${gradient?.getAttribute("y1")} to ${gradient?.getAttribute("y2")} (the plot is ${root.getPropertyValue("--basalt-size-chart-plot").trim()})`,
            `stops: ${stops.join("  ")}`,
            `${bars.length} bars, ${fills.size} distinct fill: ${[...fills][0]?.slice(0, 36)}`,
            `lit tokens: top ${root.getPropertyValue("--basalt-chart-lit-top").trim()}  mid ${root.getPropertyValue("--basalt-chart-lit-mid").trim()}  base ${root.getPropertyValue("--basalt-chart-lit-base").trim()}`,
            "contrast (the test): each stop 3:1 on levels 0 to 3 and on the picked day's plate, in both themes",
          ];
        }}
      />
    </div>
  );
}

// ---- 2. the headline frame and the trend ----

function HeadlineDemo({ state }: { state: string }) {
  const root = React.useRef<HTMLDivElement>(null);
  useFocusState(root, state, ".basalt-chart-day", -9);
  return (
    <div ref={root} style={col} data-wt-hover>
      <TimeChart
        title="Weight, 7-day trend" kind="line" trend lit days={w28.days} series={[{ id: "w", name: "Weight", values: w28.values, reasons: w28.reasons }]}
        format={lb} unit="lb" summary="Weight trended down by about three pounds over twenty-eight days. Three runs of days had no reading: one for a scale not used, one for travel." now={NOW}
      />
      <Probe
        root={root} state={state}
        run={async (el) => {
          const days = [...el.querySelectorAll<HTMLElement>(".basalt-chart-day")];
          const parts = () => ({ seat: rect(el.querySelector(".basalt-chart-seat")), unit: rect(el.querySelector(".basalt-chart-unit")), context: rect(el.querySelector(".basalt-chart-context")), headline: rect(el.querySelector(".basalt-chart-headline")), plot: rect(el.querySelector(".basalt-chart-plot")) });
          days[days.length - 1]!.focus({ preventScroll: true });
          await frames(2);
          const rest = parts();
          let worst = 0;
          const seen = new Set<string>();
          for (let i = days.length - 1; i >= 0; i--) {
            days[i]!.focus({ preventScroll: true });
            await frames(1);
            const now = parts();
            for (const key of Object.keys(rest) as Array<keyof typeof rest>) worst = Math.max(worst, same(rest[key], now[key]));
            seen.add(el.querySelector(".basalt-chart-seat")?.textContent ?? "");
          }
          (document.activeElement as HTMLElement | null)?.blur();
          await frames(3);
          const trend = trailingMean(w28.values);
          const css = getComputedStyle(el.querySelector(".basalt-chart-headline")!);
          const title = getComputedStyle(el.querySelector(".basalt-chart-title")!);
          return [
            `picked ${days.length} days in turn: the headline seat, the unit, the context line, the headline and the plot moved at most ${px(worst)}`,
            `the headline is ${css.fontSize} / ${css.lineHeight} at ${window.innerWidth}px (text-4xl under 720, text-5xl from it); the title is ${title.fontSize} / ${title.lineHeight}, ${title.fontWeight}`,
            `${el.querySelectorAll(".basalt-chart-reading").length} readings as ${parseFloat(getComputedStyle(el.querySelector(".basalt-chart-reading")!).r) * 2}px dots (size-track); the trend breaks ${trend.filter((v, i) => v != null && (i === 0 || trend[i - 1] == null)).length - 1} times at a gap; ${el.querySelectorAll("figure [aria-live]").length} live regions`,
            `the head dot: ${el.querySelectorAll(".basalt-chart-mark").length} (r ${getComputedStyle(el.querySelector(".basalt-chart-mark") ?? document.body).r}, ring r ${getComputedStyle(el.querySelector(".basalt-chart-ring") ?? document.body).r}); the plate: ${el.querySelectorAll(".basalt-chart-plate").length}; ${seen.size} distinct headline texts seen`,
          ];
        }}
      />
    </div>
  );
}

// ---- 3. the phase chart ----

function PhaseDemo({ state }: { state: string }) {
  const root = React.useRef<HTMLDivElement>(null);
  const [week, setWeek] = React.useState(11);
  const list = React.useMemo(() => calls(), []);
  useFocusState(root, state, ".basalt-chart-day", -10);
  return (
    <div ref={root} style={col} data-wt-hover>
      <PhaseChart
        title="Weight over twelve weeks" name="Weight" days={w84.days} values={w84.values} reasons={w84.reasons} calls={list} week={week} onWeekChange={setWeek}
        format={lb} unit="lb" summary="Weight over twelve weeks, with the week's choice under each. Press a day, or Enter on it, to open its week." now={NOW}
      />
      <Probe
        root={root} state={state}
        run={async (el) => {
          const out: string[] = [];
          const days = [...el.querySelectorAll<HTMLElement>(".basalt-chart-day")];
          const calls = [...el.querySelectorAll<HTMLElement>(".basalt-phase-call")];
          const d0 = rect(days[0]!)!;
          const dn = rect(days[days.length - 1]!)!;
          const c0 = rect(calls[0]!)!;
          const cn = rect(calls[calls.length - 1]!)!;
          const marks = !!el.querySelector(".basalt-phase-calls[data-marks]");
          out.push(`plot ${px(d0.h)} tall (size-chart-plot-sm, 96px); the lane spans ${px(c0.x)} to ${px(cn.x + cn.w)} against the plot's ${px(d0.x)} to ${px(dn.x + dn.w)}; a choice is ${px(c0.w)} wide, ${px(c0.h)} tall`);
          out.push(`${days.length} days, role img: ${el.querySelectorAll(".basalt-chart-day[role=img]").length}; tab stops: ${el.querySelectorAll(".basalt-chart-day[tabindex='0']").length}; live regions: ${el.querySelectorAll("figure [aria-live]").length}; the lane is ${marks ? "marks, with previous and next" : "words, one choice a week"}`);
          const span = el.querySelector(".basalt-chart-span");
          const sc = getComputedStyle(span!);
          out.push(`plate: ${sc.backgroundColor}, slides over ${sc.transitionDuration} on ${sc.transitionTimingFunction.split(",")[0]}`);
          const click = (i: number) => (marks ? el.querySelectorAll<HTMLInputElement>(".basalt-phase-calls input")[i]!.click() : calls[i]!.click());
          const lane = rect(el.querySelector(".basalt-phase-calls"));
          const open = el.querySelector(".basalt-phase-open");
          const seat = rect(open);
          let worst = 0;
          let worstOpen = 0;
          for (const i of [3, 0, 7, 11]) {
            click(i);
            await frames(3);
            worst = Math.max(worst, same(lane, rect(el.querySelector(".basalt-phase-calls"))));
            if (open) worstOpen = Math.max(worstOpen, same(seat, rect(el.querySelector(".basalt-phase-open"))));
          }
          (document.activeElement as HTMLElement | null)?.blur();
          out.push(`chose weeks 4, 1, 8 and 12: the lane moved at most ${px(worst)}${open ? `; the open-week line moved at most ${px(worstOpen)}` : ""}`);
          return out;
        }}
      />
    </div>
  );
}

// ---- 4. the share bar ----

function ShareDemo({ state }: { state: string }) {
  const root = React.useRef<HTMLDivElement>(null);
  const parts = [{ name: "Protein", value: 120 }, { name: "Carbs", value: 260 }, { name: "Fat", value: 70 }];
  return (
    <div ref={root} style={col}>
      {caption("8px, in a plan:")}
      <ShareBar id="share-sm" parts={parts} size="sm" aria-label="The plan's split" />
      {caption("12px, in a tally, with a part that is almost nothing: it reads \"<1%\" (spoken \"less than 1%\"), is as wide as its own words, never under 12px, and the parts and their gaps are still the bar's width:")}
      <ShareBar id="share-md" parts={[{ name: "Run", value: 5400 }, { name: "Row", value: 2200 }, { name: "Lift", value: 40 }]} size="md" aria-label="The week's sessions" />
      <Probe
        root={root} state={state}
        run={async (el) => {
          const out: string[] = [];
          for (const id of ["share-sm", "share-md"]) {
            const list = el.querySelector(`#${id}`)!;
            const bars = [...list.querySelectorAll(".basalt-share-bar")];
            const r = bars.map((b) => rect(b)!);
            const s = getComputedStyle(bars[0]!);
            out.push(`#${id}: ${bars.length} parts, ${px(r[0]!.h)} tall, gap ${px(r[1]!.x - (r[0]!.x + r[0]!.w))}, radius ${s.borderTopLeftRadius.slice(0, 5)}, ${new Set(bars.map((b) => getComputedStyle(b).backgroundColor)).size} ink, gradient ${s.backgroundImage}, shadow ${s.boxShadow}, shortest ${px(Math.min(...r.map((x) => x.w)))} (as wide as its words)`);
            const items = [...list.querySelectorAll("li")];
            const seen = (li: Element) => [...li.querySelectorAll(":scope > *:not(.basalt-share-bar)")].map((e) => { const c = e.cloneNode(true) as Element; c.querySelectorAll(".basalt-visually-hidden").forEach((n) => n.remove()); return (c.textContent ?? "").trim(); }).join(" ");
            const heard = (li: Element) => [...li.querySelectorAll(":scope > *:not(.basalt-share-bar)")].map((e) => { const c = e.cloneNode(true) as Element; c.querySelectorAll("[aria-hidden=true]").forEach((n) => n.remove()); return (c.textContent ?? "").trim(); }).join(" ");
            out.push(`  seen: ${items.map(seen).join(" | ")}`);
            out.push(`  spoken: ${items.map(heard).join(" | ")}`);
          }
          return out;
        }}
      />
    </div>
  );
}

// ---- 5. the coverage strip ----

function CoverageDemo({ state }: { state: string }) {
  const root = React.useRef<HTMLDivElement>(null);
  return (
    <div ref={root} style={col}>
      <CoverageStrip id="cov-strip" days={coverageDays()} />
      <CoverageStrip id="cov-week" form="week" days={coverageDays(7, [3])} />
      <Probe
        root={root} state={state}
        run={async (el) => {
          const cells = [...el.querySelectorAll("#cov-strip .basalt-coverage-cell")];
          const a = rect(cells[0]!)!;
          const b = rect(cells[1]!)!;
          const missing = getComputedStyle(cells[12]!);
          const lit = getComputedStyle(cells[0]!);
          const week = [...el.querySelectorAll("#cov-week .basalt-coverage-cell")];
          const w0 = rect(week[0]!)!;
          const w1 = rect(week[1]!)!;
          return [
            `strip: ${cells.length} cells, ${px(a.h)} tall, gap ${px(b.x - (a.x + a.w))}, radius ${lit.borderTopLeftRadius}; hidden from assistive technology: ${el.querySelector("#cov-strip .basalt-coverage-cells")?.getAttribute("aria-hidden")}`,
            `a missing day: ${missing.backgroundImage.slice(0, 40)}…, border ${missing.borderTopStyle}, outline ${missing.outlineStyle} (the hatch, no dashed seat)`,
            `week: ${week.length} squares ${px(w0.w)} by ${px(w0.h)}, gap ${px(w1.x - (w0.x + w0.w))}, radius ${getComputedStyle(week[0]!).borderTopLeftRadius}`,
          ];
        }}
      />
    </div>
  );
}

// ---- 6. the marks row ----

function MarksDemo({ state }: { state: string }) {
  const root = React.useRef<HTMLDivElement>(null);
  const [more, setMore] = React.useState(false);
  const columns = marksData("columns", 12);
  const raised = columns.map((v) => (v ? Math.min(MARKS_CAP.columns, v * 1.4) : v));
  return (
    <div ref={root} style={col}>
      {caption("Steps as columns, nights as pills, sessions as blocks. A rest day is a dot; a day nobody recorded is the hatch.")}
      <MarksRow id="mk-columns" kind="columns" values={more ? raised : columns} cap={MARKS_CAP.columns} label="Steps a day over twelve days" />
      <MarksRow id="mk-pills" kind="pills" values={marksData("pills", 12)} cap={MARKS_CAP.pills} label="Hours slept over twelve nights" />
      <MarksRow id="mk-blocks" kind="blocks" values={marksData("blocks", 12)} cap={MARKS_CAP.blocks} label="Minutes trained over twelve days" />
      <button type="button" className="basalt-button" data-variant="secondary" data-size="sm" style={{ alignSelf: "flex-start" }} onClick={() => setMore((v) => !v)}>New values: the marks glide</button>
      <Probe
        root={root} state={state}
        run={async (el) => {
          const out: string[] = [];
          for (const k of ["columns", "pills", "blocks"]) {
            const row = el.querySelector(`#mk-${k}`)!;
            const m = rect(row.querySelector(".basalt-marks-mark"))!;
            const s = getComputedStyle(row.querySelector(".basalt-marks-mark")!);
            out.push(`${k}: row ${px(rect(row)!.h)} tall, a mark ${px(m.w)} wide, corners ${s.borderTopLeftRadius} over ${s.borderBottomLeftRadius}, glide ${s.transitionDuration}`);
          }
          const rest = rect(el.querySelector(".basalt-marks-rest"))!;
          const seat = getComputedStyle(el.querySelector(".basalt-marks-seat")!);
          out.push(`a rest day: ${px(rest.w)} by ${px(rest.h)}; a missing day: ${seat.backgroundImage.slice(0, 34)}…`);
          const before = rect(el.querySelector("#mk-columns"));
          setMore(true);
          await frames(3);
          out.push(`new values: the row moved ${px(same(before, rect(el.querySelector("#mk-columns"))))}`);
          setMore(false);
          return out;
        }}
      />
    </div>
  );
}

// ---- 7. the range meter ----

function RangeDemo({ state }: { state: string }) {
  const root = React.useRef<HTMLDivElement>(null);
  const [value, setValue] = React.useState(0.9);
  return (
    <div ref={root} style={col}>
      <RangeMeter id="rm" label="Last week's change" value={value} max={1.5} plan={[0.5, 1.0]} unit="lb a week" />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[0.2, 0.9, 1.4].map((v) => <button key={v} type="button" className="basalt-button" data-variant="secondary" data-size="sm" onClick={() => setValue(v)}>{v}</button>)}
      </div>
      <Probe
        root={root} state={state}
        run={async (el) => {
          const meter = el.querySelector("#rm")!;
          const measure = () => ({ head: rect(el.querySelector(".basalt-meter-head")), track: rect(el.querySelector(".basalt-meter-track")), foot: rect(el.querySelector(".basalt-meter-foot")) });
          const rest = measure();
          const track = rest.track!;
          const at = (e: Element | null) => { const r = rect(e)!; return ((r.x + r.w / 2 - track.x - 1) / (track.w - 2)).toFixed(3); };
          const ticks = [...el.querySelectorAll(".basalt-meter-tick")];
          const marker = el.querySelector(".basalt-range-marker");
          let worst = 0;
          for (const v of [0.2, 1.4, 0.9]) {
            setValue(v);
            await frames(3);
            const now = measure();
            for (const key of Object.keys(rest) as Array<keyof typeof rest>) worst = Math.max(worst, same(rest[key], now[key]));
          }
          await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null)));
          await frames(2);
          return [
            `role ${meter.getAttribute("role")}; ${meter.getAttribute("aria-valuetext")}`,
            `ticks at ${ticks.map((t) => at(t)).join(" and ")} of the slot (the plan 0.5 and 1.0 of 1.5: 0.333 and 0.667); the marker at ${at(marker)} (0.9: 0.600), ${px(rect(marker)!.w)} with its ring`,
            `three readings in turn: the head, the slot and the foot moved at most ${px(worst)}; no fill, no band: ${el.querySelectorAll(".basalt-meter-fill, .basalt-meter-band").length} elements`,
          ];
        }}
      />
    </div>
  );
}

const WIDTHS = [1440, 390];
const FULL = ["hover", "focus", "reduced-motion", "forced-colours"];
const QUIET = ["reduced-motion", "forced-colours"];

export const ROUND_40: Round = {
  id: "40",
  title: "The charts port: the lit marks, the headline frame, the phase chart, the share bar, the coverage strip, the marks row and the range meter",
  reviewed: false,
  summary:
    "The charts batch of the components stream (DECISIONS 153): the approved site prototypes' figures, ported with the council's changes and every colour neutral. The council's votes: 1 the lit gradient, 3 to 1 (opus: flat ink); 2 no area under a line, 3 to 1; 3 how a line curves, no majority, so the line is joined straight as foundations already says; 4 the head dot, 3 to 1; 5 the readings, 4 to 0; 6 the reference lines, no majority, so Basalt's gridlines stand (three of four wanted the kit's two guides: for you); 7 and 8 the frame and its title, 4 to 0; 9 the headline's glide, no majority, so it glides; 10 a small bar plot, a four-way split, held for you and not built; 11 the second plot height, 4 to 0; 12 the share bar's form, 3 to 1; 13 one ink, 4 to 0; 14 the hatch for a missing day, 4 to 0; 15 the marks row's shapes, 3 to 1; 16 opening a week from the plot, no majority, so the prototype's form with its breaks removed; 17 the chosen week's plate, 3 to 1; 18 the range meter's plan, 3 to 1. The design panel has not reviewed this implementation. The skill gets the trend maths only (D7a names its chart module); the other parts are React-only here.",
  steps: [
    {
      id: "lit-marks",
      name: "The lit marks: one gradient in the plot's own coordinates",
      intro: "TimeChart's `lit`. Each solid mark takes one vertical gradient, the lightest stop at the top of the plot, so a taller bar reaches brighter ink.",
      widths: WIDTHS,
      scales: [1, 2],
      height: 1500,
      decisions: [
        "Ported as approved: the kit's gradient in plot coordinates, three stops (top, 55%, base), a line one stroke in the top stop. Changed by vote 1 (3 to 1, opus wanted flat ink): the kit's base stop was 2.95:1 in dark and a dimmed bar 2.19:1 in light, so the three stops are existing neutral steps, each 3:1 on levels 0 to 3 and on the picked day's plate in both themes (chart-lit-top, -mid, -base; dark 100, 64, 52; light 9, 30, 52). No new colour. The kit's dimming of unpicked bars is not ported.",
        "Not ported (AI tells, DECISIONS 135): the vertical scrub line, the halo, the count-up and the repeated entrance. The default chart stays flat chart-observed.",
      ],
      tryIt: ["Hover a day: the plate sits behind the lit bars. Under forced colours the bars are CanvasText."],
      states: FULL,
      demo: ({ state }) => <LitDemo state={state} />,
    },
    {
      id: "headline-trend",
      name: "The headline frame and the lit trend",
      intro: "TimeChart's `headline` and `trend`. The picked day's number is the headline; the readings are small dots and their 7-day trailing mean is one straight lit line that breaks at a gap.",
      widths: WIDTHS,
      scales: [1, 2],
      height: 1200,
      decisions: [
        "Ported as approved: the kit's frame (a title and Table button, the number with its unit beside it, one context line, the plot, a caption) and its trailing mean (a 7-day window, 3 readings, one missing day keeps its trend, two stop it), now a helper that returns nulls for no data or one day (the kit divided by zero).",
        "Changed by the council: vote 7 (4 to 0) removes each break: the headline sits in a seat as wide as its widest form (digits as zeros), no live region, the key hint stays a legend, 'View as table' is Basalt's Button with aria-expanded and opens the still table in the same figure, the figcaption is required, the unit stays beside the number as a written exception. Vote 8 (4 to 0): the title is 14/20, 500, secondary in a 28px row. Consent row 4: the number is text-4xl under 720 and text-5xl from it, no clamp. Vote 2 (3 to 1): no area under the line. Vote 3 had no majority (2 to 2), so the line is joined straight. Vote 4 (3 to 1): one head dot, size-chart-mark ringed size-cut, no cursor, halo or plate. Vote 5 (4 to 0): readings are size-track dots in tertiary ink at full strength; the trend breaks at a gap, no bridge. Vote 6 had no majority: Basalt's gridlines, gutter and baseline stand.",
        "Vote 9 had no majority (2 to 2): the number glides over duration-slow when a day is picked, the readable text the target; its real value is in the first frame and it never counts up (DECISIONS 136 E).",
      ],
      tryIt: ["Press Left on a focused day: the number glides, and the seat, the unit and the context line do not move.", "Open View as table: the plot does not move."],
      states: FULL,
      demo: ({ state }) => <HeadlineDemo state={state} />,
    },
    {
      id: "phase-chart",
      name: "The phase chart: a trend over weeks with a lane of choices",
      intro: "PhaseChart. A 96px plot with the trend, one choice a week under it on the same axis, and the open week's plate behind both. A press on a day, or Enter, opens its week.",
      widths: WIDTHS,
      scales: [1, 2],
      height: 1100,
      decisions: [
        "Ported as approved: N1's twelve weeks with a lane of twelve choices on the plot's axis and the open week's plate behind both; a press on the plot or Enter opens that week.",
        "Changed by the council: vote 11 (4 to 0) the plot is the one second height, size-chart-plot-sm (96px, consent row 5: not a spacing step), fixed at every width. Vote 16 had no majority (2 to 2): the prototype's form with its breaks removed (no live region; the days stay images with a roving tab stop; the lane's choices are 44px on touch), and on a phone, where twelve 44px choices do not fit, N1's approved phone form: the lane is marks and previous and next controls step through the weeks, the open week in words. Vote 17 (3 to 1; grok: it sets in place): the chosen call is primary ink on the state-selected plate with no weight change, and the plate slides over duration-slow on ease-out.",
        "The headline above the plot uses the frame's text-4xl and text-5xl figure: N1's own 22px phase read is not carried: DECISIONS 157, consent row C6, lets the frame's size stand over it.",
      ],
      tryIt: ["Click a day on the plot, or focus one and press Enter: its week opens.", "At 390, step with Previous week and Next week."],
      states: FULL,
      demo: ({ state }) => <PhaseDemo state={state} />,
    },
    {
      id: "share-bar",
      name: "The share bar: parts of a whole in one ink",
      intro: "ShareBar. N1's form without its gloss: 8px in a plan, 12px in a tally, a 4px gap, full radius, each part's share and name under it.",
      widths: WIDTHS,
      scales: [1, 2],
      height: 700,
      decisions: [
        "Ported as approved (vote 12, 3 to 1; muse wanted the personal site's): N1's geometry and its value and name under each part (14/20 600 and 13/18 secondary). Removed: its inset gloss (DECISIONS 135). Vote 13 (4 to 0): one ink for every part, a gap, the name and share in words; no steps of ink. Consent row 12 fell away with vote 12.",
        "The shares are whole percents that add to 100; the bar is decoration and the words are read once (the kit's label read the key twice). A part of nothing is left out. It draws at rest and is never a page's one entrance.",
      ],
      tryIt: ["Resize: nothing overlaps; the 12px bar keeps its smallest part as wide as its words, never under 12px, inside the bar."],
      states: QUIET,
      demo: ({ state }) => <ShareDemo state={state} />,
    },
    {
      id: "coverage-strip",
      name: "The coverage strip: a cell a day",
      intro: "CoverageStrip. A sliver a day (84 for a quarter) or seven squares for a week; lit when recorded, the hatch when not; the missing dates in words built from the cells.",
      widths: WIDTHS,
      scales: [1, 2],
      height: 600,
      decisions: [
        "Ported as approved: N1's strip and week squares. Vote 14 (4 to 0): a missing day is Basalt's hatch, not a dashed seat at 3.02:1. The cell fill follows vote 1. Consent rows: 6 the corner is a new radius-2xs (2px), 7 the strip is 48px tall (space-12, from 44), 8 the week's squares have a 4px gap (from 5).",
        "The seven-day label is built from the cells, not written by hand (it could drift). The cells are aria-hidden; the words say it. It draws at rest.",
      ],
      tryIt: ["Change a day's `recorded`: the words change with the cells."],
      states: QUIET,
      demo: ({ state }) => <CoverageDemo state={state} />,
    },
    {
      id: "marks-row",
      name: "The marks row: columns, pills and blocks",
      intro: "MarksRow. One kind of reading across a run of days in the form of the thing measured; a rest day is a dot, a missing day the hatch; 56px tall.",
      widths: WIDTHS,
      scales: [1, 2],
      height: 900,
      decisions: [
        "Ported as approved (vote 15, 3 to 1; grok wanted square columns): the dashboard's three forms and the rest-day dot, as a written exception to the square-bar rule. Consent rows 9 (a column's top corners radius-md, 8px, from 7), 10 (the row is size-chart-row, 56px, a default an app can set), 11 (the marks glide over duration-slow, from 240ms). Vote 14: the missing day is the hatch. The marks take vote 1's gradient as one for the whole row, in plot coordinates, for columns, pills and blocks alike (a short pill is no brighter than a short column at the same height). Not ported: the plan line, the pick state and the weight path nothing called.",
        "Widths the prototype set by hand are derived from tokens (a column min(44%, 28px), a pill min(26%, space-3), a block min(64%, 44px)); no new token. It draws at rest and is never a page's one entrance.",
      ],
      tryIt: ["Press 'New values': the marks glide to their heights and the row does not change size."],
      states: QUIET,
      demo: ({ state }) => <MarksDemo state={state} />,
    },
    {
      id: "range-meter",
      name: "The range meter: a reading against a plan range",
      intro: "RangeMeter. Meter's slot with its target tick drawn twice, at the plan's two ends, and the reading as a ringed dot. role=meter, the plan in its words.",
      widths: WIDTHS,
      scales: [1, 2],
      height: 500,
      decisions: [
        "Ported as approved: N1's rate meter (a marker against a plan, 0 to 1.5). Vote 18 (3 to 1; sol wanted the chart's band): the plan is two of the meter's own target ticks with nothing between, the marker a ringed dot, role=meter; the band and the 8% track (about 1.1:1) are not ported. Consent row 14: the marker is the new size-meter-marker (12px) with a size-cut ring. Consent row 15 stands as proposed: the 4px bleed is the meter tick's own reach past the slot, which the tick drawn twice keeps; only the 1px band edge, a value of the option that lost, falls away.",
        "The two ends and the marker are placed from one scale in script (the prototype had a band at a fixed third against a scale ending at 1.5, so they could part).",
      ],
      tryIt: ["Press 0.2, 0.9 and 1.4: only the marker moves; the words say under, inside or over the plan."],
      states: QUIET,
      demo: ({ state }) => <RangeDemo state={state} />,
    },
  ],
};
