import * as React from "react";

import { Avatar } from "./composition";
import { DotSep } from "./dot-sep";
import { MoreGlyph } from "./glyphs/more";
import { Icon } from "./icon";
import { useArrival } from "./arrival";
import type { ArrivalProps } from "./arrival";
import { inLevel, useFloatingLayer, usePanelLevel, usePopupLevel } from "./layers";
import { join } from "./utils";

export type { ArrivalProps } from "./arrival";

declare const process: { env: { NODE_ENV?: string } };

// ---- The stream ----
// A conversation or a timeline, oldest first: a support thread, a team chat, a document's comments, an agent's run, a project's history. One
// column, one order. A message is an avatar, a name, a time and its words; consecutive messages from one author join (the app says which, since
// only it knows what counts as one run: the author, the minutes between, an edit). A note ("Lee joined", "Status set to Open") is a quieter row in
// the text column. A quote is what someone else said (a person's words to an agent or a bot, the message a reply answers): a fill one step from
// what it sits on, with no rim, so the turn it sits in keeps the only frame.
//
// The entry a link or a notice opened (`arrived`) is scrolled to, focused (with no ring: it is a place, not a control), and marked by the selected
// wash on its own ground, with a word ("Linked") in its head so the mark never rests on the fill alone. A message or a note takes a plate, radius 8,
// reaching `space-2` past it at the sides and `space-1` above and below, behind its content, so nothing in it moves. A panel (a card, a callout) is
// never framed from outside: its own fill takes the wash, inside its one rim. The mark lasts until the reader acts (a press, or a key that is not
// one that scrolls), or until the app ends it; it then fades out over 0.75 of `duration-slow` on `ease-in`. In forced colours the fill drops and the
// word stays.

const DEFAULT_ARRIVED = "Linked";

// A message's head shows the word when the message itself, or a block in it, is the one arrived, in the arriving entry's own words. A message with
// no head drawn (joined) has no place for it: a block there draws its word itself.
interface HeadContext { hasHead: boolean; report: (label: string | null) => void }
const HeadContext = /* @__PURE__ */ React.createContext<HeadContext | null>(null);
// What a panel's own head reads, through `StreamArrivedWord`.
interface WordContext { on: boolean; ever: boolean; label: string }
const WordContext = /* @__PURE__ */ React.createContext<WordContext>({ on: false, ever: false, label: DEFAULT_ARRIVED });

/**
 * The word that says an entry is the one a link opened. A message and a note draw it in their head themselves; a panel entry (`StreamEntry panel`)
 * has no head Basalt can see, so the app puts this in the panel's own head (a card's header, a callout's actions). It keeps its room once the entry
 * has arrived, so its going moves nothing.
 */
export function StreamArrivedWord({ className }: { className?: string }) {
  const { on, ever, label } = React.useContext(WordContext);
  return ever ? <ArrivedWord on={on} label={label} className={className} /> : null;
}

function ArrivedWord({ on, label, className }: { on: boolean; label: string; className?: string }) {
  return <span className={join("basalt-stream-word", className)} data-on={on ? "" : undefined} aria-hidden={on ? undefined : true}>{label}</span>;
}

export interface StreamProps extends Omit<React.ComponentProps<"ol">, "children"> {
  /** Names the stream ("Conversation", "History"), when no heading does. */
  label?: string;
  children: React.ReactNode;
}

/**
 * The column of entries, oldest first: an ordered list of `StreamMessage`, `StreamNote` and `StreamEntry` (and `EventLogRule` for a day). It is not
 * a live region and does not follow its end: an app that adds entries while the reader is there follows the end only while the reader is at it, as
 * a `Terminal` does, and says what it must through `StatusLine`.
 */
export function Stream({ label, className, children, ...props }: StreamProps) {
  return <ol role="list" aria-label={label} {...props} className={join("basalt-stream", className)}>{children}</ol>;
}

