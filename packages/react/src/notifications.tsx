import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { CircleIcon } from "@phosphor-icons/react/dist/csr/Circle";
import { WarningIcon } from "@phosphor-icons/react/dist/csr/Warning";
import { XCircleIcon } from "@phosphor-icons/react/dist/csr/XCircle";
import * as React from "react";

import { Button, IconButton } from "./button";
import type { ButtonEdge } from "./button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "./feedback";
import { ControlIcon, loadFlight } from "./control-icon";
import { ChevronDownGlyph } from "./glyphs/chevron-down";
import { ChevronRightGlyph } from "./glyphs/chevron-right";
import { NotificationsGlyph } from "./glyphs/notifications";
import { DotSep } from "./dot-sep";
import { Icon } from "./icon";
import { InShapeContext } from "./in-shape";
import type { NotificationShapeProps } from "./notification-shape";
import { GlidePlate } from "./plate";
import { standIn } from "./shape-data";
import { useReveal } from "./reveal";
import type { ToastStatus } from "./toast";
import type { Align, FocusTarget, IconComponent, OpenChangeDetails, PopupActions, Side } from "./types";
import { join } from "./utils";

/**
 * An entry's mark. Success, warning and danger are the toast's marks; `pending` (waiting on someone, in review, queued) is the empty ring of
 * the same drawing, in secondary ink and no colour, because waiting is not a warning. Neutral draws none (its seat stays, so titles line up).
 */
export type NotificationStatus = ToastStatus | "pending";

export interface NotificationEntry {
  /** Stable, for the list's keys. */
  id: string;
  /** What happened, in one line: "Deploy finished". It is cut with an ellipsis if it is long; the whole text is still read. A group's title names who and what ("Sam, Priya and Marcus mentioned you"); Basalt adds the count. Words, or phrasing markup that holds them (a reference kept whole by a no-break span, a `<code>`): it sits inside the entry's link or button, so nothing interactive. */
  title: React.ReactNode;
  /** A secondary line: what it was about ("api, production"). Words, or phrasing markup, as `title`. */
  description?: React.ReactNode;
  /** The time, as the app writes it ("2m ago", "Yesterday"). Basalt does not format dates. A group's time is its newest entry's. */
  time: string;
  /** The same moment for machines, as `<time datetime>`. */
  dateTime?: string;
  /** The mark in the entry's 16px seat. The mark is never read: the title says it in words ("Waiting on you: approve the release"). */
  status?: NotificationStatus;
  /**
   * Unread entries take a dot and primary ink. Read entries are the same row with the dot's seat empty and the title in secondary ink. A group's
   * own flag is not read: it is unread while any of its entries is (see `entries`).
   */
  unread?: boolean;
  /** Where it goes. An entry with an `href` is a link, and one without is a button. A group is always a button: it opens. */
  href?: string;
  /** The entry for the page on screen (a list of entries in a page or a sidebar): `aria-current`, and the title at 600 from 400. The title is one cut line, so nothing moves. */
  current?: boolean;
  /**
   * A group of repeats: the entries it stands for, newest first (one level; an entry inside a group is never a group). The app does the grouping;
   * the row draws the title, the count and a chevron, and opens in place to these entries. One rule for unread, in the row, the dot, the count and
   * "Mark all as read": a group is unread while any of its entries is, and its own `unread` is ignored. Errors never group, as toasts never do: a
   * `danger` entry here is drawn at the top level, right after its group (and a group left with none is not drawn).
   */
  entries?: readonly NotificationEntry[];
  /**
   * A group's count, when the app holds more than the `entries` it gives (40 mentions, the newest 5 listed); errors are not counted in it. A whole
   * number above 0, else the group's entries are counted. Default: the entries it holds. On any other entry, a whole number above 1 draws "×N" after
   * the title (the group count's seat and type), spoken ", N times"; the title is cut first and the count always shows.
   */
  count?: number;
  /**
   * Addressed to the reader (a mention, a reply, an assignment). While unread its dot is the ringed dot (a 6px dot in a 1px ring), the bell carries the
   * same mark, and the words say it ("Unread, for you: …", "3 unread, 1 for you"). A group's own flag is not read: its entries' are.
   */
  direct?: boolean;
}

