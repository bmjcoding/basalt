// SemVer 2.0.0, as far as the changelog needs it: parsing, precedence, lines and bumps (DECISIONS 320, 1.1). No dependency.

const NUMBER = "(0|[1-9][0-9]*)";
const IDENT = "(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)";
const PATTERN = new RegExp(`^${NUMBER}\\.${NUMBER}\\.${NUMBER}(?:-(${IDENT}(?:\\.${IDENT})*))?(?:\\+([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?$`);

/** A parsed version, or null when the string is not SemVer 2.0.0. */
export function parse(version) {
  const match = PATTERN.exec(String(version));
  if (!match) return null;
  const [, major, minor, patch, pre, build] = match;
  return {
    version: String(version),
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    pre: pre ? pre.split(".") : [],
    build: build ?? null,
    core: `${major}.${minor}.${patch}`,
  };
}

/** Parse or stop with the reason. */
export function must(version, where = "version") {
  const parsed = parse(version);
  if (!parsed) throw new Error(`${where}: "${version}" is not a SemVer version (MAJOR.MINOR.PATCH, a pre-release after a hyphen)`);
  if (parsed.build) throw new Error(`${where}: "${version}" holds build metadata; a release's version never does`);
  return parsed;
}

const numeric = (id) => /^[0-9]+$/.test(id);

/** SemVer precedence: negative when a is lower. Build metadata is ignored, so two builds of one version compare equal. */
export function compare(a, b) {
  const x = typeof a === "string" ? must(a) : a;
  const y = typeof b === "string" ? must(b) : b;
  for (const key of ["major", "minor", "patch"]) if (x[key] !== y[key]) return x[key] - y[key];
  if (!x.pre.length || !y.pre.length) return (y.pre.length ? 1 : 0) - (x.pre.length ? 1 : 0);
  for (let index = 0; index < Math.max(x.pre.length, y.pre.length); index++) {
    const p = x.pre[index];
    const q = y.pre[index];
    if (p === undefined) return -1;
    if (q === undefined) return 1;
    if (p === q) continue;
    // Compared as integers of any size: Number would make rc.9007199254740992 and rc.9007199254740993 equal.
    if (numeric(p) && numeric(q)) { const a = BigInt(p); const b = BigInt(q); return a < b ? -1 : a > b ? 1 : 0; }
    if (numeric(p)) return -1;
    if (numeric(q)) return 1;
    return p < q ? -1 : 1;
  }
  return 0;
}

/** Highest first. */
export const descending = (a, b) => compare(b, a);

/**
 * A version's line: the versions that share their breaking number, the major, or in 0.x the minor (1.1). "1", "0.2".
 */
export function line(version) {
  const v = typeof version === "string" ? must(version) : version;
  return v.major === 0 ? `0.${v.minor}` : String(v.major);
}

export const BUMPS = ["patch", "minor", "major"];
const RANK = { patch: 1, minor: 2, major: 3 };

/** The higher of two bumps. */
export const higher = (a, b) => (RANK[a] >= RANK[b] ? a : b);

/** Whether `bump` is at least `floor`. */
export const atLeast = (bump, floor) => RANK[bump] >= RANK[floor];

/**
 * What moving from `base` to `next` (cores only) says, as the bump it can carry. From 1.0, the number that moved. In 0.x the numbers move one
 * place right: the minor is the breaking number and the patch carries everything else, so a patch there may carry a minor's entries.
 */
export function carries(base, next) {
  const from = typeof base === "string" ? must(base) : base;
  const to = typeof next === "string" ? must(next) : next;
  if (to.major !== from.major) return to.major > from.major ? "major" : null;
  if (to.minor !== from.minor) {
    if (to.minor < from.minor) return null;
    return to.major === 0 ? "major" : "minor";
  }
  if (to.patch > from.patch) return to.major === 0 ? "minor" : "patch";
  return null;
}

/** The smallest version after `base` that carries `bump`: what the tool suggests when it refuses a version. */
export function least(base, bump) {
  const from = typeof base === "string" ? must(base) : base;
  if (from.major === 0) {
    return bump === "major" ? `0.${from.minor + 1}.0` : `0.${from.minor}.${from.patch + 1}`;
  }
  if (bump === "major") return `${from.major + 1}.0.0`;
  if (bump === "minor") return `${from.major}.${from.minor + 1}.0`;
  return `${from.major}.${from.minor}.${from.patch + 1}`;
}