export interface StreamMessageProps extends ArrivalProps, Omit<React.ComponentProps<"li">, "children" | "ref" | "tabIndex"> {
  /** Who said it. Drawn in the head, and said before a joined message's words. */
  author: string;
  /** The face in the gutter. Default an `Avatar` of `author` at 32. It is decoration: the name beside it is what is read. */
  avatar?: React.ReactNode;
  /** When, as the app writes it ("9:41 AM", "Yesterday"). Basalt does not format it. */
  time: string;
  /** The same moment for machines. */
  dateTime?: string;
  /** Continues the message before it, from the same author: no avatar and no head (both are said, not drawn). The app decides what joins. */
  joined?: boolean;
  /** More of the head, after the time, in tertiary at 12: a `Presence`, "Edited", a badge. */
  meta?: React.ReactNode;
  /**
   * Controls at the end of the head (a menu, "Stop"), always drawn. An action the reader must not miss belongs here, never only in `quietActions`. A
   * joined message has no head, so none.
   */
  actions?: React.ReactNode;
  /**
   * One or two ghost `xs` (24) icon controls for what a reader does now and then (reply, react, copy a link); more go in one menu. With a fine pointer
   * from 720 they are revealed while the message is hovered, holds focus or holds an open popup (in the tab order at rest, never taking a press while
   * hidden): at the head's end, before `actions`, or, in a joined message, in a seat at the end of its words' first line. Everywhere else the message
   * draws one More control that opens them in a popover, so there is always a route to them. Write the same nodes for a headed and a joined message.
   * A joined message that begins with a block (a quote, a card) clears the seat's line: carry these on a headed message instead.
   */
  quietActions?: React.ReactNode;
  /** The More control's name on touch. Default "Actions for the message from {author}, {time}". */
  quietActionsLabel?: string;
  /** The time is a link to the entry (its own page or anchor): tertiary at rest, primary with the link's underline on hover and focus (on touch the underline is drawn at rest). */
  timeHref?: string;
  /** The time link's name. Default "Message from {author}, {time}". */
  timeLabel?: string;
  /** The words, and any blocks (a `StreamQuote`, a `DisclosureRow`, an `ActivityList`, a card in a `StreamBlock`). */
  children: React.ReactNode;
}

/** A message: an avatar, a name, a time and the words. See the module note. */
export function StreamMessage({ author, avatar, time, dateTime, joined = false, meta, actions, quietActions, quietActionsLabel, timeHref, timeLabel, arrived, arrivedLabel = DEFAULT_ARRIVED, onArrivedEnd, className, children, ...props }: StreamMessageProps) {
  const arrival = useArrival<HTMLLIElement>({ arrived, onArrivedEnd });
  // The label of the block in it that is arrived (one at a time), and whether one ever was, so the word keeps its room after.
  const [block, setBlock] = React.useState<string | null>(null);
  const [blockEver, setBlockEver] = React.useState<string | null>(null);
  // A joined message that has been the one arrived is read whole from then on: its head is drawn, and stays, so the mark's going moves nothing.
  const showHead = !joined || arrival.ever;
  const head = React.useMemo<HeadContext>(() => ({ hasHead: showHead, report: (label) => { setBlock(label); if (label !== null) setBlockEver(label); } }), [showHead]);
  const wordOn = arrival.on || block !== null;
  const wordEver = arrival.ever || (showHead && blockEver !== null);
  const wordLabel = arrival.on ? arrivedLabel : (block ?? blockEver ?? arrivedLabel);
  const timeEl = <time className="basalt-stream-time" dateTime={dateTime}>{time}</time>;
  const timeLink = timeHref !== undefined ? <a href={timeHref} aria-label={timeLabel ?? `Message from ${author}, ${time}`} className="basalt-stream-time-link">{timeEl}</a> : null;
  const quiet = quietActions != null ? (
    <>
      <span className="basalt-stream-quiet">{quietActions}</span>
      <QuietMore label={quietActionsLabel ?? `Actions for the message from ${author}, ${time}`}>{quietActions}</QuietMore>
    </>
  ) : null;
  // A message with no head drawn carries its time link and its quiet actions in a seat at the end of its words' first line.
  const seat = !showHead && (timeLink !== null || quiet !== null) ? <span className="basalt-stream-seat">{timeLink}{quiet}</span> : null;
  if (process.env.NODE_ENV !== "production" && seat !== null) warnBlockFirst(children);
  return (
    <li {...props} {...arrival.attrs} data-joined={showHead ? undefined : ""} className={join("basalt-stream-message", className)}>
      <span className="basalt-stream-gutter" aria-hidden="true">{showHead ? (avatar ?? <Avatar name={author} size={32} />) : null}</span>
      <div className="basalt-stream-body">
        {showHead ? (
          <div className="basalt-stream-head">
            <span className="basalt-stream-author">{author}</span>
            {timeLink ?? timeEl}
            {meta ? <span className="basalt-stream-meta">{meta}</span> : null}
            {wordEver ? <ArrivedWord on={wordOn} label={wordLabel} /> : null}
            {quiet}
            {actions ? <span className="basalt-stream-actions">{actions}</span> : null}
          </div>
        ) : (
          // While the seat draws the time (a link named with it), the prefix says the author alone, so the time is said once.
          <span className="basalt-visually-hidden">{author}{timeLink !== null ? null : <>, {timeEl}</>}: </span>
        )}
        <HeadContext.Provider value={head}>
          <WordContext.Provider value={{ on: wordOn, ever: wordEver, label: wordLabel }}>
            <div className="basalt-stream-text">{seat}{children}</div>
          </WordContext.Provider>
        </HeadContext.Provider>
      </div>
    </li>
  );
}

