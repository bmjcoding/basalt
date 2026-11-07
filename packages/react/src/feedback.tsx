import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { Field as BaseField } from "@base-ui/react/field";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { Progress as BaseProgress } from "@base-ui/react/progress";
import { CaretDownIcon, CheckCircleIcon, InfoIcon, WarningCircleIcon, WarningIcon } from "@phosphor-icons/react";
import * as React from "react";

import { Button } from "./button";
import { Icon } from "./icon";
import { MorphIcon } from "./morph-icon";
import { useGlide } from "./motion";
import { codeLanguageStatus, highlightCode, loadCodeLanguage } from "./syntax";
import { useFloatingLayer } from "./layers";
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

/** Rich content anchored to a trigger: a short form, details, a confirmation. Esc or an outside click closes it. */
export const Popover = BasePopover.Root;

export function PopoverTrigger({ className, ...props }: React.ComponentProps<typeof BasePopover.Trigger>) {
  return <BasePopover.Trigger {...props} className={withClass("basalt-popover-trigger", className)} />;
}

export interface PopoverContentProps extends React.ComponentProps<typeof BasePopover.Popup> {
  side?: React.ComponentProps<typeof BasePopover.Positioner>["side"];
  align?: React.ComponentProps<typeof BasePopover.Positioner>["align"];
  sideOffset?: number;
}

export function PopoverContent({ side = "bottom", align = "start", sideOffset = 6, className, ...props }: PopoverContentProps) {
  const layer = useFloatingLayer();
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner side={side} align={align} sideOffset={sideOffset} style={layer} className="basalt-positioner">
        <BasePopover.Popup {...props} className={withClass("basalt-popover", className)} />
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

export function PopoverTitle({ className, ...props }: React.ComponentProps<typeof BasePopover.Title>) {
  return <BasePopover.Title {...props} className={withClass("basalt-popover-title", className)} />;
}

export function PopoverDescription({ className, ...props }: React.ComponentProps<typeof BasePopover.Description>) {
  return <BasePopover.Description {...props} className={withClass("basalt-popover-description", className)} />;
}

export const PopoverClose = BasePopover.Close;

// ---- Callout ----

export type CalloutStatus = "info" | "success" | "warning" | "danger";

const CALLOUT_ICON = { info: InfoIcon, success: CheckCircleIcon, warning: WarningIcon, danger: WarningCircleIcon } as const;

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
  return (
    <div
      {...props}
      role={live === "assertive" ? "alert" : live === "polite" ? "status" : undefined}
      data-status={status}
      className={join("basalt-callout", className)}
    >
      <Icon icon={CALLOUT_ICON[status]} size={16} className="basalt-callout-icon" />
      <div className="basalt-callout-body">
        <div className="basalt-callout-title">{title}</div>
        {children ? <div className="basalt-callout-text">{children}</div> : null}
        {actions ? <div className="basalt-callout-actions">{actions}</div> : null}
      </div>
    </div>
  );
}

// ---- Progress ----

