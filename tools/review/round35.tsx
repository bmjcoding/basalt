// Round 35: audit-design-b (DECISIONS 138, approved in 139): a cut cell that can be read, two touch targets, the skip link under the bar, copying a
// NumberTicker, a required field, which set draws a glyph, and the SwiftUI callout. The council voted every design question in 138 and the owner
// approved them in 139; the implementation has not been reviewed by the panel or by the owner, and nothing here says it has. Every word is synthetic.
//
// The states are real. "focus" moves keyboard focus to the part before the shot; "esc" focuses a cut cell, opens its plate and presses Esc; "spacing"
// applies WCAG 1.4.12's text spacing (letter 0.12em, word 0.16em, line 1.5) to the table; "touch" is a coarse-pointer page (build.mjs turns touch on
// for it); "selected" selects a sentence the way a person drags across it. "forced-colours" and "reduced-motion" are the same page under those
// emulations. The counts, the hit boxes (dashed outlines) and the copied text are drawn by this review page only: Basalt draws none of them.

import { CaretDownIcon, CaretLeftIcon, CaretRightIcon, CheckIcon, CopyIcon, MagnifyingGlassIcon, MinusIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import * as React from "react";
import { createPortal } from "react-dom";

import {
  Accordion,
  AccordionItem,
  Breadcrumbs,
  Button,
  Checkbox,
  CheckGlyph,
  ChevronDownGlyph,
  ChevronLeftGlyph,
  ChevronRightGlyph,
  CloseGlyph,
  CodeBlock,
  CopyGlyph,
  Field,
  Icon,
  Input,
  Link,
  MinusGlyph,
  NotificationCentre,
  NumberField,
  NumberTicker,
  Pagination,
  PlusGlyph,
  SearchGlyph,
  SiteHeader,
  SkipLink,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHead,
  Terminal,
  Text,
} from "../../packages/react/src/index";
import skillGlyphs from "../../.agent/skills/basalt-html/parts/glyphs.json";
import type { IconComponent } from "../../packages/react/src/types";
import calloutAfterDark from "./assets/round-35/swiftui-callouts-after-dark.png";
import calloutAfterLight from "./assets/round-35/swiftui-callouts-after-light.png";
import calloutBeforeDark from "./assets/round-35/swiftui-callouts-before-dark.png";
import calloutBeforeLight from "./assets/round-35/swiftui-callouts-before-light.png";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 20 };
const row: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" };
const caption = (text: string) => <Text size="sm" tone="secondary">{text}</Text>;
/** A readout is the review page's own: it says what was measured, in a box Basalt does not draw. */
const readout: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, border: "1px solid var(--basalt-border-input)", background: "var(--basalt-surface-1)", font: "13px/18px var(--basalt-font-family-mono)", whiteSpace: "pre-wrap" };
const wait = (ms: number, then: () => void) => { const id = window.setTimeout(then, ms); return () => window.clearTimeout(id); };

// ---- 1. A cut cell that can be read ----

const RUNS = [
  ["build-0141", "Passed", "main", "Nov 14, 10:13 PM", "5m 12s", "Pin the toolchain to the version the release uses", "Owner one"],
  ["nightly-migration-backfill", "Failed", "release/2026.11", "Nov 14, 9:58 PM", "41m 07s", "Backfill the ledger in batches of five thousand rows so the replica keeps up", "Owner two, longer"],
  ["build-0140", "Running", "feature/stable-columns", "Nov 14, 9:41 PM", "2m 30s", "Hold the header still while rows load", "Owner seven"],
  ["lint-0388", "Passed", "main", "Nov 14, 8:02 PM", "48s", "Lint", "Owner ten"],
  ["deploy-preview-2291", "Cancelled", "fix/notification-touch-target", "Nov 13, 11:47 PM", "1m 03s", "Give a one-line notification entry a 44px target on touch", "Owner one"],
  ["e2e-0519", "Passed", "main", "Nov 13, 10:20 PM", "18m 55s", "Run the browser suite against the packed package", "Owner whose name is long."],
  ["build-0139", "Queued", "dependabot/npm_and_yarn/shiki-3.4.2", "Nov 13, 9:05 PM", "0s", "Bump shiki from 3.4.1 to 3.4.2", "dependabot"],
  ["bench-0042", "Passed", "perf/table-tick", "Nov 13, 7:31 PM", "6m 44s", "Memoise the row so ticking one box repaints one row", "Owner seven"],
];

