import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { Field as BaseField } from "@base-ui/react/field";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { Progress as BaseProgress } from "@base-ui/react/progress";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { InfoIcon } from "@phosphor-icons/react/dist/csr/Info";
import { WarningIcon } from "@phosphor-icons/react/dist/csr/Warning";
import { XCircleIcon } from "@phosphor-icons/react/dist/csr/XCircle";
import * as React from "react";

import { CheckGlyph } from "./glyphs/check";
import { ChevronDownGlyph } from "./glyphs/chevron-down";
import { CopyGlyph } from "./glyphs/copy";
import { IconButton } from "./button";
import { CodeLine, CodePrompt, codeLines, continues } from "./code-lines";
import { Icon } from "./icon";
import { codeLanguageStatus, highlightCode, loadCodeLanguage } from "./syntax";
import type { CodeToken } from "./syntax";
import { inLevel, useFloatingLayer, usePanelLevel, usePopupLevel } from "./layers";
import type { Align, ChangeDetails, FocusTarget, OpenChangeDetails, PartProps, PlacementOffset, PlacementProps, PopoverHandle, PopupActions, Side } from "./types";
import { join, withClass } from "./utils";

// ---- Textarea ----

export interface TextareaProps extends Omit<React.ComponentProps<"textarea">, "className"> {
  className?: string;
  /** Visible rows before it scrolls. */
  rows?: number;
}

/** Multi-line text. Inside a `Field` it takes the field's label, description and error. */
export function Textarea({ className, rows = 4, id, name, value, defaultValue, disabled, autoFocus, required, readOnly, ...props }: TextareaProps) {
  return (
    <BaseField.Control
      id={id}
      name={name}
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      autoFocus={autoFocus}
      required={required}
      readOnly={readOnly}
      className={join("basalt-input basalt-textarea", className)}
      render={<textarea rows={rows} {...props} />}
    />
  );
}

// ---- Popover ----

export interface PopoverProps<Payload = unknown> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: OpenChangeDetails) => void;
  /** Called after the open or close transition has finished. */
  onOpenChangeComplete?: (open: boolean) => void;
  /** Imperative handle: `unmount()` ends a closing animation you ran yourself (call `details.preventUnmountOnClose()` first); `close()` closes. */
  actionsRef?: React.RefObject<PopupActions | null>;
  /** Which trigger the popover belongs to when it has several: the `id` of one `PopoverTrigger`. Use with `open`. */
  triggerId?: string | null;
  defaultTriggerId?: string | null;
  /** `true` locks scroll and makes the page inert; `"trap-focus"` traps focus only. Off by default. */
  modal?: boolean | "trap-focus";
  /**
   * One popover for many triggers: a handle from `createPopoverHandle()`, also given to each `PopoverTrigger`, which may then
   * sit anywhere, outside this `Popover` too.
   */
  handle?: PopoverHandle<Payload>;
  /** Content, or a function of the open trigger's `payload` (`undefined` while no trigger has opened it). */
  children?: React.ReactNode | ((arg: { payload: Payload | undefined }) => React.ReactNode);
}

/** Rich content anchored to a trigger: a short form, details, a confirmation. Esc or an outside click closes it. */
export function Popover<Payload = unknown>({ handle, ...props }: PopoverProps<Payload>) {
  // Our handle is Base UI's, declared with our own type so no declaration of theirs reaches an app.
  return <BasePopover.Root<Payload> {...props} handle={handle as unknown as BasePopover.Handle<Payload> | undefined} />;
}

/**
 * A handle that joins one `Popover` to any number of `PopoverTrigger`s, each with its own `payload`. Make it once, outside
 * render or in a `useRef`/`useState` initialiser, and pass it as `handle` to the `Popover` and to each trigger.
 */
export function createPopoverHandle<Payload = unknown>(): PopoverHandle<Payload> {
  return BasePopover.createHandle<Payload>() as unknown as PopoverHandle<Payload>;
}

export interface PopoverTriggerProps<Payload = unknown> extends PartProps<"button"> {
  /** The popover this trigger opens, when the trigger is not inside it. */
  handle?: PopoverHandle<Payload>;
  /** What the popover's content function receives while this trigger has it open. */
  payload?: Payload;
  nativeButton?: boolean;
  /** Open when hovered, as well as when pressed. */
  openOnHover?: boolean;
  delay?: number;
  closeDelay?: number;
}

export function PopoverTrigger<Payload = unknown>({ className, handle, ...props }: PopoverTriggerProps<Payload>) {
  return <BasePopover.Trigger<Payload> {...props} handle={handle as unknown as BasePopover.Handle<Payload> | undefined} className={withClass("basalt-popover-trigger", className)} />;
}

