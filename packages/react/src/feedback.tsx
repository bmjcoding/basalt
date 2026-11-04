import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { Field as BaseField } from "@base-ui/react/field";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { Progress as BaseProgress } from "@base-ui/react/progress";
import { CaretDownIcon, CheckCircleIcon, CheckIcon, CopyIcon, InfoIcon, WarningCircleIcon, WarningIcon } from "@phosphor-icons/react";
import * as React from "react";

import { IconButton } from "./button";
import { Icon } from "./icon";
import { highlightCode } from "./syntax";
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
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner side={side} align={align} sideOffset={sideOffset} className="basalt-positioner">
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

// ---- Spinner ----

export interface SpinnerProps {
  size?: 16 | 20 | 24;
  /** What is loading, announced to screen readers. Omit when a visible label beside it already says so. */
  label?: string;
  className?: string;
}

/** Work in progress with no measurable end, for short waits. Prefer `Progress` when you know how far along it is. */
export function Spinner({ size = 16, label, className }: SpinnerProps) {
  return (
    <span role={label ? "status" : undefined} aria-label={label} aria-hidden={label ? undefined : true} className={join("basalt-spinner", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 16 16" width={size} height={size} fill="none">
        <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
        <path d="M8 1.75A6.25 6.25 0 0 1 14.25 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
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
  const tokens = React.useMemo(() => highlightCode(code, language), [code, language]);
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
      <IconButton icon={copied ? CheckIcon : CopyIcon} label={copied ? "Copied" : "Copy code"} size="sm" onClick={copy} />
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

