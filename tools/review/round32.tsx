// Round 32: the motion rules (DECISIONS 136, decided by the council and approved by the owner in DECISIONS 139): the first screen's entrance, travel the eye
// follows, a page's one ambient loop and the control that holds it, and a list or grid that is filtered or sorted. The design is decided, so this round shows
// what was built and measures it; the implementation hasn't been reviewed. Every word and number is synthetic.
//
// The states are real. The entrance, the travellers, the ambient loop and the moving items are the library's own (`TimeChart entrance`, `createTravellers`,
// `AmbientMark`, `LoopsToggle` in a real `SiteHeader`, `Reflow`); a state that shows a motion part-way holds every running animation at a chosen time
// (`holdAt`), and says so on the page. "reduced-motion" and "forced-colours" are the same page under those emulations. The readouts are this review page's:
// Basalt draws none. The measured movement of a list's followers is printed and is not zero.

import * as React from "react";
import { flushSync } from "react-dom";
import { MoonIcon } from "@phosphor-icons/react";

import {
  AmbientMark,
  Badge,
  Button,
  Card,
  FilterResult,
  IconButton,
  LoopsToggle,
  LoopsToggleIcon,
  MultiSelect,
  NumberTicker,
  Reflow,
  ReflowItem,
  Segment,
  SegmentedControl,
  SiteHeader,
  Spinner,
  Stage,
  Text,
  TimeChart,
  TravelSpinner,
  createTravellers,
  forgetEntrance,
  markEntranceSeen,
  markPageChange,
  travelRun,
  travelTokens,
} from "../../packages/react/src/index";
import type { ReflowReport } from "../../packages/react/src/index";
import { min, minSpoken, trainingData } from "../../packages/react/test/fixtures/chart-data";
import type { Round } from "./rounds";

// Composed by the HTML skill and handed in by build.mjs (round32-skill.mjs): the page for each state, as a string.
declare const __SKILL_PAGES__: Record<string, string>;

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const row: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };
const readout: React.CSSProperties = { margin: 0, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--basalt-border-input)", color: "var(--basalt-text-primary)", fontFamily: "var(--basalt-font-family-mono)", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap" };
const caption = (text: string) => <Text size="sm" tone="secondary">{text}</Text>;
const modeOf = (state: string) => state.replace(/-(forced-colours|reduced-motion)$/, "");

/** Holds every finite animation on the page at `ms` into its own timeline: a still of a motion part-way. Loops are left alone. */
function holdAt(ms: number) {
  for (const animation of document.getAnimations()) {
    if (animation.effect?.getComputedTiming().iterations === Infinity) continue;
    const end = Number(animation.effect?.getComputedTiming().endTime ?? ms);
    animation.pause();
    animation.currentTime = Math.min(ms, end);
  }
}
/** Holds every loop (the ring, the ambient marks) at `ms` into its cycle, for a still of the art. */
function holdLoops(ms: number) {
  for (const animation of document.getAnimations()) {
    if (animation.effect?.getComputedTiming().iterations !== Infinity) continue;
    animation.pause();
    animation.currentTime = ms;
  }
}
const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

// ---- 1. The entrance ----

function EntranceDemo({ state }: { state: string }) {
  const mode = modeOf(state);
  const [run, setRun] = React.useState(0);
  const [bench, setBench] = React.useState<"a" | "b">("a");
  const [log, setLog] = React.useState("");
  const [started] = React.useState(() => {
    // The page's own history for this review: a first visit unless the state is the second one.
    if (mode === "second-visit") markEntranceSeen(); else forgetEntrance();
    return true;
  });
  const data = React.useMemo(() => trainingData(28, { late: bench === "b" }), [bench]);
  const total = React.useMemo(() => Math.round((data.series[0]?.values ?? []).reduce<number>((sum, v) => sum + (typeof v === "number" ? v : 0), 0)), [data]);
  React.useEffect(() => {
    void started;
    let cancelled = false;
    (async () => {
      await frame();
      if (cancelled) return;
      const entering = document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity && (a.effect as KeyframeEffect | null)?.target?.closest?.(".basalt-chart-svg"));
      const delays = entering.map((a) => Number(a.effect?.getTiming().delay ?? 0));
      const step = delays.length > 1 ? (delays[1] ?? 0) - (delays[0] ?? 0) : 0;
      const control = document.getElementById("wt-bench-b");
      const box = control?.getBoundingClientRect();
      const hit = box ? document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) : null;
      setLog([
        `marks entering: ${entering.length}`,
        `each over: ${entering[0] ? String(entering[0].effect?.getTiming().duration) : "none"} ms, ${step.toFixed(1)} ms apart, the last starting at ${Math.round(Math.max(0, ...delays))} ms`,
        `the number beside it, in the first frame: ${document.getElementById("wt-total")?.querySelector(".basalt-ticker-text")?.textContent ?? "?"}`,
        `the control takes the pointer in the first frame: ${control && !control.hasAttribute("disabled") && hit && control.contains(hit) ? "yes" : "no"}`,
        `stored as seen yet: ${localStorage.getItem("basalt-entrance:" + location.pathname) === "seen" ? "yes" : "no (it is written when the entrance finishes or gives way)"}`,
      ].join("\n"));
      if (mode === "first-frame") holdAt(0);
      if (mode === "midway") holdAt(120);
      if (mode === "interrupted") {
        await wait(120);
        flushSync(() => setBench("b"));
        await wait(40);
        holdAt(60);
      }
    })();
    return () => { cancelled = true; };
  }, [run, mode, started]);
  return (
    <div style={{ ...col, maxWidth: 760 }}>
      {caption("One chart is this page's entrance: on a first visit its marks draw once, each over duration-figure (600ms) on ease-out, 22ms apart, every start within 200ms of the first. The words, the number, the frame, the legend and the controls are at rest in the first frame.")}
      <div style={row}>
        <Button onClick={() => { forgetEntrance(); setRun((n) => n + 1); }}>Replay</Button>
        <Button id="wt-bench-b" pressed={bench === "b"} onClick={() => setBench((b) => (b === "a" ? "b" : "a"))}>Another bench</Button>
        <Text size="sm" tone="secondary">Total <span id="wt-total"><NumberTicker value={total} glide /></span> min</Text>
      </div>
      <TimeChart
        key={run}
        entrance={mode === "second-visit" ? true : "replay"}
        title="Training" source="Watch · synthetic" kind="bar" days={data.days} series={data.series} plan={data.plan} partial={data.partial}
        format={min} spoken={minSpoken} now={Date.UTC(2026, 10, 10, 12)} unit="min" summary="Training averaged 54 minutes a day over 28 days."
      />
      <pre style={readout} data-wt-entrance="">{log}</pre>
    </div>
  );
}

