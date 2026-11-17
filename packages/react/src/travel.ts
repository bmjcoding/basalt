// Travel the eye follows (DECISIONS 136 B; docs/motion.md, "Travel"). A traveller that leaves a resting place and stops at another on
// screen, carrying something the reader follows, moves by transform on `ease-in-out`. This module is its timing and its in-flight
// rule, with no element and no animation in it: the app (or `TravelSpinner`'s stylesheet) does the moving. Nothing here runs at import.

/** The longest a leg may run (`duration-figure`), the fastest (`duration-slower`) and the rest at a stop (`duration-slow`), in ms, as the tokens have them. */
export interface TravelTokens {
  /** `duration-slower`: a leg of up to 150px. Default 300. */
  slower: number;
  /** `duration-figure`: a leg of 300px or more. Default 600. */
  figure: number;
  /** `duration-slow`: the rest at a stop. Default 200. */
  slow: number;
}

const FALLBACK: TravelTokens = { slower: 300, figure: 600, slow: 200 };
/** A leg is `duration-slower` up to this many px. */
export const TRAVEL_SHORT_LEG = 150;
/** A leg is `duration-figure` from this many px. */
export const TRAVEL_LONG_LEG = 300;
/** Between the two, a leg takes this many milliseconds a pixel. */
export const TRAVEL_MS_PER_PX = 2;
/** A run, its rests included, ends inside this many milliseconds. */
export const TRAVEL_RUN_LIMIT = 5000;
/** At most this many travellers are in flight; a further trigger lands the oldest at once. */
export const TRAVEL_IN_FLIGHT = 2;

function readMs(style: CSSStyleDeclaration, name: string, fallback: number) {
  const found = /^\s*([\d.]+)(ms|s)\s*$/.exec(style.getPropertyValue(name));
  return found ? Number(found[1]) * (found[2] === "s" ? 1000 : 1) : fallback;
}

/**
 * The three durations a travel uses, read from the page's tokens (so reduced motion's collapse reaches them), or the defaults
 * on a server. Call it when a travel starts, never at import.
 */
export function travelTokens(): TravelTokens {
  if (typeof document === "undefined") return FALLBACK;
  const style = getComputedStyle(document.documentElement);
  return {
    slower: readMs(style, "--basalt-duration-slower", FALLBACK.slower),
    figure: readMs(style, "--basalt-duration-figure", FALLBACK.figure),
    slow: readMs(style, "--basalt-duration-slow", FALLBACK.slow),
  };
}

/**
 * How long one leg of `distance` px runs: `duration-slower` up to 150px, 2ms a pixel above that, `duration-figure` from 300px.
 * A longer leg goes faster, so a diagram puts a stop at least every 300px. The result is whole milliseconds.
 */
export function travelLeg(distance: number, tokens: TravelTokens = FALLBACK): number {
  const px = Math.abs(distance);
  if (!Number.isFinite(px)) return tokens.slower;
  if (px <= TRAVEL_SHORT_LEG) return Math.round(tokens.slower);
  if (px >= TRAVEL_LONG_LEG) return Math.round(tokens.figure);
  return Math.round(Math.min(tokens.figure, Math.max(tokens.slower, px * TRAVEL_MS_PER_PX)));
}

export interface TravelRun {
  /** Each leg's duration, in ms. */
  legs: number[];
  /** The rest at the stop after each leg except the last, in ms (`duration-slow`). */
  rests: number[];
  /** The run's length in ms, rests included. Always under `TRAVEL_RUN_LIMIT`. */
  total: number;
  /** True when the run had to be shortened to fit inside five seconds. */
  shortened: boolean;
}

/** The shortest a leg may be made when a run is shortened to fit: `duration-fast`. A leg is never zero-length. */
export const TRAVEL_MIN_LEG = 100;

/**
 * The timing of a whole run: the legs' lengths in px, in order. A leg takes `travelLeg`, and there is a rest of `duration-slow` at each
 * stop between legs. A run ends inside five seconds, for every input it accepts: one that would run longer has its legs (never its
 * rests) shortened by one factor, so their order and proportions stay, and none is made shorter than `TRAVEL_MIN_LEG`. The rests
 * alone can use the budget: a plan whose rests and shortest legs cannot fit (more than 17 legs at the default tokens, 16 stops) is
 * refused with an Error that says so, because no timing can keep the bound.
 */
export function travelRun(distances: readonly number[], tokens: TravelTokens = FALLBACK): TravelRun {
  const legs = distances.map((d) => travelLeg(d, tokens));
  const rests = legs.slice(1).map(() => Math.round(tokens.slow));
  const resting = rests.reduce((sum, ms) => sum + ms, 0);
  const moving = legs.reduce((sum, ms) => sum + ms, 0);
  if (moving + resting < TRAVEL_RUN_LIMIT) return { legs, rests, total: moving + resting, shortened: false };
  const room = TRAVEL_RUN_LIMIT - 1 - resting;
  const floor = Math.min(TRAVEL_MIN_LEG, Math.round(tokens.slower));
  if (room < legs.length * floor) {
    throw new Error(`a travel of ${legs.length} legs cannot end inside ${TRAVEL_RUN_LIMIT / 1000} seconds: its ${rests.length} rests take ${resting}ms and its legs need at least ${legs.length * floor}ms more; give it fewer stops`);
  }
  // One factor for every leg; a leg that would fall under the floor stays at it, so the factor is lowered until the whole run fits.
  let scale = room / moving;
  let shrunk = legs.map((ms) => Math.max(floor, Math.floor(ms * scale)));
  while (shrunk.reduce((sum, ms) => sum + ms, 0) > room) {
    scale *= 0.97;
    shrunk = legs.map((ms) => Math.max(floor, Math.floor(ms * scale)));
  }
  return { legs: shrunk, rests, total: shrunk.reduce((sum, ms) => sum + ms, 0) + resting, shortened: true };
}

/** One traveller in flight. */
export interface Flight {
  /** 1 for the first traveller `depart` was called for, counting up. */
  readonly id: number;
  /** True once it has landed, by finishing its course or being landed at once. */
  readonly landed: boolean;
  /** Lands it: `landNow` runs (the outcome is written) and it leaves the flight list. The app calls it when the traveller finishes its course; a third trigger calls it on the oldest. Safe to call twice. */
  land(): void;
}

export interface Travellers {
  /** How many are in flight. */
  readonly count: number;
  /** The ones in flight, oldest first. */
  readonly flights: readonly Flight[];
  /**
   * A trigger. Each trigger is its own traveller: the first keeps its course and lands, and a second leaves from the start with no
   * snap, reversal or queue. With two in flight, a third lands the oldest at once (`landNow` is called for it and its outcome is
   * written) before the new one departs. `landNow` is what lands this traveller: it runs once, when the course ends or when a third trigger lands it early.
   */
  depart(landNow: () => void): Flight;
}

/** The in-flight rule of a travel, as a small store the app owns (one per diagram). Nothing here is shared between pages. */
export function createTravellers(limit: number = TRAVEL_IN_FLIGHT): Travellers {
  const flights: Flight[] = [];
  let serial = 0;
  return {
    get count() { return flights.length; },
    get flights() { return flights; },
    depart(landNow) {
      while (flights.length >= limit) (flights[0] as Flight).land();
      let landed = false;
      const flight: Flight = {
        id: ++serial,
        get landed() { return landed; },
        land() {
          if (landed) return;
          landed = true;
          const at = flights.indexOf(flight);
          if (at >= 0) flights.splice(at, 1);
          landNow();
        },
      };
      flights.push(flight);
      return flight;
    },
  };
}
