// Round 33: type and layout (DECISIONS 137, approved by the owner in DECISIONS 139): two display steps, two roles a page writes (hero and display), the lead, the page row, the
// sections, the twelve-track columns and the fallback face. The council voted it and the owner approved it as a proposal; this round is the build, shown. The design panel has not
// reviewed the implementation. Every word is synthetic, and no site is migrated: the sites and their prototypes are untouched.
//
// The numbers on each step are read from the page as it renders (getComputedStyle and getBoundingClientRect), never typed in, so a shot is its own evidence. The states are real:
// "forced-colours" and "reduced-motion" are emulations that build.mjs sets before the page loads, and the last step removes Geist from the font chain on its pages, which is what a
// page paints before the Geist file arrives (the fallback's widths are measured against the file Basalt ships in the tests, and its line counts are printed live on the last two steps).
//
// Every step is shot edge to edge (`bleed`), so a page specimen is the width its shot is named for and its row is the real row (358 at 390, not the walkthrough's padded 294), with the
// real site header above it and a footer row below it. A reading that is the review page's own (a count, a position) is printed below the footer, outside the page.

import * as React from "react";

import { Button, Columns, ColumnsItem, Heading, Lead, PageRow, PageSection, PageSections, SectionActions, SectionIntro, SiteHeader, Text, useMediaQuery } from "../../packages/react/src/index";
import type { ColumnsLayout } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 32, width: "100%" };
const caption = (text: React.ReactNode) => <Text size="sm" tone="secondary">{text}</Text>;
const readout: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };

const HERO = "Every field note in one plain book.";
const LEAD = "Fieldbook keeps notes, tables and sketches side by side, so a reader finds each one where it was left.";
const KINDS = "Three kinds of page in one book";
const SHARE = "Share one page or the whole book";
const TEXT_TITLE = "How a book keeps its pages in order";

/** The face a page is set in: Geist, Geist Fallback alone (Geist not yet arrived), or the chain fonts.css gave before the fallback (the system's). */
type Face = "geist" | "fallback" | "system";
const FACES: Record<Face, string> = {
  geist: "Geist, \"Geist Fallback\", ui-sans-serif, system-ui, sans-serif",
  fallback: "\"Geist Fallback\", ui-sans-serif, system-ui, sans-serif",
  system: "ui-sans-serif, system-ui, sans-serif",
};
const faceStyle = (face: Face) => ({ "--basalt-font-family-sans": FACES[face], fontFamily: FACES[face] }) as React.CSSProperties;

/** What an element computes to, read again when the window is resized or the fonts arrive. */
function useReadout<T extends HTMLElement>(read: (el: T) => string): [React.RefObject<T | null>, string] {
  const ref = React.useRef<T>(null);
  const readRef = React.useRef(read);
  readRef.current = read;
  const [text, setText] = React.useState("");
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setText(readRef.current(el));
    update();
    window.addEventListener("resize", update);
    void document.fonts.ready.then(update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return [ref, text];
}
const em = (n: number) => `${Math.round(n * 1000) / 1000}em`;
const computed = (el: HTMLElement) => {
  const s = getComputedStyle(el);
  const size = parseFloat(s.fontSize);
  return `${s.fontSize} / ${s.lineHeight}, ${em(parseFloat(s.letterSpacing) / size)}, ${s.fontWeight}`;
};
const linesOf = (el: HTMLElement) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));

/** A heading with its computed size, line and tracking printed under it. */
function Specimen({ name, size, level = 2, children }: { name: string; size: React.ComponentProps<typeof Heading>["size"]; level?: 1 | 2 | 3 | 4 | 5 | 6; children: React.ReactNode }) {
  const [ref, text] = useReadout<HTMLHeadingElement>(computed);
  const [linesRef, lines] = useReadout<HTMLDivElement>((el) => `${linesOf(el.firstElementChild as HTMLElement)} lines`);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }} ref={linesRef}>
      <Heading level={level} size={size} ref={ref}>{children}</Heading>
      <Text size="sm" tone="secondary" style={readout}><b>{name}</b> {text}, {lines}</Text>
    </div>
  );
}

