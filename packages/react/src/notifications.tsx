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
import { Icon } from "./icon";
import { GlidePlate } from "./plate";
import { useReveal } from "./reveal";
import type { ToastStatus } from "./toast";
import type { Align, IconComponent, OpenChangeDetails, PopupActions, Side } from "./types";
import { join } from "./utils";

/**
 * An entry's mark. Success, warning and danger are the toast's marks; `pending` (waiting on someone, in review, queued) is the empty ring of
 * the same drawing, in secondary ink and no colour, because waiting is not a warning. Neutral draws none (its seat stays, so titles line up).
 */
export type NotificationStatus = ToastStatus | "pending";

export interface NotificationEntry {
  /** Stable, for the list's keys. */
  id: string;
  /** What happened, in one line: "Deploy finished". It is cut with an ellipsis if it is long; the whole text is still read. A group's title names who and what ("Sam, Priya and Marcus mentioned you"); Basalt adds the count. */
  title: string;
  /** A secondary line: what it was about ("api, production"). */
  description?: string;
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
   * number above 0, else the group's entries are counted. Default: the entries it holds.
   */
  count?: number;
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
}

export interface NotificationCenterProps extends ListParts {
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
  className?: string;
}

/** The older spelling of `NotificationCenterProps`; it stays as an alias. */
export type NotificationCentreProps = NotificationCenterProps;

const MARKS: Record<Exclude<NotificationStatus, "neutral">, IconComponent> = { success: CheckCircleIcon, warning: WarningIcon, danger: XCircleIcon, pending: CircleIcon };

const isGroup = (entry: NotificationEntry): boolean => (entry.entries?.length ?? 0) > 0;
/** One rule everywhere: a group is unread while any of its entries is (its own flag is ignored); any other entry by its own flag. */
const isUnread = (entry: NotificationEntry): boolean => (isGroup(entry) ? entry.entries!.some((inner) => Boolean(inner.unread)) : Boolean(entry.unread));
/** What is unread is counted by the entries a reader would open, so a group of three unread mentions is three. */
const unreadCount = (entries: readonly NotificationEntry[]): number =>
  entries.reduce((count, entry) => count + (isGroup(entry) ? unreadCount(entry.entries!) : entry.unread ? 1 : 0), 0);
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
export function NotificationCenter({ entries: given, onSelect, onMarkAllRead, onClearAll, onViewAll, viewAllHref, label = "Notifications", open, defaultOpen, onOpenChange, side = "bottom", align = "end", className }: NotificationCenterProps) {
  const entries = drawn(given);
  const unread = unreadCount(entries);
  const popup = React.useRef<PopupActions | null>(null);
  // Choosing an entry, or View all, leaves the center; Esc and an outside click close it before.
  const leave = () => popup.current?.close();
  return (
    <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} actionsRef={popup}>
      <PopoverTrigger
        className="basalt-notifications-trigger"
        data-unread={unread > 0 ? "" : undefined}
        render={<IconButton icon={NotificationsGlyph} label={unread > 0 ? `${label}, ${unread} unread` : label} className={className} />}
      />
      <PopoverContent side={side} align={align} className="basalt-notifications">
        <div className="basalt-notifications-head">
          <PopoverTitle className="basalt-notifications-title">{label}</PopoverTitle>
          <span className="basalt-notifications-count">{unread} unread</span>
          <MarkAllRead unread={unread} onMarkAllRead={onMarkAllRead} edge="end" />
        </div>
        {entries.length === 0 ? (
          <p className="basalt-notifications-empty">Nothing yet.</p>
        ) : (
          // The scroller is the glide's host: the shared plate follows the pointer between entries (40 or 58 tall), behind them.
          <div className="basalt-notifications-scroll">
            <GlidePlate notifications />
            <Entries entries={entries} onChoose={(entry) => { onSelect?.(entry); leave(); }} />
          </div>
        )}
        <div className="basalt-notifications-foot">
          <ClearAll count={entries.length} onClearAll={onClearAll} edge="start" />
          {viewAllHref ? (
            <a className="basalt-button" data-variant="ghost" data-size="sm" data-edge="end" href={viewAllHref} onClick={() => { onViewAll?.(); leave(); }}>
              <span className="basalt-button-label">View all</span>
            </a>
          ) : (
            <Button variant="ghost" size="sm" edge="end" onClick={() => { onViewAll?.(); leave(); }}>View all</Button>
          )}
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
  /** What an empty list says. Default "Nothing yet." */
  empty?: React.ReactNode;
  className?: string;
}

