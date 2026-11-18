// Round 45: panels, art and parts, the last port batch of the components stream (DECISIONS 162): the flat table in a panel (D18b), the art tones for drawn lines, the closing
// block and captioned columns (D18d), the app tile (D19a) and the period stepper (D19b). Each was ported from a site the owner approved (DECISIONS 151); the council voted on what
// the port had to change (DECISIONS 162). Two things are not here: D17 (an accent as a fill, and a product's palette) waits for a research round on colour, and Blacksand's
// drawing with labels set on it (vote 3) is not ported, it stays the site's own. The design panel has not reviewed this implementation. Every word is synthetic, and Basalt ships no
// company's icon file: the tile's picture below is a neutral stand-in drawn for this page.
//
// The readouts under each part are this review page's own: they are measured from the rendered DOM when the page loads (a number printed here is the browser's, not a claim).
// "hover" puts a real pointer on the part that marks itself `data-wt-hover`; "focus" moves focus to the part's first control. "forced-colours", "reduced-motion", "print" and
// "touch" are real emulations.

import * as React from "react";

import {
  AppTile,
  Badge,
  Button,
  Card,
  CardContent,
  CaptionedColumn,
  CaptionedColumns,
  PeriodStepper,
  Stage,
  Table,
  TableBody,
  TableCall,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tab,
  Tabs,
  TabsList,
  Text,
  AmbientMark,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const mono: React.CSSProperties = { margin: 0, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--basalt-border-input)", background: "var(--basalt-surface-1)", color: "var(--basalt-text-primary)", fontFamily: "var(--basalt-font-family-mono)", fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" };
const caption = (text: string) => <Text size="sm" tone="secondary">{text}</Text>;
const px = (n: number) => `${Math.round(n * 100) / 100}px`;
const box = (el: Element | null) => (el ? el.getBoundingClientRect() : null);

type ReadyWindow = Window & { __BASALT_READY__?: Promise<void> };
const frames = (n: number) => new Promise<void>((done) => { const step = (left: number) => (left <= 0 ? done() : requestAnimationFrame(() => step(left - 1))); step(n); });

