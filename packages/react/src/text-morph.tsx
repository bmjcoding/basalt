import * as React from "react";

import { useReducedMotion } from "./motion";
import { join } from "./utils";

export interface TextMorphGlyph {
  char: string;
  /** Stable for a letter that continues from the previous string. */
  key: string;
  /** Start in the previous string. Null when the glyph is entering. */
  from: number | null;
  /** Start in the next string. Null when the glyph is leaving. */
  to: number | null;
  kind: "stay" | "enter" | "exit";
}

export interface TextMorphPlan {
  glyphs: TextMorphGlyph[];
  /** Width of the previous string. Leaving glyphs are not part of the next width. */
  fromWidth: number;
  toWidth: number;
}

/**
 * Place a string change on a measured line. Shared letters keep their source
 * identity. Leaving letters have no slot in the next width, so they can fade
 * without holding space. Entering letters occupy only the next width.
 */
export function planTextMorph(previous: string, next: string, widths: { previous: number[]; next: number[] }): TextMorphPlan {
  const from = [...previous];
  const to = [...next];
  if (widths.previous.length !== from.length || widths.next.length !== to.length) {
    throw new Error("planTextMorph widths must match the strings");
  }
  const pairs = sharedPairs(from, to);
  const fromUsed = new Set(pairs.map((pair) => pair.from));
  const toUsed = new Set(pairs.map((pair) => pair.to));
  const fromX = offsets(widths.previous);
  const toX = offsets(widths.next);
  const glyphs: TextMorphGlyph[] = [];
  for (const pair of pairs) {
    glyphs.push({
      char: to[pair.to] ?? "",
      key: `stay-${pair.from}`,
      from: fromX[pair.from] ?? 0,
      to: toX[pair.to] ?? 0,
      kind: "stay",
    });
  }
  from.forEach((char, index) => {
    if (fromUsed.has(index)) return;
    glyphs.push({ char, key: `exit-${index}`, from: fromX[index] ?? 0, to: null, kind: "exit" });
  });
  to.forEach((char, index) => {
    if (toUsed.has(index)) return;
    glyphs.push({ char, key: `enter-${index}`, from: null, to: toX[index] ?? 0, kind: "enter" });
  });
  return {
    glyphs,
    fromWidth: widths.previous.reduce((sum, width) => sum + width, 0),
    toWidth: widths.next.reduce((sum, width) => sum + width, 0),
  };
}

function offsets(widths: number[]) {
  const starts: number[] = [];
  let cursor = 0;
  for (const width of widths) {
    starts.push(cursor);
    cursor += width;
  }
  return starts;
}

/** Longest common subsequence, preferring earlier letters so a shared prefix stays put. */
function sharedPairs(from: string[], to: string[]) {
  const cell = (row: number, column: number) => grid[row]?.[column] ?? 0;
  const glyph = (list: string[], index: number) => list[index] ?? "";
  const grid = Array.from({ length: from.length + 1 }, () => Array<number>(to.length + 1).fill(0));
  for (let i = from.length - 1; i >= 0; i--) {
    for (let j = to.length - 1; j >= 0; j--) {
      const row = grid[i];
      if (!row) continue;
      row[j] = glyph(from, i) === glyph(to, j) ? cell(i + 1, j + 1) + 1 : Math.max(cell(i + 1, j), cell(i, j + 1));
    }
  }
  const pairs: { from: number; to: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < from.length && j < to.length) {
    if (glyph(from, i) === glyph(to, j)) {
      pairs.push({ from: i, to: j });
      i += 1;
      j += 1;
    } else if (cell(i + 1, j) >= cell(i, j + 1)) i += 1;
    else j += 1;
  }
  return pairs;
}

interface PlacedGlyph {
  char: string;
  key: string;
  x: number;
  opacity: number;
  kind: TextMorphGlyph["kind"];
}

function place(glyphs: TextMorphGlyph[], at: "from" | "to"): PlacedGlyph[] {
  return glyphs.map((glyph) => ({
    char: glyph.char,
    key: glyph.key,
    x: (at === "from" ? glyph.from : glyph.to) ?? glyph.from ?? glyph.to ?? 0,
    opacity: at === "from" ? (glyph.kind === "enter" ? 0 : 1) : glyph.kind === "exit" ? 0 : 1,
    kind: glyph.kind,
  }));
}