// ---- 1b. A page change without a reload ----

/**
 * A site whose pages change with no reload: this page is long past its first second when the "page" changes, so the document's own clock would call a chart late.
 * The app reports the change (`markPageChange`) and the same gates apply from there: a first visit plays the entrance, a second rests. The chart's `entrance` is
 * plain `true` here, not "replay", so every gate is the real one.
 */
function PageChangeDemo({ state }: { state: string }) {
  const mode = modeOf(state);
  const [page, setPage] = React.useState<{ serial: number; shown: boolean }>({ serial: 0, shown: false });
  const [log, setLog] = React.useState("");
  const data = React.useMemo(() => trainingData(28), []);
  const change = React.useCallback((visit: "first" | "second") => {
    if (visit === "first") forgetEntrance(); else markEntranceSeen();
    markPageChange();
    setPage((p) => ({ serial: p.serial + 1, shown: true }));
  }, []);
  React.useEffect(() => {
    if (mode === "default") return undefined;
    let cancelled = false;
    const job = (async () => {
      await document.fonts.ready;
      // Past the first second of this document, as a page reached by a link would be.
      while (performance.now() < 1400) await wait(50);
      if (cancelled) return;
      flushSync(() => change(mode === "second-visit" ? "second" : "first"));
      await frame();
      const entering = document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity && (a.effect as KeyframeEffect | null)?.target?.closest?.(".basalt-chart-svg")).length;
      setLog(`the document is ${Math.round(performance.now())} ms old when the page changes (past its first second)\nthe change was reported: markPageChange()\nmarks entering: ${entering}${entering ? "" : " (a second visit: drawn at rest)"}`);
      if (mode === "first-visit") holdAt(120);
    })();
    (window as unknown as { __BASALT_READY__?: Promise<void> }).__BASALT_READY__ = job;
    return () => { cancelled = true; };
  }, [mode, change]);
  return (
    <div style={{ ...col, maxWidth: 760 }}>
      {caption("A page change with no reload is a load. The app tells the entrance when the change began, and the same gates apply from then: a first visit to the path, on its first screen, within a second of the change. Nothing here uses replay.")}
      <div style={row}>
        <Button onClick={() => change("first")}>A page not seen before</Button>
        <Button onClick={() => change("second")}>A page seen before</Button>
      </div>
      {page.shown ? (
        <TimeChart key={page.serial} entrance title="Training" source="Watch · synthetic" kind="bar" days={data.days} series={data.series} plan={data.plan} partial={data.partial}
          format={min} spoken={minSpoken} now={Date.UTC(2026, 10, 10, 12)} unit="min" summary="Training averaged 54 minutes a day over 28 days." />
      ) : <Text size="sm" tone="secondary">No page has changed yet.</Text>}
      <pre style={readout}>{log}</pre>
    </div>
  );
}

// ---- 1c. The hold and printing settle a running entrance ----

function SettleDemo({ state }: { state: string }) {
  const mode = modeOf(state);
  const [log, setLog] = React.useState("");
  const data = React.useMemo(() => trainingData(28), []);
  const read = React.useCallback((say: string) => {
    const left = document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity && (a.effect as KeyframeEffect | null)?.target?.closest?.(".basalt-chart-svg")).length;
    const bar = document.querySelector(".basalt-chart-svg .basalt-chart-bar");
    const t = bar ? getComputedStyle(bar).transform : "none";
    setLog(`${say}\nanimations left on the figure: ${left}\nthe first bar's scale: ${!t || t === "none" ? "1 (at rest)" : new DOMMatrixReadOnly(t).d.toFixed(3)}`);
  }, []);
  React.useEffect(() => {
    forgetEntrance();
    document.documentElement.removeAttribute("data-loops");
    const print = window.matchMedia("print");
    const onPrint = () => { if (print.matches) window.setTimeout(() => read("printing began 120 ms in: the figure settled at once"), 60); };
    print.addEventListener("change", onPrint);
    let cancelled = false;
    const job = (async () => {
      await document.fonts.ready;
      await frame();
      if (cancelled) return;
      if (mode === "held" || mode === "print") holdAt(120);
      if (mode === "held") { document.documentElement.setAttribute("data-loops", "held"); await wait(80); read("the hold arrived 120 ms in: the figure settled at once, with no new animation"); }
      else read(mode === "print" ? "held 120 ms in; the shot then switches to print" : "playing");
    })();
    (window as unknown as { __BASALT_READY__?: Promise<void> }).__BASALT_READY__ = job;
    return () => { cancelled = true; print.removeEventListener("change", onPrint); document.documentElement.removeAttribute("data-loops"); };
  }, [mode, read]);
  return (
    <div style={{ ...col, maxWidth: 760 }}>
      {caption("The root hold, or printing, arriving while the entrance runs settles it at once: no new animation, and print never shows a partly drawn figure.")}
      <div style={row}><LoopsToggle form="button" /><Text size="sm" tone="secondary">Press it within the first 800ms of a replay.</Text></div>
      <TimeChart entrance="replay" title="Training" source="Watch · synthetic" kind="bar" days={data.days} series={data.series} plan={data.plan} partial={data.partial}
        format={min} spoken={minSpoken} now={Date.UTC(2026, 10, 10, 12)} unit="min" summary="Training averaged 54 minutes a day over 28 days." />
      <pre style={readout}>{log}</pre>
    </div>
  );
}

