// The core set's drawing. A glyph is eight cubic slots on the 24 grid (a straight stroke is a cubic with its controls on
// the line; a slot that is not drawn is an invisible point), drawn at rest or selected from the same numbers:
// selected closes the opening, fills each closed loop, and cuts the inner strokes out of the fill as holes.
// The stroke is 2.25 units on 24 at every size. Colour is `currentColor`.
//
// Each glyph is its own module (src/glyphs/*.ts, written from the drawn set by glyphs/generate.mjs). This file is what
// they share: the types, the geometry, and the drawing of a drawing. Nothing here runs when the module is loaded.

import * as React from "react";

import type { IconGlyphProps } from "./types";

/** One cubic: [x0, y0, x1, y1, x2, y2, x3, y3, on]. `on` is 1 when drawn and 0 when unused. */
export type GlyphSlot = readonly [number, number, number, number, number, number, number, number, number];

/**
 * A slot as stored, in the shortest form that says it: [x, y] a point; [x0, y0, x3, y3] a straight line; [x0, y0, x1, y1,
 * x2, y2, x3, y3] a cubic; or all nine numbers, when the slot is not drawn (`on` 0) or is part drawn.
 */
export type GlyphSlotData = readonly number[];

/** A core glyph's drawing, as the council drew it. */
export interface GlyphData {
  readonly name: string;
  /** The closed drawing, which selected draws. Slots after the last one stored are unused. In a rotation group, the group's canonical (unturned) drawing. */
  readonly selected: readonly GlyphSlotData[];
  /** The slots that differ at rest: the opening of the seam, or a stroke that exists only when selected. */
  readonly rest?: Readonly<Record<number, GlyphSlotData>>;
  /** Closed loops, as slot indexes in order. Selected fills each. */
  readonly loops?: readonly (readonly number[])[];
  /** Slots that become holes in the fill when selected. */
  readonly knock?: readonly number[];
  /** The holes also cut the strokes (Home's door). */
  readonly cut?: boolean;
  /** Fill the loops with the even-odd rule (Sandboxes). */
  readonly evenodd?: boolean;
  /** Glyphs of one group are the same drawing at another angle, so a change between them turns. */
  readonly group?: string;
  /** Degrees clockwise about the tile's centre from the group's canonical drawing. */
  readonly rotate?: number;
}

/** An icon component that also carries its drawing. Pass it to `Icon`, `Button`'s `icon`, or any `IconComponent` prop. */
export type GlyphIcon = React.FunctionComponent<IconGlyphProps> & { readonly glyph: GlyphData };

/** What is on screen: slots (unturned), the angle they are turned by, and how far the fill has risen (0 to 1). */
export interface Drawing {
  readonly slots: readonly GlyphSlot[];
  readonly angle: number;
  readonly f: number;
  readonly loops: readonly (readonly number[])[];
  readonly knock: readonly number[];
  readonly cut?: boolean;
  readonly evenodd?: boolean;
}

export const SLOTS = 8;
/** The stroke, in units on the 24 grid, at every size: 1.5px at 16, 1.875 at 20, 2.25 at 24. */
export const STROKE = 2.25;

const UNUSED: GlyphSlot = [12, 12, 12, 12, 12, 12, 12, 12, 0];

/** A stored slot as nine numbers. A straight line has its controls a third of the way along, as the drawn set has them. */
function expand(s: GlyphSlotData): GlyphSlot {
  const [x0 = 0, y0 = 0] = s;
  if (s.length === 2) return [x0, y0, x0, y0, x0, y0, x0, y0, 1];
  if (s.length === 4) {
    const dx = (s[2] as number) - x0;
    const dy = (s[3] as number) - y0;
    return [x0, y0, x0 + dx / 3, y0 + dy / 3, x0 + (2 * dx) / 3, y0 + (2 * dy) / 3, s[2] as number, s[3] as number, 1];
  }
  if (s.length === 8) return [...s, 1] as unknown as GlyphSlot;
  return s as unknown as GlyphSlot;
}

function padded(slots: readonly GlyphSlotData[]): GlyphSlot[] {
  const out = slots.map(expand);
  while (out.length < SLOTS) out.push(UNUSED);
  return out;
}

/** The eight slots of a glyph at rest or selected. */
export function slotsOf(data: GlyphData, selected: boolean): GlyphSlot[] {
  const out = padded(data.selected);
  if (!selected && data.rest) for (const [index, slot] of Object.entries(data.rest)) out[Number(index)] = expand(slot);
  return out;
}

