import { CheckCircleIcon, WarningIcon, XCircleIcon } from "@phosphor-icons/react";
import * as React from "react";

import { Button, IconButton } from "./button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "./feedback";
import { NotificationsGlyph } from "./glyphs/notifications";
import { Icon } from "./icon";
import { GlidePlate } from "./plate";
import type { ToastStatus } from "./toast";
import type { Align, IconComponent, OpenChangeDetails, PopupActions, Side } from "./types";

export interface NotificationEntry {
  /** Stable, for the list's keys. */
  id: string;
  /** What happened, in one line: "Deploy finished". It is cut with an ellipsis if it is long; the whole text is still read. */
  title: string;
  /** A secondary line: what it was about ("blacksand-api, production"). */
  description?: string;
  /** The time, as the app writes it ("2m ago", "Yesterday"). Basalt does not format dates. */
  time: string;
  /** The same moment for machines, as `<time datetime>`. */
  dateTime?: string;
  /** Success, warning and danger draw the toast's marks. Neutral draws none (its seat stays, so titles line up). */
  status?: ToastStatus;
  /** Unread entries take a dot and primary ink. Read entries are the same row with the dot's seat empty and the title in secondary ink. */
  unread?: boolean;
  /** Where it goes. An entry with an `href` is a link, and one without is a button. */
  href?: string;
}

export interface NotificationCentreProps {
  /** The entries to list, newest first. The app owns the data and its persistence. */
  entries: readonly NotificationEntry[];
  /** An entry was chosen. The centre closes after it. */
  onSelect?: (entry: NotificationEntry) => void;
  /** "Mark all as read" was pressed. Update `unread` on your entries: the rows change ink and nothing moves. */
  onMarkAllRead?: () => void;
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

const MARKS: Record<Exclude<ToastStatus, "neutral">, IconComponent> = { success: CheckCircleIcon, warning: WarningIcon, danger: XCircleIcon };

/**
 * The durable copy of what the toasts said. A bell button (32px, a 6px ink dot when anything is unread, the count in its
 * accessible name and never drawn, so the button never changes width) opens a popover of entries, with "Mark all as read"
 * and "View all". It is presentational: the app owns the entries, their read state, persistence and the "View all" page.
 *
 * This is what lets a toast time out: a toast may close after five seconds when the information, and any action, also has a
 * home here (`home: "centre"` on the toast). Keep an entry's action reachable for as long as it is valid.
 */
export function NotificationCentre({ entries, onSelect, onMarkAllRead, onViewAll, viewAllHref, label = "Notifications", open, defaultOpen, onOpenChange, side = "bottom", align = "end", className }: NotificationCentreProps) {
  const unread = entries.reduce((count, entry) => count + (entry.unread ? 1 : 0), 0);
  const popup = React.useRef<PopupActions | null>(null);
  // Choosing an entry, or View all, leaves the centre; Esc and an outside click close it before.
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
          {/* Stays mounted and keeps focus when nothing is left to mark, as Clear does: disabled in place. */}
          <Button variant="ghost" size="sm" className="basalt-notifications-mark" disabled={unread === 0} focusableWhenDisabled onClick={() => onMarkAllRead?.()}>
            Mark all as read
          </Button>
        </div>
        {entries.length === 0 ? (
          <p className="basalt-notifications-empty">Nothing yet.</p>
        ) : (
          // The scroller is the glide's host: the shared plate follows the pointer between entries (40 or 58 tall), behind them.
          <div className="basalt-notifications-scroll">
            <GlidePlate notifications />
            <ul className="basalt-notifications-list">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <NotificationRow entry={entry} onChoose={() => { onSelect?.(entry); leave(); }} />
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="basalt-notifications-foot">
          {viewAllHref ? (
            <a className="basalt-button" data-variant="ghost" data-size="sm" href={viewAllHref} onClick={() => { onViewAll?.(); leave(); }}>
              <span className="basalt-button-label">View all</span>
            </a>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => { onViewAll?.(); leave(); }}>View all</Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({ entry, onChoose }: { entry: NotificationEntry; onChoose: () => void }) {
  const status = entry.status ?? "neutral";
  const body = (
    <>
      {/* The dot's own seat: always there, filled only while unread, so reading a row moves nothing. */}
      <span className="basalt-notification-dot" aria-hidden="true" />
      <span className="basalt-notification-mark" aria-hidden="true">{status === "neutral" ? null : <Icon icon={MARKS[status]} size={16} />}</span>
      <span className="basalt-notification-text">
        <span className="basalt-notification-title">
          {entry.unread ? <span className="basalt-visually-hidden">Unread: </span> : null}
          {entry.title}
        </span>
        {entry.description ? <span className="basalt-notification-line">{entry.description}</span> : null}
      </span>
      <time className="basalt-notification-time" dateTime={entry.dateTime}>{entry.time}</time>
    </>
  );
  const common = { className: "basalt-notification", "data-unread": entry.unread ? "" : undefined, "data-status": status, onClick: onChoose };
  return entry.href ? <a href={entry.href} {...common}>{body}</a> : <button type="button" {...common}>{body}</button>;
}