export interface PopoverContentProps extends PartProps<"div">, PlacementProps {
  side?: Side;
  align?: Align;
  /** Distance from the anchor, in pixels, or a function of the placement. 6 by default. */
  sideOffset?: PlacementOffset;
  /** What receives focus on open: `true` for the first control, `false` for none, an element, or a function that returns one. */
  initialFocus?: FocusTarget;
  finalFocus?: FocusTarget;
}

export function PopoverContent({ side = "bottom", align = "start", sideOffset = 6, anchor, alignOffset, collisionAvoidance, collisionBoundary, collisionPadding, sticky, className, children, ...props }: PopoverContentProps) {
  const layer = useFloatingLayer();
  // One level above its opener (floor 1, cap 3).
  const level = usePopupLevel();
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner side={side} align={align} sideOffset={sideOffset} anchor={anchor} alignOffset={alignOffset} collisionAvoidance={collisionAvoidance} collisionBoundary={collisionBoundary} collisionPadding={collisionPadding} sticky={sticky} style={layer} className="basalt-positioner">
        <BasePopover.Popup {...props} data-level={level} className={withClass("basalt-popover", className)}>{inLevel(level, children)}</BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

export function PopoverTitle({ className, ...props }: PartProps<"h2">) {
  return <BasePopover.Title {...props} className={withClass("basalt-popover-title", className)} />;
}

export function PopoverDescription({ className, ...props }: PartProps<"p">) {
  return <BasePopover.Description {...props} className={withClass("basalt-popover-description", className)} />;
}

export interface PopoverCloseProps extends PartProps<"button"> {
  nativeButton?: boolean;
}

export function PopoverClose(props: PopoverCloseProps) {
  return <BasePopover.Close {...props} />;
}

// ---- Callout ----

export type CalloutStatus = "info" | "success" | "warning" | "danger";

const CALLOUT_ICON = { info: InfoIcon, success: CheckCircleIcon, warning: WarningIcon, danger: XCircleIcon } as const;

export interface CalloutProps extends Omit<React.ComponentProps<"div">, "title"> {
  status?: CalloutStatus;
  /** One line saying what's wrong or what to know. */
  title: React.ReactNode;
  /** What to do about it. */
  children?: React.ReactNode;
  /** Actions, usually one or two small buttons. */
  actions?: React.ReactNode;
  /**
   * Announce it when it appears: "polite" for information, "assertive" only for an error that
   * blocks the task. Omit for a message present when the page loads.
   */
  live?: "polite" | "assertive";
}

/**
 * An inline message that stays until the situation changes: a warning or error that needs a
 * decision, or information the reader shouldn't miss. Status is the icon's shape and colour plus
 * the words; the surface stays neutral.
 */
export function Callout({ status = "info", title, children, actions, live, className, ...props }: CalloutProps) {
  const level = usePanelLevel();
  return (
    <div
      {...props}
      role={live === "assertive" ? "alert" : live === "polite" ? "status" : undefined}
      data-status={status}
      data-level={level}
      className={join("basalt-callout", className)}
    >
      <Icon icon={CALLOUT_ICON[status]} size={16} className="basalt-callout-icon" />
      <div className="basalt-callout-body">
        <div className="basalt-callout-title">{title}</div>
        {children ? <div className="basalt-callout-text">{inLevel(level, children)}</div> : null}
        {actions ? <div className="basalt-callout-actions">{inLevel(level, actions)}</div> : null}
      </div>
    </div>
  );
}

// ---- Progress ----

export interface ProgressProps extends Omit<PartProps<"div">, "children"> {
  /** How far along, from `min` to `max`. `null` while the end isn't known. */
  value: number | null;
  min?: number;
  max?: number;
  /** How the value is written, as `Intl.NumberFormat` options. */
  format?: Intl.NumberFormatOptions;
  locale?: string | string[];
  /** The spoken value, e.g. "3 of 5 steps". */
  getAriaValueText?: (formattedValue: string, value: number | null) => string;
  /** What is progressing: "Building image". Required: it names the progress bar. */
  label: React.ReactNode;
  /** Show the value (e.g. 42%) beside the label. */
  showValue?: boolean;
}

/** Progress of a task with a known end. Pass `value={null}` while the end isn't known yet. */
export function Progress({ label, showValue = true, className, ...props }: ProgressProps) {
  return (
    <BaseProgress.Root {...props} className={withClass("basalt-progress", className)}>
      <div className="basalt-progress-head">
        <BaseProgress.Label className="basalt-progress-label">{label}</BaseProgress.Label>
        {showValue ? <BaseProgress.Value className="basalt-progress-value" /> : null}
      </div>
      <BaseProgress.Track className="basalt-progress-track">
        <BaseProgress.Indicator className="basalt-progress-indicator" />
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
}

export { Spinner } from "./spinner";
export type { SpinnerProps, SpinnerVariant } from "./spinner";

// ---- Skeleton ----

export interface SkeletonProps extends React.ComponentProps<"span"> {
  width?: number | string;
  height?: number | string;
  /** "text" rounds like a line of text; "block" like a card or image. */
  shape?: "text" | "block" | "circle";
}

/** A placeholder for content that's loading, in its final size so nothing jumps. Hidden from screen readers: announce loading once, elsewhere. */
export function Skeleton({ width = "100%", height, shape = "text", className, style, ...props }: SkeletonProps) {
  return (
    <span
      {...props}
      aria-hidden="true"
      data-shape={shape}
      className={join("basalt-skeleton", className)}
      style={{ width, height: height ?? (shape === "text" ? "0.8em" : 64), ...style }}
    />
  );
}

// ---- CodeBlock ----

export interface CodeBlockProps {
  /** The code, as text. */
  code: string;
  /** A language or common alias (e.g. "typescript", "tsx", "sh", "swift"). Omit for plain text. */
  language?: string;
  /** A file name or language shown above the code, e.g. "terminal" or "Package.swift". */
  title?: string;
  /** Show a copy button. On by default. */
  copyable?: boolean;
  /**
   * A shell prompt such as `"$"`. It puts every line in the gutter (16px plus `space-2`), and a line after one that ends in a
   * backslash gets an empty gutter. The prompt is chrome: a selection and a screen reader skip it, and copy takes `code`
   * exactly as given.
   */
  prompt?: string;
  className?: string;
}

/** Code longer than this (UTF-16 code units) is, in a browser, coloured once its plain text has painted; shorter code is coloured in the render. */
const COLOUR_LATER_FROM = 10_000;

/** `useSyncExternalStore` with nothing to subscribe to: false in the browser, true on the server and in the hydrating render. */
const noSubscription = () => () => {};

/** Code, commands or logs, in mono on a sunken surface, scrolling sideways rather than wrapping. */
export function CodeBlock({ code, language, title, copyable = true, prompt, className }: CodeBlockProps) {
  // A well: level 1 on the page, one deeper inside a card, and so on up to 3.
  const level = usePanelLevel();
  // The code renders as plain text at once; colour follows when its grammar has loaded, with
  // no change in layout. Languages loaded earlier (or preloaded for SSR) colour immediately.
  const [loaded, setLoaded] = React.useState(0);
  const status = codeLanguageStatus(language);
  React.useEffect(() => {
    if (status !== "loading" || !language) return;
    let live = true;
    loadCodeLanguage(language).then((ok) => { if (ok && live) setLoaded((n) => n + 1); });
    return () => { live = false; };
  }, [language, status]);
  // A long block is coloured after its plain text has painted, not inside the render that mounts it: highlighting is the cost, and it
  // grows with the code (a 99,000-character block took 0.6s of the main thread on a slow device). A short one is coloured at once, as before.
  // That holds only where an effect will run. On the server, in static markup and in the hydrating render a long block is coloured in
  // the render exactly as it always was (a language preloaded for the server colours every block up to the cap, and hydration must find
  // the same spans), and the page keeps those colours: nothing turns plain after hydration.
  const late = code.length > COLOUR_LATER_FROM;
  const serverRender = React.useSyncExternalStore(noSubscription, () => false, () => true);
  const [coloured, setColoured] = React.useState<{ code: string; language: string | undefined; tokens: CodeToken[] | null } | null>(null);
  const kept = React.useRef<{ code: string; language: string | undefined; tokens: CodeToken[] } | null>(null);
  const now = React.useMemo(() => (status === "ready" && (!late || serverRender) ? highlightCode(code, language) : null), [code, language, status, loaded, late, serverRender]);
  if (now) kept.current = { code, language, tokens: now };
  const held = kept.current && kept.current.code === code && kept.current.language === language ? kept.current.tokens : null;
  React.useEffect(() => {
    if (!late || serverRender || held || status !== "ready") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      timer = setTimeout(() => setColoured({ code, language, tokens: highlightCode(code, language) }), 0);
    });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [late, serverRender, held, code, language, status, loaded]);
  const tokens = now ?? held ?? (late && coloured && coloured.code === code && coloured.language === language ? coloured.tokens : null);
  // Preserve the original whitespace, including CRLF and trailing newlines. Token offsets
  // locate spans in the source; source text is rendered by React, never injected as HTML.
  const content = React.useMemo(() => {
    let cursor = 0;
    const nodes = tokens?.map((token, i) => {
      const gap = code.slice(cursor, token.offset);
      cursor = token.offset + token.content.length;
      return <React.Fragment key={i}>{gap}<span style={{ color: token.color }}>{token.content}</span></React.Fragment>;
    });
    return { nodes, rest: code.slice(cursor) };
  }, [tokens, code]);
  // With a prompt, every line has a gutter, so the text is cut into lines; without one the block is a single run of text.
  const lines = React.useMemo(() => (prompt === undefined ? null : codeLines(code, tokens)), [prompt, code, tokens]);
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // clipboard refused (insecure context or permissions): leave the button as it was
    }
  };
  const copyButton = copyable ? (
    <span className="basalt-code-copy">
      <IconButton size="sm" icon={copied ? CheckGlyph : CopyGlyph} label={copied ? "Copied" : "Copy code"} onClick={copy} />
      <span className="basalt-visually-hidden" role="status">{copied ? "Copied" : ""}</span>
    </span>
  ) : null;
  return (
    <figure className={join("basalt-code", className)} data-titled={title ? "" : undefined} data-level={level}>
      {title ? (
        <figcaption className="basalt-code-title">
          <span>{title}</span>
          {copyButton}
        </figcaption>
      ) : null}
      {/* a scrollable region must be reachable by keyboard */}
      <pre className="basalt-code-pre" tabIndex={0} role="region" aria-label={title ? `${title} code` : "Code"}>
        {lines ? (
          <code data-language={language} className="basalt-code-lines">
            {lines.map((line, i) => (
              <CodeLine key={i} gutter={i > 0 && continues(lines[i - 1]) ? null : <CodePrompt>{prompt}</CodePrompt>}>
                {/* A line that is one plain run is passed as a string. React hydrates a string child by its text alone, so a cold
                    client (grammar not loaded yet) matches a server that sent coloured spans for the same line. */}
                {line.length === 1 && line[0] && !line[0].color ? line[0].text : line.map((run, j) => (run.color ? <span key={j} style={{ color: run.color }}>{run.text}</span> : <React.Fragment key={j}>{run.text}</React.Fragment>))}
              </CodeLine>
            ))}
          </code>
        ) : (
          <code data-language={language}>{tokens ? <>{content.nodes}{content.rest}</> : code}</code>
        )}
      </pre>
      {title ? null : copyButton}
    </figure>
  );
}