/** What the bell, the popover and the in-page list share. */
interface ListParts {
  /** The entries to list, newest first. The app owns the data and its persistence. */
  entries: readonly NotificationEntry[];
  /** An entry was chosen (never a group's row, which opens instead). The center closes after it. */
  onSelect?: (entry: NotificationEntry) => void;
  /** "Mark all as read" was pressed. Update `unread` on your entries: the rows change ink and nothing moves. */
  onMarkAllRead?: () => void;
  /**
   * "Clear all" was pressed: remove the entries (the app owns them). Given, the foot shows "Clear all" at its start (DECISIONS 269); with nothing
   * left it stays, disabled in place, and keeps focus. The center stays open.
   */
  onClearAll?: () => void;
  /** Titles and lines wrap whole instead of one cut line each. Default false. A page list of sentences sets it; the bell leaves it off. */
  wrap?: boolean;
  /** Before the first answer: stand-in rows, no count and no empty words. With entries already shown it changes nothing. */
  loading?: boolean;
  /** Stand-in rows while loading. Default 3. */
  loadingRows?: number;
  /** What is said once while the shape shows. Default "Loading notifications". */
  loadingLabel?: string;
  /** What an empty list says, once it is known to be empty. Default "Nothing yet." A failed first read is the app's node, with its words and a link. */
  empty?: React.ReactNode;
  /** The words after the count of unread direct entries ("1 for you"). Default "for you". */
  directLabel?: string;
  /** Why "Mark all as read" cannot run now. Given while anything is unread, the button is off (still a stop, described by the reason) and the reason is drawn. */
  markAllReadReason?: string;
  /** Why "Clear all" cannot run now. Given while entries remain, the button is off (still a stop, described by the reason) and the reason is drawn. */
  clearAllReason?: string;
}

export interface NotificationCenterProps extends ListParts {
  /**
   * The bell is a ghost icon button: when it is the last control of a bar (`AppHeader`'s last action, `SiteHeader`'s last tool), give it
   * `edge="end"` so its glyph goes on the bar's line (DECISIONS 336).
   */
  edge?: ButtonEdge;
  /** "View all" was pressed (the app's own page). With `viewAllHref` it is a link as well. */
  onViewAll?: () => void;
  viewAllHref?: string;
  /** The button's name and the popup's title. "Notifications" by default; the unread count is added to the button's name. */
  label?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: OpenChangeDetails) => void;
  side?: Side;
  align?: Align;
  /**
   * What takes focus when the popover opens: `true` for its first control (the default, "Mark all as read", which stays a stop while there is nothing to
   * mark), `false` for none, an element or a ref, or a function given how it was opened (`"mouse"`, `"touch"`, `"keyboard"`) that returns one: say,
   * a function that finds the first entry (`.basalt-notification`) to open on the list.
   */
  initialFocus?: FocusTarget;
  className?: string;
}

/** The older spelling of `NotificationCenterProps`; it stays as an alias. */
export type NotificationCentreProps = NotificationCenterProps;

// The first load's shape (LoadingShape and its measuring, about 13 KB) is a module of its own, notification-shape.tsx, fetched only while a list waits for its
// first answer, so a bell or a page list that never waits carries none of it. It is made on first use; nothing runs when this module loads.
let shapeModule: Promise<typeof import("./notification-shape")> | undefined;
const loadShape = () => {
  shapeModule ??= import("./notification-shape").catch((error) => { shapeModule = undefined; throw error; });
  return shapeModule;
};
let lazyShape: React.LazyExoticComponent<(props: NotificationShapeProps) => React.JSX.Element> | undefined;
const shapePart = () => (lazyShape ??= React.lazy(() => loadShape().then((m) => ({ default: m.NotificationShape }))));

