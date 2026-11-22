import * as React from "react";

import { Avatar } from "./composition";
import { DotSep } from "./dot-sep";
import { useInShape } from "./in-shape";
import { inLevel, usePanelLevel } from "./layers";
import { join } from "./utils";

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
/** Keys that read around the entry rather than act: they leave the mark where it is. A pattern, not a set, so loading the module builds nothing. */
const reading = (key: string) => /^(Arrow(Up|Down|Left|Right)|Page(Up|Down)|Home|End| |Shift|Control|Alt|Meta|CapsLock)$/.test(key);

export interface ArrivalProps {
  /** This is the entry a link, a search result or a notice opened: it is scrolled to, focused and marked until the reader acts. */
  arrived?: boolean;
  /** The word that says so, in the entry's head. Default "Linked"; an app says why in its own words ("Search result", "From your notice"). */
  arrivedLabel?: string;
  /** The reader has acted, so the mark is going. Without it the part ends the mark itself; with it, the app may also clear `arrived`. */
  onArrivedEnd?: () => void;
}

// One entry arrives at a time. The one placed last is the one the reader is at: placing another ends the one before (its `onArrivedEnd` is
// called). Assigned only while an entry is arrived, so loading this module does nothing.
let current: { end: () => void } | undefined;

/** Whether the element has a box the reader can see: not under `display: none` (nor `content-visibility: hidden`). */
const shown = (el: HTMLElement) => el.getClientRects().length > 0 && (typeof el.checkVisibility !== "function" || el.checkVisibility());

/** The nearest ancestor that scrolls the entry on the block axis, or null when it is the page. */
function scrollerOf(el: HTMLElement): HTMLElement | null {
  for (let at = el.parentElement; at && at !== document.body && at !== document.documentElement; at = at.parentElement) {
    const { overflowY } = getComputedStyle(at);
    if ((overflowY === "auto" || overflowY === "scroll") && at.scrollHeight > at.clientHeight) return at;
  }
  return null;
}

/**
 * The arrival's state: shown while `arrived` and the reader has not acted yet. Once the entry has a box (a pane it sits in may be hidden when it
 * mounts) it is scrolled to and focused, once each time it turns on, and from then the reader's first act ends it.
 */
function useArrival<T extends HTMLElement>({ arrived = false, onArrivedEnd }: ArrivalProps) {
  const inShape = useInShape();
  const ref = React.useRef<T>(null);
  const [ended, setEnded] = React.useState(false);
  const [ever, setEver] = React.useState(false);
  const [placed, setPlaced] = React.useState(false);
  const end = React.useRef(onArrivedEnd);
  end.current = onArrivedEnd;
  React.useEffect(() => { if (arrived) setEnded(false); }, [arrived]);
  const on = arrived && !ended && inShape === 0;
  React.useEffect(() => { if (!on) setPlaced(false); }, [on]);
  React.useLayoutEffect(() => {
    if (!on || placed) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const place = () => {
      // A short entry is brought to the middle of what scrolls it; one taller than most of that (the pane's visible height, or the window's), to its top.
      const scroller = scrollerOf(el);
      const room = scroller ? scroller.clientHeight : window.innerHeight;
      el.scrollIntoView({ block: el.getBoundingClientRect().height > room * 0.6 ? "start" : "center", inline: "nearest" });
      el.focus({ preventScroll: true });
      setEver(true);
      setPlaced(true);
    };
    if (shown(el)) { place(); return undefined; }
    // Not laid out yet (a hidden tab or pane): wait until it has a box, then place it once.
    const watch = new ResizeObserver(() => { if (shown(el)) { watch.disconnect(); place(); } });
    watch.observe(el);
    return () => watch.disconnect();
  }, [on, placed]);
  React.useEffect(() => {
    if (!on || !placed) return undefined;
    const finish = () => { setEnded(true); end.current?.(); };
    const self = { end: finish };
    if (current && current !== self) current.end();
    current = self;
    const act = (event: Event) => {
      if (event.type === "keydown") {
        const key = (event as KeyboardEvent).key;
        const inField = (event.target as Element | null)?.closest?.("input, textarea, select, [contenteditable='true'], [contenteditable='']");
        if (reading(key) && !(key === " " && inField)) return;
      }
      finish();
    };
    // From the next frame, so the press or key that opened the entry does not end its mark.
    const frame = requestAnimationFrame(() => {
      document.addEventListener("pointerdown", act, true);
      document.addEventListener("keydown", act, true);
    });
    return () => {
      if (current === self) current = undefined;
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", act, true);
      document.removeEventListener("keydown", act, true);
    };
  }, [on, placed]);
  // Once it has arrived the entry stays a focus target, so taking the mark away never drops the reader's focus.
  const attrs = { ref, tabIndex: ever || on ? -1 : undefined, "data-arrival": ever || on ? "" : undefined, "data-arrived": on ? "" : undefined };
  return { on, ever: ever || on, attrs };
}

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
  /** Controls at the end of the head (a menu, "Stop"). A joined message has no head, so none. */
  actions?: React.ReactNode;
  /** The words, and any blocks (a `StreamQuote`, a `DisclosureRow`, an `ActivityList`, a card in a `StreamBlock`). */
  children: React.ReactNode;
}

/** A message: an avatar, a name, a time and the words. See the module note. */
export function StreamMessage({ author, avatar, time, dateTime, joined = false, meta, actions, arrived, arrivedLabel = DEFAULT_ARRIVED, onArrivedEnd, className, children, ...props }: StreamMessageProps) {
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
  return (
    <li {...props} {...arrival.attrs} data-joined={showHead ? undefined : ""} className={join("basalt-stream-message", className)}>
      <span className="basalt-stream-gutter" aria-hidden="true">{showHead ? (avatar ?? <Avatar name={author} size={32} />) : null}</span>
      <div className="basalt-stream-body">
        {showHead ? (
          <div className="basalt-stream-head">
            <span className="basalt-stream-author">{author}</span>
            {timeEl}
            {meta ? <span className="basalt-stream-meta">{meta}</span> : null}
            {wordEver ? <ArrivedWord on={wordOn} label={wordLabel} /> : null}
            {actions ? <span className="basalt-stream-actions">{actions}</span> : null}
          </div>
        ) : (
          <span className="basalt-visually-hidden">{author}, {timeEl}: </span>
        )}
        <HeadContext.Provider value={head}>
          <WordContext.Provider value={{ on: wordOn, ever: wordEver, label: wordLabel }}>
            <div className="basalt-stream-text">{children}</div>
          </WordContext.Provider>
        </HeadContext.Provider>
      </div>
    </li>
  );
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
