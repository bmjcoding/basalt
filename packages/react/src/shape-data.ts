// The data side of a loading shape (skeleton-shape, DECISIONS 247, 248 and 258): what a prefill is drawn from, the stand-in words, and a list's
// remembered count. Plain code, with no React, so a server or a data layer can import it. Nothing here runs at import.

/** Which of the two drawings a prefill is: 0 is drawn on the page, 1 is the unseen twin it is compared with. */
export type StandInVariant = 0 | 1;

/** A record with any field, at any depth, left out: what an app already knows of the data a region will draw. An array is known whole or not at all. */
export type DeepPartial<T> = T extends (infer U)[] ? U[] : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> | null } : T;

/** Known words: a table's column heads and a row of tabs name the page's structure, and are drawn as they are in a shape. */
export const KEEP = 'thead, [role="tablist"], [data-bone="keep"]';

/**
 * What a prefill draws from: the stand-in, with every field the app knows put over it. `known` is a partial record, deeply (a known incident inside
 * an unknown room is `fillIn({ incident }, standInRoom(variant))`); a field it leaves out, or sets to `undefined` or `null`, keeps the stand-in's value.
 * An array is taken whole.
 */
export function fillIn<T>(known: DeepPartial<T> | null | undefined, standIns: T): T {
  if (known === undefined || known === null) return standIns;
  if (typeof known !== "object" || Array.isArray(known) || typeof standIns !== "object" || standIns === null || Array.isArray(standIns)) return known as T;
  const out: Record<string, unknown> = { ...(standIns as Record<string, unknown>) };
  for (const [key, value] of Object.entries(known as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    out[key] = fillIn(value as never, (standIns as Record<string, unknown>)[key]);
  }
  return out as T;
}

// Words of ordinary lengths, picked by a seed so a shape is the same every time it is drawn (a shape that changed would shimmer). An array literal:
// nothing is computed at import.
const WORDS = ["the", "of", "service", "and", "to", "latency", "for", "orders", "on", "payments", "are", "api", "checkout", "database", "pool", "queue", "timing", "errors", "after", "release", "with", "users", "region", "from", "mobile", "search", "login", "cache", "retries"];

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

/** How many rows the list under `key` had when it last loaded, or `null`: a shape draws that many stand-ins. Storage that is blocked reads as none. */
export function rememberedCount(key: string): number | null {
  try {
    const value = localStorage.getItem(COUNT_PREFIX + key);
    if (value === null) return null;
    const count = Number(value);
    return Number.isFinite(count) && count >= 0 ? count : null;
  } catch {
    return null;
  }
}

/** Note a list's real count once it has loaded, for its next shape: the count and nothing else (`localStorage`, `basalt-shape:<key>`). */
export function rememberCount(key: string, count: number): void {
  try {
    localStorage.setItem(COUNT_PREFIX + key, String(count));
  } catch {
    // No storage: the next shape fits the window.
  }
}
