// The record a release page is drawn from (DECISIONS 320, 3.4): what `tools/changelog` writes, one entry per change. Basalt's own types, so an app's
// type-check reads no tool's declarations. Types only: nothing here runs.

/** The sections a change stands in, in the order every output draws them, under "Action needed". */
export type ReleaseEntryType = "security" | "deprecated" | "removed" | "added" | "changed" | "fixed";

/** The least version bump a change needs. */
export type ReleaseBump = "major" | "minor" | "patch";

export interface ReleaseEntryRecord {
  /** Permanent: set when the entry is written and never changed or reused. The entry's address on the page ("#pr120-1"). */
  id: string;
  type: ReleaseEntryType;
  bump: ReleaseBump;
  /** The component or page it concerns ("FormGrid", "Home"), drawn before the sentence at 500. */
  area?: string;
  /** One sentence. Backticks mark code; nothing else in it is markup. */
  text: string;
  /** Someone must do something: the entry stands under "Action needed" and nowhere else in its release. */
  action?: boolean;
  /** Its migration note, drawn as a link on its own line under the sentence. */
  link?: { label: string; href: string };
  pr?: { number: number; href: string };
  commit?: { sha: string; href?: string };
  /** At most two are on the source line, then "3 more"; every one is in the sources panel. */
  tickets?: { tracker: string; label: string; href?: string }[];
  /** Who wrote the entry's words, or said they take authorship of them. Absent when nobody has: the panel then has no Author row. */
  authors?: string[];
}

export interface ReleaseAudience {
  /** The group's own word ("For admins"), an `h3`. Absent for a paragraph for everyone. */
  for?: string;
  text: string;
  /** The entries the paragraph is about. */
  covers: string[];
}

export interface ReleaseRecord {
  /** SemVer ("1.4.0", "2.0.0-rc.2"), or "Unreleased" with `unreleased`. */
  version: string;
  /** The ship date, `YYYY-MM-DD`. Absent while unreleased. */
  date?: string;
  unreleased?: boolean;
  /** The release this one was checked against: "Before upgrading from 0.1.0". */
  previous?: string;
  /** The pre-releases of this version, no longer drawn: their addresses open this release. */
  replaces?: string[];
  /** A product's headline: "A monitor can open an incident room". */
  title?: string;
  summary?: string;
  audiences?: ReleaseAudience[];
  entries: ReleaseEntryRecord[];
}