// ---- 2. Travel ----

const NODES = ["Sent", "Checked", "Filed"] as const;

function TravelDemo({ state }: { state: string }) {
  const mode = modeOf(state);
  const layer = React.useRef<HTMLDivElement>(null);
  const boxes = React.useRef<Array<HTMLSpanElement | null>>([]);
  const travellers = React.useRef(createTravellers());
  const [lit, setLit] = React.useState<number[]>([]);
  const [log, setLog] = React.useState<string[]>([]);
  const [sent, setSent] = React.useState(0);
  const say = (line: string) => setLog((lines) => [line, ...lines].slice(0, 5));
  const centres = () => {
    const origin = layer.current?.getBoundingClientRect();
    return boxes.current.map((b) => { const r = b?.getBoundingClientRect(); return r && origin ? { x: r.left + r.width / 2 - origin.left, y: r.top + r.height / 2 - origin.top } : { x: 0, y: 0 }; });
  };
  const at = (p: { x: number; y: number }) => `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
  const curve = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(`--basalt-${name}`).trim();
  const flash = (i: number) => { setLit((l) => [...l, i]); window.setTimeout(() => setLit((l) => { const next = [...l]; next.splice(next.indexOf(i), 1); return next; }), travelTokens().slow); };

  const send = () => {
    const id = sent + 1;
    setSent(id);
    const marker = document.createElement("span");
    marker.className = "wt-marker";
    Object.assign(marker.style, { position: "absolute", left: "0", top: "0", width: "10px", height: "10px", margin: "-5px 0 0 -5px", borderRadius: "50%", background: "var(--basalt-text-primary)", boxShadow: "0 0 0 2px var(--basalt-surface-1)" });
    layer.current?.append(marker);
    const t0 = performance.now();
    const c = centres();
    let landed = false;
    const finish = (how: string) => {
      marker.style.transform = at(c[2] ?? { x: 0, y: 0 });
      flash(2);
      say(`Request ${id} filed ${((performance.now() - t0) / 1000).toFixed(2)} s after it was sent: ${how}.`);
      marker.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 75, delay: travelTokens().slow, easing: curve("ease-in"), fill: "forwards" }).finished.then(() => marker.remove(), () => marker.remove());
    };
    const flight = travellers.current.depart(() => { if (landed) return; landed = true; marker.getAnimations().forEach((a) => a.cancel()); finish(travellers.current.count >= 2 ? "landed at once, because a third was sent" : "it travelled the whole way"); });
    flash(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      marker.style.transform = at(c[2] ?? { x: 0, y: 0 });
      marker.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 100 });
      flash(1);
      flight.land();
      return;
    }
    const run = travelRun([Math.hypot((c[1]?.x ?? 0) - (c[0]?.x ?? 0), (c[1]?.y ?? 0) - (c[0]?.y ?? 0)), Math.hypot((c[2]?.x ?? 0) - (c[1]?.x ?? 0), (c[2]?.y ?? 0) - (c[1]?.y ?? 0))], travelTokens());
    (async () => {
      for (let leg = 0; leg < 2; leg++) {
        const from = c[leg] ?? { x: 0, y: 0 };
        const to = c[leg + 1] ?? { x: 0, y: 0 };
        marker.style.transform = at(to);
        const a = marker.animate([{ transform: at(from) }, { transform: at(to) }], { duration: run.legs[leg] ?? 300, easing: curve("ease-in-out") });
        try { await a.finished; } catch { return; }
        if (landed) return;
        flash(leg + 1);
        if (leg === 0) { await wait(run.rests[0] ?? 200); if (landed) return; }
      }
      flight.land();
    })();
  };

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (mode === "default") return;
      await frame();
      if (cancelled) return;
      send();
      if (mode === "two") { await wait(240); if (cancelled) return; send(); }
      await wait(mode === "two" ? 160 : 150);
      if (!cancelled) for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.pause();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const tokens = travelTokens();
  return (
    <div style={{ ...col, maxWidth: 640 }}>
      {caption("A traveller that starts and stops at rest on screen moves on ease-in-out: a leg is 300ms up to 150px, 2ms a pixel above, 600ms from 300px, with a 200ms rest at each stop. Each trigger is its own traveller; with two in flight a third lands the oldest at once.")}
      <div style={row}><Button onClick={send}>Send</Button><Button onClick={() => { send(); window.setTimeout(send, 240); }}>Send two, the second mid-flight</Button><Badge>{`${travellers.current.count} flying`}</Badge></div>
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", padding: "16px 0" }}>
        <span aria-hidden="true" style={{ position: "absolute", insetInline: "calc(100% / 6)", top: 28, borderTop: "1px solid var(--basalt-border-input)" }} />
        {NODES.map((name, i) => (
          <div key={name} style={{ position: "relative", display: "grid", justifyItems: "center", gap: 8 }}>
            <span ref={(el) => { boxes.current[i] = el; }} style={{ width: 16, height: 16, borderRadius: 4, border: "1px solid var(--basalt-border-input)", background: lit.includes(i) ? "var(--basalt-text-primary)" : "var(--basalt-surface-page)", transition: lit.includes(i) ? "none" : "background-color var(--basalt-duration-fast) var(--basalt-ease-out)" }} />
            <Text size="sm" tone={lit.includes(i) ? "primary" : "secondary"}>{name}</Text>
          </div>
        ))}
        <div ref={layer} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
      </div>
      <ul style={{ ...readout, listStyle: "none", minHeight: 110 }} aria-live="off">
        <li>{`legs: ${NODES.length - 1}; at 1440 a leg is about 240px, so ${travelRun([240], tokens).legs[0]}ms; at 390 about 119px, so ${travelRun([119], tokens).legs[0]}ms`}</li>
        {log.map((line, i) => <li key={`${i}-${line}`}>{line}</li>)}
      </ul>
      <div style={row}>{caption("TravelSpinner keeps its single 300ms leg:")}<TravelSpinnerPair /></div>
    </div>
  );
}

function TravelSpinnerPair() {
  const from = React.useRef<HTMLSpanElement>(null);
  const to = React.useRef<HTMLSpanElement>(null);
  const [on, setOn] = React.useState(false);
  return (
    <>
      <span ref={from} style={{ display: "inline-flex" }}><Spinner label="Pending" size={16} /></span>
      <span style={{ display: "inline-block", width: 120 }} />
      <span ref={to} style={{ display: "inline-flex", width: 16, height: 16 }} />
      <Button size="sm" onClick={() => setOn((v) => !v)}>{on ? "Reset" : "Accept"}</Button>
      <TravelSpinner active={on} fromRef={from} toRef={to} />
    </>
  );
}

// ---- 3. The ambient loop, the header and the control ----

// The lights sit in a band above the headline, where the art is quiet.
const LIGHTS = Array.from({ length: 24 }, (_, i) => ({ left: `${((i * 37 + 11) % 97) + 1}%`, top: `${20 + ((i * 53 + 7) % 11)}%` }));
const LOCKUP = <span style={{ font: "600 16px/1 var(--basalt-font-family-sans)", letterSpacing: "-0.01em" }}>Placeholder</span>;
const swapTheme = () => { const root = document.documentElement; root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light"; };

function AmbientDemo({ state }: { state: string }) {
  const mode = modeOf(state);
  const [log, setLog] = React.useState("");
  React.useEffect(() => {
    let cancelled = false;
    const job = (async () => {
      await document.fonts.ready;
      await frame();
      await frame();
      if (cancelled) return;
      if (mode === "held") (document.querySelector('.basalt-bar-actions [title="Pause animations"]') as HTMLElement | null)?.click();
      // The narrow menu exists only where the bar shows its Menu button (under 720): clicking a button that is not drawn would open the narrow menu over the wide bar.
      const menu = document.querySelector<HTMLElement>('.basalt-site-menu-trigger[aria-label="Menu"]');
      if ((mode === "menu" || mode === "menu-held") && menu && menu.getBoundingClientRect().width > 0 && getComputedStyle(menu).display !== "none") {
        menu.click();
        await wait(450);
        // The open menu covers the bar: its first row is the pause control in its Button form.
        if (mode === "menu-held") (document.querySelector(".basalt-site-menu-loops .basalt-button") as HTMLElement | null)?.click();
      }
      await wait(50);
      if (cancelled) return;
      const loops = document.getAnimations().filter((a) => (a as CSSAnimation).animationName === "basalt-ambient");
      const periods = loops.map((a) => Number(a.effect?.getTiming().duration));
      setLog([
        `ambient marks running: ${loops.length}${document.documentElement.getAttribute("data-loops") === "held" ? " (held: every mark at full opacity)" : ""}`,
        loops.length ? `periods: ${Math.round(Math.min(...periods))} to ${Math.round(Math.max(...periods))} ms, no two in step; opacity only, 1 to 0.2` : "none running",
        `the bar: brand, ${document.querySelectorAll(".basalt-bar-actions > *").length} items in its end cluster, in this order: ${[...document.querySelectorAll(".basalt-site-bar .basalt-bar-actions > *")].map((e) => e.getAttribute("aria-label") ?? e.getAttribute("title") ?? e.textContent?.trim() ?? "").filter(Boolean).join(", ")}`,
      ].join("\n"));
      if (mode !== "held" && mode !== "menu") holdLoops(1800);
    })();
    (window as unknown as { __BASALT_READY__?: Promise<void> }).__BASALT_READY__ = job;
    return () => { cancelled = true; };
  }, [mode]);
  return (
    <div style={{ margin: "-16px" }}>
      <SiteHeader
        brand={LOCKUP} brandLabel="Placeholder home"
        links={["Product", "Docs", "Pricing"].map((label) => ({ href: `#${label.toLowerCase()}`, label, current: label === "Docs" }))}
        loopsToggle={<LoopsToggleIcon />}
        themeToggle={<IconButton icon={MoonIcon} label="Switch theme" onClick={swapTheme} />}
        action={<Button variant="primary">Get started</Button>}
      />
      <Stage
        style={{ minHeight: 520 }}
        art={(
          <div style={{ position: "absolute", inset: 0 }}>
            <svg width="100%" height="100%" viewBox="0 0 1440 520" preserveAspectRatio="xMidYMax slice" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
              <path d="M0 400 L220 330 L420 390 L640 300 L900 380 L1140 310 L1440 390 L1440 520 L0 520 Z" fill="var(--basalt-art-tone-1)" />
              <path d="M0 460 L260 410 L520 450 L820 400 L1100 445 L1440 415 L1440 520 L0 520 Z" fill="var(--basalt-art-tone-2)" />
            </svg>
            {LIGHTS.map((light, i) => <AmbientMark key={i} index={i} style={light} />)}
          </div>
        )}
      >
        <div style={{ padding: "96px var(--basalt-space-4) 32px", display: "grid", gap: 16, maxWidth: 560 }}>
          <Text size="lg" weight="semibold">Moving art holds still when you ask it to</Text>
          <div style={row}><Button>Primary action</Button><Spinner label="Working" /></div>
          <Card style={{ padding: 16, display: "grid", gap: 12 }}>
            <Text size="sm" tone="secondary">The same control as a pressed-toggle Button, and as a settings row:</Text>
            <LoopsToggle form="button" />
            <LoopsToggle form="switch" />
          </Card>
        </div>
      </Stage>
      <pre style={{ ...readout, margin: 16 }} data-wt-ambient="">{log}</pre>
    </div>
  );
}

