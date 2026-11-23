import * as React from "react";

import { useArrival } from "./arrival";
import { CopyButton } from "./copy-button";
import { DescriptionItem, DescriptionList } from "./description-list";
import { Badge } from "./display";
import { DotLine, DotSep } from "./dot-sep";
import { Accordion, AccordionItem, Callout, Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "./feedback";
import { Link } from "./navigation";
import { formatReleaseDate } from "./release-date";
import type { ReleaseEntryRecord, ReleaseEntryType, ReleaseRecord } from "./release-types";
import { TextButton } from "./text-button";
import { join } from "./utils";

export type { ReleaseAudience, ReleaseBump, ReleaseEntryRecord, ReleaseEntryType, ReleaseRecord } from "./release-types";

// A page of releases from their records (DECISIONS 320, section 2): a package's changelog ("reference") or a product's release notes ("notes").
// Releases highest first, one column, each at most the words' measure plus space-6 plus the sidebar's width, space-10 apart with a divider
// between. A release is its header (the number and the date in one heading, the counts computed from its list, "Pre-release" and "Your version",
// Copy link), then a package's summary, "Action needed" (a warning callout, never folded), a product's paragraphs for each audience, then one line
// a change under Security, Deprecated, Removed, Added, Changed and Fixed. A product's list is one fold holding its summary: "All changes", or
// "Other changes" when action entries stand above it, counted by what it opens. A package's list is open and only Fixed folds (past 3, in a
// release of more than 10). Each entry's source line (the pull request and at most two tickets) is a quiet text button that opens "Sources";
// from 640 of the release's own width it stands beside the words in one column down the list, under it below that. A release is `#v1.4.0`, an
// entry its permanent id; the one a link opens is the stream's arrival (the plate and "Linked"), with every fold that holds it opened. Build
// details is on the release this session runs, from the running build. Nothing on the page is typed twice: the order, the counts, the folds and
// the callout's opening line come from the record. Without script, and in print, every fold is open.

/** The page's fixed words, for another language. Counted words are functions of their number. */
export interface ReleaseWords {
  unreleased: string;
  actionNeeded: string;
  sections: Record<ReleaseEntryType, string>;
  allChanges: string;
  otherChanges: string;
  buildDetails: string;
  sources: string;
  pullRequest: string;
  ticket: string;
  tickets: string;
  commit: string;
  author: string;
  authors: string;
  yourVersion: string;
  preRelease: string;
  linked: string;
  copyLink: string;
  /** The name of a release's Copy link: "Copy link to Basalt 0.2.0". */
  copyLinkTo: (release: string) => string;
  copyLinkToChange: string;
  copyBuildDetails: string;
  copied: string;
  linkCopied: string;
  buildDetailsCopied: string;
  more: (count: number) => string;
  changes: (count: number) => string;
  needAction: (count: number) => string;
  /** "Before upgrading from 0.1.0, check these 4 changes." */
  beforeUpgrading: (previous: string, count: number) => string;
}

const WORDS: ReleaseWords = {
  unreleased: "Unreleased",
  actionNeeded: "Action needed",
  sections: { security: "Security", deprecated: "Deprecated", removed: "Removed", added: "Added", changed: "Changed", fixed: "Fixed" },
  allChanges: "All changes",
  otherChanges: "Other changes",
  buildDetails: "Build details",
  sources: "Sources",
  pullRequest: "Pull request",
  ticket: "Ticket",
  tickets: "Tickets",
  commit: "Commit",
  author: "Author",
  authors: "Authors",
  yourVersion: "Your version",
  preRelease: "Pre-release",
  linked: "Linked",
  copyLink: "Copy link",
  copyLinkTo: (release) => `Copy link to ${release}`,
  copyLinkToChange: "Copy link to this change",
  copyBuildDetails: "Copy build details",
  copied: "Copied",
  linkCopied: "Link copied",
  buildDetailsCopied: "Build details copied",
  more: (count) => `${count} more`,
  changes: (count) => `${count} ${count === 1 ? "change" : "changes"}`,
  needAction: (count) => `${count} ${count === 1 ? "needs action" : "need action"}`,
  beforeUpgrading: (previous, count) => `Before upgrading from ${previous}, check ${count === 1 ? "this change" : `these ${count} changes`}.`,
};

export interface ReleaseBuildRow {
  label: string;
  value: string;
  /** An identifier (a build, a commit): mono. */
  mono?: boolean;
}

export interface ReleaseNotesProps extends Omit<React.ComponentProps<"div">, "children"> {
  releases: readonly ReleaseRecord[];
  /** "reference": the list open, Unreleased shown (a package). "notes": audience paragraphs lead and the list folds (a product). */
  form: "reference" | "notes";
  /** The product's name, for "Copy link to Basalt 0.2.0". */
  product: string;
  /** The page's own address, for copied links. Default: the window's, read when a button is pressed. */
  baseHref?: string;
  /** The version this session runs: that release carries "Your version". */
  running?: string;
  /** The running build's own rows, from what the app's build wrote: Build details, on the release marked "Your version". Never read from a record. */
  runningBuild?: readonly ReleaseBuildRow[];
  /** The level of a release's heading. Default 2. */
  headingLevel?: 2 | 3;
  /** The entry or release to mark as arrived, for an app with its own router. Default: the window's fragment, followed on hashchange. */
  arrived?: string | null;
  onArrivedEnd?: () => void;
  /** The page's fixed words, for another language. */
  words?: Partial<ReleaseWords>;
  /** The dates' locale. Default "en-US". */
  locale?: string;
}

const ORDER: readonly ReleaseEntryType[] = ["security", "deprecated", "removed", "added", "changed", "fixed"];
const RANK = { major: 0, minor: 1, patch: 2 } as const;
/** Fixed folds when the release holds more than this many changes, and Fixed more than `FOLD_FIXED`. */
const FOLD_OVER = 10;
const FOLD_FIXED = 3;
/** The source line names the pull request and at most this many tickets. */
const SHOWN_TICKETS = 2;

/** A release's address: "v1.4.0", "unreleased". */
export const releaseId = (release: Pick<ReleaseRecord, "version" | "unreleased">) => (release.unreleased ? "unreleased" : `v${release.version}`);

/** Inside a section, entries stand by impact (the bump), then by area, then by id. */
const byImpact = (a: ReleaseEntryRecord, b: ReleaseEntryRecord) =>
  RANK[a.bump] - RANK[b.bump] || (a.area ?? "").localeCompare(b.area ?? "", "en") || a.id.localeCompare(b.id, "en");

/** The sentence: backticks mark code, and nothing else is markup. */
function Sentence({ text }: { text: string }) {
  const parts = text.split(/`([^`]+)`/);
  return <>{parts.map((part, index) => (index % 2 ? <code key={index} className="basalt-inline-code">{part}</code> : <React.Fragment key={index}>{part}</React.Fragment>))}</>;
}

interface Section { type: ReleaseEntryType; entries: ReleaseEntryRecord[] }

/** The release's parts, computed from its record. */
function partsOf(release: ReleaseRecord, form: ReleaseNotesProps["form"]) {
  const action = release.entries.filter((entry) => entry.action).sort(byImpact);
  const sections: Section[] = ORDER.map((type) => ({ type, entries: release.entries.filter((entry) => !entry.action && entry.type === type).sort(byImpact) })).filter((section) => section.entries.length > 0);
  const inside = sections.reduce((sum, section) => sum + section.entries.length, 0);
  const leads = form === "notes" && Boolean(release.audiences?.length);
  const folded = leads && inside > 0;
  const fixedFolds = !folded && release.entries.length > FOLD_OVER && (sections.find((section) => section.type === "fixed")?.entries.length ?? 0) > FOLD_FIXED;
  return { action, sections, inside, leads, folded, fixedFolds };
}

/** The keys of the folds a release has, and the fold that holds each entry. */
function foldsOf(release: ReleaseRecord, form: ReleaseNotesProps["form"]) {
  const id = releaseId(release);
  const { folded, fixedFolds, sections } = partsOf(release, form);
  const all: string[] = [];
  const holding = new Map<string, string>();
  if (folded) {
    all.push(`${id}-all`);
    for (const section of sections) for (const entry of section.entries) holding.set(entry.id, `${id}-all`);
  } else if (fixedFolds) {
    all.push(`${id}-fixed`);
    for (const entry of sections.find((section) => section.type === "fixed")?.entries ?? []) holding.set(entry.id, `${id}-fixed`);
  }
  return { all, holding };
}

/** The page's own address with no fragment and no query: from the app, or the window's once the page is in a browser. */
function useBase(baseHref: string | undefined) {
  const [base, setBase] = React.useState(baseHref ?? "");
  React.useEffect(() => {
    if (baseHref !== undefined) setBase(baseHref);
    else setBase(`${window.location.origin}${window.location.pathname}`);
  }, [baseHref]);
  return base;
}

/** The arrived target: the app's, or the window's fragment followed on hashchange. Each change is a fresh arrival. */
function useTarget(arrived: string | null | undefined) {
  const [fragment, setFragment] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (arrived !== undefined) return undefined;
    let frame = 0;
    const read = () => {
      const raw = window.location.hash.slice(1);
      let id = raw;
      try { id = decodeURIComponent(raw); } catch { /* a fragment that is not valid percent-encoding is read as written */ }
      // Turn it off first, then on, so the same target reached again (Back, then Forward) arrives again.
      setFragment(null);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setFragment(id || null));
    };
    read();
    window.addEventListener("hashchange", read);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("hashchange", read); };
  }, [arrived]);
  return arrived !== undefined ? arrived : fragment;
}

interface Shared {
  words: ReleaseWords;
  base: string;
  locale: string;
  level: 2 | 3;
  target: string | null;
  onArrivedEnd?: () => void;
  open: ReadonlySet<string>;
  setFold: (key: string, open: boolean) => void;
}

/** The word "Linked", on a line above what arrived, kept in place once it has been shown so its going moves nothing. */
function ArrivedWord({ on, ever, label }: { on: boolean; ever: boolean; label: string }) {
  if (!ever) return null;
  return <span className="basalt-stream-word basalt-stream-word-line basalt-release-word" data-on={on ? "" : undefined} aria-hidden={on ? undefined : true}>{label}</span>;
}

function Heading({ level, ...props }: React.ComponentProps<"h2"> & { level: number }) {
  return React.createElement(`h${Math.min(level, 6)}`, props);
}

/** A fold: an accordion of one item whose heading holds the button. Closed panels stay in the document, so the browser's find opens them. */
function Fold({ name, title, level, shared, className, children }: { name: string; title: React.ReactNode; level: number; shared: Shared; className?: string; children: React.ReactNode }) {
  const value = shared.open.has(name) ? [name] : [];
  return (
    <Accordion hiddenUntilFound value={value} onValueChange={(next) => shared.setFold(name, next.includes(name))} className={join("basalt-release-fold", className)}>
      <AccordionItem value={name} headingLevel={Math.min(level, 6) as 2 | 3 | 4 | 5 | 6} title={title}>{children}</AccordionItem>
    </Accordion>
  );
}

/** A count after its name, `space-1` away: the space is read, the gap drawn. */
const Count = ({ n }: { n: number }) => <span className="basalt-release-count"><span className="basalt-visually-hidden"> </span>{n}</span>;

function SourceLine({ entry, textId, shared }: { entry: ReleaseEntryRecord; textId: string; shared: Shared }) {
  // The panel itself takes focus when it opens (its first link would draw a ring the reader did not ask for); Tab goes on into it.
  const panel = React.useRef<HTMLDivElement>(null);
  const { words } = shared;
  const tickets = entry.tickets ?? [];
  const ids: string[] = [];
  if (entry.pr) ids.push(`#${entry.pr.number}`);
  for (const ticket of tickets.slice(0, SHOWN_TICKETS)) ids.push(ticket.label);
  if (!entry.pr && !tickets.length && entry.commit) ids.push(entry.commit.sha.slice(0, 8));
  if (!ids.length) return null;
  const more = tickets.length - SHOWN_TICKETS;
  const shown = more > 0 ? [...ids, words.more(more)] : ids;
  return (
    <Popover>
      <PopoverTrigger
        render={(
          <TextButton quiet className="basalt-release-source" aria-describedby={textId}>
            <span className="basalt-visually-hidden">{words.sources}: </span>
            {shown.map((id, index) => (
              <React.Fragment key={index}>
                {index > 0 ? <DotSep spaced /> : null}
                <span className="basalt-release-id">{id}</span>
              </React.Fragment>
            ))}
          </TextButton>
        )}
      />
      <PopoverContent ref={panel} initialFocus={panel} align="end" collisionPadding={16} className="basalt-release-sources">
        <PopoverTitle className="basalt-popover-title">{words.sources}</PopoverTitle>
        <DescriptionList className="basalt-release-sources-list">
          {entry.pr ? <DescriptionItem term={words.pullRequest} mono><a className="basalt-link" href={entry.pr.href}><span className="basalt-link-label">#{entry.pr.number}</span></a></DescriptionItem> : null}
          {tickets.length ? (
            <DescriptionItem
              term={tickets.length === 1 ? words.ticket : words.tickets}
              values={tickets.map((ticket) => (
                <>{ticket.tracker} {ticket.href ? <a className="basalt-link basalt-release-mono" href={ticket.href}><span className="basalt-link-label">{ticket.label}</span></a> : <span className="basalt-release-mono">{ticket.label}</span>}</>
              ))}
            />
          ) : null}
          {entry.commit ? (
            <DescriptionItem term={words.commit} mono>
              {entry.commit.href ? <a className="basalt-link" href={entry.commit.href}><span className="basalt-link-label">{entry.commit.sha.slice(0, 8)}</span></a> : entry.commit.sha.slice(0, 8)}
            </DescriptionItem>
          ) : null}
          {entry.authors?.length ? <DescriptionItem term={entry.authors.length === 1 ? words.author : words.authors} values={entry.authors} /> : null}
        </DescriptionList>
        <CopyButton size="sm" text={`${shared.base}#${entry.id}`} copiedLabel={words.copied} statusLabel={words.linkCopied}>{words.copyLinkToChange}</CopyButton>
      </PopoverContent>
    </Popover>
  );
}

function Entry({ entry, shared }: { entry: ReleaseEntryRecord; shared: Shared }) {
  const arrival = useArrival<HTMLLIElement>({ arrived: shared.target === entry.id, onArrivedEnd: shared.onArrivedEnd });
  const textId = `${entry.id}-words`;
  return (
    <li {...arrival.attrs} id={entry.id} data-link={entry.link ? "" : undefined} className="basalt-release-entry">
      <ArrivedWord on={arrival.on} ever={arrival.ever} label={shared.words.linked} />
      <div className="basalt-release-entry-words">
        <p className="basalt-release-entry-text" id={textId}>
          {entry.area ? <><span className="basalt-release-area">{entry.area}:</span>{" "}</> : null}
          <Sentence text={entry.text} />
        </p>
        {entry.link ? <Link href={entry.link.href} className="basalt-release-migrate">{entry.link.label}</Link> : null}
      </div>
      <span className="basalt-release-source-cell"><SourceLine entry={entry} textId={textId} shared={shared} /></span>
    </li>
  );
}

const List = ({ entries, shared }: { entries: ReleaseEntryRecord[]; shared: Shared }) => (
  <ul className="basalt-release-list">{entries.map((entry) => <Entry key={entry.id} entry={entry} shared={shared} />)}</ul>
);

function Sections({ release, sections, level, foldFixed, shared }: { release: ReleaseRecord; sections: Section[]; level: number; foldFixed: boolean; shared: Shared }) {
  const id = releaseId(release);
  return (
    <>
      {sections.map((section) => {
        const title = <>{shared.words.sections[section.type]}<Count n={section.entries.length} /></>;
        if (section.type === "fixed" && foldFixed) {
          return (
            <section key={section.type} className="basalt-release-section" data-folded="">
              <Fold name={`${id}-fixed`} title={title} level={level} shared={shared}><List entries={section.entries} shared={shared} /></Fold>
            </section>
          );
        }
        return (
          <section key={section.type} className="basalt-release-section">
            <Heading level={level} className="basalt-release-section-title">{title}</Heading>
            <List entries={section.entries} shared={shared} />
          </section>
        );
      })}
    </>
  );
}

function BuildDetails({ rows, shared }: { rows: readonly ReleaseBuildRow[]; shared: Shared }) {
  return (
    <div className="basalt-release-build">
      <Fold name="build" title={shared.words.buildDetails} level={shared.level + 1} shared={shared}>
        <DescriptionList className="basalt-release-build-list">
          {rows.map((row) => <DescriptionItem key={row.label} term={row.label} mono={row.mono}>{row.value}</DescriptionItem>)}
        </DescriptionList>
        <CopyButton size="sm" text={rows.map((row) => `${row.label}: ${row.value}`).join("\n")} copiedLabel={shared.words.copied} statusLabel={shared.words.buildDetailsCopied}>{shared.words.copyBuildDetails}</CopyButton>
      </Fold>
    </div>
  );
}

function Release({ release, form, product, running, runningBuild, shared }: { release: ReleaseRecord; form: ReleaseNotesProps["form"]; product: string; running?: string; runningBuild?: readonly ReleaseBuildRow[]; shared: Shared }) {
  const { words, level, locale } = shared;
  const id = releaseId(release);
  const arrival = useArrival<HTMLElement>({ arrived: shared.target === id, onArrivedEnd: shared.onArrivedEnd });
  const { action, sections, inside, leads, folded, fixedFolds } = partsOf(release, form);
  const total = release.entries.length;
  const day = release.date ? formatReleaseDate(release.date, locale) : null;
  const yours = running !== undefined && !release.unreleased && running === release.version;
  const pre = !release.unreleased && release.version.includes("-");
  const name = release.unreleased ? words.unreleased : `${product} ${release.version}`;
  const date = release.date && day ? <time dateTime={release.date}>{day}</time> : null;
  const counts = [
    total ? <React.Fragment key="c">{words.changes(total)}</React.Fragment> : null,
    action.length ? <a key="a" href={`#${id}-action`} className="basalt-release-action-link">{words.needAction(action.length)}</a> : null,
  ];
  const badges = pre || yours ? (
    <span className="basalt-release-badges">
      {pre ? <Badge>{words.preRelease}</Badge> : null}
      {yours ? <Badge>{words.yourVersion}</Badge> : null}
    </span>
  ) : null;
  const facts = counts.filter(Boolean);
  const headingId = `${id}-heading`;
  const heading = release.title ? (
    <>
      <Heading level={level} id={headingId} className="basalt-release-heading" data-headline="">
        <span className="basalt-release-meta basalt-release-number-line"><DotLine>{release.version}{date}</DotLine></span>
        <span className="basalt-visually-hidden">: </span>
        <span className="basalt-release-title">{release.title}</span>
      </Heading>
      {facts.length || badges ? <p className="basalt-release-meta"><DotLine>{facts}</DotLine>{badges}</p> : null}
    </>
  ) : (
    <>
      <Heading level={level} id={headingId} className="basalt-release-heading">
        <span className="basalt-release-version" data-words={release.unreleased ? "" : undefined}>{release.unreleased ? words.unreleased : release.version}</span>
        {date ? <span className="basalt-visually-hidden">, {day}</span> : null}
      </Heading>
      {date || facts.length || badges ? <p className="basalt-release-meta"><DotLine>{date}{facts}</DotLine>{badges}</p> : null}
    </>
  );
  const summary = release.summary ? <p className="basalt-release-summary">{release.summary}</p> : null;
  const actionBlock = action.length ? (
    <Callout
      status="warning"
      id={`${id}-action`}
      className="basalt-release-action"
      title={<Heading level={level + 1} className="basalt-release-callout-title">{words.actionNeeded}<Count n={action.length} /></Heading>}
    >
      {form === "reference" && release.previous ? <p className="basalt-release-upgrade">{words.beforeUpgrading(release.previous, action.length)}</p> : null}
      <List entries={action} shared={shared} />
    </Callout>
  ) : null;
  return (
    <section {...arrival.attrs} id={id} aria-labelledby={headingId} data-form={form} className="basalt-release">
      <header className="basalt-release-head">
        <div className="basalt-release-head-text">
          <ArrivedWord on={arrival.on} ever={arrival.ever} label={words.linked} />
          {heading}
        </div>
        <CopyButton variant="ghost" size="sm" text={`${shared.base}#${id}`} aria-label={words.copyLinkTo(name)} copiedLabel={words.copied} statusLabel={words.linkCopied} className="basalt-release-copy">
          {words.copyLink}
        </CopyButton>
      </header>
      {leads ? null : summary}
      {actionBlock}
      {leads ? release.audiences!.map((audience, index) => (
        <section key={index} className="basalt-release-audience">
          {audience.for ? <Heading level={level + 1} className="basalt-release-audience-title">{audience.for}</Heading> : null}
          <p className="basalt-release-paragraph">{audience.text}</p>
        </section>
      )) : null}
      {folded ? (
        <div className="basalt-release-all">
          <Fold name={`${id}-all`} level={level + 1} shared={shared} title={<>{action.length ? words.otherChanges : words.allChanges}<Count n={inside} /></>}>
            {summary}
            <Sections release={release} sections={sections} level={level + 2} foldFixed={false} shared={shared} />
          </Fold>
        </div>
      ) : (
        <>
          {leads ? summary : null}
          <Sections release={release} sections={sections} level={level + 1} foldFixed={fixedFolds} shared={shared} />
        </>
      )}
      {yours && runningBuild?.length ? <BuildDetails rows={runningBuild} shared={shared} /> : null}
    </section>
  );
}

/** The releases from their records. See the module note. */
export function ReleaseNotes({ releases, form, product, baseHref, running, runningBuild, headingLevel = 2, arrived, onArrivedEnd, words: wordsProp, locale = "en-US", className, ...props }: ReleaseNotesProps) {
  const words = React.useMemo(() => ({ ...WORDS, ...wordsProp, sections: { ...WORDS.sections, ...wordsProp?.sections } }), [wordsProp]);
  const drawn = React.useMemo(() => releases.filter((release) => !(form === "notes" && release.unreleased)), [releases, form]);
  const base = useBase(baseHref);
  const raw = useTarget(arrived);
  // A version that a drawn release replaces opens that release.
  const target = React.useMemo(() => {
    if (!raw) return null;
    const stable = drawn.find((release) => release.replaces?.some((version) => `v${version}` === raw));
    return stable ? releaseId(stable) : raw;
  }, [raw, drawn]);
  // Without script every fold is open; once the page runs, they start closed.
  const [wired, setWired] = React.useState(false);
  const [open, setOpen] = React.useState<ReadonlySet<string>>(() => new Set());
  React.useLayoutEffect(() => setWired(true), []);
  const folds = React.useMemo(() => {
    const all: string[] = ["build"];
    const holding = new Map<string, string>();
    for (const release of drawn) {
      const own = foldsOf(release, form);
      all.push(...own.all);
      for (const [entry, fold] of own.holding) holding.set(entry, fold);
    }
    return { all, holding };
  }, [drawn, form]);
  // The arrival opens every fold that holds its target.
  React.useEffect(() => {
    const fold = target ? folds.holding.get(target) : undefined;
    if (fold) setOpen((now) => (now.has(fold) ? now : new Set([...now, fold])));
  }, [target, folds]);
  const setFold = React.useCallback((key: string, next: boolean) => setOpen((now) => {
    const copy = new Set(now);
    if (next) copy.add(key);
    else copy.delete(key);
    return copy;
  }), []);
  const shared: Shared = {
    words,
    base,
    locale,
    level: headingLevel,
    target,
    onArrivedEnd,
    open: wired ? open : new Set(folds.all),
    setFold,
  };
  const matches = running !== undefined && drawn.some((release) => !release.unreleased && release.version === running);
  return (
    <div {...props} data-form={form} className={join("basalt-release-notes", className)}>
      {running !== undefined && !matches && runningBuild?.length ? <BuildDetails rows={runningBuild} shared={shared} /> : null}
      {drawn.map((release) => <Release key={releaseId(release)} release={release} form={form} product={product} running={running} runningBuild={runningBuild} shared={shared} />)}
    </div>
  );
}
