// Round 25: a header over full-bleed art, and art tokens. The council voted (decision 104, finish-nov10 batch 4b: a three-member round,
// 2 of 3 deciding; the votes are in .review/council/header-over-art-vote/) and handed the build over. This is that design built as
// decided: the site header clear over a stage that declares its headroom, paired stage art, the headroom check, and framed art. The design
// panel has not reviewed this implementation. Every picture here is synthetic and drawn from the greys of the art tokens: no brand marks
// or photographs.
//
// The states are real. "scroll-1", "scroll-24" and "scroll-80" scroll the page by that many pixels before the shot; "press-menu" clicks
// the narrow menu's Menu button and "press-menu-opening" holds its unroll 50ms in. "reduced-motion", "forced-colours",
// "reduced-transparency" and "print" are emulations that build.mjs sets before the page loads. The build also runs the headroom check
// (`checkHeadroom`, from dist/testing) against "stage-paired" and "stage-night" and "stage-busy": the paired scene must pass in each theme at
// 390 and 1440 at 1x and 2x, and the busy scene must fail, or the round does not build.
//
// In the live walkthrough a demo sits in a scrolling frame, so the page itself never scrolls and the bar stays clear. Open the page with
// ?step=<id>&shot=1 to scroll the real thing.

import { MoonIcon } from "@phosphor-icons/react";
import * as React from "react";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, FramedArt, IconButton, PairedArt, SiteHeader, Stage } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const Mark = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" /></svg>
);
const lockup = <><Mark /><span>Placeholder</span></>;
const toggleTheme = () => { const root = document.documentElement; root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light"; };
const toggle = <IconButton icon={MoonIcon} label="Switch theme" onClick={toggleTheme} />;
const LINKS = ["Product", "Docs", "Changelog", "Pricing"].map((label) => ({ href: `#${label.toLowerCase()}`, label, current: label === "Product" }));

/** The live walkthrough shows each demo in a frame, so sticky parts stay inside it; a screenshot shows the page itself. */
const framed = new URLSearchParams(location.search).get("shot") !== "1";
function Frame({ children }: { children: React.ReactNode }) {
  if (!framed) return <>{children}</>;
  return <div style={{ position: "relative", height: 620, overflow: "auto", transform: "translateZ(0)", border: "1px solid var(--basalt-border-divider)", borderRadius: 12 }}>{children}</div>;
}

function useRootTheme(): string {
  return React.useSyncExternalStore(
    (notify) => { const observer = new MutationObserver(notify); observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); return () => observer.disconnect(); },
    () => document.documentElement.dataset.theme ?? "dark",
    () => "dark",
  );
}

/** "scroll-24" scrolls the page 24px, once the demo has mounted. A suffix for an emulation (reduced-motion, forced-colours) is ignored. */
function useScroll(state: string) {
  React.useEffect(() => {
    const match = /^scroll-(\d+)/.exec(state);
    if (!match) return undefined;
    const timer = window.setTimeout(() => window.scrollTo(0, Number(match[1])), 50);
    return () => window.clearTimeout(timer);
  }, [state]);
}

// ---- Synthetic art: dunes in the greys of the art tokens. A picture file cannot read a custom property, so the two versions are drawn
// with the tone values themselves (field, tone 1 to 4 in each theme); drawn inline (see "busy") art uses the tokens and swaps by itself.

const TONES = {
  dark: { field: "#000000", t1: "#111111", t2: "#333333", t3: "#6b6b6b", t4: "#bfbfbf" },
  light: { field: "#fafafa", t1: "#f0f0f0", t2: "#bfbfbf", t3: "#858585", t4: "#4d4d4d" },
};
// Stars of the night: below 270 in source pixels, which is below the headline's zone at the stage's 640px minimum height (the art is covered, so the crop is checked by the build).
const STARS: ReadonlyArray<readonly [number, number]> = [[880, 286], [1010, 301], [1120, 280], [1230, 312], [1330, 292], [940, 318], [1060, 274], [1180, 322], [1390, 306], [820, 300], [1290, 276], [1420, 288], [700, 296], [610, 314], [520, 288], [430, 304]];

