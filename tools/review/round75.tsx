// Round 75: cimip-gaps-3 T1, motion, access and the page base (the council's decision, Fable deciding, 2026-11-25, under the owner's handoff, DECISIONS 385).
// Under reduced motion no loop runs and a running timer counts whole minutes; an eighth stage state, idle ("Not started"); the smoked header is opaque
// under more contrast; EmptyState's title is text-base with titleSize; LinkCard gains the compact titleSize md and base. The opt-in page base (base.css)
// changes no pixel until an app imports it, so it is not shown. Built by Opus; the browser tests are written and not run (DECISIONS 359).
//
// "Today" sides are this build with the old look put back by a scoped rule, only on that side: the ring and the underline at the low point of their old
// fade (opacity 0.55, 35% ink), the full-width bar, the smoked bar under more contrast, and the 18/26 empty-state title.
// States: "reduced-motion" and "more-contrast" and "forced-colours" are emulations build.mjs sets before the page loads; "held" sets data-loops="held";
// "scrolled" scrolls a frame so text passes under the bar.

import { BinocularsIcon, BookOpenIcon, PlusIcon } from "@phosphor-icons/react";
import * as React from "react";

import {
  AppHeader,
  Button,
  EmptyState,
  Heading,
  IconButton,
  LinkCard,
  Progress,
  RunStage,
  RunStep,
  RunTimeline,
  SettingsGlyph,
  SiteHeader,
  Spinner,
  Stage,
  StageBadge,
  StageList,
  StageMark,
  StageRail,
  Text,
  TextButton,
} from "../../packages/react/src/index";
import type { StageState } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const label: React.CSSProperties = { margin: "0 0 var(--basalt-space-2)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-secondary)" };
const PAIR = ".r75-pair { display: grid; gap: var(--basalt-space-8); grid-template-columns: minmax(0, 1fr); } @media (min-width: 720px) { .r75-pair { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }";
const stack: React.CSSProperties = { display: "grid", gap: "var(--basalt-space-4)", justifyItems: "start", minWidth: 0 };

/** "held" holds every loop on the page, as the hold does. */
function useHeld(state: string) {
  React.useEffect(() => {
    if (state !== "held") return undefined;
    document.documentElement.setAttribute("data-loops", "held");
    return () => document.documentElement.removeAttribute("data-loops");
  }, [state]);
}

// ---- 1. The loops under reduced motion

// Today under reduced motion, drawn at the low point of the old fade: the ring at 0.55, the bar full width at 0.55, the underline at 35% ink.
const TODAY_LOOPS = `
.r75-today .basalt-spinner[data-variant="ring"] svg { opacity: 0.55; }
.r75-today .basalt-progress-indicator[data-indeterminate] { visibility: visible !important; left: 0; width: 100%; opacity: 0.55; }
.r75-today .basalt-text-button[data-loading] .basalt-text-button-label { text-decoration-color: color-mix(in oklch, currentColor 35%, transparent); }`;

function Loops({ domain }: { domain: "bakery" | "photos" }) {
  const words = domain === "bakery"
    ? { ring: "Syncing today's orders", button: "Save the recipe", text: "Print the labels", bar: "Importing the price list", mark: "Proofing" }
    : { ring: "Reading the card", button: "Export the album", text: "Write the captions again", bar: "Indexing 2,140 photos", mark: "Uploading" };
  return (
    <div style={stack}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--basalt-space-2)" }}><Spinner label={words.ring} /><Text as="span" size="sm" tone="secondary">{words.ring}</Text></span>
      <span style={{ display: "inline-flex", gap: "var(--basalt-space-2)" }}><Button variant="primary" loading>{words.button}</Button><IconButton icon={SettingsGlyph} label="Settings" loading /></span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--basalt-space-3)" }}><StageMark state="running" /><Text as="span" size="sm">{words.mark}</Text></span>
      <TextButton loading>{words.text}</TextButton>
      <div style={{ width: "min(320px, 100%)" }}><Progress label={words.bar} value={null} /></div>
    </div>
  );
}