/**
 * Whether the list's place shows the first load's shape: from a first load (a loading state and no entries) until the shape has finished, its hold
 * included. The populated list is drawn in its own place whatever `loading` says, so a refresh (or `loading` given later) never remounts its entries.
 */
function useFirstLoad(first: boolean) {
  const [done, setDone] = React.useState(!first);
  // A list that is emptied and waits again shows the shape again.
  if (first && done) setDone(false);
  React.useEffect(() => { if (first) void loadShape().catch(() => {}); }, [first]);
  const finish = React.useCallback(() => setDone(true), []);
  return { shown: first || !done, finish };
}

/**
 * The first load: stand-in entries as bones, in the list's own box. Until the shape's code has arrived the box holds the same stand-ins unseen, so it is the
 * waiting phase's height and nothing moves when the shape arrives.
 */
function FirstLoad({ first, label, rows, wrap, className, onDone }: { first: boolean; label: string; rows: number; wrap?: boolean; className?: string; onDone: () => void }) {
  const Shape = shapePart();
  // The stand-ins are told they are drawn in a shape by the package's own context: the lazy module inlines its copy of LoadingShape, whose provider is not
  // the one a part in the package reads.
  const standing = () => <InShapeContext.Provider value={1}><Entries entries={standIns(rows)} wrap={wrap} onChoose={() => {}} /></InShapeContext.Provider>;
  return (
    // The fallback is busy as the shape is, so a held first paint (holdFirstPaint) waits for the shape's code within its own limit, as it waits for a shape.
    <React.Suspense fallback={<div className={join("basalt-loading-shape", className)} aria-busy="true"><div aria-hidden="true" inert style={{ visibility: "hidden" }}>{standing()}</div></div>}>
      <Shape loading={first} label={label} className={className} shape={standing} onDone={onDone} />
    </React.Suspense>
  );
}

/** The words after "Unread, " on an unread direct entry: the list's `directLabel`. */
const DirectWords = /* @__PURE__ */ React.createContext("for you");

const MARKS: Record<Exclude<NotificationStatus, "neutral">, IconComponent> = { success: CheckCircleIcon, warning: WarningIcon, danger: XCircleIcon, pending: CircleIcon };

const isGroup = (entry: NotificationEntry): boolean => (entry.entries?.length ?? 0) > 0;
/** One rule everywhere: a group is unread while any of its entries is (its own flag is ignored); any other entry by its own flag. */
const isUnread = (entry: NotificationEntry): boolean => (isGroup(entry) ? entry.entries!.some((inner) => Boolean(inner.unread)) : Boolean(entry.unread));
/** What is unread is counted by the entries a reader would open, so a group of three unread mentions is three. */
const unreadCount = (entries: readonly NotificationEntry[]): number =>
  entries.reduce((count, entry) => count + (isGroup(entry) ? unreadCount(entry.entries!) : entry.unread ? 1 : 0), 0);
/** The unread entries addressed to the reader, counted as unread is: an unread child of a group counts, and a group's own flag is ignored. */
const directCount = (entries: readonly NotificationEntry[]): number =>
  entries.reduce((count, entry) => count + (isGroup(entry) ? directCount(entry.entries!) : entry.unread && entry.direct ? 1 : 0), 0);
/** Whether a row shows the ringed dot: unread and for the reader (a group, while any unread entry in it is). */
const isDirect = (entry: NotificationEntry): boolean => (isGroup(entry) ? entry.entries!.some((inner) => Boolean(inner.unread && inner.direct)) : Boolean(entry.unread && entry.direct));
/** A count on an entry that is not a group: a whole number above 1, else none. */
const repeatOf = (entry: NotificationEntry): number | undefined => (!isGroup(entry) && Number.isInteger(entry.count) && entry.count! > 1 ? entry.count : undefined);
/** The stand-in entries a first load draws as bones: even rows have a second line (58, 40, 58), in the entry's own grid. */
const standIns = (rows: number): NotificationEntry[] =>
  Array.from({ length: Math.max(0, Math.floor(rows)) }, (_, i) => ({ id: `stand-in-${i}`, title: standIn(i * 3 + 1, 26), description: i % 2 === 0 ? standIn(i * 3 + 2, 18) : undefined, time: standIn(i * 3 + 3, 6) }));