/** Runs `read` once the page has laid out, prints the lines it returns, and holds the shot until they are written (see round 41's Readout). */
function Readout({ read, again = [], title = "Measured on this page" }: { read: (root: HTMLElement) => string[]; again?: unknown[]; title?: string }) {
  const ref = React.useRef<HTMLPreElement>(null);
  const [lines, setLines] = React.useState<string[]>([]);
  const ready = React.useRef<{ promise: Promise<void>; done: () => void } | null>(null);
  if (!ready.current) {
    let done = () => {};
    const promise = new Promise<void>((resolve) => { done = resolve; });
    ready.current = { promise, done };
  }
  React.useLayoutEffect(() => {
    const own = ready.current!;
    (window as ReadyWindow).__BASALT_READY__ = Promise.race([own.promise, new Promise<void>((resolve) => window.setTimeout(resolve, 8000))]);
    return () => own.done();
  }, []);
  React.useEffect(() => {
    let live = true;
    const t = window.setTimeout(async () => {
      const root = ref.current?.closest("[data-round45]") as HTMLElement | null;
      let next: string[];
      try { next = root ? read(root) : ["(no page to measure)"]; } catch (error) { next = [`(the measurement failed: ${error instanceof Error ? error.message : String(error)})`]; }
      if (!live) return;
      setLines(next);
      await frames(3);
      if (live) ready.current?.done();
    }, 400);
    return () => { live = false; window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, again);
  return <pre ref={ref} style={mono}>{`${title}\n${lines.join("\n")}`}</pre>;
}

const Page = ({ children, gap = 16 }: { children: React.ReactNode; gap?: number }) => <div data-round45="" style={{ ...col, gap }}>{children}</div>;
const hoverMark = (state: string) => (state === "hover" ? { "data-wt-hover": "" } : {});
/** What a state asks the page to do before the shot: focus a part's first control, both real. */
function useFocusFirst(state: string, selector: string) {
  React.useEffect(() => {
    if (state !== "focus") return;
    const t = window.setTimeout(() => (document.querySelector(selector) as HTMLElement | null)?.focus(), 150);
    return () => window.clearTimeout(t);
  }, [state, selector]);
}
const colour = (el: Element | null, prop: "color" | "backgroundColor" | "borderTopColor" | "stroke") => (el ? getComputedStyle(el)[prop] : "?");

// ---- D18b: the flat table in a panel ----
const QUEUE: [string, string, string, string][] = [
  ["Athlete A", "Hold the plan", "Nothing changes this week", "2 days"],
  ["Athlete B", "Lower Thursday's load by a third", "A synthetic reason that is long enough to wrap inside its column", "5 days"],
  ["Athlete C", "Move the long run", "Saturday to Sunday", "1 day"],
];
function FlatTableDemo({ state }: { state: string }) {
  useFocusFirst(state, ".basalt-table-container");
  const narrow = state === "focus";
  return (
    <Page>
      <div style={{ maxWidth: narrow ? 360 : 640 }}>
        <Card data-wt-card="">
          <CardContent>
            {/* The panel's head and note are the app's markup (2C note 4): one flex line that wraps, the title text-md at 500, the count text-base at 400 with the accent dot. */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "var(--basalt-space-1) var(--basalt-space-4)", marginBottom: "var(--basalt-space-5)" }}>
              <p style={{ margin: 0, whiteSpace: "nowrap", color: "var(--basalt-text-primary)", font: "var(--basalt-font-weight-medium) var(--basalt-text-md-size) / var(--basalt-text-md-line-height) var(--basalt-font-family-sans)" }}>Monday's review queue</p>
              <Badge status="accent" variant="plain" style={{ whiteSpace: "nowrap", color: "var(--basalt-text-primary)", font: "var(--basalt-font-weight-regular) var(--basalt-text-base-size) / var(--basalt-text-base-line-height) var(--basalt-font-family-sans)" }}>3 drafts need you</Badge>
            </div>
            <TableContainer flat label="Monday's review queue">
              <Table columns={[{ width: 88 }, {}, { width: 84 }]} minWidth={narrow ? 520 : 280}>
                <TableHeader><TableRow><TableHead>Athlete</TableHead><TableHead>Draft</TableHead><TableHead numeric>Waiting</TableHead></TableRow></TableHeader>
                <TableBody>
                  {QUEUE.map(([who, call, what, wait], i) => (
                    <TableRow key={who} {...(i === 1 ? hoverMark(state) : {})}><TableCell>{who}</TableCell><TableCell><TableCall call={call} detail={what} /></TableCell><TableCell numeric>{wait}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <p style={{ margin: "var(--basalt-space-4) 0 0", color: "var(--basalt-text-tertiary)", font: "var(--basalt-font-weight-regular) var(--basalt-text-sm-size) / var(--basalt-text-sm-line-height) var(--basalt-font-family-sans)" }}>Illustration. Made-up athletes; most weeks the draft is to hold.</p>
          </CardContent>
        </Card>
      </div>
      <Readout read={(root) => {
        const card = root.querySelector("[data-wt-card]")!;
        const frame = root.querySelector(".basalt-table-container") as HTMLElement;
        const fs = getComputedStyle(frame);
        const th = root.querySelector("th")!;
        const td = root.querySelector("tbody td")!;
        const call = root.querySelector(".basalt-table-call")!;
        const a = box(call.querySelector(".basalt-table-call-main"))!;
        const b = box(call.querySelector(".basalt-table-call-detail"))!;
        const heads = [...root.querySelectorAll("th")].map((h) => px(box(h)!.width)).join(", ");
        return [
          `the card is the one box: level ${card.getAttribute("data-level")}, border ${getComputedStyle(card).borderTopWidth}, radius ${getComputedStyle(card).borderTopLeftRadius}`,
          `the table's frame: border ${fs.borderTopWidth}, radius ${fs.borderTopLeftRadius}, fill ${fs.backgroundColor}, shadow ${fs.boxShadow}, level ${frame.getAttribute("data-level") ?? "none (the card's)"}`,
          `the header band keeps its fill ${colour(th, "backgroundColor")} (surface-sunken-strong); a square band inset by the card's space-4 (${px(box(frame)!.x - box(card)!.x - 1)}) — whether it reads as a box in a box is for the review`,
          `cells padded ${getComputedStyle(td).paddingTop} above and below, ${getComputedStyle(td).paddingLeft} aside; the call ${getComputedStyle(call.querySelector(".basalt-table-call-main")!).fontWeight} in primary over the detail ${getComputedStyle(call.querySelector(".basalt-table-call-detail")!).fontWeight} in secondary, ${px(b.top - a.bottom)} apart`,
          `column widths ${heads}: a still table (they do not move with the text; the test measures 0px)`,
          `the row with the long reason is ${px(box(root.querySelectorAll("tbody tr")[1]!)!.height)} tall, the others ${px(box(root.querySelectorAll("tbody tr")[0]!)!.height)}`,
          `the frame is ${frame.getAttribute("tabindex") === "0" ? "a keyboard stop while it overflows (the control ring, +2 outside)" : "not a keyboard stop: the table fits"}`,
        ];
      }} />
    </Page>
  );
}

// ---- D18d vote 1: the art tones ----
function WindowDrawing({ tones }: { tones: boolean }) {
  const ink = tones
    ? { primary: "var(--basalt-art-mark)", secondary: "var(--basalt-art-tone-4)", tertiary: "var(--basalt-art-tone-3)", faint: "var(--basalt-art-tone-2)" }
    : { primary: "var(--basalt-text-primary)", secondary: "var(--basalt-text-secondary)", tertiary: "var(--basalt-text-tertiary)", faint: "color-mix(in oklab, var(--basalt-text-primary) 30%, transparent)" };
  const line = (stroke: string, width: number) => ({ fill: "none", stroke, strokeWidth: width, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, vectorEffect: "non-scaling-stroke" as const });
  return (
    <svg viewBox="0 0 240 150" role="img" aria-label={tones ? "A drawing of two windows, in the art tones" : "The same drawing, in text inks"} style={{ display: "block", width: "100%", background: "var(--basalt-surface-page)" }} data-wt-tones={tones ? "tones" : "inks"}>
      <rect x="20" y="20" width="90" height="110" {...line(ink.primary, 1.5)} />
      <rect x="130" y="20" width="90" height="110" {...line(ink.secondary, 1)} />
      <path d="M20 75 H110 M65 20 V130" {...line(ink.tertiary, 1)} />
      <path d="M130 75 H220 M175 20 V130" {...line(ink.faint, 1)} />
      <path d="M30 120 C60 90 90 110 104 40" {...line(ink.primary, 1.25)} />
    </svg>
  );
}
function ArtTonesDemo() {
  return (
    <Page>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <div style={col}>{caption("As SRA draws it today: text inks, and primary at 30%")}<WindowDrawing tones={false} /></div>
        <div style={col}>{caption("As ported: the art tones nearest each ink")}<WindowDrawing tones /></div>
      </div>
      <Readout read={(root) => {
        const strokes = (kind: string) => [...root.querySelectorAll(`[data-wt-tones=${kind}] path, [data-wt-tones=${kind}] rect`)].map((p) => colour(p, "stroke"));
        const before = strokes("inks");
        const after = strokes("tones");
        const names = ["secondary line (rect)", "tertiary lines (cross)", "30% lines (cross)", "primary curve"];
        return [
          "mapping (vote 1, 3 to 1): text-primary → art-mark (the same colour); text-secondary → art-tone-4; text-tertiary → art-tone-3; primary at 30% → art-tone-2",
          `primary frame: ${before[0]} → ${after[0]}`,
          `${names[0]}: ${before[1]} → ${after[1]}`,
          `${names[1]}: ${before[2]} → ${after[2]}`,
          `${names[2]}: ${before[3]} → ${after[3]}`,
          "stroke widths are the drawing's own and are not ported; text drawn in the SVG stays a text ink. In dark the mid lines get a little lighter and the fine lines a little darker.",
        ];
      }} />
    </Page>
  );
}

// ---- D18d votes 2 and 3: the closing block ----
function ClosingDemo({ state }: { state: string }) {
  useFocusFirst(state, ".basalt-stage .basalt-button");
  // The marks are placed in pixels from the block's top, inside the top padding (64px at 390), which no quiet zone reaches at any width: a percentage of the block's height lands on the words when they wrap.
  const dots = [[12, 20], [30, 36], [47, 24], [63, 40], [81, 28], [90, 44]];
  const sky = (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <rect width="100" height="100" fill="var(--basalt-art-field)" />
      <path d="M0 78 C25 66 45 84 70 72 S92 70 100 76 V100 H0Z" fill="var(--basalt-art-tone-1)" />
      <path d="M0 90 C20 82 50 94 75 86 S95 84 100 88 V100 H0Z" fill="var(--basalt-art-tone-2)" />
    </svg>
  );
  return (
    <Page gap={0}>
      <div data-wt-above="" style={{ padding: "var(--basalt-space-6)", border: "1px solid var(--basalt-border-divider)", borderRadius: 12 }}>
        <Text>The page's last section. The closing block begins one section gap below it.</Text>
      </div>
      <Stage
        closing
        art={<>{sky}{dots.map(([x, y], i) => <AmbientMark key={i} index={i} style={{ left: `${x}%`, top: y }} />)}</>}
        style={{ ["--basalt-stage-room" as string]: "var(--basalt-space-12)" }}
        data-wt-closing=""
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16, paddingInline: "var(--basalt-gutter)" }}>
          <h2 data-quiet="line" style={{ margin: 0, font: "var(--basalt-font-weight-semibold) var(--basalt-text-4xl-size) / var(--basalt-text-4xl-line-height) var(--basalt-font-family-sans)", letterSpacing: "var(--basalt-text-4xl-tracking)" }}>Words in a quiet zone.</h2>
          <p data-quiet="lead" style={{ margin: 0, maxWidth: "var(--basalt-size-prose-width)", color: "var(--basalt-text-secondary)" }}>The closing block is the stage's second form: level 0 on art-field, no headroom and no pull-up. Its art is behind the words and held still.</p>
          <div data-quiet="actions"><Button variant="primary">Start</Button></div>
        </div>
      </Stage>
      <div style={{ height: 16 }} />
      <Readout read={(root) => {
        const stage = root.querySelector("[data-wt-closing]") as HTMLElement;
        const above = root.querySelector("[data-wt-above]")!;
        const s = getComputedStyle(stage);
        const mark = stage.querySelector("[data-ambient]");
        const art = stage.querySelector(".basalt-stage-art") as HTMLElement;
        return [
          `no headroom marker: ${stage.querySelectorAll("[data-basalt-headroom]").length}; headroom declared: ${stage.hasAttribute("data-headroom") ? "yes" : "no"}; the site bar is not changed by it`,
          `the air above it ${px(box(stage)!.top - box(above)!.bottom)} and its top padding ${s.paddingTop} (--basalt-section-gap: ${getComputedStyle(document.documentElement).getPropertyValue("--basalt-section-gap").trim() || "from the token"}), bottom padding ${s.paddingBottom} (the art's room, the app's)`,
          `level 0: border ${s.borderTopWidth}, radius ${s.borderTopLeftRadius}, shadow ${s.boxShadow}, fill ${s.backgroundColor} (art-field)`,
          `the art: ${getComputedStyle(art).position}, pointer-events ${getComputedStyle(art).pointerEvents}, aria-hidden ${art.getAttribute("aria-hidden")}; display ${getComputedStyle(art).display}`,
          `a mark's animation: ${mark ? getComputedStyle(mark).animationName : "?"} at opacity ${mark ? getComputedStyle(mark).opacity : "?"} (held still: the page's one loop is the top stage's)`,
          `Blacksand's drawing with labels on it (vote 3) is not ported: it recomposes for its box, so it stays the site's own.`,
        ];
      }} />
    </Page>
  );
}

// ---- D18d vote 4: captioned columns ----
function useCount(table: [number, number][]) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [count, setCount] = React.useState(1);
  React.useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const measure = () => { const width = node.getBoundingClientRect().width; setCount(table.reduce((n, [from, columns]) => (width >= from ? columns : n), 1)); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, count] as const;
}
function ColumnsDemo() {
  // The count is the app's: three from 900px for large; two from 480 and four from 960 for small (the approved pages).
  const [largeRef, large] = useCount([[900, 3]]);
  const [smallRef, small] = useCount([[480, 2], [960, 4]]);
  const items: [string, string][] = [["A first claim", "A synthetic sentence that says what follows from it, in a few words more."], ["A second claim", "Another synthetic sentence, shorter."], ["A third claim", "A third one, which is a little longer than the others are so the rows differ."], ["A fourth claim", "The last."]];
  return (
    <Page>
      <div ref={largeRef}>
        <CaptionedColumns size="large" columns={large as 1 | 2 | 3} data-wt-large="">{items.slice(0, 3).map(([head, body]) => <CaptionedColumn key={head} head={head}>{body}</CaptionedColumn>)}</CaptionedColumns>
      </div>
      <div ref={smallRef}>
        <CaptionedColumns size="small" columns={small as 1 | 2 | 4} data-wt-small="">{items.map(([head, body]) => <CaptionedColumn key={head} head={head}>{body}</CaptionedColumn>)}</CaptionedColumns>
      </div>
      <Readout again={[large, small]} read={(root) => {
        const sizes = (el: Element) => { const dt = el.querySelector("dt")!; const dd = el.querySelector("dd")!; const a = getComputedStyle(dt); const b = getComputedStyle(dd); return `head ${a.fontSize} at ${a.fontWeight} in ${colour(dt, "color")}, ${px(box(dd)!.top - box(dt)!.bottom)} over a ${b.fontSize} at ${b.fontWeight} sentence in ${colour(dd, "color")}`; };
        const l = root.querySelector("[data-wt-large]")!;
        const s = root.querySelector("[data-wt-small]")!;
        const li = getComputedStyle(l.querySelector(".basalt-captioned-item")!);
        const sl = getComputedStyle(s);
        return [
          `large, ${large} column${large > 1 ? "s" : ""}: a rule on top of each item (${li.borderTopWidth}), padding ${li.paddingTop} above and ${li.paddingBottom} below; ${sizes(l)}`,
          `small, ${small} column${small > 1 ? "s" : ""}: one rule over the list (${sl.borderTopWidth}), ${sl.paddingTop} under it, ${sl.rowGap} between rows; ${sizes(s)}`,
          `the gutter is ${getComputedStyle(l).columnGap} (size-gutter) in both; the count is the app's (3 from 900px for large; 2 from 480 and 4 from 960 for small), so the part has no breakpoints of its own`,
        ];
      }} />
    </Page>
  );
}

// ---- D19a: the app tile ----
// A neutral stand-in drawn for this page: two flat greys. It is not a company's icon file, and Basalt ships none.
const STAND_IN = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#6f6f6f"/><circle cx="100" cy="100" r="54" fill="#d4d4d4"/><rect x="84" y="84" width="32" height="32" fill="#6f6f6f"/></svg>`)}`;
const TILE_SIZES = [20, 32, 36, 40, 44, 48, 52] as const;
function TileDemo() {
  return (
    <Page>
      <div style={{ ...col, gap: 12 }}>
        {TILE_SIZES.map((size) => (
          <div key={size} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AppTile size={size} src={STAND_IN} data-wt-tile={size} />
            <Text>Synthetic company <Text as="span" tone="secondary" size="sm">at {size}px</Text></Text>
          </div>
        ))}
      </div>
      {caption("The tile is decorative and always has the company's name beside it. The picture is a neutral stand-in: Basalt ships no company's icon file.")}
      <Readout read={(root) => {
        const tile = root.querySelector("[data-wt-tile='52']")!;
        const rim = tile.querySelector(".basalt-app-tile-rim")!;
        const path = rim.querySelector("path")!;
        const ps = getComputedStyle(path);
        const sizes = TILE_SIZES.map((s) => { const b = box(root.querySelector(`[data-wt-tile='${s}']`)); return `${s}: ${px(b!.width)} by ${px(b!.height)}`; }).join("; ");
        return [
          `sizes: ${sizes}`,
          `the shape: a superellipse of exponent 5, ${(path.getAttribute("d")!.match(/L/g) ?? []).length + 1} points, drawn by the tile's own clip (${tile.querySelector("clipPath")!.id}); it takes no radius (${getComputedStyle(tile).borderTopLeftRadius}); shadow ${getComputedStyle(tile).boxShadow}`,
          `the hairline follows it: ${ps.strokeWidth}, ${colour(path, "stroke")} (border-hairline), non-scaling (${ps.vectorEffect}), ${px(box(tile)!.x - box(rim)!.x)} outside the picture on each side`,
          `aria-hidden ${tile.getAttribute("aria-hidden")}; draggable ${tile.querySelector("img")!.getAttribute("draggable")}; user-select ${getComputedStyle(tile).userSelect}; forced colours: not drawn`,
        ];
      }} />
    </Page>
  );
}

// ---- D19b: the period stepper ----
function StepperDemo({ state }: { state: string }) {
  const [n, setN] = React.useState(state === "at-end" ? 12 : 8);
  const last = 12;
  React.useEffect(() => {
    if (state === "hover") document.querySelector(".basalt-period-stepper .basalt-button")?.setAttribute("data-wt-hover", "");
    if (state === "focus") { const t = window.setTimeout(() => (document.querySelector(".basalt-period-stepper .basalt-button") as HTMLElement | null)?.focus(), 150); return () => window.clearTimeout(t); }
    if (state === "at-end") { const t = window.setTimeout(() => (document.querySelector("[data-wt-bar] .basalt-period-stepper .basalt-button:last-child") as HTMLElement | null)?.focus(), 150); return () => window.clearTimeout(t); }
    return undefined;
  }, [state]);
  // labels[n] is week n's (there is no week 0): every week the buttons can reach has one, so pressing "The week before" never blanks the label.
  const labels = ["", "10 to 16 Aug", "17 to 23 Aug", "24 to 30 Aug", "31 Aug to 6 Sept", "7 to 13 Sept", "14 to 20 Sept", "21 to 27 Sept", "28 Sept to 4 Oct", "5 to 11 Oct", "12 to 18 Oct", "19 to 25 Oct", "26 Oct to 1 Nov"];
  const bar = (key: string, isWhole: boolean) => (
    <div style={{ containerType: "inline-size", border: "1px solid var(--basalt-border-divider)", borderRadius: 12 }} data-wt-bar={key}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", justifyContent: "space-between", minHeight: 56, paddingInline: "var(--basalt-space-1)", borderBottom: "1px solid var(--basalt-border-divider)" }}>
        <Tabs value="week"><TabsList aria-label={`Dashboard ${key}`}><Tab value="week">Week</Tab><Tab value="trends">Trends</Tab><Tab value="sources">Sources</Tab></TabsList></Tabs>
        <PeriodStepper
          label={isWhole ? "17 Aug to 8 Nov" : labels[n]!}
          spokenPrefix={isWhole ? "" : `Week ${n}, build, `}
          previousLabel="The week before"
          nextLabel="The week after"
          whole={isWhole}
          atStart={n <= 1}
          atEnd={n >= last}
          onPrevious={() => setN((v) => Math.max(1, v - 1))}
          onNext={() => setN((v) => Math.min(last, v + 1))}
        />
      </div>
      <div style={{ padding: "var(--basalt-space-4)" }}><Text size="sm" tone="secondary">The view below the bar.</Text></div>
    </div>
  );
  return (
    <Page>
      {caption("A week view, then the whole-span view (the Sources view), under it: the buttons are hidden there and keep their room.")}
      {bar("a", false)}
      {bar("b", true)}
      <Readout again={[n]} read={(root) => {
        const stepper = root.querySelector("[data-wt-bar='a'] .basalt-period-stepper")!;
        const whole = root.querySelector("[data-wt-bar='b'] .basalt-period-stepper")!;
        const parts = (el: Element) => [...el.querySelectorAll("button, .basalt-period-label")].map((e) => { const r = e.getBoundingClientRect(); const o = el.getBoundingClientRect(); return [r.x - o.x, r.width]; });
        const [prev, next] = [...stepper.querySelectorAll("button")];
        const label = stepper.querySelector(".basalt-period-label")!;
        const ls = getComputedStyle(label);
        const bs = box(stepper)!;
        const containerWidth = box(stepper.closest("[data-wt-bar]"))!.width;
        const states = [prev!, next!].map((b) => `${b.getAttribute("aria-label")}: ${b.getAttribute("aria-disabled") === "true" ? "stopped, still focusable" : "ready"}`).join("; ");
        const moved = parts(stepper).map((p, i) => Math.max(Math.abs(p[0]! - parts(whole)[i]![0]!), Math.abs(p[1]! - parts(whole)[i]![1]!)));
        return [
          `buttons ${px(box(prev!)!.width)} by ${px(box(prev!)!.height)} (ghost, the core chevrons), ${px(box(label)!.left - box(prev!)!.right)} from the label; ${states}`,
          `label ${ls.fontSize} at ${ls.fontWeight}, ${ls.lineHeight} line, ${ls.fontVariantNumeric}, ${ls.whiteSpace}; seat ${px(box(label)!.width)} (at least ${ls.minWidth}); the widest week label measures 110px, so 128 holds it`,
          `the whole-span view: buttons ${[...whole.querySelectorAll("button")].map((b) => getComputedStyle(b).visibility).join(", ")}; the previous button, the label and the next button move ${moved.map(px).join(", ")} from where the week view has them (0px)`,
          `${containerWidth < 640 ? "the stepper has its own row (the bar's container is under 640px)" : "the stepper is inline beside the tabs (the bar's container is 640px or more)"}: ${px(containerWidth)} container, the stepper ${px(bs.width)} by ${px(bs.height)}, border above ${getComputedStyle(stepper).borderTopWidth}`,
          `spoken: one polite status line after the label holds still 400ms ("Week ${n}, build, ${labels[n] ?? ""}"); the prefix is never drawn`,
        ];
      }} />
    </Page>
  );
}

const COMMON = { widths: [1440, 390], scales: [1, 2], height: 760 };
const MEDIA = ["forced-colours", "reduced-motion"];

export const ROUND_45: Round = {
  id: "45",
  title: "Panels, art and parts: the flat table, art tones, the closing block, captioned columns, the app tile and the period stepper",
  reviewed: false,
  summary:
    "The last port batch of the components stream, ported from the owner's approved site prototypes (DECISIONS 151) with the council's changes (DECISIONS 162): a table laid flat inside a Card with a two-line cell (D18b); the art tones for a drawing's lines; the closing block, a second form of Stage; captioned columns in two sizes (D18d); the app tile, a picture clipped to a superellipse (D19a); and the period stepper (D19b). D17 (an accent as a fill, and a product's palette) is not built: it waits for a research round on colour and contrast. Blacksand's drawing with labels set on it (vote 3) is not ported: it stays the site's own. Basalt ships no company's icon file: the tile's picture is a neutral stand-in. The design panel has not reviewed this implementation. Every word is synthetic.",
  steps: [
    {
      id: "flat-table", name: "D18b: a flat table in a panel", intro: "TableContainer flat inside a Card: one box, not two. A two-line cell (TableCall) is a call over what it changes. The panel's head and note are the app's markup.",
      ...COMMON, states: ["hover", "focus", ...MEDIA],
      decisions: [
        "Ported as approved (N1's review queue, page.css:474-485): the table's own frame has no border, radius, fill or shadow; the cells are padded space-2 above and below; a two-line cell is a 500 call in primary over what changes in secondary, space-0-5 (2px) apart; the head is one flex line (gap space-1 by space-4, space-5 below) with the title text-md at 500 and the count text-base at 400; the note is text-sm tertiary, space-4 above. The header band keeps its fill.",
        "Changed by the consent list (all six rows stand): the line heights are each size's token (row 3: the stepper label 20, the title 24, the count 20) and the count's dot is the accent Badge dot, size-dot 6px (row 4), not an 8px brass fill. The colour of that dot is D17's, which waits.",
        "Changed by note 5, 4 to 0: the panel is a Card with its own space-4 padding, where the slab had 20 to 32px, so the table sits 4 to 16px closer to the rim. The slab itself (D18a) is out of this stream.",
        "Not checked before the build, and now shown in both themes: how the header band, square and inset by the card's padding, reads in a rounded card. If it reads as a box in a box, that is a design item for the owner.",
      ],
      tryIt: ["In \"hover\", a row takes the wash. In \"focus\" the card is 360px, so the table overflows and its frame is a keyboard stop.", "The row with the long reason grows; no column or header moves."],
      demo: ({ state }) => <FlatTableDemo state={state} />,
    },
    {
      id: "art-tones", name: "D18d vote 1: the art tones for a drawing's lines", intro: "A drawing's lines take the art tones, not the text inks: the same drawing, before and after.",
      ...COMMON, states: MEDIA,
      decisions: [
        "Vote 1, 3 to 1 (option a; sol wrote three art-line aliases): SRA's drawings take the tone nearest each ink: text-primary to art-mark (the same colour), text-secondary to art-tone-4, text-tertiary to art-tone-3, and primary at 30% to art-tone-2. Stroke widths are the drawing's own and are not ported; text drawn in the SVG stays a text ink.",
        "What moves, from opus's measurement: in dark the secondary lines go 12 steps lighter and the tertiary 10 darker; primary at 30% composites to #474747 in dark and #b6b6b6 in light, and art-tone-2 is the nearest tone in both. The order of the four inks is kept.",
        "Nothing ships as a component for this: SRA's drawings are the site's own. Foundations gains the rule, and this page shows it on a sample drawing.",
      ],
      tryIt: ["Compare the two drawings in each theme; the readout prints each stroke's colour before and after."],
      demo: () => <ArtTonesDemo />,
    },
    {
      id: "closing-block", name: "D18d votes 2 and 3: the closing block", intro: "Stage closing: the stage's second form at a page's end. Level 0 on art-field, no headroom and no pull-up, its art held still.",
      ...COMMON, states: ["focus", ...MEDIA, "print"],
      decisions: [
        "Ported as approved (Blacksand's The way in, blacksand.css:148-156): ground art-field, the art layer absolute with inset 0, clipped, pointer-events none and hidden from assistive technology, words and actions in data-quiet zones, and in forced colours and print the art is not drawn and the bottom padding is space-16. It reuses Stage's art layer and its forced-colours and print rules, and checkHeadroom reads each quiet zone grown by space-1-5.",
        "Vote 2, 4 to 0 (option a): a second form of Stage with no ambient mark. The page's one loop is the top stage's; the sky's stars, which breathe in the prototype, are drawn at full opacity and held. The foundations line reads: one stage at the top, and at most one closing block at the end.",
        "Consent rows 5 and 6: the top padding and the air above are --basalt-section-gap (128, 96 or 64 by width), where the prototype's two were fluid between 64 and 128; the ends are the same values.",
        "Vote 3, 3 to 1 (option c): Blacksand's drawing with labels set on it is not ported. It recomposes for its box, which foundations already calls the site's own (DECISIONS 146 F). Nothing of it is on this page.",
      ],
      tryIt: ["In forced colours the art is not drawn and the block is the system's Canvas; in print the bottom padding is 64px.", "A mark in the sky keeps full opacity: it does not breathe."],
      demo: ({ state }) => <ClosingDemo state={state} />,
    },
    {
      id: "captioned-columns", name: "D18d vote 4: captioned columns, large and small", intro: "CaptionedColumns: a short head over a sentence, in the columns the app counts. One part in two sizes, each with the approved values.",
      ...COMMON, states: MEDIA,
      decisions: [
        "Vote 4, 4 to 0 (option a): one part, two sizes. Large is the home page's list (blacksand.css:137-140): a border-divider rule on top of each item and space-6 of padding, the head text-xl at 600 in primary with the token's tracking, space-3 above a text-md 400 sentence in secondary at 24. Small is the captions' list (way.css:150-154, :164-175): one size-hairline rule over the list and space-5 under it, space-6 between rows, the head text-base at 500, space-1 above a text-base 400 sentence. The gutter is size-gutter in both.",
        "Ported as approved, with the prototype's raw weights (500, 600, 400) written as the weight tokens, and the head over its sentence as a dt and a dd.",
        "The count is the app's (columns, 1 to 4), because the approved pages differ (3 from 900px; 2 from 480 and 4 from 960 of the container): this page counts from the width of its own box. The part carries no breakpoints.",
      ],
      tryIt: ["The large list is three columns from 900px and one under; the small list is four from 960, two from 480 and one under."],
      demo: () => <ColumnsDemo />,
    },
    {
      id: "app-tile", name: "D19a: the app tile", intro: "AppTile: the picture an app gives it, clipped to a superellipse with a hairline that follows it. Always beside the company's name.",
      ...COMMON, states: [...MEDIA, "touch"],
      decisions: [
        "Ported as approved (N1's Tiles.tsx and page.css:396-400): a square box of the size its parent sets (20, 32, 36, 40, 44, 48 and 52), the picture clipped to the icon shape, one solid 1px hairline in border-hairline drawn over it and half a pixel outside, no shadow, nothing drawn over the picture, user-select none, draggable off, and not drawn in forced colours.",
        "Vote 5, 4 to 0 (option a): the tile draws the image the app gives it, clipped to its shape, always beside the company's name. Basalt ships no company's icon file, in the package, the reference or the skill: this page's picture is a neutral stand-in drawn for it. Foundations says the tile shows what a product has the right to show.",
        "Vote 6, 4 to 0 (option a): a superellipse of exponent 5 at every size, the hairline following it. \"Radius by role\" gains the line: an app tile takes no radius.",
        "Engineering, no pixel (2C 6 and 7): each tile carries its own clip with its own id, so a page that forgot a definition cannot leave one unclipped; the 120 points are built when first used; the tile takes a size from the seven, or is the width of its box.",
      ],
      tryIt: ["Zoom to see the hairline following the corner at 20px; in forced colours the tile is not drawn and the name stays."],
      demo: () => <TileDemo />,
    },
    {
      id: "period-stepper", name: "D19b: the period stepper", intro: "PeriodStepper: two icon buttons round a label that says which stretch of time is shown. Under 640px of its container it takes its own row under the tabs.",
      ...COMMON, states: ["hover", "focus", "at-end", ...MEDIA, "touch"],
      decisions: [
        "Ported as approved (N1's Dash.tsx:336-340, page.css:97-99 and :343-347): ghost icon buttons at the default size, the label text-base at 500 in primary, centred, tabular and on one line in a fixed seat, a gap of space-1; with no weeks both buttons are hidden and keep their room; under 640px the stepper takes its own row, full width, 52px tall, space-2 of inline padding, a hairline above and buttons at least 44 by 44.",
        "Consent rows 1 to 3 (all stand): the seat is space-32 (128px), not 140 (opus measured the widest label at 110px, grok at 101); the row breaks at size-breakpoint-container-lg (640px) of the bar's own container, never the 720px viewport; the label's line height is the token's 20.",
        "Vote 7, 4 to 0 (option a): the glyphs are the core chevron-left and chevron-right that Pagination draws, at 16px, not Phosphor's carets.",
        "Engineering, no pixel (2C 2 and 3): at the first or last week the button stops but keeps focus (aria-disabled, focusableWhenDisabled), where the prototype's disabled carets dropped it; and the label is one polite status line spoken after it holds still 400ms, with the hidden prefix, so six presses in a second speak once.",
      ],
      tryIt: ["Press the week buttons: the seat and the buttons do not move. At the last week \"The week after\" stops and keeps focus.", "The second bar is the whole-span view: its buttons are hidden, and the readout prints that nothing moved."],
      demo: ({ state }) => <StepperDemo state={state} />,
    },
  ],
};