/** The words' own first lines: a block anything else, which clears the seat's line. */
// A function, not a set: loading this module allocates nothing (no module-scope side effects).
const isLine = (tag: string) => /^(?:p|ul|ol|h[1-6])$/.test(tag);
let warnedBlock = false;
/** Development only: a joined message whose words begin with a block, which then starts under the seat's line. */
function warnBlockFirst(children: React.ReactNode) {
  if (warnedBlock) return;
  const first = React.Children.toArray(children)[0];
  if (!React.isValidElement(first) || (typeof first.type === "string" && isLine(first.type))) return;
  warnedBlock = true;
  console.warn("Basalt StreamMessage: a joined message with quietActions or timeHref begins with a block, which starts under the seat's line (20px more above it). Carry them on a headed message, or leave them off and use the block's own head.");
}

// The More popover loads the first time a reader reaches for More (stream-more.tsx): the message draws More, and the popup, its positioning and
// Floating UI come only when someone asks. Pointing at or focusing More starts the load; pressing it opens the popover as soon as it is there.
// Assigned on first use, so loading this module does nothing.
type QuietModule = typeof import("./stream-more");
let quietLoading: Promise<QuietModule> | undefined;
const loadQuiet = () => (quietLoading ??= import("./stream-more").catch((error) => { quietLoading = undefined; throw error; }));

/**
 * The quiet actions' touch form: one More control (an ellipsis at 16 in secondary, no plate at rest, `aria-haspopup="dialog"`) that opens the same
 * controls in a popover, its opener's level plus one. Esc and a press outside close it and focus returns to More; a press on a control in it closes
 * it, unless that control opens a popup of its own. With a fine pointer from 720 the stylesheet hides it and shows the inline controls.
 */
function QuietMore({ label, children }: { label: string; children: React.ReactNode }) {
  const [Popup, setPopup] = React.useState<QuietModule["QuietPopup"] | null>(null);
  const [open, setOpen] = React.useState(false);
  const layer = useFloatingLayer();
  const level = usePopupLevel();
  const warm = () => { loadQuiet().catch(() => {}); };
  const press = (event: React.MouseEvent) => {
    const control = (event.target as Element).closest("button, a[href], [role='menuitem']");
    if (control && !control.hasAttribute("aria-haspopup")) setOpen(false);
  };
  const trigger = (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={open}
      className="basalt-stream-more"
      onPointerEnter={Popup ? undefined : warm}
      onFocus={Popup ? undefined : warm}
      onClick={Popup ? undefined : () => loadQuiet().then((module) => { setPopup(() => module.QuietPopup); setOpen(true); })}
    >
      <Icon icon={MoreGlyph} size={16} />
    </button>
  );
  if (!Popup) return trigger;
  return <Popup open={open} onOpenChange={setOpen} trigger={trigger} level={level} layer={layer} label={label}>{inLevel(level, <div className="basalt-cluster" onClick={press}>{children}</div>)}</Popup>;
}

export interface StreamNoteProps extends ArrivalProps, Omit<React.ComponentProps<"li">, "children" | "ref" | "tabIndex"> {
  /** What happened, in a sentence: "Lee Marsh joined", "Status set to Open". */
  children: React.ReactNode;
  /** An `Icon` at 16 in the gutter, centred under where avatars stand. */
  mark?: React.ReactNode;
  /** When, as the app writes it. */
  time?: string;
  dateTime?: string;
}

/** A quieter row: a sentence in secondary ink at 13 in the text column, and its time. See the module note. */
export function StreamNote({ children, mark, time, dateTime, arrived, arrivedLabel = DEFAULT_ARRIVED, onArrivedEnd, className, ...props }: StreamNoteProps) {
  const arrival = useArrival<HTMLLIElement>({ arrived, onArrivedEnd });
  return (
    <li {...props} {...arrival.attrs} className={join("basalt-stream-note", className)}>
      <span className="basalt-stream-gutter" aria-hidden="true">{mark}</span>
      <div className="basalt-stream-note-line">
        <span className="basalt-stream-note-text">{children}</span>
        {time ? <time className="basalt-stream-time" dateTime={dateTime}>{time}</time> : null}
        {arrival.ever ? <ArrivedWord on={arrival.on} label={arrivedLabel} /> : null}
      </div>
    </li>
  );
}