/** A group's count: the app's when it is a whole number above 0, else the entries it holds. */
const countOf = (entry: NotificationEntry): number => (Number.isInteger(entry.count) && entry.count! > 0 ? entry.count! : entry.entries?.length ?? 0);
/**
 * The entries as drawn. Errors never group: a `danger` entry inside a group is lifted to the top level, right after its group, and a group left with
 * none is not drawn.
 */
function drawn(entries: readonly NotificationEntry[]): NotificationEntry[] {
  const out: NotificationEntry[] = [];
  for (const entry of entries) {
    if (!isGroup(entry)) { out.push(entry); continue; }
    const kept = entry.entries!.filter((inner) => inner.status !== "danger");
    if (kept.length) out.push(kept.length === entry.entries!.length ? entry : { ...entry, entries: kept });
    out.push(...entry.entries!.filter((inner) => inner.status === "danger"));
  }
  return out;
}

/**
 * The durable copy of what the toasts said. A bell button (32px, a 6px ink dot when anything is unread, the count in its
 * accessible name and never drawn, so the button never changes width) opens a popover of entries, with "Mark all as read"
 * and "View all". It is presentational: the app owns the entries, their read state, persistence and the "View all" page.
 *
 * This is what lets a toast time out: a toast may close after five seconds when the information, and any action, also has a
 * home here (`home: "center"` on the toast). Keep an entry's action reachable for as long as it is valid.
 *
 * On a phone the bell gives way to a page: put `NotificationList` on the app's own page and link to it from the tab bar (`TabBarItem`
 * with `NotificationsGlyph` and its `dot`), the same page "View all" opens.
 */