// ---- 3b. The HTML skill: its narrow menu's pause row, and a line glide ----

/** A page composed by the HTML skill's own compose.mjs, drawn in an iframe at the walkthrough's width; the page says by message when its still is ready. */
function SkillDemo({ page, state, height }: { page: "menu" | "glide"; state: string; height: number }) {
  const mode = modeOf(state);
  const key = page === "menu" ? (mode === "menu-held" ? "menu-held" : "menu") : "glide";
  // The walkthrough sets the theme after it mounts, and a person can switch it: follow the root's attribute, and draw the page once it is known.
  const [theme, setTheme] = React.useState<string | null>(null);
  React.useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    read();
    const watch = new MutationObserver(read);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => watch.disconnect();
  }, []);
  const source = React.useMemo(() => (theme ? (__SKILL_PAGES__[key] ?? "").replace("__THEME__", theme) : ""), [key, theme]);
  React.useEffect(() => {
    let resolve: () => void = () => {};
    const ready = new Promise<void>((r) => { resolve = r; });
    const listen = (event: MessageEvent) => { if ((event.data as { basaltSkill?: string } | null)?.basaltSkill === "ready") resolve(); };
    window.addEventListener("message", listen);
    (window as unknown as { __BASALT_READY__?: Promise<void> }).__BASALT_READY__ = Promise.race([ready, wait(6000)]);
    return () => window.removeEventListener("message", listen);
  }, [key]);
  return (
    <div style={{ ...col, maxWidth: 760 }}>
      {caption(page === "menu" ? "The HTML skill's narrow menu, built by script from the bar's markup. When the bar has a loops toggle, the first row after the band is the pressed-toggle button \"Pause animations\" (DECISIONS 148). It shows at 390; at 1440 the bar's own links are drawn and the menu does not exist." : "The HTML skill's chart: a new data set 120ms into the entrance. Every mark glides from where it was drawn, a line along its path and its markers from their centres, as React's do. Held at 90ms into the glide.")}
      <iframe title="The HTML skill's page" srcDoc={source} style={{ width: "100%", height, border: "1px solid var(--basalt-border-input)", borderRadius: 8, background: "transparent" }} />
    </div>
  );
}