/** The settled drawing of a glyph at rest or selected. A glyph with no loops has no fill, so selected draws it as at rest. */
export function settle(data: GlyphData, selected: boolean): Drawing {
  const loops = data.loops ?? [];
  return {
    slots: slotsOf(data, selected),
    angle: data.rotate ?? 0,
    f: selected && loops.length ? 1 : 0,
    loops,
    knock: data.knock ?? [],
    cut: data.cut,
    evenodd: data.evenodd,
  };
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** A slot turned about the tile's centre. */
export function turn(slot: GlyphSlot, degrees: number): GlyphSlot {
  if (!degrees) return slot;
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const out = slot.slice() as unknown as number[];
  for (let i = 0; i < 8; i += 2) {
    const dx = (slot[i] as number) - 12;
    const dy = (slot[i + 1] as number) - 12;
    out[i] = 12 + dx * cos - dy * sin;
    out[i + 1] = 12 + dx * sin + dy * cos;
  }
  return out as unknown as GlyphSlot;
}

const reach = (s: GlyphSlot) => Math.hypot(s[6] - s[0], s[7] - s[1]) + Math.hypot(s[2] - s[0], s[3] - s[1]) + Math.hypot(s[4] - s[6], s[5] - s[7]);

function pathOf(s: GlyphSlot, move = true): string {
  const m = move ? `M${r3(s[0])} ${r3(s[1])}` : "";
  if (reach(s) < 1e-3) return `${m}L${r3(s[6])} ${r3(s[7])}`;
  return `${m}C${r3(s[2])} ${r3(s[3])} ${r3(s[4])} ${r3(s[5])} ${r3(s[6])} ${r3(s[7])}`;
}

/** A point is drawn 1.5 times the stroke, as type draws a period heavier than its stems. */
function widthOf(s: GlyphSlot): number {
  const l = reach(s);
  return l >= STROKE ? STROKE : STROKE * (1 + 0.5 * (1 - l / STROKE));
}

/** The paths of a drawing: the fill with its holes, then the strokes. The caller supplies the `<svg>`. */
export function DrawingPaths({ drawing }: { drawing: Drawing }) {
  const id = `basalt-glyph-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const slots = drawing.slots.map((s) => turn(s, drawing.angle));
  const { knock, loops, f } = drawing;
  const strokes = (
    <g fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
      {slots.map((s, i) => {
        const opacity = s[8] * (knock.includes(i) ? 1 - f : 1);
        if (opacity < 0.002) return null;
        const w = widthOf(s);
        return <path key={i} d={pathOf(s)} strokeWidth={Math.abs(w - STROKE) > 1e-6 ? r3(w) : undefined} strokeOpacity={opacity < 0.999 ? r3(opacity) : undefined} />;
      })}
    </g>
  );
  if (f <= 0.001 || !loops.length) return strokes;
  const holes = knock.filter((i) => (slots[i]?.[8] ?? 0) > 0.001);
  const fill = loops.map((loop) => `${loop.map((i, k) => pathOf(slots[i] as GlyphSlot, k === 0)).join("")}Z`).join("");
  return (
    <>
      {holes.length ? (
        <mask id={id} maskUnits="userSpaceOnUse" x={-2} y={-2} width={28} height={28}>
          <rect x={-2} y={-2} width={28} height={28} fill="#fff" />
          <g fill="none" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={r3(f)}>
            {holes.map((i) => {
              const s = slots[i] as GlyphSlot;
              return <path key={i} d={pathOf(s)} strokeWidth={r3(widthOf(s))} strokeOpacity={s[8] < 0.999 ? r3(s[8]) : undefined} />;
            })}
          </g>
        </mask>
      ) : null}
      <g mask={holes.length ? `url(#${id})` : undefined}>
        <path d={fill} fill="currentColor" fillOpacity={r3(f)} fillRule={drawing.evenodd ? "evenodd" : undefined} />
        {drawing.cut ? strokes : null}
      </g>
      {drawing.cut ? null : strokes}
    </>
  );
}

/** A drawing in its own tile. `size` is in px; the stroke is 2.25 of 24 whatever the size. */
export function DrawingSvg({ drawing, size = 16, ...rest }: { drawing: Drawing; size?: number | string } & Omit<React.SVGProps<SVGSVGElement>, "ref" | "width" | "height">) {
  return (
    <svg {...rest} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <DrawingPaths drawing={drawing} />
    </svg>
  );
}

/**
 * Make a core glyph into an icon component. A glyph draws at rest unless `weight` is "fill", which `Icon` passes for
 * `selected`; any other weight is ignored, since the set has one weight.
 */
export function glyph(data: GlyphData): GlyphIcon {
  function Glyph({ size = 16, weight, className, focusable, role, "aria-hidden": ariaHidden, "aria-label": ariaLabel }: IconGlyphProps) {
    return (
      <DrawingSvg
        drawing={settle(data, weight === "fill")}
        size={size}
        className={className}
        focusable={focusable}
        role={role}
        aria-hidden={ariaHidden}
        aria-label={ariaLabel}
        data-glyph={data.name}
      />
    );
  }
  Glyph.displayName = `Glyph(${data.name})`;
  return Object.assign(Glyph, { glyph: data });
}