export function NotificationCenter({ entries: given, onSelect, onMarkAllRead, onClearAll, onViewAll, viewAllHref, label = "Notifications", open, defaultOpen, onOpenChange, side = "bottom", align = "end", edge, initialFocus, className, wrap, loading, loadingRows = 3, loadingLabel = "Loading notifications", empty = "Nothing yet.", directLabel = "for you", markAllReadReason, clearAllReason }: NotificationCenterProps) {
  const entries = drawn(given);
  const unread = unreadCount(entries);
  const direct = directCount(entries);
  const first = Boolean(loading) && entries.length === 0;
  const firstLoad = useFirstLoad(first);
  const ids = React.useId();
  const popup = React.useRef<PopupActions | null>(null);
  // Choosing an entry, or View all, leaves the center; Esc and an outside click close it before.
  const leave = () => popup.current?.close();
  const name = unread > 0 ? `${label}, ${unread} unread${direct > 0 ? `, ${direct} ${directLabel}` : ""}` : label;
  const markReason = markAllReadReason && unread > 0 ? markAllReadReason : undefined;
  const clearReason = onClearAll && clearAllReason && entries.length > 0 ? clearAllReason : undefined;
  const list = entries.length === 0 ? (
    <p className="basalt-notifications-empty">{empty}</p>
  ) : (
    <>
      {/* The scroller is the glide's host: the shared plate follows the pointer between entries (40 or 58 tall), behind them. */}
      <GlidePlate notifications />
      <Entries entries={entries} wrap={wrap} directLabel={directLabel} onChoose={(entry) => { onSelect?.(entry); leave(); }} />
    </>
  );
  return (
    <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} actionsRef={popup}>
      <PopoverTrigger
        className="basalt-notifications-trigger"
        data-unread={unread > 0 ? "" : undefined}
        data-direct={direct > 0 ? "" : undefined}
        render={<IconButton icon={NotificationsGlyph} label={name} edge={edge} className={className} />}
      />
      <PopoverContent side={side} align={align} initialFocus={initialFocus} className="basalt-notifications">
        <div className="basalt-notifications-head">
          <PopoverTitle className="basalt-notifications-title">{label}</PopoverTitle>
          {/* The longer line does not fit beside the title and the button at 360: "for you" is said and not drawn here. Before the first answer the seat is blank. */}
          <span className="basalt-notifications-count">{first ? null : <>{unread} unread{direct > 0 ? <span className="basalt-visually-hidden">, {direct} {directLabel}</span> : null}</>}</span>
          <MarkAllRead unread={unread} onMarkAllRead={onMarkAllRead} edge="end" reason={markReason} reasonId={`${ids}-mark`} />
          {markReason ? <p id={`${ids}-mark`} className="basalt-notifications-reason">{markReason}</p> : null}
        </div>
        {/* Before the first answer the shape is the scroller; after it, the list in its own place, as without a loading state. */}
        {firstLoad.shown ? (
          <FirstLoad first={first} label={loadingLabel} rows={loadingRows} wrap={wrap} className="basalt-notifications-scroll" onDone={firstLoad.finish} />
        ) : entries.length === 0 ? list : <div className="basalt-notifications-scroll">{list}</div>}
        <div className="basalt-notifications-foot">
          <ClearAll count={entries.length} onClearAll={onClearAll} edge="start" reason={clearReason} reasonId={`${ids}-clear`} />
          {viewAllHref ? (
            <a className="basalt-button" data-variant="ghost" data-size="sm" data-edge="end" href={viewAllHref} onClick={() => { onViewAll?.(); leave(); }}>
              <span className="basalt-button-label">View all</span>
            </a>
          ) : (
            <Button variant="ghost" size="sm" edge="end" onClick={() => { onViewAll?.(); leave(); }}>View all</Button>
          )}
          {clearReason ? <p id={`${ids}-clear`} className="basalt-notifications-reason">{clearReason}</p> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** The older spelling of `NotificationCenter`; it stays as an alias. */
export const NotificationCentre = NotificationCenter;

export interface NotificationListProps extends ListParts {
  /** The head band: the unread count and "Mark all as read". Default true; `false` for a list of entries in a sidebar or a page column. */
  head?: boolean;
  /** The list's name for assistive technology. Default "Notifications". Give `aria-labelledby` instead to name it by the page's heading. */
  label?: string;
  "aria-labelledby"?: string;
  className?: string;
}

/**
 * The center's entries in the page: the page form, for the app's own notifications page (what "View all" opens, and on a phone the tab bar's
 * destination, since a bell does not fit a phone's header), and for a list of entries in a sidebar. The same rows, seats, groups and words as the
 * bell's popover, with no popover, no title (the page's heading names it) and no glide: each entry paints its own plate. No rim: it is a list,
 * not an object. Paging is the app's (`ListBand` under it). With `onClearAll` a foot holds "Clear all" at its start, as the center's does.
 */
export function NotificationList({ entries: given, onSelect, onMarkAllRead, onClearAll, head = true, label = "Notifications", "aria-labelledby": labelledBy, empty = "Nothing yet.", className, wrap, loading, loadingRows = 3, loadingLabel = "Loading notifications", directLabel = "for you", markAllReadReason, clearAllReason }: NotificationListProps) {
  const entries = drawn(given);
  const unread = unreadCount(entries);
  const direct = directCount(entries);
  const first = Boolean(loading) && entries.length === 0;
  const firstLoad = useFirstLoad(first);
  const ids = React.useId();
  const markReason = markAllReadReason && unread > 0 ? markAllReadReason : undefined;
  const clearReason = onClearAll && clearAllReason && entries.length > 0 ? clearAllReason : undefined;
  const list = entries.length === 0
    ? <p className="basalt-notifications-empty">{empty}</p>
    : <Entries entries={entries} wrap={wrap} directLabel={directLabel} onChoose={(entry) => onSelect?.(entry)} label={labelledBy ? undefined : label} labelledBy={labelledBy} />;
  return (
    <div className={join("basalt-notification-list", className)}>
      {head ? (
        <div className="basalt-notifications-head">
          {/* "3 unread · 1 for you" on one line; before the first answer the seat is blank. */}
          <span className="basalt-notifications-count">{first ? null : <>{unread} unread{direct > 0 ? <><DotSep spaced />{direct} {directLabel}</> : null}</>}</span>
          <MarkAllRead unread={unread} onMarkAllRead={onMarkAllRead} reason={markReason} reasonId={`${ids}-mark`} />
          {markReason ? <p id={`${ids}-mark`} className="basalt-notifications-reason">{markReason}</p> : null}
        </div>
      ) : null}
      {firstLoad.shown ? <FirstLoad first={first} label={loadingLabel} rows={loadingRows} wrap={wrap} onDone={firstLoad.finish} /> : list}
      {onClearAll ? (
        // The center's foot without View all (this is the page it opens): Clear all at its start.
        <div className="basalt-notifications-foot">
          <ClearAll count={entries.length} onClearAll={onClearAll} reason={clearReason} reasonId={`${ids}-clear`} />
          {clearReason ? <p id={`${ids}-clear`} className="basalt-notifications-reason">{clearReason}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

interface Reasoned {
  /** Why the action cannot run now: the button is off in place, still a stop, and described by the drawn reason. */
  reason?: string;
  reasonId?: string;
}

function MarkAllRead({ unread, onMarkAllRead, edge, reason, reasonId }: { unread: number; onMarkAllRead?: () => void; edge?: ButtonEdge } & Reasoned) {
  // Stays mounted and keeps focus when nothing is left to mark, as Clear does: disabled in place.
  return (
    <Button variant="ghost" size="sm" edge={edge} className="basalt-notifications-mark" disabled={unread === 0 || Boolean(reason)} focusableWhenDisabled aria-describedby={reason ? reasonId : undefined} onClick={() => onMarkAllRead?.()}>
      Mark all as read
    </Button>
  );
}

function ClearAll({ count, onClearAll, edge, reason, reasonId }: { count: number; onClearAll?: () => void; edge?: ButtonEdge } & Reasoned) {
  if (!onClearAll) return null;
  // At the foot's start, apart from View all; stays mounted and keeps focus when nothing is left, as Mark all as read does.
  return (
    <Button variant="ghost" size="sm" edge={edge} className="basalt-notifications-clear" disabled={count === 0 || Boolean(reason)} focusableWhenDisabled aria-describedby={reason ? reasonId : undefined} onClick={() => onClearAll()}>
      Clear all
    </Button>
  );
}

function Entries({ entries, onChoose, label, labelledBy, wrap, directLabel = "for you" }: { entries: readonly NotificationEntry[]; onChoose: (entry: NotificationEntry) => void; label?: string; labelledBy?: string; wrap?: boolean; directLabel?: string }) {
  return (
    <DirectWords.Provider value={directLabel}>
    <ul className="basalt-notifications-list" aria-label={label} aria-labelledby={labelledBy} data-wrap={wrap ? "" : undefined}>
      {entries.map((entry) => (isGroup(entry) ? <GroupItem key={entry.id} entry={entry} onChoose={onChoose} /> : (
        <li key={entry.id}>
          <NotificationRow entry={entry} onChoose={() => onChoose(entry)} />
        </li>
      )))}
    </ul>
    </DirectWords.Provider>
  );
}

/**
 * A group of repeats: its own row, a button with `aria-expanded`, then its entries, which open in place under it (the reveal: a grid row going 0fr to
 * 1fr over `duration-slow`, at once under reduced motion), indented to the row's words so they read as its own. Focus stays on the row: its entries
 * are the next tab stops.
 */
function GroupItem({ entry, onChoose }: { entry: NotificationEntry; onChoose: (entry: NotificationEntry) => void }) {
  const reveal = useReveal({ focusFirst: false });
  const inner = entry.entries ?? [];
  return (
    <li {...reveal.rootProps} ref={reveal.root as unknown as React.Ref<HTMLLIElement>} className="basalt-notification-group">
      <NotificationRow entry={entry} group={{ open: reveal.open, controls: reveal.id, count: countOf(entry) }} onChoose={reveal.toggle} />
      <div className="basalt-reveal-panel" id={reveal.id} inert={!reveal.open}>
        <div className="basalt-reveal-clip" data-reveal-clip="">
          <ul className="basalt-notification-entries">
            {inner.map((child) => (
              <li key={child.id}>
                <NotificationRow entry={child} onChoose={() => onChoose(child)} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}

interface GroupState {
  open: boolean;
  controls: string;
  count: number;
}

function NotificationRow({ entry, onChoose, group }: { entry: NotificationEntry; onChoose: (event: React.MouseEvent) => void; group?: GroupState }) {
  const status = entry.status ?? "neutral";
  const unread = isUnread(entry);
  const direct = unread && isDirect(entry);
  const directWords = React.useContext(DirectWords);
  const repeat = group ? undefined : repeatOf(entry);
  const times = group ? group.count : repeat;
  // A count is spoken inside the title (", 3 times"), so the name reads as one phrase; the drawn "×3" is hidden from it.
  const title = (
    <span className="basalt-notification-title">
      {unread ? <span className="basalt-visually-hidden">{direct ? `Unread, ${directWords}: ` : "Unread: "}</span> : null}
      {entry.title}
      {/* Read in place and drawn at no size (`basalt-said`), so the text reads "Deploy finished, 3 times" with no space before the comma. */}
      {times !== undefined ? <span className="basalt-said">, {times} times</span> : null}
    </span>
  );
  const body = (
    <>
      {/* The dot's own seat: always there, filled only while unread, so reading a row moves nothing. */}
      <span className="basalt-notification-dot" aria-hidden="true" />
      <span className="basalt-notification-mark" aria-hidden="true">{status === "neutral" ? null : <Icon icon={MARKS[status]} size={16} />}</span>
      <span className="basalt-notification-text">
        {times !== undefined ? (
          // The title is cut first; the count (the toast's "×3") and a group's chevron always show.
          <span className="basalt-notification-head">
            {title}
            <span className="basalt-notification-count" aria-hidden="true">×{times}</span>
            {/* The disclosure's convention, as DisclosureRow: the core chevron points to the end while closed (mirrored right to left) and down while open. */}
            {group ? <span className="basalt-notification-caret" aria-hidden="true"><ControlIcon icon={group.open ? ChevronDownGlyph : ChevronRightGlyph} size={16} /></span> : null}
          </span>
        ) : title}
        {entry.description ? <span className="basalt-notification-line">{entry.description}</span> : null}
      </span>
      <time className="basalt-notification-time" dateTime={entry.dateTime}>{entry.time}</time>
    </>
  );
  const common = {
    className: "basalt-notification",
    "data-unread": unread ? "" : undefined,
    "data-direct": direct ? "" : undefined,
    "data-status": status,
    "data-current": entry.current ? "" : undefined,
    onClick: onChoose,
  };
  if (group) {
    return (
      <button type="button" {...common} data-group="" aria-expanded={group.open} aria-controls={group.controls} aria-current={entry.current ? "true" : undefined} onPointerEnter={() => void loadFlight()} onFocus={() => void loadFlight()}>
        {body}
      </button>
    );
  }
  return entry.href
    ? <a href={entry.href} {...common} aria-current={entry.current ? "page" : undefined}>{body}</a>
    : <button type="button" {...common} aria-current={entry.current ? "true" : undefined}>{body}</button>;
}