function measure(host: HTMLElement, value: string) {
  const probe = document.createElement("span");
  const style = getComputedStyle(host);
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.whiteSpace = "pre";
  probe.style.fontFamily = style.fontFamily;
  probe.style.fontSize = style.fontSize;
  probe.style.fontWeight = style.fontWeight;
  probe.style.letterSpacing = style.letterSpacing;
  probe.style.fontFeatureSettings = style.fontFeatureSettings;
  host.appendChild(probe);
  const widths = [...value].map((character) => {
    probe.textContent = character;
    return probe.getBoundingClientRect().width;
  });
  const height = probe.getBoundingClientRect().height || parseFloat(style.lineHeight) || parseFloat(style.fontSize);
  probe.remove();
  return { widths, height };
}

export interface TextMorphProps {
  /** The full string. Shared letters stay; only the changed glyphs animate. */
  text: string;
  className?: string;
}

/**
 * A label or counter that changes in place. Glyphs are measured and absolutely
 * positioned, so a shared letter does not reflow and a leaving letter does not
 * keep its width. The container width eases from the old line to the new one.
 * The visual glyphs are hidden from assistive technology. One polite live
 * region carries the whole string, once.
 */
export function TextMorph({ text, className }: TextMorphProps) {
  const reduced = useReducedMotion();
  const host = React.useRef<HTMLSpanElement>(null);
  const shown = React.useRef(text);
  const [glyphs, setGlyphs] = React.useState<PlacedGlyph[] | null>(null);
  const [box, setBox] = React.useState<{ width: number; height: number } | null>(null);
  const [motion, setMotion] = React.useState(false);
  // Fonts can report ready a frame before glyph widths settle. Measure again once two frames agree.
  const [metricsReady, setMetricsReady] = React.useState(false);
  React.useEffect(() => {
    let live = true;
    const watch = async () => {
      await document.fonts?.ready;
      let previous = -1;
      for (let attempt = 0; attempt < 8 && live; attempt += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const width = host.current ? measure(host.current, "0").widths[0] ?? 0 : 0;
        if (attempt > 0 && Math.abs(width - previous) < 0.01) {
          setMetricsReady(true);
          return;
        }
        previous = width;
      }
      if (live) setMetricsReady(true);
    };
    watch();
    return () => { live = false; };
  }, []);

  React.useLayoutEffect(() => {
    const element = host.current;
    if (!element) return;
    const next = measure(element, text);
    const settle = () => {
      const plan = planTextMorph(text, text, { previous: next.widths, next: next.widths });
      setMotion(false);
      setBox({ width: plan.toWidth, height: next.height });
      setGlyphs(place(plan.glyphs, "to"));
      shown.current = text;
    };
    if (reduced || shown.current === text) {
      settle();
      return;
    }
    const previous = shown.current;
    const prev = measure(element, previous);
    const plan = planTextMorph(previous, text, { previous: prev.widths, next: next.widths });
    setMotion(false);
    setBox({ width: plan.fromWidth, height: next.height });
    setGlyphs(place(plan.glyphs, "from"));
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      setMotion(true);
      inner = requestAnimationFrame(() => {
        setBox({ width: plan.toWidth, height: next.height });
        setGlyphs(place(plan.glyphs, "to"));
        shown.current = text;
      });
    });
    const duration = parseFloat(getComputedStyle(element).getPropertyValue("--basalt-duration-base")) || 180;
    const done = window.setTimeout(() => {
      setGlyphs((current) => current?.filter((glyph) => glyph.kind !== "exit") ?? null);
    }, duration + 40);
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      window.clearTimeout(done);
    };
  }, [text, reduced, metricsReady]);

  return (
    <span
      ref={host}
      className={join("basalt-text-morph", className)}
      data-static={motion ? undefined : ""}
      data-font={metricsReady ? "ready" : undefined}
      style={box ? { width: box.width, height: box.height } : undefined}
    >
      <span aria-hidden="true" inert={true}>
        {glyphs?.map((glyph) => (
          <span
            key={glyph.key}
            className="basalt-text-morph-glyph"
            data-kind={glyph.kind}
            style={{ transform: `translateX(${glyph.x}px)`, opacity: glyph.opacity }}
          >
            {glyph.char}
          </span>
        ))}
      </span>
      <span className="basalt-visually-hidden" aria-live="polite">
        {text}
      </span>
    </span>
  );
}