function LoopsDemo({ state }: { state: string }) {
  useHeld(state);
  const reduced = state === "reduced-motion";
  return (
    <div className="r75-pair">
      <style>{`${PAIR} ${reduced ? TODAY_LOOPS : ""}`}</style>
      {reduced ? (
        <div className="r75-today" style={{ minWidth: 0 }}>
          <p style={label}>Today under reduced motion (main), at the low point of its fade: a bakery</p>
          <Loops domain="bakery" />
        </div>
      ) : (
        <div style={{ minWidth: 0 }}>
          <p style={label}>{state === "held" ? "Held: a bakery" : "Full motion, unchanged: a bakery"}</p>
          <Loops domain="bakery" />
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <p style={label}>{reduced ? "This build under reduced motion: a photo library (the held look)" : state === "held" ? "Held: a photo library" : "Full motion, unchanged: a photo library"}</p>
        <Loops domain="photos" />
      </div>
    </div>
  );
}

// ---- 2. A running time in whole minutes

function useSince(ms: number) {
  const [at] = React.useState(() => Date.now() - ms);
  return at;
}

function Timers() {
  const twenty = useSince(20_000);
  const four = useSince(240_000);
  const finished = useSince(2_850_000);
  return (
    <div className="r75-pair">
      <style>{PAIR}</style>
      <div style={{ minWidth: 0 }}>
        <p style={label}>A bread bake: a list at 20 s and at 4 min, and a finished stage</p>
        <StageList label="Bake stages" timeScale="minutes">
          <RunStage name="Mix" state="success" start={finished} end={finished + 2_850_000} />
          <RunStage name="Proof" state="running" start={four} />
          <RunStage name="Shape" state="running" start={twenty} />
          <RunStage name="Bake" state="idle" />
        </StageList>
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={label}>A photo export: a rail at the minutes scale</p>
        <StageRail label="Export stages" timeScale="minutes">
          <RunStage name="Scan" state="success" start={finished} end={finished + 150_000} />
          <RunStage name="Resize" state="running" start={four} />
          <RunStage name="Caption" state="running" start={twenty} />
          <RunStage name="Upload" state="idle" />
        </StageRail>
      </div>
    </div>
  );
}

// ---- 3. Idle, "Not started"

const EIGHT: StageState[] = ["idle", "queued", "running", "success", "failed", "skipped", "canceled", "retrying"];
const BADGE_STATES: readonly StageState[] = ["idle", "queued", "running", "success", "failed"];

function IdleDemo() {
  return (
    <div style={{ display: "grid", gap: "var(--basalt-space-6)" }}>
      <style>{PAIR}</style>
      <div>
        <p style={label}>The eight marks at 16, 20 and 24: idle first, then queued</p>
        {([16, 20, 24] as const).map((size) => (
          <div key={size} style={{ display: "flex", gap: "var(--basalt-space-3)", marginBottom: "var(--basalt-space-2)" }}>{EIGHT.map((s) => <StageMark key={s} state={s} size={size} />)}</div>
        ))}
      </div>
      <div className="r75-pair">
        <div style={{ minWidth: 0 }}>
          <p style={label}>A greenhouse's watering run: a list and a timeline</p>
          <StageList label="Watering stages">
            <RunStage name="Check the tank" state="success" start={0} end={4_200} />
            <RunStage name="North beds" state="queued" />
            <RunStage name="South beds" state="idle" />
            <RunStage name="Seed trays" state="idle" />
          </StageList>
          <div style={{ marginTop: "var(--basalt-space-4)" }}>
            <RunTimeline label="Watering steps" keep={false}>
              <RunStep state="success" start={0} end={4_200}>Read the soil sensors</RunStep>
              <RunStep state="queued">Wait for the tank to refill</RunStep>
              <RunStep state="idle">Water the south beds</RunStep>
            </RunTimeline>
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={label}>A print shop's order: a rail and its badges</p>
          <StageRail label="Order stages">
            <RunStage name="Proof" state="success" start={0} end={64_000} />
            <RunStage name="Print" state="queued" />
            <RunStage name="Trim" state="idle" />
            <RunStage name="Ship" state="idle" />
          </StageRail>
          <div style={{ display: "grid", gap: "var(--basalt-space-2)", justifyItems: "start", marginTop: "var(--basalt-space-4)" }}>
            {(["idle", "queued", "success"] as const).map((s) => <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: "var(--basalt-space-2)", fontSize: "var(--basalt-text-sm-size)" }}><StageBadge state={s} states={BADGE_STATES} /><span style={{ color: "var(--basalt-text-secondary)" }}>Order 3318</span></span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- 4. The smoked header under more contrast

const TODAY_CHROME = `.r75-today .basalt-chrome { background: var(--basalt-surface-chrome) !important; -webkit-backdrop-filter: blur(var(--basalt-blur-chrome)) !important; backdrop-filter: blur(var(--basalt-blur-chrome)) !important; }`;
const FRAME: React.CSSProperties = { position: "relative", boxSizing: "border-box", width: "100%", height: 300, overflowY: "auto", border: "var(--basalt-size-hairline) solid var(--basalt-border-hairline)", borderRadius: "var(--basalt-radius-md)", background: "var(--basalt-surface-page)" };

function Bar({ name }: { name: string }) {
  return (
    <header className="basalt-chrome" style={{ display: "flex", alignItems: "center", gap: "var(--basalt-space-4)", height: 56, padding: "0 var(--basalt-space-4)", boxSizing: "border-box", borderBottom: "var(--basalt-size-hairline) solid var(--basalt-border-hairline)" }}>
      <Text as="span" weight="semibold">{name}</Text>
      <Text as="span" size="sm" tone="secondary">Recipes</Text>
      <span style={{ flex: 1 }} />
      <Button variant="primary" size="sm">New</Button>
    </header>
  );
}

function ScrollFrame({ name, words }: { name: string; words: string[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { if (ref.current) ref.current.scrollTop = 190; }, []);
  return (
    <div ref={ref} style={FRAME} tabIndex={0} role="region" aria-label={`${name}, scrolled`}>
      <Bar name={name} />
      <div style={{ padding: "0 var(--basalt-space-4) var(--basalt-space-4)", display: "grid", gap: "var(--basalt-space-4)" }}>
        <div style={{ height: 120, display: "flex", alignItems: "flex-end", padding: "var(--basalt-space-3)", background: "var(--basalt-text-primary)", color: "var(--basalt-surface-page)", fontSize: "var(--basalt-text-sm-size)", margin: "0 calc(-1 * var(--basalt-space-4))" }}>A bright picture, scrolled under the bar</div>
        <Text as="div" size="4xl" weight="semibold">{words[0]}</Text>
        {words.slice(1).map((w) => <Text key={w} as="p" style={{ margin: 0 }}>{w}</Text>)}
        <div style={{ height: 240 }} />
      </div>
    </div>
  );
}

function ChromeDemo({ state }: { state: string }) {
  const more = state === "more-contrast";
  return (
    <div className="r75-pair">
      <style>{`${PAIR} ${more ? TODAY_CHROME : ""}`}</style>
      <div className={more ? "r75-today" : undefined} style={{ minWidth: 0 }}>
        <p style={label}>{more ? "Today under more contrast (main): still smoked and blurred" : "Without more contrast: smoked, unchanged"}</p>
        <ScrollFrame name="Larder" words={["Sourdough", "Levain at 9, mix at 11, shape by 3.", "Rye loaves rest overnight in the cold room."]} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={label}>{more ? "This build under more contrast: opaque surface-page, no filter, the line at border-input" : "Without more contrast: smoked, unchanged"}</p>
        <ScrollFrame name="Field log" words={["Heron count", "Twelve at the north pond before eight.", "The east reeds were quiet after the rain."]} />
      </div>
    </div>
  );
}

// ---- 5. A clear bar at the top under more contrast

const Mark = () => <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" /></svg>;
const ART = (
  <svg viewBox="0 0 1440 600" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: "100%" }}>
    <rect width="1440" height="600" fill="var(--basalt-art-field)" />
    <path d="M0 360 C300 280 520 430 760 350 S1200 290 1440 360 V600 H0Z" fill="var(--basalt-art-tone-1)" />
    <path d="M0 460 C260 390 480 510 760 440 S1180 410 1440 470 V600 H0Z" fill="var(--basalt-art-tone-2)" />
  </svg>
);
const framed = new URLSearchParams(location.search).get("shot") !== "1";

function ClearDemo() {
  const page = (
    <div style={{ background: "var(--basalt-surface-page)" }}>
      <SiteHeader brand={<><Mark /><span>Tidewater</span></>} brandLabel="Tidewater home" links={[{ href: "#charts", label: "Charts", current: true }, { href: "#harbours", label: "Harbours" }]} action={<Button variant="primary">Open the atlas</Button>} />
      <Stage headroom style={{ minHeight: 460 }} art={ART}>
        <div style={{ padding: "var(--basalt-space-8) var(--basalt-gutter, 24px)" }}>
          <Heading level={1} size="4xl">Tide charts for every harbour</Heading>
        </div>
      </Stage>
      <div style={{ height: 600 }} />
    </div>
  );
  if (!framed) return page;
  return <div style={{ position: "relative", height: 520, overflow: "auto", transform: "translateZ(0)", border: "1px solid var(--basalt-border-divider)", borderRadius: 12 }}>{page}</div>;
}

// ---- 6. EmptyState's title

const TODAY_EMPTY = `.r75-today .basalt-empty-state-title { font-size: var(--basalt-text-lg-size) !important; line-height: var(--basalt-text-lg-line-height) !important; letter-spacing: var(--basalt-text-lg-tracking) !important; }`;

function EmptyPage({ today, domain }: { today: boolean; domain: "recipes" | "survey" }) {
  const d = domain === "recipes"
    ? { app: "Recipe box", section: "Saved this week", icon: BookOpenIcon, page: "No recipes yet", pageText: "Recipes you save from the kitchen appear here.", panel: "Nothing saved this week", panelText: "Save a recipe to see it here.", action: "Add a recipe" }
    : { app: "Field survey", section: "Today's sightings", icon: BinocularsIcon, page: "No walks recorded", pageText: "Walks you record on the survey appear here.", panel: "No sightings today", panelText: "Sightings you log on a walk appear here.", action: "Log a sighting" };
  return (
    <div className={today ? "r75-today" : undefined} style={{ minWidth: 0, display: "grid", gap: "var(--basalt-space-4)", alignContent: "start" }}>
      <p style={{ ...label, margin: 0 }}>{today ? "Today (main): the title is 18/26 at every level" : "This build: text-base (default), md for a page's whole content, lg"}</p>
      <div style={{ border: "var(--basalt-size-hairline) solid var(--basalt-border-divider)", borderRadius: "var(--basalt-radius-lg)", overflow: "hidden" }}>
        <AppHeader solid title={d.app} actions={<Button variant="ghost" size="sm" icon={PlusIcon}>{d.action}</Button>} />
        <EmptyState headingLevel={2} titleSize={today ? "base" : "md"} icon={d.icon} title={d.page} description={d.pageText} actions={<Button size="sm">{d.action}</Button>} />
      </div>
      <div style={{ padding: "var(--basalt-space-4)", border: "var(--basalt-size-hairline) solid var(--basalt-border-divider)", borderRadius: "var(--basalt-radius-lg)" }}>
        <Heading level={2} size="md">{d.section}</Heading>
        <EmptyState headingLevel={3} title={d.panel} description={d.panelText} />
      </div>
      {today ? null : <EmptyState headingLevel={3} titleSize="lg" title={`${d.panel} (titleSize lg)`} description={d.panelText} />}
    </div>
  );
}

function EmptyDemo() {
  return (
    <div className="r75-pair">
      <style>{`${PAIR} ${TODAY_EMPTY}`}</style>
      <EmptyPage today domain="recipes" />
      <EmptyPage today={false} domain="survey" />
    </div>
  );
}

// ---- 7. LinkCard's title sizes

const media = (tone: string) => (
  <svg viewBox="0 0 320 140" aria-hidden="true" style={{ display: "block", width: "100%", height: "auto" }}>
    <rect width="320" height="140" fill="var(--basalt-surface-sunken)" />
    <circle cx="240" cy="70" r="38" fill={tone} />
  </svg>
);

function CardsDemo() {
  return (
    <div style={{ display: "grid", gap: "var(--basalt-space-10)" }}>
      <style>{`${PAIR} .r75-cards { display: grid; gap: var(--basalt-space-6); grid-template-columns: minmax(0, 1fr); } @media (min-width: 720px) { .r75-cards { grid-template-columns: repeat(3, minmax(0, 1fr)); } }`}</style>
      <div>
        <p style={label}>titleSize display (the default, unchanged): a tide atlas's editorial page</p>
        <div style={{ maxWidth: 560 }}><LinkCard href="#atlas" title="Tide atlas" description="Charts for every harbour on the coast." state="2026" media={media("var(--basalt-art-tone-2)")} /></div>
      </div>
      <div>
        <Heading level={1} size="lg">Studio</Heading>
        <p style={label}>titleSize md and base on an app page under an 18px title: a pottery studio's home</p>
        <div className="r75-cards">
          <LinkCard titleSize="md" href="#glazes" title="Glazes" description="Recipes and test tiles." state="24" media={media("var(--basalt-art-tone-2)")} />
          <LinkCard titleSize="md" href="#kiln" title="Kiln log" description="Firings this month." state="9" />
          <LinkCard titleSize="base" href="#clay" title="Clay stock" description="Bags on the shelf." state="31" media={media("var(--basalt-art-tone-1)")} />
        </div>
        <div style={{ display: "grid", gap: "var(--basalt-space-1)", marginTop: "var(--basalt-space-6)", maxWidth: 360 }}>
          <p style={label}>titleSize base with a title alone, stacked (a 44px hit area on touch, no change to layout)</p>
          <LinkCard titleSize="base" href="#orders" title="Open orders" />
          <LinkCard titleSize="base" href="#classes" title="Classes this week" />
          <LinkCard titleSize="base" href="#suppliers" title="Suppliers" target="_blank" />
        </div>
      </div>
    </div>
  );
}

const BUILT = "Built from the council's decision (cimip-gaps-3 T1: Fable deciding, Astra, Muse and Neon agreeing in their final positions), under the owner's handoff (DECISIONS 385). Built by Opus; the implementation is not reviewed. The browser tests are written and not run (DECISIONS 359).";

export const ROUND_75: Round = {
  id: "75",
  title: "cimip-gaps-3 T1: motion, access and the page base",
  reviewed: false,
  summary:
    "Under reduced motion no loop runs (the ring, a busy TextButton's underline and the indeterminate bar hold still, as held) and a running timer counts whole minutes; an eighth stage state, idle (\"Not started\"), a still dashed circle; the smoked header is opaque under more contrast; EmptyState's title is text-base, with titleSize md and lg; LinkCard gains the compact titleSize md and base. The page base is an opt-in base.css and changes no pixel until imported. Not reviewed; tests written, not run.",
  steps: [
    {
      id: "loops",
      name: "No loop runs under reduced motion",
      intro: "The ring (alone, in a busy Button and IconButton, in a running StageMark), a busy TextButton and the indeterminate Progress bar. Under reduced motion each is its held look: the ring at full opacity, the underline dashed and full, the bar its track only.",
      decisions: [
        "The ring's old fade fell to 2.70:1 in light at its low point (#4d4d4d at 55% over white), under the 3:1 a mark needs. A still arc is the look the hold already shipped, so nothing new is drawn.",
        "The hold stays and still outranks reduced motion; reduced motion never turns it on, and the hold alone freezes rewriting text and stops what starts by itself. Forced colours alone does not still the ring.",
        "The indeterminate bar keeps no aria-valuenow; its label still says the work runs. basalt-pulse and the skill's bh-fade are deleted with their readers.",
        BUILT,
      ],
      tryIt: ["Turn on Reduce motion in the OS: nothing on this page loops.", "Press Pause animations: the same pixels."],
      states: ["reduced-motion", "held"],
      widths: [1440, 390],
      height: 560,
      demo: ({ state }) => <LoopsDemo state={state} />,
    },
    {
      id: "timer",
      name: "A running time counts whole minutes under reduced motion",
      intro: "At 20 s a running time reads \"<1 min\" (said \"less than 1 minute\", PT0M), at 4 min \"4 min\"; it changes once a minute and is exact again at its end. Full motion, unchanged, is the default shot; reduced motion is the second.",
      decisions: [
        "One floored length for the drawn figure, the spoken words and dateTime; carried is added before the floor; the hold still wins.",
        "An app's format and spoken receive the floored length and the grain (\"minute\"), so a one-argument formatter cannot keep ticking. \"<1 min\" is as wide as \"00.0 s\", so with the default words no seat widens.",
        "The server writes the exact figure; the client reads the setting before paint, so no exact figure is painted after hydration and the change lands once. Countdown, Clock and DateAge do not change.",
        BUILT,
      ],
      tryIt: ["Turn on Reduce motion and watch the list for a minute: one change, at the boundary."],
      states: ["reduced-motion"],
      widths: [1440, 390],
      height: 360,
      demo: () => <Timers />,
    },
    {
      id: "idle",
      name: "Idle: a stage the sequence has not reached",
      intro: "Phosphor Bold CircleDashed in tertiary ink, never animated, with the default word \"Not started\". Queued is work that waits and could start at any moment, and keeps its breath; the dashed shape parts the two once motion stops and under more contrast.",
      decisions: [
        "A list draws the word; a rail says it and draws nothing in the status seat; a full step draws it in tertiary at 400 and never rolls; the badge is the neutral dot, never the pending ring (work actively waiting).",
        "StageBadge's `states` names the states a badge will show, so its seat is as wide as their widest word; left out, the seat is today's seven words, and a badge that shows an unlisted state widens once and warns.",
        "StageState has an eighth member: an app's own Record<StageState, …> needs an eighth entry.",
        BUILT,
      ],
      tryIt: ["Look at the 16px row: idle and queued read apart by shape alone."],
      states: ["more-contrast", "forced-colours", "reduced-motion"],
      widths: [1440, 390],
      height: 620,
      demo: () => <IdleDemo />,
    },
    {
      id: "chrome",
      name: "The smoked header is opaque under more contrast",
      intro: "Text and a bright picture scrolled under the bar. Under more contrast the bar is opaque surface-page with no filter, its line the hairline that the mode already draws as border-input. Without the setting nothing changes.",
      decisions: [
        "Blurred words passing under a 92.5% to 96% layer ghost beside the title, and the reader who asked for more contrast is the one least able to part them. Safari and Firefox do not evaluate reduced transparency, so more contrast is the setting those readers have.",
        "The rule lives with the component; no token is aliased. Ink stays primary and secondary. Forced colours still wins (Canvas).",
        "For the owner's eye: today under more contrast (left) beside this build (right).",
        BUILT,
      ],
      tryIt: ["Turn on Increase contrast and scroll a page under the bar."],
      states: ["more-contrast"],
      widths: [1440, 390],
      height: 420,
      demo: ({ state }) => <ChromeDemo state={state} />,
    },
    {
      id: "clear",
      name: "A clear bar is never clear under more contrast",
      intro: "A site header over a stage that declares its headroom, at the very top: clear without the setting, opaque with its line from the first frame under more contrast.",
      decisions: ["At the top and scrolled the bar is the same opaque fill, so there is nothing to fade between.", BUILT],
      tryIt: ["Open ?step=clear&shot=1 with Increase contrast on."],
      states: ["more-contrast"],
      widths: [1440, 390],
      height: 520,
      demo: () => <ClearDemo />,
    },
    {
      id: "empty",
      name: "EmptyState's title is text-base, at every level",
      intro: "Under an app bar's 18px title and a 16px section heading. Today's 18/26 equalled the bar's h1 and outranked the section heading; the title is now 14/20 at 500 by default, md (16/24) where the empty state is a page's whole content, lg (18/26) for today's look.",
      decisions: [
        "A part's level prop places its heading in the outline and never sets its size (as DECISIONS 386). headingLevel gains 1.",
        "Everything else is unchanged: centred, the 24px icon, the 42ch description, the actions.",
        "For the owner's eye: today (left, a recipe box) beside this build (right, a field survey), at page level and in a panel.",
        BUILT,
      ],
      tryIt: ["Compare each title with the bar's title and the section heading above it."],
      widths: [1440, 390],
      height: 900,
      demo: () => <EmptyDemo />,
    },
    {
      id: "cards",
      name: "LinkCard's compact title sizes",
      intro: "The display card is unchanged, to the pixel. titleSize md (16/24) and base (14/20), each 600, are for an app page: a 16px arrow at every width, the foot a step down, and a 44px hit area on touch with no change to layout.",
      decisions: [
        "Above the title: space-4 (md) or space-3 (base) under media, none without; space-4 to the arrow; the foot text-base or text-sm, space-2 or space-1 below the title, space-4 apart; it still stacks under 720.",
        "The arrow stays centred on the title's first line from one variable. titleLevel still changes no size.",
        BUILT,
      ],
      tryIt: ["On a phone, tap just above or below a title-only card: it is that card."],
      widths: [1440, 390],
      height: 1100,
      touch: true,
      demo: () => <CardsDemo />,
    },
  ],
};