// ---- The frame: the real site header above a specimen, a footer row below it, and the review's own readout under that ----

const MARK = <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" /></svg>;

function SiteFrame({ face = "geist" as Face, children, below }: { face?: Face; children: React.ReactNode; below?: React.ReactNode }) {
  return (
    <div style={{ ...faceStyle(face), fontFamily: "var(--basalt-font-family-sans)" }}>
      <SiteHeader brand={<>{MARK}<span>Fieldbook</span></>} brandLabel="Fieldbook home" links={[{ href: "#guide", label: "Guide" }, { href: "#pricing", label: "Pricing" }]} />
      {children}
      <PageRow as="footer" style={{ paddingBlock: 32 }}>{caption("Fieldbook. Synthetic page.")}</PageRow>
      {below ? <PageRow style={{ ...col, paddingBlockEnd: 32 }}>{below}</PageRow> : null}
    </div>
  );
}

// ---- 1. The display steps and the two roles ----

function ScaleDemo() {
  // A fixed step is never shown on a phone (docs and examples show the roles there): the specimen of the two fixed steps and the ladder start at 720.
  const wide = useMediaQuery("(width >= 720px)");
  const [bandRef, band] = useReadout<HTMLDivElement>(() => `window ${window.innerWidth}px: ${window.innerWidth >= 1024 ? "1024 and up" : window.innerWidth >= 720 ? "720 to 1023" : "under 720"}`);
  return (
    <SiteFrame>
      <PageRow style={{ ...col, paddingBlock: 32 }}>
        <div ref={bandRef}>{caption(<>The band this window is in: <b style={readout}>{band}</b>. Resize the window: a role changes at 720 and at 1024 and at no other width.</>)}</div>
        <Specimen name="hero" size="hero" level={1}>Plain notes</Specimen>
        <Specimen name="display" size="display">Plain notes</Specimen>
        {wide ? (
          <>
            <Specimen name="text-7xl" size="7xl">Plain</Specimen>
            <Specimen name="text-6xl" size="6xl">Plain</Specimen>
            <Specimen name="text-5xl" size="5xl">Plain</Specimen>
            <Specimen name="text-4xl" size="4xl">Plain</Specimen>
          </>
        ) : (
          caption("The fixed steps text-7xl and text-6xl are not shown on a phone: a page writes the roles there.")
        )}
        <Lead>The lead is text-xl (20/28) from 720 and text-lg (18/26) under it, at the prose measure.</Lead>
      </PageRow>
    </SiteFrame>
  );
}

// ---- 2 and 3. A first screen over three sections, and a text-led page ----

/** The four sections of a first screen: a hero, a lead and two buttons, then three sections. `idp` keeps ids apart when a page is drawn twice. */
function FirstScreenSections({ idp = "" }: { idp?: string }) {
  return (
    <PageSections as="div">
      <PageSection aria-labelledby={`${idp}first-hero`}>
        <SectionIntro>
          <Heading id={`${idp}first-hero`} level={1} size="hero">{HERO}</Heading>
          <Lead>{LEAD}</Lead>
          <SectionActions><Button variant="primary" size="lg">Start a book</Button><Button size="lg">Read the guide</Button></SectionActions>
        </SectionIntro>
      </PageSection>
      <PageSection aria-labelledby={`${idp}next-head`}>
        <SectionIntro><Heading id={`${idp}next-head`} level={2} size="display">{KINDS}</Heading><Lead>A book holds notes, tables and sketches.</Lead></SectionIntro>
        <Columns layout="3">{[1, 2, 3].map((n) => <Tile key={n} label={`Kind ${n}`} height={120} />)}</Columns>
      </PageSection>
      <PageSection aria-labelledby={`${idp}share-head`}>
        <SectionIntro><Heading id={`${idp}share-head`} level={2} size="display">{SHARE}</Heading></SectionIntro>
        <Columns layout="7-5"><Tile label="Text column" height={160} /><Tile label="Object" height={160} /></Columns>
      </PageSection>
      <PageSection aria-labelledby={`${idp}close-head`}>
        <SectionIntro>
          <Heading id={`${idp}close-head`} level={2} size="display">Start with one page</Heading>
          <SectionActions><Button variant="primary" size="lg">Start a book</Button></SectionActions>
        </SectionIntro>
      </PageSection>
    </PageSections>
  );
}