function dunes(theme: "dark" | "light", { stars = true, band = false }: { stars?: boolean; band?: boolean } = {}): string {
  const c = TONES[theme];
  const sky = stars
    ? (theme === "dark"
      ? STARS.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 5 === 0 ? 2.5 : 1.5}" fill="${i % 5 === 0 ? c.t4 : c.t3}"/>`).join("")
      : `<circle cx="1180" cy="290" r="34" fill="none" stroke="${c.t3}" stroke-width="3"/>`)
    : "";
  const lit = band ? `<rect y="14" width="1440" height="26" fill="${theme === "dark" ? "#ededed" : "#171717"}"/>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 720" preserveAspectRatio="xMidYMid slice"><rect width="1440" height="720" fill="${c.field}"/>${lit}${sky}<path d="M0 410 C300 340 520 470 760 400 S1200 350 1440 410 V720 H0Z" fill="${c.t1}"/><path d="M0 520 C260 450 480 570 760 500 S1180 470 1440 530 V720 H0Z" fill="${c.t2}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
const NIGHT = dunes("dark");
const DAY = dunes("light");

// ---- The page: the header, a stage, and a short page below it.

function Page({ children, below = true }: { children?: React.ReactNode; below?: boolean }) {
  return (
    <>
      {children}
      {below ? (
        <main style={{ maxWidth: 1152, margin: "0 auto", padding: "var(--basalt-space-8) var(--basalt-gutter) var(--basalt-space-16)" }}>
          <p style={{ margin: 0, maxWidth: "var(--basalt-size-prose-width)", color: "var(--basalt-text-secondary)", font: "var(--basalt-font-weight-regular) var(--basalt-text-md-size) / var(--basalt-text-md-line-height) var(--basalt-font-family-sans)" }}>
            Synthetic page content. The bar above is the smoked bar once this scrolls under it; at the very top it is clear.
          </p>
          <div style={{ height: 520 }} />
        </main>
      ) : null}
    </>
  );
}

function Hero({ headline, lead, panel }: { headline: string; lead: string; panel: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 var(--basalt-gutter) var(--basalt-space-12)", boxSizing: "border-box" }}>
      {headline ? <div data-quiet="headline" style={{ maxWidth: 560 }}>
        <h1 style={{ margin: 0, font: "var(--basalt-font-weight-semibold) var(--basalt-text-4xl-size) / var(--basalt-text-4xl-line-height) var(--basalt-font-family-sans)", letterSpacing: "var(--basalt-text-4xl-tracking)" }}>{headline}</h1>
        <p data-quiet="lead" style={{ margin: "var(--basalt-space-3) 0 0", color: "var(--basalt-text-secondary)", font: "var(--basalt-font-weight-regular) var(--basalt-text-lg-size) / var(--basalt-text-lg-line-height) var(--basalt-font-family-sans)" }}>{lead}</p>
      </div> : null}
      <div style={{ marginTop: "var(--basalt-space-8)", maxWidth: 420 }}>{panel}</div>
    </div>
  );
}

const panel = (
  <Card>
    <CardHeader><CardTitle>A panel on the stage</CardTitle><CardDescription>Solid, at level 1, with its rim. Nothing translucent goes on art.</CardDescription></CardHeader>
    <CardContent><Button variant="primary">Get started</Button></CardContent>
  </Card>
);

function Bar({ solid = false }: { solid?: boolean }) {
  return <SiteHeader brand={lockup} brandLabel="Placeholder home" links={LINKS} themeToggle={toggle} action={<Button variant="primary">Get started</Button>} solid={solid} />;
}

/** A paired stage: a night picture and a day picture, and the page's theme chooses. It declares its headroom, which the build's check proves. */
function PairedDemo({ state }: { state: string }) {
  useScroll(state);
  return (
    <Frame>
      <Page>
        <Bar />
        <Stage headroom style={{ minHeight: 640 }} art={<PairedArt dark={NIGHT} light={DAY} loading="eager" />}>
          <Hero headline="Dunes, drawn in greys" lead="Paired art: a night version and a day version, swapped with the theme." panel={panel} />
        </Stage>
      </Page>
    </Frame>
  );
}

/** A stage with one version only (the night): its headroom reaches black, so in the light theme the product does not declare it and the bar is smoked from the top. */
function NightDemo({ state }: { state: string }) {
  useScroll(state);
  const theme = useRootTheme();
  return (
    <Frame>
      <Page>
        <Bar />
        <Stage headroom={theme === "dark"} style={{ minHeight: 640 }} art={<PairedArt dark={NIGHT} light={NIGHT} loading="eager" />}>
          <Hero
            headline={theme === "dark" ? "Night only" : ""}
            lead={theme === "dark" ? "Clear in the dark theme, where this art fits." : ""}
            panel={<Card><CardHeader><CardTitle>{theme === "dark" ? "Declared in dark" : "Not declared in light"}</CardTitle><CardDescription>{theme === "dark" ? "The night art keeps its headroom under the limit here." : "The night art's headroom reaches black, which the theme's ink can't read over, so the bar is smoked from the top. No words sit on this art."}</CardDescription></CardHeader><CardContent><span /></CardContent></Card>}
          />
        </Stage>
      </Page>
    </Frame>
  );
}

/** The scene run up under the bar. Drawn with the art tokens, so it swaps with the theme and fails the check in both. */
const BUSY = (
  <svg viewBox="0 0 1440 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="1440" height="720" fill="var(--basalt-art-field)" />
    <rect y="14" width="1440" height="26" fill="var(--basalt-art-mark)" />
    {STARS.map(([x, y], i) => <circle key={i} cx={x} cy={y - 240} r={i % 3 === 0 ? 3 : 2} fill="var(--basalt-art-tone-4)" />)}
    <path d="M0 410 C300 340 520 470 760 400 S1200 350 1440 410 V720 H0Z" fill="var(--basalt-art-tone-1)" />
    <path d="M0 520 C260 450 480 570 760 500 S1180 470 1440 530 V720 H0Z" fill="var(--basalt-art-tone-2)" />
  </svg>
);

function BusyDemo({ state }: { state: string }) {
  useScroll(state);
  return (
    <Frame>
      <Page>
        <Bar />
        <Stage style={{ minHeight: 640 }} art={BUSY}>
          <Hero headline="Art run up under the bar" lead="The headroom check fails, so this stage cannot declare it and the bar is smoked from the first frame." panel={<Card><CardHeader><CardTitle>Why it is smoked</CardTitle><CardDescription>A lit band crosses the top 80px, past the quiet limit in both themes.</CardDescription></CardHeader><CardContent><span /></CardContent></Card>} />
        </Stage>
      </Page>
    </Frame>
  );
}

// ---- Framed art

// A held request on an eager image would keep the page's load event from firing, so the loading tile is lazy. The hold and fail addresses are served by build.mjs's routes for the screenshots (a request that never answers, and one that is refused).
const HOLD = "https://basalt.invalid/hold.svg";
const FAIL = "https://basalt.invalid/fail.svg";
const grey = (theme: "dark" | "light") => dunes(theme, { stars: true });

function FramedDemo() {
  const theme = useRootTheme();
  const art = grey(theme === "light" ? "light" : "dark");
  const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: "var(--basalt-space-8) var(--basalt-space-6)", alignItems: "start" };
  const label = (text: string) => <div style={{ margin: "0 0 var(--basalt-space-2)", color: "var(--basalt-text-secondary)", font: "var(--basalt-font-weight-semibold) var(--basalt-text-xs-size) / var(--basalt-text-xs-line-height) var(--basalt-font-family-sans)" }}>{text}</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--basalt-space-8)" }}>
      <div style={gridStyle}>
        {(["square", "photo", "screen", "wide"] as const).map((aspect) => (
          <div key={aspect}>{label(`aspect-${aspect}`)}<FramedArt src={art} alt={`A drawn dune scene, ${aspect}`} aspect={aspect} loading="eager" caption={`The ${aspect} frame.`} credit="Synthetic art" /></div>
        ))}
      </div>
      <div style={gridStyle}>
        <div>{label("Loading")}<FramedArt src={HOLD} alt="A drawn dune scene" caption="Held: the placeholder, no shimmer, spinner or blur." credit="Synthetic art" loading="lazy" /></div>
        <div>{label("Failed, meaningful art")}<FramedArt src={FAIL} alt="A drawn dune scene at dusk" caption="Refused: the alt text, centred, in secondary." credit="Synthetic art" loading="eager" /></div>
        <div>{label("Failed, decorative art")}<FramedArt src={FAIL} alt="" caption="Refused: decorative art shows nothing." loading="eager" /></div>
        <div>{label("In a panel")}<Card><CardContent><FramedArt src={art} alt="A drawn dune scene" aspect="wide" caption="Inside a panel the radius is the outer 12 less the padding." loading="eager" /></CardContent></Card></div>
      </div>
    </div>
  );
}

function MenuDemo({ state }: { state: string }) {
  return <PairedDemo state={state} />;
}

const STAGE_STATES = ["scroll-1", "scroll-24", "scroll-80", "reduced-transparency", "forced-colours", "reduced-motion", "print"];

export const ROUND_25: Round = {
  id: "25",
  title: "A header over full-bleed art, and art tokens",
  reviewed: false,
  summary:
    "The council voted (decision 104, a three-member round, 2 of 3 deciding; Muse was out) and handed the build over. The site header is clear at the very top of a page over a stage that declares its headroom, and the smoked bar from the first pixel of scroll; stage art is paired and swaps with the theme; a test helper checks every pixel of the headroom; framed art is a figure with a rim, an aspect ratio and a caption; and the art tokens give drawn art its greys. The design panel has not reviewed this implementation, and every picture here is synthetic.",
  steps: [
    {
      id: "stage-paired",
      name: "A paired stage under a clear bar",
      intro: "Dunes at night and by day, swapped with the theme. The bar is clear at scroll 0 and the smoked bar from 1px.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 760,
      decisions: [
        "Decided 3 to 0 (opus's addition: a panel on a stage is solid, at level 1, with its rim). The bar sits on the art with no scrim, gradient, text-shadow or blend, and its ink is the theme's own: it never changes, in either state. Clear is no fill, no blur and a transparent line; the 56px bar never grows.",
        "The art keeps its headroom: the top 80px (size-stage-headroom) plus the top safe area holds no pixel past art-quiet-limit (#333333 in dark, #bfbfbf in light), so secondary ink holds 4.89:1 and 4.60:1 at worst. The stage declares it passed, and SiteHeader clears only over a stage that does. The build runs the check on this page in both themes at 390 and 1440, at 1x and 2x, and it must pass.",
        "The change to smoked: from the first pixel of scroll, from one IntersectionObserver on a 1px sentinel at the document's top (3 to 0). The fill and the line fade in over duration-base on ease-out, and back to clear at 0.75 on ease-in; the blur switches at once; the ink does not change (2 to 1; sol wanted every change at once). The shots at 1px, 24px and 80px show the bar mid-way through the scroll: by 24px the fade is done.",
        "Built beyond the vote's words: a jump past the headroom (a wheel burst, Page Down, an anchor jump, a restored scroll position) switches all of it at once. Sol saw busy art under a still-transparent bar after a 620px jump; the fade is for the first pixels only. This is the build's reading of the vote's own test list, and it is open to the council.",
        "Not copied from the prototypes: opus's links each painting their own pill and its native dialog (the bar here is the decided one, with the shared glide, 44px hit areas and Base UI's Dialog); its run-time sampler (the check is a test); its colour parser, which threw on oklab(); grok's flat band painted behind the bar, and its scrim painted above its sheet.",
        "Reduced transparency is the opaque page with its hairline from the first frame; forced colours are Canvas and CanvasText with a real line and the art not drawn; print is the opaque static bar, the stage's art not printing and the stage in the flow.",
      ],
      tryIt: ["Open ?step=stage-paired&shot=1 and scroll: the bar is clear only at the top.", "Use the theme button: the art swaps, and the bar's ink stays the theme's own.", "Tab to a link over the art: the ring is the standard ring."],
      states: STAGE_STATES,
      demo: ({ state }) => <PairedDemo state={state} />,
    },
    {
      id: "stage-night",
      name: "A night-only stage in the light theme",
      intro: "One version of the art. Where it doesn't fit the theme, the product doesn't declare it and the bar is smoked from the top.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 760,
      decisions: [
        "Decided 3 to 0 (grok moved): the ink is always the theme's own, so art that doesn't fit the theme gets the smoked bar from the top, never a second ink. A one-version photograph is not a stage; it goes in a frame.",
        "In the light theme this stage's headroom reaches black, so it is not declared and the bar starts smoked. In the dark theme the same art passes and the bar is clear. The build's check proves it passes in dark and fails in light.",
        "No words sit on this art in the light theme: theme ink on black is about 1.14:1, and nothing rescues words on art (the smoked bar rescues only the bar).",
      ],
      tryIt: ["Switch to light: the bar is the smoked bar from the first frame."],
      states: ["scroll-1"],
      demo: ({ state }) => <NightDemo state={state} />,
    },
    {
      id: "stage-busy",
      name: "A busy scene with its art run up under the bar",
      intro: "The art leaves no headroom, so the check fails and the bar is smoked from the first frame.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 760,
      decisions: [
        "Decided 3 to 0: the guarantee comes from a contract with the art that a test proves, not from a scrim. The build runs the check on this page and it must fail, naming the worst pixel (#ededed in dark, #171717 in light).",
        "A quiet zone needn't be a box: how art leaves room is the art's. Opus's busy scene kept its quiet field as a hard-edged rectangle, and the build doesn't copy that; the dunes here have no box at all.",
      ],
      tryIt: ["Compare with the paired stage: same bar, same page, and the bar is smoked."],
      states: [],
      demo: ({ state }) => <BusyDemo state={state} />,
    },
    {
      id: "stage-menu",
      name: "The menu from the clear bar",
      intro: "The narrow menu is a modal: opening it turns the bar solid, and closing returns the bar to the state it was in.",
      widths: [390],
      scales: [1, 2],
      height: 760,
      decisions: [
        "Decided 3 to 0: the menu is the decided top sheet on Base UI's Dialog, solid, its first row drawing the bar in place with Close on the Menu button's box. Focus lands on Close. The scrim is unblurred and covers the stage; the art never shows through the menu.",
        "Not copied from grok: its scrim painted above its sheet.",
      ],
      tryIt: ["Open Menu at 390 and press Escape: the bar is clear again."],
      states: ["press-menu-opening@390", "press-menu@390", "press-menu-forced-colours@390", "press-menu-reduced-motion@390"],
      demo: ({ state }) => <MenuDemo state={state} />,
    },
    {
      id: "framed-art",
      name: "Framed art in each aspect, loading, failed and captioned",
      intro: "A picture in the flow is a panel's geometry: a real rim outside the art, radius 12, no shadow, and a ratio that reserves its box.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 900,
      decisions: [
        "Decided 3 to 0: a real 1px rim outside the art (border-rim), never over its pixels; radius 12 on the page and the nested-radius rule inside a panel (a card's 12 less its 16 of padding is square, which the last tile shows); no shadow; an aspect ratio always set from the four tokens (photo, 3:2, by default), reserving the box before the art loads.",
        "While it loads, and if it fails, the frame is surface-placeholder and nothing else: no shimmer, spinner or blurred preview. Once decoded the art fades in over duration-base on ease-out (100ms, opacity only, under reduced motion). Failed meaningful art shows its alt text in secondary at 13/18, centred; decorative art shows nothing.",
        "The caption is a figcaption under the frame, space-2 below, start-aligned, at most size-prose-width: text-sm in secondary, then the credit on a line of its own at text-xs in tertiary. It prints.",
        "The loading and failed tiles use addresses the review build holds and refuses; in the live walkthrough the browser refuses both, so the loading tile shows as failed there.",
      ],
      tryIt: ["Switch themes: the rim and the placeholder follow.", "Compare the last tile's square corners with the others' 12."],
      states: ["reduced-motion", "forced-colours", "print"],
      demo: () => <FramedDemo />,
    },
  ],
};
