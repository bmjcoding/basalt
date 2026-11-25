// A timeline's seats (DECISIONS 359, Ops 2, rule 4): arithmetic on the events' places and the cards' size, with no DOM, imported by TimelineDiagram's
// module alone. Seats are derived, latest event first, each taking the first free of: above near, below near, above far, below far. A seat is free when
// the card is space-3 from every card in its lane, its stem is space-2 clear of every nearer card on its side, and every farther card's stem is space-2
// clear of it. Where only far seats are free and both are, the event takes the one that leaves the event before it a near seat; otherwise above. Each
// event tests four seats against the cards placed, so the work is bounded by the events squared. Nothing runs at load.

export type SeatSide = "above" | "below";
export interface Seat { k: number; x: number; l: number; side: SeatSide; lane: 0 | 1; turned: boolean }
export type Seating = { ok: true; placed: Seat[] } | { ok: false; at: number };

/**
 * Seats a timeline's cards. `xs` are the events' places from the axis' start edge (in time order); `width` is the drawing's; `node` a card's width; `gap`
 * the room between two cards in a lane (space-3), `clear` between a stem and a card (space-2), `radius` how far a card's start edge is before its stem
 * (radius-md, so the stem meets the flat part of its side). A flag turns toward the start only where it would pass the drawing's end edge.
 */
export function seatCards(xs: readonly number[], width: number, node: number, gap: number, clear: number, radius: number): Seating {
  const order: Array<[SeatSide, 0 | 1]> = [["above", 0], ["below", 0], ["above", 1], ["below", 1]];
  const placed: Seat[] = [];
  const startOf = (x: number) => { let l = x - radius, turned = false; if (l + node > width) { l = x + radius - node; turned = true; } return { l, turned }; };
  const fits = (x: number, l: number, side: SeatSide, lane: 0 | 1, extra?: Seat): boolean => {
    for (const c of extra ? [...placed, extra] : placed) {
      if (c.side !== side) continue;
      if (c.lane === lane) { if (!(l + node + gap <= c.l || c.l + node + gap <= l)) return false; }
      // My stem passes a nearer card's lane: it is clear of that card.
      else if (c.lane < lane) { if (!(x < c.l - clear || x > c.l + node + clear)) return false; }
      // A farther card's stem passes my lane: it is clear of me.
      else if (!(c.x < l - clear || c.x > l + node + clear)) return false;
    }
    return true;
  };
  for (let k = xs.length - 1; k >= 0; k--) {
    const x = xs[k]!;
    const { l, turned } = startOf(x);
    if (l < 0) return { ok: false, at: k };
    const open = order.filter(([side, lane]) => fits(x, l, side, lane));
    if (!open.length) return { ok: false, at: k };
    let pick = open[0]!;
    if (pick[1] === 1 && open.length > 1 && k > 0) {
      const before = xs[k - 1]!, b = startOf(before);
      const leaves = open.filter(([side, lane]) => { const me: Seat = { k, x, l, side, lane, turned }; return fits(before, b.l, "above", 0, me) || fits(before, b.l, "below", 0, me); });
      if (leaves.length) pick = leaves[0]!;
    }
    placed.push({ k, x, l, side: pick[0], lane: pick[1], turned });
  }
  return { ok: true, placed: placed.sort((a, b) => a.k - b.k) };
}