function FirstScreen({ face = "geist" as Face, withReadout = true }) {
  const [ref, text] = useReadout<HTMLDivElement>((el) => {
    const head = el.querySelector("#next-head") as HTMLElement | null;
    const sections = el.querySelector(".basalt-page-sections") as HTMLElement | null;
    if (!head || !sections) return "";
    const firstLine = head.getBoundingClientRect().top + parseFloat(getComputedStyle(head).lineHeight);
    return `window ${window.innerHeight}px high. The next section's headline: first line ends at y ${Math.round(firstLine)}, ${firstLine <= window.innerHeight ? "on the first screen" : "below the first screen"}. The page is ${Math.round(sections.getBoundingClientRect().height)}px tall.`;
  });
  return (
    <div ref={ref}>
      <SiteFrame face={face} below={withReadout ? caption(<span style={readout}>{text}</span>) : undefined}>
        <FirstScreenSections />
      </SiteFrame>
    </div>
  );
}

function TextPageSections() {
  return (
    <PageSections as="div">
      <PageSection aria-labelledby="text-title">
        <SectionIntro>
          <Heading id="text-title" level={1} size="display">{TEXT_TITLE}</Heading>
          <Lead>Pages are kept in the order they were written, and a reader can move one without losing its place.</Lead>
        </SectionIntro>
        <div style={{ maxWidth: "var(--basalt-size-prose-width)", display: "flex", flexDirection: "column", gap: 16 }}>
          <Heading level={2} size="2xl">Pages and their order</Heading>
          <Text size="md">A page holds one note, one table or one sketch. Pages sit in a list, and the list is the book. Moving a page changes the list and nothing else, so links to it keep working.</Text>
          <Text size="md">A table keeps its columns in the order it was made. A sketch keeps its strokes. A note keeps its words, and the words keep their order.</Text>
          <Heading level={2} size="2xl">Sharing</Heading>
          <Text size="md">Share a page with a link, or share the whole book. A shared page shows its title, its text and its last change, and nothing about the pages around it.</Text>
        </div>
      </PageSection>
    </PageSections>
  );
}

function TextPage({ face = "geist" as Face }) {
  return <SiteFrame face={face}><TextPageSections /></SiteFrame>;
}

/** A placeholder tile for what a page would put in a column: a plain shape with its words, not a Basalt component. */
function Tile({ label, height }: { label: string; height: number }) {
  return (
    <div style={{ minHeight: height, display: "flex", alignItems: "flex-end", padding: 16, boxSizing: "border-box", background: "var(--basalt-surface-placeholder)", border: "1px solid var(--basalt-border-hairline)", borderRadius: 12, color: "var(--basalt-text-secondary)" }}>
      <Text size="sm" tone="secondary">{label}</Text>
    </div>
  );
}

// ---- 4. Every Columns layout ----

const LAYOUTS: [ColumnsLayout, number][] = [["2", 2], ["3", 3], ["4", 4], ["7-5", 2], ["5-7", 2], ["8-4", 2], ["4-8", 2]];