function CutCellDemo({ state }: { state: string }) {
  const host = React.useRef<HTMLDivElement>(null);
  const [counts, setCounts] = React.useState("");
  const spacing = state.startsWith("spacing");
  const wide = state.startsWith("wide");
  // The harness shoots 300ms after the page loads, so every step below happens inside the first 250ms: the cell is focused at once, Esc follows, and the
  // count is written last. (A timer that fires later is never seen in a screenshot.)
  React.useEffect(() => {
    const table = host.current?.querySelector("table");
    if (!table) return undefined;
    const cancel: Array<() => void> = [];
    const target = () => [...table.querySelectorAll<HTMLElement>("[data-cut]")].find((c) => c.textContent?.startsWith("Backfill")) ?? table.querySelector<HTMLElement>("[data-cut]");
    const count = () => {
      const cells = table.querySelectorAll("th, td").length;
      const cut = table.querySelectorAll("[data-cut]").length;
      const stops = [...table.querySelectorAll("th, td")].filter((cell) => (cell as HTMLElement).tabIndex === 0).length;
      const peek = document.querySelector<HTMLElement>(".basalt-cell-peek");
      const open = peek?.hasAttribute("data-open");
      const cell = document.activeElement as HTMLElement | null;
      const ring = cell && table.contains(cell) ? cell.matches(":focus-visible") : false;
      const box = peek?.getBoundingClientRect();
      const reach = box && open ? ` Plate x ${box.left.toFixed(1)} to ${box.right.toFixed(1)} (${box.width.toFixed(1)} wide) in a ${document.documentElement.clientWidth}px viewport: ${box.left >= -0.5 && box.right <= document.documentElement.clientWidth + 0.5 ? "inside it" : "PAST IT"}.` : "";
      setCounts(`${cut} of ${cells} cells are cut at this width${spacing ? " under 1.4.12 spacing" : ""}. Tab stops this adds to the table: ${stops}.${wide ? " The Message column is 420px wide in a table of 1600px." : ""}\nPlate: ${open ? `open over "${peek?.textContent}"` : "closed"}. Focused cell: ${cell && table.contains(cell) ? `"${cell.textContent}" (ring ${ring ? "shown" : "not shown"})` : "none"}.${reach}`);
    };
    cancel.push(wait(0, count));
    if (state.includes("focus") || state.includes("esc")) {
      cancel.push(wait(40, () => target()?.focus()));
      if (state.includes("esc")) cancel.push(wait(120, () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))));
      cancel.push(wait(state.includes("esc") ? 140 : 70, count));
      cancel.push(wait(state.includes("esc") ? 260 : 200, count));
    }
    return () => cancel.forEach((fn) => fn());
  }, [state, spacing]);
  return (
    <div ref={host} style={{ ...col, padding: 4 }}>
      {spacing ? <style>{".r35-spacing, .r35-spacing * { letter-spacing: 0.12em !important; word-spacing: 0.16em !important; line-height: 1.5 !important; }"}</style> : null}
      {caption("Seven columns, 63 cells with the header. The ellipsis and the 40px row stay. A cut cell is a focus stop; on hover (after the tooltip's wait) or focus its whole value opens in place over it. The Started column is sized for its longest form.")}
      <div className={spacing ? "r35-spacing" : undefined}>
        <TableContainer label="Runs table">
          {wide ? (
            <Table columns={[{ width: 170 }, { width: 420 }, {}]} minWidth={1600}>
              <TableHeader>
                <TableRow>{["Run", "Message", "Owner"].map((name) => <TableHead key={name}>{name}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {RUNS.slice(0, 4).map((r) => (
                  <TableRow key={r[0]}><TableRowHead>{r[0]}</TableRowHead><TableCell>{`${r[5]} ${r[5]}`}</TableCell><TableCell>{r[6]}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
          <Table columns={[{ width: 170 }, { width: 120 }, { width: 190 }, { width: 176 }, { width: 88 }, { width: 260 }, {}]} minWidth={1180}>
            <TableHeader>
              <TableRow>{["Run", "Status", "Branch", "Started", "Duration", "Message", "Owner"].map((name) => <TableHead key={name} numeric={name === "Duration"}>{name}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {RUNS.map((r) => (
                <TableRow key={r[0]}>
                  <TableRowHead>{r[0]}</TableRowHead><TableCell>{r[1]}</TableCell><TableCell mono>{r[2]}</TableCell><TableCell>{r[3]}</TableCell><TableCell numeric>{r[4]}</TableCell><TableCell>{r[5]}</TableCell><TableCell>{r[6]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </TableContainer>
      </div>
      <div style={readout}>{counts || "Counting…"}</div>
    </div>
  );
}

// ---- 2. Two touch targets ----

const ENTRIES = [
  { id: "a", title: "Deploy finished", time: "2m ago", status: "success" as const, unread: true },
  { id: "b", title: "Backup finished", description: "ledger-replica, nightly", time: "1h ago" },
  { id: "c", title: "Review requested", time: "Yesterday", href: "#c" },
];

/** Draws each target's real box as a dashed outline, from the page's own measurements. Basalt draws none. */
function Boxes({ selector }: { selector: string }) {
  const [boxes, setBoxes] = React.useState<Array<{ x: number; y: number; w: number; h: number }>>([]);
  React.useEffect(() => {
    // A short standalone link's hit box is at least 44 wide: draw it as a pseudo-element makes it (the page measures the link, and widens the box to match).
    const measure = () => setBoxes([...document.querySelectorAll(selector)].flatMap((el) => [...el.getClientRects()].map((r) => {
      const short = el.matches("a.basalt-link") && !el.closest("p") && r.width < 44;
      return { x: r.left + window.scrollX - (short ? (44 - r.width) / 2 : 0), y: r.top + window.scrollY, w: short ? 44 : r.width, h: r.height };
    })));
    const stop = wait(500, measure);
    window.addEventListener("resize", measure);
    return () => { stop(); window.removeEventListener("resize", measure); };
  }, [selector]);
  // Drawn into the body, in document coordinates, so each outline sits on the box it measures wherever its target is portalled or scrolled.
  return createPortal(<>{boxes.map((b, i) => <div key={i} aria-hidden="true" style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, border: "1px dashed var(--basalt-status-warning)", pointerEvents: "none", zIndex: 100000, boxSizing: "border-box" }} />)}</>, document.body);
}

function TouchDemo({ state }: { state: string }) {
  const [report, setReport] = React.useState("");
  const area = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => wait(600, () => {
    const entries = [...document.querySelectorAll(".basalt-notification")].map((e) => Math.round(e.getBoundingClientRect().height));
    const links = [...(area.current?.querySelectorAll("a.basalt-link") ?? [])].map((e) => `${Math.round(e.getBoundingClientRect().height)}`);
    const boxes = [...document.querySelectorAll(".basalt-notification, .basalt-notifications button, a.basalt-link")].filter((e) => e.getClientRects().length).flatMap((e) => [...e.getClientRects()]);
    let overlaps = 0;
    boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => {
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5) overlaps += 1;
    }));
    setReport(`entry heights: ${entries.join(", ")}.  Link heights: ${links.join(", ")} (the short "Go", two standalone, then the two in the sentence; "Go" is 44 wide as a hit box, drawn dashed).  Pairs of targets that overlap: ${overlaps}.`);
  }), [state]);
  return (
    <div style={{ ...col, position: "relative", padding: 4 }}>
      {caption(state === "touch" ? "A coarse pointer: a one-line entry is 44 tall (its line centred), a two-line entry stays 58, a standalone link has a 44px box with nothing moved, and a link in a sentence keeps its line. Dashed outlines are the hit boxes, drawn by this page." : "A mouse: a one-line entry is 40, a standalone link is its line. The same page as the touch shot beside it.")}
      <div style={{ position: "relative", height: 340 }}>
        <NotificationCentre defaultOpen entries={ENTRIES} />
      </div>
      <div ref={area} style={{ maxWidth: 360 }}>
        <div><Link href="#go">Go</Link></div>
        <div style={{ height: 32 }} />
        <div><Link href="#guide">Read the deployment guide</Link></div>
        <div style={{ height: 32 }} />
        <div><Link href="https://example.test/status" target="_blank">Open the status page</Link></div>
        <p style={{ margin: "16px 0 0" }}>Read <Link href="#a">the first guide</Link> and then <Link href="#b">the second guide</Link> before you start, since the order matters here.</p>
      </div>
      {state === "touch" ? <Boxes selector=".basalt-notification, .basalt-notifications button, a.basalt-link" /> : null}
      <div style={readout}>{report || "Measuring…"}</div>
    </div>
  );
}

// ---- 3. The skip link ----

const MARK = <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" /></svg>;

function Frame({ height, label, children, onReady }: { height: number; label: string; children: React.ReactNode; onReady?: (doc: Document) => void }) {
  const ref = React.useRef<HTMLIFrameElement>(null);
  const [body, setBody] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write("<!doctype html><html><head></head><body></body></html>");
    doc.close();
    for (const node of Array.from(document.head.querySelectorAll("style, link[rel=stylesheet]"))) doc.head.appendChild(node.cloneNode(true));
    const style = doc.createElement("style");
    style.textContent = "html, body { margin: 0; } body { background: var(--basalt-surface-page); color: var(--basalt-text-primary); font-family: var(--basalt-font-family-sans); font-size: var(--basalt-text-base-size); line-height: var(--basalt-text-base-line-height); }";
    doc.head.appendChild(style);
    const sync = () => { doc.documentElement.setAttribute("data-theme", document.documentElement.getAttribute("data-theme") ?? "dark"); doc.documentElement.style.colorScheme = document.documentElement.style.colorScheme; };
    sync();
    const watch = new MutationObserver(sync);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style"] });
    setBody(doc.body);
    return () => watch.disconnect();
  }, []);
  React.useEffect(() => {
    if (body && onReady) onReady(body.ownerDocument);
  }, [body, onReady]);
  return (
    <div style={{ border: "1px solid var(--basalt-border-input)", borderRadius: 12, overflow: "hidden" }}>
      {/* oxlint-disable-next-line react/iframe-missing-sandbox -- a frame the round writes itself with doc.write of its own markup, to measure it */}
      <iframe ref={ref} title={label} style={{ display: "block", width: "100%", height, border: 0 }} />
      {body ? createPortal(children, body) : null}
    </div>
  );
}

function SkipDemo({ state }: { state: string }) {
  const [report, setReport] = React.useState("");
  const notice = state.startsWith("notice");
  const ready = React.useCallback((doc: Document) => {
    if (!state.includes("focus") && !notice) return;
    const link = doc.querySelector<HTMLElement>(".basalt-skip-link");
    link?.focus();
    const measure = () => {
      const bar = doc.querySelector(".basalt-site-header")?.getBoundingClientRect();
      const brand = doc.querySelector(".basalt-site-brand-mark")?.getBoundingClientRect();
      const s = link?.getBoundingClientRect();
      if (!bar || !brand || !s) return;
      const over = Math.max(0, Math.min(s.right, bar.right) - Math.max(s.left, bar.left)) * Math.max(0, Math.min(s.bottom, bar.bottom) - Math.max(s.top, bar.top));
      const f = (n: number) => n.toFixed(1);
      setReport(`${state.includes("scrolled") ? "After a 200px scroll: the notice has gone and the bar has stuck at the top. " : ""}Bar: y ${f(bar.top)} to ${f(bar.bottom)}.  Skip link box: x ${f(s.left)} to ${f(s.right)}, y ${f(s.top)} to ${f(s.bottom)}.  Gap under the bar's line: ${f(s.top - bar.bottom)}px (space-2 is 8).  ${f(s.left - brand.left)}px from the brand's start edge.  Ring (+2) top: ${f(s.top - 4 - bar.bottom)}px under the line.  Overlap with the bar: ${f(over)} px².`);
    };
    if (state.includes("scrolled")) window.setTimeout(() => doc.defaultView?.scrollTo(0, 200), 30);
    window.setTimeout(measure, state.includes("scrolled") ? 130 : 80);
  }, [state, notice]);
  return (
    <div style={col}>
      {caption(notice ? "A real page in a frame of its own with a 40px notice above its bar. The link reads the bar's real bottom edge when it takes focus and again on scroll, so it sits space-2 under the bar where the bar is: at y 40 to 96 before the scroll, stuck at 0 to 56 after it." : "A real page in a frame of its own, whose bar is at the top of the frame: the link sits under the bar, on the brand's start edge. Tab once to see it.")}
      <Frame height={280} label="A page with a site header and a skip link" onReady={ready}>
        <SkipLink target="r35-main" />
        {notice ? <div style={{ height: 40, display: "flex", alignItems: "center", padding: "0 16px", background: "var(--basalt-surface-3)", fontSize: 13 }}>A notice above the bar</div> : null}
        <SiteHeader brand={<>{MARK}<span>Acme</span></>} brandLabel="Acme home" links={[{ href: "#a", label: "Product", current: true }, { href: "#b", label: "Pricing" }]} action={<Button variant="primary">Get started</Button>} />
        <main id="r35-main" tabIndex={-1} style={{ padding: "96px 24px 700px", outline: "none" }}>{caption("The page.")}</main>
      </Frame>
      <div style={readout}>{report || (state.includes("focus") || notice ? "Measuring…" : "The skip link is unseen until it has focus.")}</div>
    </div>
  );
}

// ---- 4. Copying a NumberTicker ----

function TickerDemo({ state }: { state: string }) {
  const [copied, setCopied] = React.useState("");
  const sentence = React.useRef<HTMLParagraphElement>(null);
  const [value, setValue] = React.useState(1284.5);
  const changing = state.startsWith("changed");
  // "changed": the value changes at 40ms, and the readout says what the sentence reads at 200ms. In forced colours and under reduced motion the digits change in place; otherwise they roll.
  React.useEffect(() => {
    if (!changing) return undefined;
    const stops = [wait(40, () => setValue(8531.7)), wait(200, () => setCopied(`the sentence reads: ${JSON.stringify(sentence.current?.textContent ?? "")}`))];
    return () => stops.forEach((stop) => stop());
  }, [changing]);
  React.useEffect(() => {
    if (state !== "selected" && !state.startsWith("selected")) return undefined;
    return wait(300, () => {
      const range = document.createRange();
      if (sentence.current) range.selectNodeContents(sentence.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      setCopied(JSON.stringify(selection?.toString() ?? ""));
    });
  }, [state]);
  return (
    <div style={col}>
      {caption("The digits are drawn and never selected; the number sits behind them, transparent, and is what a selection paints and copies. At rest nothing differs from before.")}
      <p ref={sentence} style={{ margin: 0, fontSize: 20 }}>Orders today: <NumberTicker value={value} /> of <NumberTicker value={1500} /> done</p>
      {copied ? <div style={readout}>{changing ? copied : `Selection.toString(): ${copied}`}</div> : null}
    </div>
  );
}

// ---- 5. A required field ----

function RequiredDemo() {
  return (
    <form style={{ ...col, maxWidth: 640 }} onSubmit={(event) => event.preventDefault()}>
      {caption("Required directly after the label, optional only where an author marks it, and a field marked neither shows nothing. The word is hidden from assistive technology: the input's own `required` says it.")}
      <Field label="Sandbox name" required name="sandbox"><Input /></Field>
      <Field label="Note" optional name="note"><Input /></Field>
      <Field label="Region" name="region"><Input /></Field>
      <Field label="Window" required requiredLabel="Obligatoire" name="window" description="A translated word."><Input /></Field>
    </form>
  );
}

// ---- 6. Which set draws a glyph ----

type Pair = { name: string; before: IconComponent; after: IconComponent };
const PAIRS: Pair[] = [
  { name: "check", before: CheckIcon, after: CheckGlyph },
  { name: "close", before: XIcon, after: CloseGlyph },
  { name: "chevron left", before: CaretLeftIcon, after: ChevronLeftGlyph },
  { name: "chevron right", before: CaretRightIcon, after: ChevronRightGlyph },
  { name: "chevron down", before: CaretDownIcon, after: ChevronDownGlyph },
  { name: "copy", before: CopyIcon, after: CopyGlyph },
  { name: "plus", before: PlusIcon, after: PlusGlyph },
  { name: "minus", before: MinusIcon, after: MinusGlyph },
  { name: "search", before: MagnifyingGlassIcon, after: SearchGlyph },
];

// The HTML skill's half of E2. Each module that drew a Phosphor icon for a name the core set owns now writes the core glyph's whole SVG (the markup of
// `Basalt._.glyph(name)`, put in at build time from the drawn set). "After" is that markup, read from the skill's own built glyph table; "before" is the
// Phosphor Bold icon the module drew. The module is the one whose script writes it.
const SKILL_SWAPS: Array<{ module: string; where: string; before: IconComponent; core: string }> = [
  { module: "menu", where: "a checked item's check", before: CheckIcon, core: "check" },
  { module: "combobox", where: "the chosen option's check", before: CheckIcon, core: "check" },
  { module: "copy", where: "copied", before: CheckIcon, core: "check" },
  { module: "copy", where: "copy failed", before: XIcon, core: "close" },
  { module: "terminal", where: "the copy button", before: CopyIcon, core: "copy" },
  { module: "terminal", where: "copied (the compact button)", before: CheckIcon, core: "check" },
  { module: "toast", where: "the dismiss button", before: XIcon, core: "close" },
  { module: "number", where: "the decrease stepper", before: MinusIcon, core: "minus" },
  { module: "number", where: "the increase stepper", before: PlusIcon, core: "plus" },
  { module: "filter", where: "the trigger's chevron", before: CaretDownIcon, core: "chevron-down" },
  { module: "filter", where: "the search band", before: MagnifyingGlassIcon, core: "search" },
  { module: "palette", where: "the input row", before: MagnifyingGlassIcon, core: "search" },
  { module: "command-list", where: "the input row", before: MagnifyingGlassIcon, core: "search" },
];
const skillSvg = (core: string, size: number) => `<svg class="icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" aria-hidden="true" focusable="false">${(skillGlyphs as Record<string, string[]>)[core]?.[0] ?? ""}</svg>`;

function SkillGlyphDemo() {
  return (
    <div style={col}>
      {caption("The HTML skill's modules, before (Phosphor Bold) and after (the core glyph, the SVG each module now writes), at 16 and 20. Each swap changes pixels; the module in the first column is the one whose script draws it.")}
      <div style={{ display: "grid", gridTemplateColumns: "auto auto repeat(4, auto)", gap: "10px 18px", alignItems: "center", justifyContent: "start" }}>
        <Text size="sm" tone="secondary">module</Text><Text size="sm" tone="secondary">where</Text>
        {[16, 20].map((s) => <React.Fragment key={s}><Text size="sm" tone="secondary">before {s}</Text><Text size="sm" tone="secondary">after {s}</Text></React.Fragment>)}
        {SKILL_SWAPS.map((swap) => (
          <React.Fragment key={`${swap.module}-${swap.where}`}>
            <Text size="sm" mono>{swap.module}</Text><Text size="sm">{swap.where}</Text>
            {/* sink: skillSvg's drawing of a core glyph from the generated glyph source, no data; the walkthrough compares the skill's glyph with React's */}
            {/* oxlint-disable-next-line react/no-danger -- the skill's drawing of a core glyph, no data (the sink: comment above) */}
            {([16, 20] as const).map((s) => <React.Fragment key={s}><Icon icon={swap.before} size={s} /><span aria-hidden="true" style={{ display: "inline-flex" }} dangerouslySetInnerHTML={{ __html: skillSvg(swap.core, s) }} /></React.Fragment>)}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function GlyphDemo() {
  return (
    <div style={col}>
      {caption("Before is Phosphor Bold (what the components drew); after is the core set (what they draw now). Each swap changes pixels. At 16, 20 and 24, then the real components.")}
      <div style={{ display: "grid", gridTemplateColumns: "auto repeat(6, auto)", gap: "10px 18px", alignItems: "center", justifyContent: "start" }}>
        <span />{[16, 20, 24].map((s) => <React.Fragment key={s}><Text size="sm" tone="secondary">before {s}</Text><Text size="sm" tone="secondary">after {s}</Text></React.Fragment>)}
        {PAIRS.map((p) => (
          <React.Fragment key={p.name}>
            <Text size="sm">{p.name}</Text>
            {([16, 20, 24] as const).map((s) => <React.Fragment key={s}><Icon icon={p.before} size={s} /><Icon icon={p.after} size={s} /></React.Fragment>)}
          </React.Fragment>
        ))}
      </div>
      <div style={{ ...row, gap: 24 }}>
        <Checkbox defaultChecked>Checked</Checkbox>
        <Checkbox indeterminate>Mixed</Checkbox>
        <NumberField aria-label="Count" defaultValue={2} />
        <Breadcrumbs items={[{ label: "Home", href: "#" }, { label: "Runs", href: "#r" }, { label: "Run" }]} />
        <Pagination page={2} pageCount={5} onPageChange={() => {}} />
      </div>
      <div style={{ maxWidth: 520 }}>
        <Accordion defaultValue={["x"]}><AccordionItem value="x" title="Details">Body</AccordionItem></Accordion>
        <CodeBlock code="npm test" language="bash" />
        <Terminal title="Deploy" lines={[{ kind: "command", text: "basalt deploy" }, { kind: "done", text: "Built" }]} />
      </div>
      <SkillGlyphDemo />
    </div>
  );
}

// ---- 7. The SwiftUI callout ----

function CalloutRenders() {
  const [appearance, setAppearance] = React.useState<"dark" | "light">(() => (document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"));
  const before = appearance === "dark" ? calloutBeforeDark : calloutBeforeLight;
  const after = appearance === "dark" ? calloutAfterDark : calloutAfterLight;
  return (
    <div style={col}>
      <div style={row}>
        <Button aria-pressed={appearance === "dark"} onClick={() => setAppearance("dark")}>Dark native view</Button>
        <Button aria-pressed={appearance === "light"} onClick={() => setAppearance("light")}>Light native view</Button>
      </div>
      <div style={{ ...row, alignItems: "flex-start" }}>
        <figure style={{ margin: 0, flex: "1 1 320px" }}><img src={before} alt={`Before, ${appearance}: four callouts, radius 12, a neutral hairline on every status.`} style={{ width: "100%", height: "auto", borderRadius: 12 }} /><figcaption><Text size="sm" tone="secondary">Before: radius 12, a neutral hairline for every status.</Text></figcaption></figure>
        <figure style={{ margin: 0, flex: "1 1 320px" }}><img src={after} alt={`After, ${appearance}: four callouts, radius 8, success, warning and danger with a rim in their status colour.`} style={{ width: "100%", height: "auto", borderRadius: 12 }} /><figcaption><Text size="sm" tone="secondary">After: radius 8, and success, warning and danger draw a rim in the status colour at 45% over the callout's own level.</Text></figcaption></figure>
      </div>
      {caption("Actual NSHostingView renders (BASALT_SNAPSHOT_DIR, RenderTests.testCalloutsRenderInBothAppearances). They are references; iOS and visionOS were not run.")}
    </div>
  );
}

export const ROUND_35: Round = {
  id: "35",
  title: "The audit's design answers, part B: a cut cell, two touch targets, the skip link, copying a number, a required field, which set draws a glyph, and the SwiftUI callout",
  reviewed: false,
  summary:
    "audit-design-b builds what the council decided in DECISIONS 138 and the owner approved in DECISIONS 139: parts B and C of the audit's design questions, glyph ownership, and the SwiftUI callout. The selected state, more contrast and the rule sentences are audit-design-a's. The council voted and the owner approved the design; the implementation has not been reviewed by the panel or by the owner. Where a pixel changed it is shown before and after.",
  steps: [
    {
      id: "cut-cell",
      name: "A cut cell can be read",
      intro: "A still table keeps its ellipsis and its 40px row. A cut cell is a focus stop and opens its whole value in place over it on a level-3 plate (WCAG 1.4.13: Esc, hoverable, persistent). A cell that is whole is not a stop.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 660,
      decisions: [
        "DECISIONS 138, B1, 2 to 1 (sol: body cells wrap inside fixed columns and the row grows above the 40px floor). Approved in 139.",
        "The three defects of the council's prototype are fixed: after Esc the cell shows its own −2 ring; a plate is never past the viewport (at 390 it moves in); and the tab stops it adds are counted and printed below each shot.",
        "A column of one fixed form (a date, a time, a status) is sized for its longest form under 1.4.12 spacing: the Started column is 176, not 144.",
        "DECISIONS 142: a header's label is sized to fit its column under 1.4.12 spacing, as a fixed-form column is. A cut sortable header is left alone (2 to 1): the sort button is the whole cell and its name holds the label, and an open plate would take its pointer and cover its indicator. A plain header keeps the plate.",
        "DECISIONS 142: an opened value near the viewport's edge has no majority, so the build's clamp stands (\"in place\" with \"never past the viewport\"). The plate may be narrower than its cell: in a 420px column at 390 it fits the viewport and the column does not change (the `wide-focus` shot).",
        "Not decided, left as built: a cut body cell that holds a link opens no plate (an open plate takes the pointer, so a plate over a link is a different case). It goes to the council with the links and rows batch.",
      ],
      tryIt: ["Tab through the table: each stop is a cut cell and opens its value.", "Hover a cut cell and wait; move onto the plate; press Esc.", "Under spacing, each cell that gets cut is still readable."],
      states: ["focus", "esc", "spacing", "spacing-focus", "wide-focus@390", "wide-focus-forced-colours@390", "wide-focus-reduced-motion@390", "focus-forced-colours", "focus-reduced-motion"],
      demo: ({ state }) => <CutCellDemo state={state} />,
    },
    {
      id: "touch-targets",
      name: "Two touch targets",
      intro: "A one-line notification entry is at least 44 tall on touch, its line centred; a Link on its own line has a 44px hit box with no change to layout or look. A link inside a sentence keeps its line.",
      widths: [390],
      scales: [1, 2],
      height: 1000,
      decisions: [
        "DECISIONS 138, B2, 3 to 0. Approved in 139.",
        "A short link (\"Go\") is a 44 by 44 target: its hit box is widened by a box with no content, not the link, so its width, its line and its look do not change (the amendment's defect C).",
        "Two standalone links on neighbouring lines less than 24px apart have hit boxes that overlap (DECISIONS 142: no majority, so the build stands; the README states it as a limit and writes no rule about spacing). Neither shot has them; the count of overlapping pairs is printed.",
      ],
      tryIt: ["On a phone, tap just above and below the standalone links and an entry's text: each lands."],
      states: ["touch"],
      demo: ({ state }) => <TouchDemo state={state} />,
    },
    {
      id: "skip-link",
      name: "The skip link under the bar",
      intro: "Focused, the skip link hangs under the bar, space-2 below its line, on the brand's start edge, floating with the rim, shadow-overlay and radius 8. It covers nothing in the bar and moves nothing.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 340,
      decisions: ["DECISIONS 138, B3, 3 to 0. Approved in 139. At 390 the council's old placement covered the brand link by 3,175px²; this one covers 0.", "DECISIONS 142, 3 to 0: a bar that is not at the top of the viewport (a notice above it) is cleared too: the link reads the bar's real bottom edge from script when it takes focus, and again on scroll and resize while it holds focus; with no script or no bar it is where the stylesheet puts it. How it finds the bar: the first `.basalt-site-header`, `.basalt-app-header` or `.basalt-sticky-bar` in the page (the skill: `.topbar` or `.app-header`)."],
      tryIt: ["Tab once from the top of the page."],
      states: ["focus", "focus-forced-colours", "focus-reduced-motion", "notice", "notice-scrolled", "notice-forced-colours", "notice-scrolled-forced-colours", "notice-reduced-motion"],
      demo: ({ state }) => <SkipDemo state={state} />,
    },
    {
      id: "ticker",
      name: "Copying a NumberTicker",
      intro: "A selection paints the sentence's own band through each number and copies the sentence as one line with the number once. Selection.toString() is printed, at rest, under reduced motion and in forced colours.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 280,
      decisions: ["DECISIONS 138, C2, 3 to 0. Approved in 139. At rest and mid-roll not one unselected pixel changed (measured against `origin/main`, light and dark, 1x and 2x). The readable number is now in the sentence's flow under the strips, in a box with no width, so the band is the sentence's own and the copy is one line; the strips are built of inline boxes so they add no line break.", "DECISIONS 147, 3 to 0: in forced colours the strips are hidden and the number is its own text, so the system paints one selection band and its selected-text colour on the digits; the roll is given up there (the `changed-forced-colours` shot: a new value changes in place). The number's width and baseline stay where they are.", "DECISIONS 147, 2 to 1: under reduced motion the number sits in the sentence's own line with no 1em box and no clip, so the band is exactly the sentence's; six unselected pixels at a comma's foot change. The sparkline head's ticker, a flex item, keeps its 1em box.", "DECISIONS 147, 2 to 1: a ticker that is a flex item in an app's own layout is accepted as built (its digits sit where a plain-text sibling's text sits; they used to sit at the bottom of a stretched row), said in the README. DECISIONS 147, 2 to 1: the skill's 44px hit box on a short standalone link is accepted as built, with its 27 pixels; its rule leaves `.topbar-links a` out, because that link's own `::after` reserves the current link's width."],
      tryIt: ["Drag across the sentence and copy it."],
      states: ["selected", "selected-forced-colours", "selected-reduced-motion", "changed", "changed-forced-colours"],
      demo: ({ state }) => <TickerDemo state={state} />,
    },
    {
      id: "required",
      name: "A required field",
      intro: "\"Required\" directly after the label, in tertiary at text-xs. \"Optional\" only where marked. Never an asterisk.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 420,
      decisions: ["DECISIONS 138, C3, 3 to 0. Approved in 139. The council's prototype put the word at the far end of the label row; here it follows the label."],
      tryIt: ["Read the form with a screen reader: each name is the label alone, and the required inputs say so themselves."],
      demo: () => <RequiredDemo />,
    },
    {
      id: "glyph-owner",
      name: "Which set draws a glyph",
      intro: "Check, close, the chevrons, copy, plus, minus and search are drawn by the core set wherever a component draws them, in React and in the HTML skill. Phosphor draws what the core lacks.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 1400,
      decisions: ["DECISIONS 138, E2, 3 to 0. Approved in 139. Every swap changes pixels: the pairs below are the before and after at each size, for React's components and then for the HTML skill's modules (the menu, combobox, copy, terminal, toast, number, filter, palette and command list), which now write the core glyph's SVG where they drew Phosphor's."],
      tryIt: ["Open a Select or a Menu: the check beside the chosen item is the core's."],
      states: ["forced-colours", "reduced-motion"],
      demo: () => <GlyphDemo />,
    },
    {
      id: "swiftui-callout",
      name: "The SwiftUI callout",
      intro: "BasaltCallout takes radius 8 and, for success, warning and danger, a rim in its status colour at 45% over its own level, as foundations says.",
      widths: [960, 390],
      scales: [1],
      height: 560,
      decisions: ["Engineering (DECISIONS 138, E8, 3 to 0): it makes SwiftUI match what foundations already says. The renders show every status in both appearances."],
      tryIt: ["Compare the two columns."],
      demo: () => <CalloutRenders />,
    },
  ],
};
