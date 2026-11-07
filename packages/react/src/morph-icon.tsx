import * as React from "react";

import { useReducedMotion } from "./motion";
import { join } from "./utils";

/** One straight stroke in a 24px grid. A collapsed line is a point. */
type Line = readonly [number, number, number, number];
type Lines = readonly [Line, Line, Line];

interface IconDef {
  lines: Lines;
  /** Degrees clockwise from the group's canonical drawing. */
  rotate: number;
  /** Same geometry, different angle. These spin instead of interpolating. */
  group?: string;
}

const point = (x: number, y: number): Line => [x, y, x, y];

const ARROW: Lines = [
  [4, 12, 15, 12],
  [15, 12, 9, 7],
  [15, 12, 9, 17],
];
const CHEVRON: Lines = [
  [9, 6, 15, 12],
  [15, 12, 9, 18],
  point(15, 12),
];
const PLUS: Lines = [
  [5, 12, 19, 12],
  [12, 5, 12, 19],
  point(12, 12),
];

const ICONS = {
  menu: {
    lines: [
      [5, 7, 19, 7],
      [5, 12, 19, 12],
      [5, 17, 19, 17],
    ],
    rotate: 0,
  },
  plus: { lines: PLUS, rotate: 0, group: "plus" },
  close: { lines: PLUS, rotate: 45, group: "plus" },
  minus: {
    lines: [
      [5, 12, 19, 12],
      point(12, 12),
      point(12, 12),
    ],
    rotate: 0,
  },
  check: {
    lines: [
      [5, 13, 10, 18],
      [10, 18, 19, 7],
      point(10, 18),
    ],
    rotate: 0,
  },
  play: {
    lines: [
      [8, 6, 18, 12],
      [18, 12, 8, 18],
      [8, 18, 8, 6],
    ],
    rotate: 0,
  },
  pause: {
    lines: [
      [8, 6, 8, 18],
      [16, 6, 16, 18],
      point(12, 12),
    ],
    rotate: 0,
  },
  "arrow-right": { lines: ARROW, rotate: 0, group: "arrow" },
  "arrow-down": { lines: ARROW, rotate: 90, group: "arrow" },
  "arrow-left": { lines: ARROW, rotate: 180, group: "arrow" },
  "arrow-up": { lines: ARROW, rotate: 270, group: "arrow" },
  "chevron-right": { lines: CHEVRON, rotate: 0, group: "chevron" },
  "chevron-down": { lines: CHEVRON, rotate: 90, group: "chevron" },
  "chevron-left": { lines: CHEVRON, rotate: 180, group: "chevron" },
  "chevron-up": { lines: CHEVRON, rotate: 270, group: "chevron" },
  copy: {
    lines: [
      [8, 8, 8, 19],
      [8, 19, 18, 19],
      [11, 6, 18, 6],
    ],
    rotate: 0,
  },
  equals: {
    lines: [
      [5, 9, 19, 9],
      [5, 15, 19, 15],
      point(12, 12),
    ],
    rotate: 0,
  },
  asterisk: {
    lines: [
      [12, 4, 12, 20],
      [5, 8, 19, 16],
      [5, 16, 19, 8],
    ],
    rotate: 0,
  },
  external: {
    lines: [
      [6, 18, 17, 7],
      [17, 7, 10, 7],
      [17, 7, 17, 14],
    ],
    rotate: 0,
  },
} as const satisfies Record<string, IconDef>;

export type MorphName = keyof typeof ICONS;

export const MORPH_NAMES = Object.keys(ICONS) as MorphName[];

function rotateLine(line: Line, degrees: number): Line {
  if (!degrees) return line;
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const turn = (x: number, y: number): [number, number] => {
    const dx = x - 12;
    const dy = y - 12;
    return [12 + dx * cos - dy * sin, 12 + dx * sin + dy * cos];
  };
  const a = turn(line[0], line[1]);
  const b = turn(line[2], line[3]);
  return [a[0], a[1], b[0], b[1]];
}

function lerpLine(from: Line, to: Line, t: number): Line {
  return [0, 1, 2, 3].map((index) => {
    const start = from[index] ?? 0;
    const end = to[index] ?? start;
    return start + (end - start) * t;
  }) as unknown as Line;
}

export interface MorphIconProps {
  /** Which drawing to show. Changing it morphs the three strokes, or spins a rotation group. */
  name: MorphName;
  size?: number;
  className?: string;
}

/**
 * An icon drawn with exactly three strokes, so one icon can become another.
 * Arrows, chevrons, and plus/close share a shape and rotate. Anything else
 * interpolates its endpoints. A stroke that an icon does not need collapses to a point.
 * Reduced motion swaps immediately.
 */
export function MorphIcon({ name, size = 16, className }: MorphIconProps) {
  const reduced = useReducedMotion();
  const def = ICONS[name];
  const shown = React.useRef<IconDef>(def);
  const [lines, setLines] = React.useState<Lines>(def.lines);
  const [rotate, setRotate] = React.useState(def.rotate);
  const [spin, setSpin] = React.useState(false);

  React.useEffect(() => {
    const next = ICONS[name];
    const previous = shown.current;
    if (reduced) {
      setLines(next.lines);
      setRotate(next.rotate);
      setSpin(false);
      shown.current = next;
      return;
    }
    const previousGroup = "group" in previous ? previous.group : undefined;
    const nextGroup = "group" in next ? next.group : undefined;
    if (previousGroup && previousGroup === nextGroup) {
      setLines(next.lines);
      setRotate(next.rotate);
      setSpin(true);
      shown.current = next;
      return;
    }
    const start = previous.lines.map((line) => rotateLine(line, previous.rotate)) as unknown as Lines;
    const end = next.lines.map((line) => rotateLine(line, next.rotate)) as unknown as Lines;
    setSpin(false);
    setRotate(0);
    setLines(start);
    const started = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / 200);
      const eased = 1 - (1 - t) ** 3;
      setLines(start.map((line, index) => {
        const target = end[index];
        return target ? lerpLine(line, target, eased) : line;
      }) as unknown as Lines);
      if (t < 1) {
        frame = requestAnimationFrame(step);
        return;
      }
      setLines(next.lines);
      setRotate(next.rotate);
      shown.current = next;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [name, reduced]);

  return (
    <svg
      className={join("basalt-morph", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      data-icon={name}
      data-spin={spin ? "" : undefined}
      data-reduced={reduced ? "" : undefined}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
      fill="none"
    >
      {lines.map((line, index) => (
        <line key={index} x1={line[0]} y1={line[1]} x2={line[2]} y2={line[3]} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ))}
    </svg>
  );
}