function ColumnsDemo() {
  const [ref, text] = useReadout<HTMLDivElement>(() => `window ${window.innerWidth}px: ${window.innerWidth >= 1024 ? "layouts as named; an item's own span counts" : window.innerWidth >= 720 ? "2 and 3 hold, 4 is two rows of two, everything else stacks (an item's own span too)" : "one column"}`);
  return (
    <SiteFrame>
      <PageRow style={{ ...col, paddingBlock: 32 }}>
        <div ref={ref}>{caption(<span style={readout}>{text}. A display headline never sits in a column narrower than 7 of 12.</span>)}</div>
        {LAYOUTS.map(([layout, n]) => (
          <div key={layout} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Text size="sm" tone="secondary" mono>layout="{layout}"</Text>
            <Columns layout={layout}>{Array.from({ length: n }, (_, i) => <Tile key={i} label={`${i + 1}`} height={64} />)}</Columns>
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Text size="sm" tone="secondary" mono>no layout, an item's own span: 7, 5, then 12 (from 1024 only)</Text>
          <Columns><ColumnsItem span={7}><Tile label="span 7" height={64} /></ColumnsItem><ColumnsItem span={5}><Tile label="span 5" height={64} /></ColumnsItem><ColumnsItem span={12}><Tile label="span 12" height={64} /></ColumnsItem></Columns>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Text size="sm" tone="secondary" mono>a layout="3" inside an item of span 8: three across at 4 tracks of their own grid (from 1024)</Text>
          <Columns><ColumnsItem span={8}><Columns layout="3">{[1, 2, 3].map((n) => <Tile key={n} label={`${n}`} height={64} />)}</Columns></ColumnsItem><ColumnsItem span={4}><Tile label="span 4" height={64} /></ColumnsItem></Columns>
        </div>
      </PageRow>
    </SiteFrame>
  );
}

// ---- 5. Geist delayed: the fallback face ----

/** The line count and the widest line of each headline in a face, measured in a hidden copy of the page's row (a probe the page's own text is never changed by). */
function FaceTable() {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const [rows, setRows] = React.useState<string[][]>([]);
  React.useLayoutEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const measure = () => {
      const out: string[][] = [];
      for (const probe of el.querySelectorAll<HTMLElement>("[data-probe]")) {
        const widths: Record<string, number> = { geist: 1, fallback: 1, system: 1 };
        const lines: Record<string, number> = { geist: 0, fallback: 0, system: 0 };
        for (const face of ["geist", "fallback", "system"] as const) {
          const h = probe.querySelector<HTMLElement>(`[data-face="${face}"]`)!;
          lines[face] = linesOf(h);
          const range = document.createRange();
          range.selectNodeContents(h);
          widths[face] = Math.max(...[...range.getClientRects()].map((r) => r.width));
        }
        const pct = (face: string) => `${((((widths[face] ?? 1) - (widths.geist ?? 1)) / (widths.geist ?? 1)) * 100).toFixed(1)}%`;
        out.push([probe.dataset.probe ?? "", `${lines.geist}`, `${lines.fallback} (${pct("fallback")})`, `${lines.system} (${pct("system")})`]);
      }
      setRows(out);
    };
    measure();
    window.addEventListener("resize", measure);
    void document.fonts.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const samples: [string, "hero" | "display", string][] = [["hero", "hero", HERO], ["display", "display", KINDS], ["display", "display", SHARE], ["display", "display", TEXT_TITLE]];
  return (
    <div ref={rowRef} style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
      <div aria-hidden="true" style={{ position: "absolute", visibility: "hidden", inset: 0, pointerEvents: "none" }}>
        {samples.map(([name, size, copy], i) => (
          <div key={i} data-probe={`${name}: ${copy}`}>
            {(["geist", "fallback", "system"] as const).map((face) => <Heading key={face} data-face={face} size={size} style={faceStyle(face)}>{copy}</Heading>)}
          </div>
        ))}
      </div>
      <Text size="sm" tone="secondary" style={readout}><b>Lines in each face at this width</b> (and how much wider or narrower the widest line is than Geist's):</Text>
      {rows.map(([name, geist, fallback, system]) => (
        <Text key={name} size="sm" tone="secondary" style={readout}>{name}. Geist {geist}, Geist Fallback {fallback}, today's system chain {system}</Text>
      ))}
    </div>
  );
}

function FallbackDemo() {
  return (
    <div style={col}>
      <SiteFrame face="fallback" below={<><PageRow style={{ padding: 0 }}>{caption("Geist is out of the font chain on the two pages above, which is the page before the Geist file has arrived. The counts show Geist Fallback against Geist and against the system chain fonts.css gave before it. The fallback reduces the shift; it does not promise the same wrap at every width.")}</PageRow><FaceTable /></>}>
        <FirstScreenSections />
        <TextPageSections />
      </SiteFrame>
    </div>
  );
}

// ---- 6. What moves when Geist arrives ----

/** Window widths under 720 to sweep: the roles are the same 44/36 sizes and the gutter 16 at all of them, so a hidden copy in a box of that width is that window's page. */
const SWEEP = [320, 326, 340, 360, 376, 380, 390, 400, 414, 428];

/** The first-screen page drawn twice, hidden, in each face at the row's real width, and what the swap would move: the page's height and each headline's lines and top. */
function ShiftTable() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [lines, setLines] = React.useState<string[]>([]);
  const [phone, setPhone] = React.useState(() => window.innerWidth < 720);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      setPhone(window.innerWidth < 720);
      const read = (selector: string) => {
        const copy = el.querySelector<HTMLElement>(selector)!;
        const heads = [...copy.querySelectorAll<HTMLElement>("h1, h2")];
        return { height: copy.getBoundingClientRect().height, tops: heads.map((h) => h.getBoundingClientRect().top - copy.getBoundingClientRect().top), lines: heads.map(linesOf), names: heads.map((h) => h.textContent ?? "") };
      };
      const g = read('[data-copy="geist"]');
      const f = read('[data-copy="fallback"]');
      const out = g.names.map((name, i) => `${name}: Geist ${g.lines[i]} ${g.lines[i] === 1 ? "line" : "lines"}, Geist Fallback ${f.lines[i]} ${f.lines[i] === 1 ? "line" : "lines"}; what follows moves ${Math.round(((g.tops[i + 1] ?? g.height) - g.tops[i]!) - ((f.tops[i + 1] ?? f.height) - f.tops[i]!))}px when Geist arrives`);
      out.push(`The page at ${window.innerWidth}px: ${Math.round(f.height)}px in Geist Fallback, ${Math.round(g.height)}px in Geist, so ${Math.round(g.height - f.height)}px moves in all (positive: the page grows when Geist arrives).`);
      if (window.innerWidth < 720 && el.querySelector('[data-sweep]')) {
        const moves = SWEEP.map((w) => [w, Math.round(read(`[data-sweep="geist-${w}"]`).height - read(`[data-sweep="fallback-${w}"]`).height)] as const);
        out.push(`Across phone windows (a box of each width, the same page): ${moves.map(([w, d]) => `${w}: ${d}px`).join(", ")}.`);
      } else {
        out.push("The sweep across phone widths is on the 390 shots: the roles are the same 44 and 36 at every width under 720.");
      }
      setLines(out);
    };
    measure();
    window.addEventListener("resize", measure);
    void document.fonts.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8 }}>
      <div aria-hidden="true" style={{ position: "fixed", visibility: "hidden", insetInline: 0, top: 0, pointerEvents: "none" }}>
        {(["geist", "fallback"] as const).map((face) => <div key={face} data-copy={face} style={faceStyle(face)}><FirstScreenSections idp={`${face}-`} /></div>)}
      </div>
      {phone ? (
        <div aria-hidden="true" style={{ position: "fixed", visibility: "hidden", left: 0, top: 0, pointerEvents: "none" }}>
          {SWEEP.flatMap((w) => (["geist", "fallback"] as const).map((face) => <div key={`${face}-${w}`} data-sweep={`${face}-${w}`} style={{ ...faceStyle(face), width: w }}><FirstScreenSections idp={`${face}-${w}-`} /></div>))}
        </div>
      ) : null}
      <Text size="sm" tone="secondary" style={readout}><b>What moves at this width</b> (a headline set on more lines in Geist than in the fallback pushes what follows down by the extra lines):</Text>
      {lines.map((line) => <Text key={line} size="sm" tone="secondary" style={readout}>{line}</Text>)}
    </div>
  );
}