// ---- 4 and 5. A grid and a list that are filtered, sorted and changed mid-move ----

const TREES = [
  ["fir", "Fir", "tall", 31], ["pine", "Pine", "tall", 28], ["cedar", "Cedar", "tall", 33], ["larch", "Larch", "tall", 26], ["oak", "Oak", "round", 22], ["elm", "Elm", "round", 24],
  ["maple", "Maple", "round", 19], ["alder", "Alder", "wide", 15], ["birch", "Birch", "wide", 18], ["yew", "Yew", "wide", 12], ["rowan", "Rowan", "round", 9], ["hazel", "Hazel", "round", 6],
].map(([id, name, kind, height]) => ({ id: id as string, name: name as string, kind: kind as string, height: height as number }));
const KINDS = ["round", "tall", "wide"] as const;

interface Measured { lines: string[] }

function FlowDemo({ state, layout }: { state: string; layout: "grid" | "list" }) {
  const mode = modeOf(state);
  const [kinds, setKinds] = React.useState<string[]>([]);
  const [sort, setSort] = React.useState<"name" | "height">("name");
  const [log, setLog] = React.useState<Measured>({ lines: [] });
  const result = React.useRef<HTMLParagraphElement>(null);
  const reports = React.useRef<ReflowReport[]>([]);
  const order = React.useMemo(() => TREES.filter((t) => !kinds.length || kinds.includes(t.kind)).sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : b.height - a.height)).map((t) => t.id), [kinds, sort]);
  const focusLine = (el: Element | null) => (!el ? "nothing" : el === result.current ? "the result line" : (el.closest("[data-key]")?.getAttribute("data-key") ?? el.id) || el.tagName);
  const set = (next: { kinds?: string[]; sort?: "name" | "height" }) => flushSync(() => { if (next.kinds) setKinds(next.kinds); if (next.sort) setSort(next.sort); });

  const measure = async () => {
    // The run reads layout: wait until the page's fonts have settled, or it measures lines that are about to reflow.
    await document.fonts.ready;
    const targets = ["#wt-heading", "#wt-controls", "#wt-result", "#wt-flow"];
    const read = (sel: string) => { const r = document.querySelector(sel)?.getBoundingClientRect(); return r ? [r.left, r.top, r.width] : [0, 0, 0]; };
    const start = new Map(targets.map((t) => [t, read(t)]));
    const nodes = [...document.querySelectorAll(".basalt-reflow-item")];
    nodes.forEach((n, i) => { (n as HTMLElement & { __orig?: number }).__orig = i; });
    let aboveBeside = 0;
    let follows = 0;
    let longest = 0;
    let shift = 0;
    const followStart = document.getElementById("wt-after")?.getBoundingClientRect().top ?? 0;
    let observer: PerformanceObserver | null = null;
    try { observer = new PerformanceObserver((list) => { for (const e of list.getEntries()) shift += (e as unknown as { value: number }).value; }); observer.observe({ type: "layout-shift", buffered: false }); } catch { /* not measured */ }
    let sampling = true;
    (async () => {
      let last = performance.now();
      while (sampling) {
        await frame();
        const now = performance.now();
        longest = Math.max(longest, now - last);
        last = now;
        for (const t of targets.slice(0, 3)) { const a = read(t); const b = start.get(t) ?? a; aboveBeside = Math.max(aboveBeside, Math.abs(a[0]! - b[0]!), Math.abs(a[1]! - b[1]!), Math.abs(a[2]! - b[2]!)); }
        const flow = read("#wt-flow"); const fs = start.get("#wt-flow") ?? flow;
        aboveBeside = Math.max(aboveBeside, Math.abs(flow[0]! - fs[0]!), Math.abs(flow[1]! - fs[1]!), Math.abs(flow[2]! - fs[2]!));
        const after = document.getElementById("wt-after")?.getBoundingClientRect().top ?? followStart;
        follows = Math.max(follows, Math.abs(after - followStart));
      }
    })();
    // The steps of the brief's run: filter, clear, sort both ways, a filter reversed 60ms later, a sort reversed 70ms later.
    const outOfPlace: number[] = [];
    const settleMid = (change: () => void) => {
      const before = new Map([...document.querySelectorAll(".basalt-reflow-item")].filter((e) => !(e as HTMLElement).hidden).map((e) => { const r = e.getBoundingClientRect(); return [e.getAttribute("data-key"), [r.left, r.top]] as const; }));
      change();
      let worst = 0;
      for (const e of document.querySelectorAll(".basalt-reflow-item")) { const was = before.get(e.getAttribute("data-key")); if (!was) continue; const r = e.getBoundingClientRect(); worst = Math.max(worst, Math.abs(r.left - was[0]), Math.abs(r.top - was[1])); }
      outOfPlace.push(worst);
    };
    (document.querySelector('[data-key="elm"] a') as HTMLElement | null)?.focus();
    set({ kinds: ["round"] }); await wait(260);
    set({ kinds: [] }); await wait(260);
    set({ sort: "height" }); await wait(260);
    set({ sort: "name" }); await wait(260);
    set({ kinds: ["tall"] }); await wait(60); settleMid(() => set({ kinds: [] })); await wait(300);
    set({ sort: "height" }); await wait(70); settleMid(() => set({ sort: "name" })); await wait(300);
    // Focus: Elm has focus, then Round is cleared for Wide, so Elm leaves.
    (document.querySelector('[data-key="elm"] a') as HTMLElement | null)?.focus();
    set({ kinds: ["wide"] }); await wait(10);
    const focus = focusLine(document.activeElement);
    await wait(300);
    set({ kinds: [] }); await wait(300);
    sampling = false;
    await frame();
    observer?.disconnect();
    const replaced = [...document.querySelectorAll(".basalt-reflow-item")].filter((n) => (n as HTMLElement & { __orig?: number }).__orig === undefined || !n.isConnected).length;
    const summary = reportsLine(reports.current);
    setLog({
      lines: [
        `replaced, not moved: ${replaced} of ${nodes.length}`,
        `drawn out of place at a change made mid-move: ${Math.max(0, ...outOfPlace).toFixed(1)} px (the drawn position and opacity are the next move's start)`,
        `above and beside (heading, controls, result line, the box's own edge), every frame: ${aboveBeside.toFixed(1)} px`,
        `what follows the box, at its largest displacement while the height glides: ${follows.toFixed(1)} px (measured, and not zero: it moves once, with the box)`,
        `longest frame: ${longest.toFixed(1)} ms`,
        `layout shift recorded (raw entries): ${shift.toFixed(3)}`,
        `focus when Elm left: ${focus}`,
        summary,
      ],
    });
  };
  const reportsLine = (list: ReflowReport[]) => `changes made: ${list.length}; items moved ${list.reduce((n, r) => n + r.moved, 0)}, faded ${list.reduce((n, r) => n + r.faded, 0)}; changes landed at once: ${list.filter((r) => r.atOnce).length}`;

  React.useEffect(() => {
    let cancelled = false;
    const job = (async () => {
      if (mode === "default" || mode === "rest") return;
      await document.fonts.ready;
      await frame();
      if (cancelled) return;
      if (mode === "filtered") { set({ kinds: ["round"] }); await frame(); holdAt(90); }
      if (mode === "sorted") { set({ sort: "height" }); await frame(); holdAt(90); }
      if (mode === "mid-move") { set({ kinds: ["round"] }); await wait(60); set({ kinds: ["tall"] }); await frame(); holdAt(70); }
      if (mode === "focus") {
        (document.querySelector('[data-key="elm"] a') as HTMLElement | null)?.focus({ focusVisible: true } as FocusOptions);
        set({ sort: "height" }); await wait(260);
        (document.querySelector('[data-key="elm"] a') as HTMLElement | null)?.focus({ focusVisible: true } as FocusOptions);
        set({ kinds: ["wide", "tall"] }); await wait(400);
      }
      if (mode === "measured") await measure();
    })();
    // The screenshot waits for the sequence (build.mjs awaits window.__BASALT_READY__ when a page sets it).
    (window as unknown as { __BASALT_READY__?: Promise<void> }).__BASALT_READY__ = job;
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const grid = layout === "grid";
  const itemStyle: React.CSSProperties = grid ? { display: "grid", gap: 4, padding: 16, color: "inherit", textDecoration: "none", minHeight: 88 } : { display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", minHeight: 44, padding: "0 8px", color: "inherit", textDecoration: "none" };
  const body = TREES.map((t) => (
    <ReflowItem key={t.id} itemKey={t.id} as={grid ? "div" : "li"} data-key={t.id}>
      <a href={`#${t.id}`} className={grid ? "basalt-card" : undefined} data-level={grid ? 1 : undefined} style={itemStyle} onClick={(e) => e.preventDefault()}>
        <span style={{ fontWeight: 600 }}>{t.name}</span>
        <span style={{ color: "var(--basalt-text-secondary)", fontVariantNumeric: "tabular-nums" }}>{t.kind} · {t.height} m</span>
      </a>
    </ReflowItem>
  ));
  return (
    <div style={{ ...col, maxWidth: 760 }}>
      {caption(grid ? "A grid of cards, filtered and sorted: the items that stay move by transform over 200ms on ease-out, an arrival fades in place, a leaver fades under the movers over 75ms, and the box's height glides. No item is replaced." : "The same on a list of rows. A row is opaque in its panel's own surface while it moves, so one crossing another covers it.")}
      <h3 id="wt-heading" style={{ margin: 0, font: "600 16px/24px var(--basalt-font-family-sans)" }}>Trees</h3>
      <div id="wt-controls" style={row}>
        <MultiSelect label="Kind" options={KINDS.map((k) => ({ value: k, label: k }))} value={kinds} onValueChange={(next) => set({ kinds: next })} />
        <SegmentedControl aria-label="Sort" value={sort} onValueChange={(next) => set({ sort: next === "height" ? "height" : "name" })}>
          <Segment value="name">By name</Segment>
          <Segment value="height">Tallest first</Segment>
        </SegmentedControl>
        <Button variant="ghost" onClick={() => { void measure(); }}>Measure</Button>
      </div>
      <FilterResult id="wt-result" ref={result}>{`Showing ${order.length} of ${TREES.length} trees, ${sort === "name" ? "by name" : "tallest first"}`}</FilterResult>
      <Reflow
        id="wt-flow" order={order} layout={grid ? "grid" : "list"} as={grid ? "div" : "ul"} fallbackFocus={result}
        onReflow={(r) => { reports.current.push(r); }}
        style={grid ? { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 } : { listStyle: "none", margin: 0, padding: 0 }}
      >
        {body}
      </Reflow>
      <p id="wt-after" style={{ margin: 0, color: "var(--basalt-text-secondary)" }}>What follows the list.</p>
      <pre style={readout} data-wt-measured="">{log.lines.length ? log.lines.join("\n") : "Press Measure: it runs a filter, a clear, both sorts, a filter reversed 60ms in and a sort reversed 70ms in, and prints what moved."}</pre>
    </div>
  );
}

const MODE_STATES = (...names: string[]) => names;

export const ROUND_32: Round = {
  id: "32",
  title: "The motion rules: an entrance, travel, one ambient loop with its pause, and items that move to their places",
  reviewed: false,
  summary:
    "What the council decided and the owner approved in DECISIONS 136 and 139, built: one figure on a first screen draws its marks once on a first visit (600ms a mark on ease-out, 22ms apart, every start within 200ms, and at rest on a second visit); a traveller between two resting places on screen moves on ease-in-out, one traveller a trigger; a page's one ambient loop is opacity only, in its art, with LoopsToggle in the header's end cluster and in two more forms; and a list or grid that is filtered or sorted moves what stays to its place and never replaces an item. The number beside a figure is its real value in the first frame. The movement the list's followers make while the box's height glides is measured and printed, and it is not zero. The design panel has not reviewed the build. Every word and number is synthetic.",
  steps: [
    {
      id: "entrance",
      name: "The entrance: one figure draws once, on a first visit",
      intro: "TimeChart's entrance prop. The marks are the only thing that moves; the words, the number, the frame and the controls are there in the first frame. Replay forgets the visit.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 900,
      decisions: [
        "DECISIONS 136 A, approved in 139: one token, duration-figure (600ms), on ease-out; duration-stagger 22ms, shrunk so every start falls within duration-slow of the first; the page's path is stored as seen when it finishes or gives way.",
        "A solid line draws by its stroke; a dashed or dotted line fades in, because a dash pattern can't be drawn along its length. A number beside the figure is its real value in the first frame (decision E): the readout prints it.",
      ],
      tryIt: ["Press Replay, then Another bench halfway through: every mark glides from where it is drawn.", "Reload: the figure is drawn at rest (a second visit)."],
      states: MODE_STATES("first-frame", "midway", "interrupted", "second-visit", "midway-reduced-motion", "midway-forced-colours"),
      demo: ({ state }) => <EntranceDemo state={state} />,
    },
    {
      id: "page-change",
      name: "A page change without a reload counts as a load",
      intro: "A site that never reloads between pages. The document is more than a second old when the page changes; the app reports the change, and the entrance runs on a first visit and rests on a second.",
      widths: [1440, 390],
      scales: [1],
      height: 900,
      decisions: [
        "DECISIONS 143, item 7, 3 to 0: the app tells the entrance when the change began (markPageChange, the skill's Basalt.pageChange), and the same gates apply from then. With nothing reported the document's own clock is used, as before. A path reached this way is stored as seen when its entrance finishes or gives way.",
        "This specimen uses the real gates (entrance, not replay), which the first entrance step skips.",
      ],
      tryIt: ["Press 'A page not seen before': the marks draw. Press it again: they draw again (it forgets the visit). Press 'A page seen before': drawn at rest."],
      states: MODE_STATES("first-visit", "second-visit"),
      demo: ({ state }) => <PageChangeDemo state={state} />,
    },
    {
      id: "entrance-settle",
      name: "The hold and printing settle a running entrance",
      intro: "Held 120ms in, then the hold or print arrives: the figure is at rest at once, with no new animation.",
      widths: [1440],
      scales: [1],
      height: 900,
      decisions: ["DECISIONS 136 A with DECISIONS 143: a figure under the hold, or printing, is drawn at rest. A data change or a control used mid-entrance still glides."],
      tryIt: ["Press Replay on the first entrance step, then Pause animations within 800ms."],
      states: MODE_STATES("held", "print"),
      demo: ({ state }) => <SettleDemo state={state} />,
    },
    {
      id: "travel",
      name: "Travel the eye follows",
      intro: "A marker crosses a three-step diagram on ease-in-out. One traveller a trigger; with two in flight, a third lands the oldest at once.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 640,
      decisions: [
        "DECISIONS 136 B, approved in 139: a leg is duration-slower up to 150px, 2ms a pixel above, duration-figure from 300px; a 200ms rest at a stop; a run ends inside five seconds. Under reduced motion the traveller appears at its destination with a 100ms fade and the outcome is written at once.",
        "The hold does not stop a travel the reader started. TravelSpinner keeps its single duration-slower leg.",
      ],
      tryIt: ["Press Send, then Send two: both markers travel the whole way.", "Press Accept under TravelSpinner."],
      states: MODE_STATES("one", "two", "one-reduced-motion"),
      demo: ({ state }) => <TravelDemo state={state} />,
    },
    {
      id: "ambient",
      name: "A page's one ambient loop, and the control that holds it",
      intro: "A real SiteHeader with a brand, links, LoopsToggle (the icon form), the theme toggle and the primary action, over a stage whose art has 24 looping lights. Held, every light is at full opacity.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 900,
      decisions: [
        "DECISIONS 136 C, approved in 139: opacity only, 1 to 0.2 on ease-in-out, each mark 0.6 to 1.4 times duration-loop-ambient (6000ms) with its own phase, at most 24 marks, none wider than size-dot; still under reduced motion, in forced colours and in print.",
        "LoopsToggle is one control in three forms with the fixed name \"Pause animations\". At 390 the bar holds the brand, the icon toggle, the theme toggle and Menu; the open narrow menu covers the bar, so its first row below the band is the same control in its Button form (DECISIONS 143), pressed and at rest below. The icon's name is its `title` alone.",
      ],
      tryIt: ["Press the pause icon in the bar: the lights hold, the spinner too, and the Button and the switch below follow.", "At 390, open Menu: the pause row is the first thing after its band."],
      states: MODE_STATES("running", "held", "menu@390", "menu-held@390", "running-reduced-motion", "running-forced-colours"),
      demo: ({ state }) => <AmbientDemo state={state} />,
    },
    {
      id: "skill-menu",
      name: "The HTML skill's narrow menu has the pause row",
      intro: "A page composed with the skill's compose.mjs: a bar with links, an action and a loops toggle. Under 720 its menu's first row after the band is the same pressed-toggle button.",
      widths: [390],
      scales: [1, 2],
      height: 760,
      decisions: ["DECISIONS 148, item 2, 3 to 0: the skill's menu gets the row React's has, so the hold can be reached while the menu is open. A bar with no loops toggle has no such row. loops.js wires every [data-loops-toggle] with one listener, so the row needs no script of its own."],
      tryIt: ["Open Menu, press Pause animations, close the menu: the bar's icon shows the same state."],
      states: MODE_STATES("menu", "menu-held"),
      demo: ({ state }) => <SkillDemo page="menu" state={state} height={680} />,
    },
    {
      id: "skill-glide",
      name: "The HTML skill's chart glides a new data set mid-entrance",
      intro: "A line chart in the skill. 120ms into its entrance a new data set arrives; the line, its markers and the plan glide from where they were drawn.",
      widths: [1440, 390],
      scales: [1],
      height: 760,
      decisions: ["DECISIONS 143, item 8, with DECISIONS 148: a line and its markers glide from their drawn geometry (the path, the dash progress and the markers' centres), not only the bars."],
      tryIt: ["Reload the page: the chart draws once; the page's own script changes its data 120ms in."],
      demo: ({ state }) => <SkillDemo page="glide" state={state} height={620} />,
    },
    {
      id: "grid",
      name: "A grid, filtered and sorted",
      intro: "Reflow. Twelve synthetic trees as cards. Items that stay move by transform; arrivals fade; leavers are the same element, fading under the movers; the box's height glides.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 900,
      decisions: [
        "DECISIONS 136 D, approved in 139. Focus from an item that leaves goes to the next that stays in the order drawn, else the one before, else the result line, and never scrolls. Only items on screen move, and past 48 the change lands at once.",
        "The measured movement is printed by Measure and is not called zero: what follows the box moves as its height glides. The 48-item bound is a chosen limit; its frame time at 4x CPU throttle is in the PR.",
      ],
      tryIt: ["Choose kinds and a sort; change two in quick succession.", "Tab to Elm, then choose Wide: focus goes to the next card that stays.", "Press Measure."],
      states: MODE_STATES("rest", "filtered", "sorted", "mid-move", "focus", "measured", "filtered-reduced-motion", "rest-forced-colours"),
      demo: ({ state }) => <FlowDemo state={state} layout="grid" />,
    },
    {
      id: "list",
      name: "A list, filtered and sorted",
      intro: "The same Reflow on rows. A row is opaque in its panel's own surface while it moves.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 900,
      decisions: ["As the grid. A table is not part of this: it keeps the still-table rule."],
      tryIt: ["As the grid: filter, sort, change again while it moves, then press Measure."],
      states: MODE_STATES("rest", "filtered", "sorted", "mid-move", "focus", "measured", "filtered-reduced-motion", "rest-forced-colours"),
      demo: ({ state }) => <FlowDemo state={state} layout="list" />,
    },
  ],
};