interface ArrivalBoxProps extends ArrivalProps {
  /** What it holds is a panel (a `Card`, a `Callout`): the panel's own fill takes the wash, inside its rim, and nothing is drawn round it. */
  panel?: boolean;
}

export interface StreamEntryProps extends ArrivalBoxProps, Omit<React.ComponentProps<"li">, "children" | "ref" | "tabIndex"> {
  /** Any other entry: a card, an update, a figure. */
  children: React.ReactNode;
  /** Starts at the gutter's edge and spans the stream, instead of standing in the text column under the words. */
  bleed?: boolean;
}

/**
 * An entry of the app's own: a panel or anything else, in the text column (or across the stream with `bleed`). A panel entry that can be the one
 * arrived puts `StreamArrivedWord` in its own head.
 */
export function StreamEntry({ panel = false, bleed = false, arrived, arrivedLabel = DEFAULT_ARRIVED, onArrivedEnd, className, children, ...props }: StreamEntryProps) {
  const arrival = useArrival<HTMLLIElement>({ arrived, onArrivedEnd });
  return (
    <li {...props} {...arrival.attrs} data-panel={panel ? "" : undefined} data-bleed={bleed ? "" : undefined} className={join("basalt-stream-entry", className)}>
      <WordContext.Provider value={{ on: arrival.on, ever: arrival.ever, label: arrivedLabel }}>
        {!panel && arrival.ever ? <ArrivedWord on={arrival.on} label={arrivedLabel} className="basalt-stream-word-line" /> : null}
        {children}
      </WordContext.Provider>
    </li>
  );
}

export interface StreamBlockProps extends ArrivalBoxProps, Omit<React.ComponentProps<"div">, "children" | "ref" | "tabIndex"> {
  children: React.ReactNode;
}

/**
 * A part of a message that can be the one a link opened on its own (one paragraph of an answer, a card inside an agent's turn). Its message's
 * head says the word, in the block's `arrivedLabel`; in a joined message, which has no head, the block draws the word above itself. A block that is
 * not a panel takes the plate behind it; a panel's own fill takes the wash.
 */
export function StreamBlock({ panel = false, arrived, arrivedLabel = DEFAULT_ARRIVED, onArrivedEnd, className, children, ...props }: StreamBlockProps) {
  const arrival = useArrival<HTMLDivElement>({ arrived, onArrivedEnd });
  const head = React.useContext(HeadContext);
  const on = arrival.on;
  // In a message with its head drawn, the head says the word, in this block's words. With no head to say it (a joined message, or no message),
  // the block draws its word itself, above what it holds, and keeps its room after.
  const inHead = Boolean(head?.hasHead);
  React.useEffect(() => {
    if (!on || !head?.hasHead) return undefined;
    head.report(arrivedLabel);
    return () => head.report(null);
  }, [on, head, arrivedLabel]);
  return (
    <div {...props} {...arrival.attrs} data-panel={panel ? "" : undefined} className={join("basalt-stream-block", className)}>
      {!inHead && arrival.ever ? <ArrivedWord on={on} label={arrivedLabel} className="basalt-stream-word-line" /> : null}
      {on && inHead ? <span className="basalt-visually-hidden">{arrivedLabel}: </span> : null}
      <WordContext.Provider value={{ on, ever: false, label: arrivedLabel }}>{children}</WordContext.Provider>
    </div>
  );
}

export interface StreamQuoteProps extends Omit<React.ComponentProps<"figure">, "children"> {
  /** Who said it and to whom, in the app's words ("Dana Okafor asked", "Replying to Sam"). Tertiary, at 12, above the words. */
  cite?: React.ReactNode;
  /** When, as the app writes it; after `cite`. */
  time?: string;
  dateTime?: string;
  /** What they said. */
  children: React.ReactNode;
}

/**
 * The other side of an exchange: what a person said to an agent or a bot, or the message a reply answers, inside the turn that answers it. A fill
 * one step from what it sits on (one level up in dark; the sunken band's grey in light), radius 8, and no rim: the turn keeps the only frame, and
 * the words above it say whose they are, so the fill never carries that alone.
 */
export function StreamQuote({ cite, time, dateTime, className, children, ...props }: StreamQuoteProps) {
  const level = usePanelLevel();
  return (
    <figure {...props} data-level={level} className={join("basalt-stream-quote", className)}>
      {cite || time ? (
        <figcaption className="basalt-stream-quote-cite">
          {cite}
          {cite && time ? <DotSep spaced /> : null}
          {time ? <time dateTime={dateTime}>{time}</time> : null}
        </figcaption>
      ) : null}
      <blockquote className="basalt-stream-quote-text">{inLevel(level, children)}</blockquote>
    </figure>
  );
}