function ShiftDemo() {
  return (
    <SiteFrame face="fallback" below={<><PageRow style={{ padding: 0 }}>{caption("The page above is in Geist Fallback alone. DECISIONS 137 accepted that the fallback reduces shift and does not guarantee the same wrap at every width. On a real 390 window every headline is set in the same lines in both faces, and so are 1440, 1024 and 800; at some phone widths a headline wraps differently, and the sweep below says where.")}</PageRow><ShiftTable /></>}>
        <FirstScreenSections idp="shift-" />
    </SiteFrame>
  );
}

const WIDTHS = [1440, 1024, 800, 390];

export const ROUND_33: Round = {
  id: "33",
  title: "Type and layout: display type, the lead, the page row, the sections, the columns and the fallback face",
  reviewed: false,
  summary:
    "Built from DECISIONS 137 (the council's vote, a proposal), DECISIONS 139 (the owner's approval) and DECISIONS 144 (the council's vote on three open points). Two fixed steps, text-6xl 72/76 and text-7xl 96/96; two roles a page writes, hero (96/96, 72/76 from 720, 44/48 under 720) and display (72/76, 56/60, 36/40), stepped on the viewport at 720 and 1024 and never fluid; the lead; the page row; sections one stepped gap apart; twelve columns, where an item's own span holds from 1024 only; and Geist Fallback. Every step is shot edge to edge at the width it names, with the real site header above and a footer below. No site is migrated. The design panel has not reviewed the implementation.",
  steps: [
    {
      id: "scale",
      name: "The display steps and the two roles, with their sizes read live",
      intro: "Hero and display beside the fixed steps they are made of, each with its computed size, line height, tracking and weight printed from the page as it renders. A fixed step is not shown on a phone.",
      widths: WIDTHS,
      scales: [1, 2],
      height: 900,
      bleed: true,
      decisions: [
        "DECISIONS 137 A and 139: two fixed steps and two roles, stepped at 720 and 1024 on the viewport; no clamp, no viewport or container units in type; the ten shipped steps do not change.",
        "A role's phone value is a row width, not a letter count: at 44px most words fit the 288px row at 320, and a word that does not fit breaks.",
        "Docs and examples show the roles on a phone and never a fixed 6xl or 7xl there, so the fixed steps are left out under 720 on this page.",
      ],
      tryIt: ["Resize the window across 720 and 1024: the printed band and the sizes change there and nowhere else."],
      states: ["forced-colours", "reduced-motion"],
      demo: () => <ScaleDemo />,
    },
    {
      id: "first-screen",
      name: "A first screen: a hero, a lead and two buttons over three sections",
      intro: "The row is the site header's row, the first section starts half a gap below the bar, sections are one stepped gap apart (128, 96, 64) and the next section's headline is on the first screen.",
      widths: WIDTHS,
      scales: [1, 2],
      height: 900,
      bleed: true,
      decisions: [
        "DECISIONS 137 C: one row for every part of a page, a first screen included; sections one gap apart; the first half a gap below the bar; a head half a gap above its body; a gap above the footer. No section is given the window's height.",
        "The first-screen test is the first line of the next section's headline on the first screen. It yields when a reader enlarges text or spacing, and is never met by shrinking type, clipping or fixing a height.",
      ],
      tryIt: ["Make the window taller: the page does not grow (no section takes the window's height)."],
      states: ["forced-colours", "reduced-motion"],
      demo: () => <FirstScreen />,
    },
    {
      id: "text-page",
      name: "A text-led page",
      intro: "An inner page's display headline, a lead and a prose column on the row's start edge, so the first letter of each lines up with the brand.",
      widths: WIDTHS,
      scales: [1, 2],
      height: 900,
      bleed: true,
      decisions: ["DECISIONS 137 B and C: the lead is text-xl from 720 and text-lg under it, 400 in secondary ink at the prose measure, with text-wrap pretty."],
      tryIt: ["Compare the first letters of the headline, the lead and the prose: one edge."],
      states: ["forced-colours", "reduced-motion"],
      demo: () => <TextPage />,
    },
    {
      id: "columns",
      name: "Every Columns layout",
      intro: "Twelve tracks on the row with the gutter between them and space-8 between rows: 2, 3, 4, 7-5, 5-7, 8-4 and 4-8, an item's own span, and a grid nested in an item.",
      widths: WIDTHS,
      scales: [1, 2],
      height: 900,
      bleed: true,
      decisions: [
        "DECISIONS 137 C: from 720 to 1023 2 and 3 hold, 4 becomes two rows of two and the uneven splits stack; under 720 one column. The 1024 and 800 shots show the stacking, which the prototype's page did not do.",
        "DECISIONS 144: an item's own span holds from 1024 only, so a hand-written 7 + 5 cannot escape the stacking from 720 to 1023; a grid nested in an item reads its own layout, not the outer grid's.",
        "No new breakpoint: 900 and 1280 are not adopted.",
      ],
      tryIt: ["Resize across 1024 and 720 and watch 4, the uneven splits and the two spans."],
      states: ["forced-colours", "reduced-motion"],
      demo: () => <ColumnsDemo />,
    },
    {
      id: "fallback",
      name: "The same pages with Geist delayed: Geist Fallback",
      intro: "Both pages in Geist Fallback alone, the face the page paints before the Geist file arrives, with the line count of each headline in Geist, in the fallback and in the system chain printed live.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 900,
      bleed: true,
      decisions: [
        "DECISIONS 137 A: one face per weight from local Arial, with size-adjust and metric overrides measured against the Geist file Basalt ships (102.4%, 104.7% and 99.5%).",
        "The fallback reduces the shift when Geist arrives; it does not promise the same wrap at every width. Where Arial is not installed the next family answers.",
      ],
      tryIt: ["Read the counts at 1440 and at 390, and resize: they are measured at the width you are at."],
      states: ["forced-colours", "reduced-motion"],
      demo: () => <FallbackDemo />,
    },
    {
      id: "shift",
      name: "What moves when Geist arrives",
      intro: "The first-screen page in Geist Fallback alone, and below it, measured on a hidden copy in each face at this width, how many lines each headline takes, how far the swap moves what follows, and on a phone the same for a sweep of window widths.",
      widths: WIDTHS,
      scales: [1, 2],
      height: 900,
      bleed: true,
      decisions: [
        "DECISIONS 137 accepted that the fallback reduces shift and does not guarantee the same wrap at every width. Measured on the real row, the sample page moves 0px at 1440, 1024, 800 and 390; it moves at a few phone widths (the sweep on the 390 shots prints each).",
        "A 40px move that the council measured for \"Share one page or the whole book\" at 390 was measured on the walkthrough's padded 294px row, which a 326px window gives; it is not what a 390 window does.",
        "Nothing is done about it: a metric-matched fallback cannot hold every wrap, and this step shows where it does not.",
      ],
      tryIt: ["Read the numbers at 390, 800, 1024 and 1440."],
      states: ["forced-colours", "reduced-motion"],
      demo: () => <ShiftDemo />,
    },
  ],
};
