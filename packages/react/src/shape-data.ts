// The data side of a loading shape (skeleton-shape, DECISIONS 247, 248 and 258): what a prefill is drawn from, the stand-in words, and a list's
// remembered count. Plain code, with no React, so a server or a data layer can import it. Nothing here runs at import, and nothing here persists
// anything on its own: a count is kept where the app says (a `CountStore` it passes), or for the page's life.

/** Which of the two drawings a prefill is: 0 is drawn on the page, 1 is the unseen twin it is compared with. */
export type StandInVariant = 0 | 1;

/**
 * A record with any field, at any depth, left out: what an app already knows of the data a region will draw. Only a plain record is partial; an array, a `Date`, a `Map`, a `Set`,
 * a function and every other value is known whole or not at all.
 */
export type DeepPartial<T> = T extends readonly unknown[] | Date | RegExp | Map<unknown, unknown> | Set<unknown> | ((...args: never[]) => unknown) ? T : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

/** A plain record (an object literal, or one made with no prototype): the only kind `fillIn` merges into. */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Known words: a table's column heads and a row of tabs name the page's structure, and are drawn as they are in a shape. */
export const KEEP = 'thead, [role="tablist"], [data-bone="keep"]';

/**
 * What a prefill draws from: the stand-in, with every field the app knows put over it. `known` is a partial record, deeply (a known order inside an
 * unknown account is `fillIn({ order }, standInAccount(variant))`). **Unknown and known-empty are told apart by `undefined` and `null`:** a field
 * left out or set to `undefined` is unknown and keeps the stand-in's value; a field set to `null` is known to be empty and stays `null`. Only plain
 * records are merged: an array, a `Date`, a `Map`, any other object with a prototype of its own, and every atomic value (a string, a number, `null`)
 * is taken as given. `known` itself `null` or `undefined` is nothing known (a cache with no entry), and gives the stand-in back.
 */
export function fillIn<T>(known: NoInfer<DeepPartial<T>> | null | undefined, standIns: T): T {
  if (known === undefined || known === null) return standIns;
  if (!isPlainRecord(known) || !isPlainRecord(standIns)) return known as T;
  const out: Record<string, unknown> = { ...standIns };
  for (const [key, value] of Object.entries(known)) {
    if (value === undefined) continue;
    out[key] = value === null ? null : fillIn(value as never, standIns[key]);
  }
  return out as T;
}

// Words of ordinary lengths, picked by a seed so a shape is the same every time it is drawn (a shape that changed would shimmer). Plain, everyday
// words of no domain: they are never read, only measured. An array literal: nothing is computed at import.
const WORDS = ["the", "of", "garden", "and", "to", "window", "for", "letters", "on", "morning", "are", "map", "kitchen", "picture", "blue", "river", "evening", "paper", "after", "season", "with", "people", "valley", "from", "little", "station", "table", "light", "forward"];

/**
 * Words that fill about `length` characters, the same for the same seed and variant; the other variant's words differ. They are never seen as words:
 * they give a bone its length. The unseen variant (1) is longer too, half again and a dozen letters, so text of unknown length takes another height
 * there, and whatever sits below it is at another place in the two drawings and is a bone, never a word that would move when the real text arrived.
 */
export function standIn(seed: number, length: number, variant: StandInVariant = 0): string {
  const target = variant === 1 ? Math.round(length * 1.5) + 12 : length;
  let out = "";
  let n = seed * 7 + 3 + variant * 389;
  while (out.length < target) {
    n = (n * 31 + 17) % 997;
    out += (out ? " " : "") + WORDS[n % WORDS.length];
  }
  return out.slice(0, Math.max(1, target)).trimEnd();
}

const COUNT_PREFIX = "basalt-shape:";

/**
 * Where a list's last count is kept: the app's choice, never Basalt's. Anything with `getItem` and `setItem` (and `removeItem`, for `forgetCount`) will do: `sessionStorage`,
 * a store the app scopes to the signed-in account and clears at sign-out, or its own data cache. `localStorage` fits only when the count may outlive the session and be read by
 * whoever signs in next on the machine. A function is called when the count is read or written, so storage that throws when touched (blocked by the browser) reads as none.
 */
export type CountStore = Pick<Storage, "getItem" | "setItem"> & Partial<Pick<Storage, "removeItem">>;

/** The page's own store, for a call that names none: a map that lives as long as the page, made on first use (nothing is made at import). */
let pageCounts: Map<string, string> | undefined;
const pageStore = (): CountStore => {
  const map = (pageCounts ??= new Map());
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => { map.set(key, value); }, removeItem: (key) => { map.delete(key); } };
};
const storeOf = (store: CountStore | (() => CountStore | null | undefined) | undefined): CountStore | null | undefined => (typeof store === "function" ? store() : store ?? pageStore());

/**
 * How many rows the list under `key` had when it last loaded, or `null`: a shape draws that many stand-ins. Read from `store`; with none, from what `rememberCount` noted on this
 * page (nothing outlives a reload). Storage that is blocked, or holds anything but a whole number, reads as none.
 */
export function rememberedCount(key: string, store?: CountStore | (() => CountStore | null | undefined)): number | null {
  try {
    const value = storeOf(store)?.getItem(COUNT_PREFIX + key) ?? null;
    if (value === null) return null;
    const count = Number(value);
    return /^\d+$/.test(value) && Number.isSafeInteger(count) ? count : null;
  } catch {
    return null;
  }
}

/**
 * Note a list's real count once it has loaded, for its next shape: the count and nothing else, under `basalt-shape:<key>`. Kept in `store`, the app's (see `CountStore`); with
 * none, only for the page's life, so nothing is written to the origin's storage unless the app asks. The count is the app's data: scope `key` or `store` to whoever it belongs to.
 */
export function rememberCount(key: string, count: number, store?: CountStore | (() => CountStore | null | undefined)): void {
  // A count is a whole number of rows, none or more; anything else (a string from untyped code, a fraction, NaN) is dropped, never stored.
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) return;
  try {
    storeOf(store)?.setItem(COUNT_PREFIX + key, String(count));
  } catch {
    // No storage: the next shape fits the window.
  }
}

/** Forget a list's count (at sign-out, say), from `store` or from the page's own. */
export function forgetCount(key: string, store?: CountStore | (() => CountStore | null | undefined)): void {
  try {
    storeOf(store)?.removeItem?.(COUNT_PREFIX + key);
  } catch {
    // No storage: nothing was kept.
  }
}