export interface ProgressProps extends Omit<React.ComponentProps<typeof BaseProgress.Root>, "children"> {
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

// ---- Number ticker ----

export interface NumberTickerProps {
  value: number;
  /** Shown to everyone, including screen readers. Defaults to a grouped integer. */
  format?: (value: number) => string;
  /** Ease the visible digits toward `value`. The readable text is still the target, once. */
  glide?: boolean;
  className?: string;
}

const TICKER_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

function tickerText(value: number, format?: (value: number) => string) {
  return format ? format(value) : new Intl.NumberFormat("en-US").format(value);
}

/** Rolls each digit into place. Reduced motion snaps. The readable value is always in the text. */
export function NumberTicker({ value, format, glide = false, className }: NumberTickerProps) {
  if (glide) return <GlidingTicker value={value} format={format} className={className} />;
  return <TickerBody value={value} shown={value} format={format} className={className} />;
}

function GlidingTicker({ value, format, className }: Omit<NumberTickerProps, "glide">) {
  const eased = useGlide(value);
  return <TickerBody value={value} shown={Math.round(eased)} format={format} className={className} />;
}

function TickerBody({ value, shown, format, className }: NumberTickerProps & { shown: number }) {
  const text = tickerText(shown, format);
  const spoken = tickerText(value, format);
  return (
    <span className={join("basalt-ticker", className)}>
      <span className="basalt-visually-hidden">{spoken}</span>
      <span aria-hidden="true" className="basalt-ticker-visual">
        {Array.from(text).map((character, index) =>
          TICKER_DIGITS.includes(character) ? (
            <span key={`${index}-${text.length}`} className="basalt-ticker-digit" style={{ "--_d": TICKER_DIGITS.indexOf(character) } as React.CSSProperties}>
              <span className="basalt-ticker-strip">
                {TICKER_DIGITS.map((digit) => (
                  <span key={digit}>{digit}</span>
                ))}
              </span>
            </span>
          ) : (
            <span key={`${index}-mark`} className="basalt-ticker-char">
              {character}
            </span>
          ),
        )}
      </span>
    </span>
  );
}

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
  className?: string;
}

/** Code, commands or logs, in mono on a sunken surface, scrolling sideways rather than wrapping. */
export function CodeBlock({ code, language, title, copyable = true, className }: CodeBlockProps) {
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
  const tokens = React.useMemo(() => (status === "ready" ? highlightCode(code, language) : null), [code, language, status, loaded]);
  // Preserve the original whitespace, including CRLF and trailing newlines. Token offsets
  // locate spans in the source; source text is rendered by React, never injected as HTML.
  let cursor = 0;
  const content = tokens?.map((token, i) => {
    const gap = code.slice(cursor, token.offset);
    cursor = token.offset + token.content.length;
    return <React.Fragment key={i}>{gap}<span style={{ color: token.color }}>{token.content}</span></React.Fragment>;
  });
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
      <Button variant="ghost" size="sm" aria-label={copied ? "Copied" : "Copy code"} data-icon-only="" onClick={copy}>
        <MorphIcon name={copied ? "check" : "copy"} size={16} />
      </Button>
      <span className="basalt-visually-hidden" role="status">{copied ? "Copied" : ""}</span>
    </span>
  ) : null;
  return (
    <figure className={join("basalt-code", className)} data-titled={title ? "" : undefined}>
      {title ? (
        <figcaption className="basalt-code-title">
          <span>{title}</span>
          {copyButton}
        </figcaption>
      ) : null}
      {/* a scrollable region must be reachable by keyboard */}
      <pre className="basalt-code-pre" tabIndex={0} aria-label={title ? `${title} code` : "Code"}>
        <code data-language={language}>{tokens ? <>{content}{code.slice(cursor)}</> : code}</code>
      </pre>
      {title ? null : copyButton}
    </figure>
  );
}

// ---- Accordion ----

/** Sections that expand one at a time or several at once. For a page's secondary detail, not its main content. */
export function Accordion({ className, ...props }: React.ComponentProps<typeof BaseAccordion.Root>) {
  return <BaseAccordion.Root {...props} className={withClass("basalt-accordion", className)} />;
}

export interface AccordionItemProps extends Omit<React.ComponentProps<typeof BaseAccordion.Item>, "title"> {
  /** The always-visible header. */
  title: React.ReactNode;
  children: React.ReactNode;
}

export function AccordionItem({ title, children, className, ...props }: AccordionItemProps) {
  return (
    <BaseAccordion.Item {...props} className={withClass("basalt-accordion-item", className)}>
      <BaseAccordion.Header className="basalt-accordion-header">
        <BaseAccordion.Trigger className="basalt-accordion-trigger">
          <span>{title}</span>
          <Icon icon={CaretDownIcon} size={16} className="basalt-accordion-caret" />
        </BaseAccordion.Trigger>
      </BaseAccordion.Header>
      <BaseAccordion.Panel className="basalt-accordion-panel">
        <div className="basalt-accordion-content">{children}</div>
      </BaseAccordion.Panel>
    </BaseAccordion.Item>
  );
}