// ---- Accordion ----

/** Sections that expand one at a time or several at once. For a page's secondary detail, not its main content. */
export interface AccordionProps extends PartProps<"div", "defaultValue"> {
  /** The values of the open items. */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[], details: ChangeDetails) => void;
  /** Allow several items open at once. Off by default. */
  multiple?: boolean;
  disabled?: boolean;
  loopFocus?: boolean;
  orientation?: "horizontal" | "vertical";
  /** Keep closed panels in the document, so the browser's find-in-page can open them. */
  hiddenUntilFound?: boolean;
  keepMounted?: boolean;
}

export function Accordion({ className, ...props }: AccordionProps) {
  return <BaseAccordion.Root {...props} className={withClass("basalt-accordion", className)} />;
}

export interface AccordionItemProps extends Omit<PartProps<"div", "title">, "children"> {
  /** Names the item in `value`. Generated when omitted. */
  value?: string;
  disabled?: boolean;
  onOpenChange?: (open: boolean, details: ChangeDetails) => void;
  /** The always-visible header. */
  title: React.ReactNode;
  /** The header's heading level in the page outline, 3 by default; its size stays the same at every level. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
}

export function AccordionItem({ title, headingLevel = 3, children, className, ...props }: AccordionItemProps) {
  return (
    <BaseAccordion.Item {...props} className={withClass("basalt-accordion-item", className)}>
      <BaseAccordion.Header className="basalt-accordion-header" render={headingLevel === 3 ? undefined : React.createElement(`h${headingLevel}`)}>
        <BaseAccordion.Trigger className="basalt-accordion-trigger">
          <span>{title}</span>
          <Icon icon={ChevronDownGlyph} size={16} className="basalt-accordion-caret" />
        </BaseAccordion.Trigger>
      </BaseAccordion.Header>
      <BaseAccordion.Panel className="basalt-accordion-panel">
        <div className="basalt-accordion-content">{children}</div>
      </BaseAccordion.Panel>
    </BaseAccordion.Item>
  );
}