/**
 * The center's entries in the page: the page form, for the app's own notifications page (what "View all" opens, and on a phone the tab bar's
 * destination, since a bell does not fit a phone's header), and for a list of entries in a sidebar. The same rows, seats, groups and words as the
 * bell's popover, with no popover, no title (the page's heading names it) and no glide: each entry paints its own plate. No rim: it is a list,
 * not an object. Paging is the app's (`ListBand` under it). With `onClearAll` a foot holds "Clear all" at its start, as the center's does.
 */
export function NotificationList({ entries: given, onSelect, onMarkAllRead, onClearAll, head = true, label = "Notifications", "aria-labelledby": labelledBy, empty = "Nothing yet.", className }: NotificationListProps) {
  const entries = drawn(given);
  const unread = unreadCount(entries);
  return (
    <div className={join("basalt-notification-list", className)}>
      {head ? (
        <div className="basalt-notifications-head">
          <span className="basalt-notifications-count">{unread} unread</span>
          <MarkAllRead unread={unread} onMarkAllRead={onMarkAllRead} />
        </div>
      ) : null}
      {entries.length === 0 ? (
        <p className="basalt-notifications-empty">{empty}</p>
      ) : (
        <Entries entries={entries} onChoose={(entry) => onSelect?.(entry)} label={labelledBy ? undefined : label} labelledBy={labelledBy} />
      )}
      {onClearAll ? (
        // The center's foot without View all (this is the page it opens): Clear all at its start.
        <div className="basalt-notifications-foot">
          <ClearAll count={entries.length} onClearAll={onClearAll} />
        </div>
      ) : null}
    </div>
  );
}

function MarkAllRead({ unread, onMarkAllRead, edge }: { unread: number; onMarkAllRead?: () => void; edge?: ButtonEdge }) {
  // Stays mounted and keeps focus when nothing is left to mark, as Clear does: disabled in place.
  return (
    <Button variant="ghost" size="sm" edge={edge} className="basalt-notifications-mark" disabled={unread === 0} focusableWhenDisabled onClick={() => onMarkAllRead?.()}>
      Mark all as read
    </Button>
  );
}

function ClearAll({ count, onClearAll, edge }: { count: number; onClearAll?: () => void; edge?: ButtonEdge }) {
  if (!onClearAll) return null;
  // At the foot's start, apart from View all; stays mounted and keeps focus when nothing is left, as Mark all as read does.
  return (
    <Button variant="ghost" size="sm" edge={edge} className="basalt-notifications-clear" disabled={count === 0} focusableWhenDisabled onClick={() => onClearAll()}>
      Clear all
    </Button>
  );
}

function Entries({ entries, onChoose, label, labelledBy }: { entries: readonly NotificationEntry[]; onChoose: (entry: NotificationEntry) => void; label?: string; labelledBy?: string }) {
  return (
    <ul className="basalt-notifications-list" aria-label={label} aria-labelledby={labelledBy}>
      {entries.map((entry) => (isGroup(entry) ? <GroupItem key={entry.id} entry={entry} onChoose={onChoose} /> : (
        <li key={entry.id}>
          <NotificationRow entry={entry} onChoose={() => onChoose(entry)} />
        </li>
      )))}
    </ul>
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
  // A group's count is spoken inside the title (", 3 times"), so the name reads as one phrase; the drawn "×3" is hidden from it.
  const title = (
    <span className="basalt-notification-title">
      {unread ? <span className="basalt-visually-hidden">Unread: </span> : null}
      {entry.title}
      {group ? <span className="basalt-visually-hidden">, {group.count} times</span> : null}
    </span>
  );
  const body = (
    <>
      {/* The dot's own seat: always there, filled only while unread, so reading a row moves nothing. */}
      <span className="basalt-notification-dot" aria-hidden="true" />
      <span className="basalt-notification-mark" aria-hidden="true">{status === "neutral" ? null : <Icon icon={MARKS[status]} size={16} />}</span>
      <span className="basalt-notification-text">
        {group ? (
          // The title is cut first; the count (the toast's "×3") and the chevron always show.
          <span className="basalt-notification-head">
            {title}
            <span className="basalt-notification-count" aria-hidden="true">×{group.count}</span>
            {/* The disclosure's convention, as DisclosureRow: the core chevron points to the end while closed (mirrored right to left) and down while open. */}
            <span className="basalt-notification-caret" aria-hidden="true"><ControlIcon icon={group.open ? ChevronDownGlyph : ChevronRightGlyph} size={16} /></span>
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
