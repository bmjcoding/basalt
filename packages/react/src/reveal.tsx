// Show all / show fewer (DECISIONS 152, D6): a button that opens the rest of a long list in place. The rest is a grid row going `0fr`
// to `1fr` over `duration-slow` on `ease-out`, and back at 0.75× on `ease-in`; it is `inert` and hidden while closed, and
// under reduced motion it is simply there. The clip keeps `space-2` of room beside the rows so a ring is whole, and lets go once
// the transition has ended (the transition's own end, not a timer): from then nothing clips.
//
// `Reveal` is the generic part. `DirectoryList` shares the same machinery through `useReveal` so its rest stays in its one list.
import * as React from "react";

import { Button } from "./button";
import { join } from "./utils";

export interface RevealOptions {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** A transition longer than zero will run, so the end of it is worth waiting for. */
const animates = (el: Element) => {
  const first = getComputedStyle(el).transitionDuration.split(",")[0]?.trim() ?? "0s";
  return Number.parseFloat(first) * (first.endsWith("ms") ? 1 : 1000) > 0;
};

/**
 * The state behind a reveal: open, and settled (open and done opening, so nothing clips and a ring is whole). The root element
 * carries `data-reveal`, `data-open` and `data-settled`; the clips inside it read them.
 */
export function useReveal({ open: controlled, defaultOpen = false, onOpenChange }: RevealOptions) {
  const [inner, setInner] = React.useState(defaultOpen);
  const open = controlled ?? inner;
  const [settled, setSettled] = React.useState(open);
  const root = React.useRef<HTMLDivElement>(null);
  const button = React.useRef<HTMLButtonElement>(null);
  // Set when a keyboard opened it: focus goes on to the first new row, once the clip has let go and its ring is whole (vote 5).
  const focusOnSettle = React.useRef(false);
  const first = React.useRef(true);
  const id = React.useId();

  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = root.current;
    if (!open) { setSettled(false); focusOnSettle.current = false; return; }
    const clip = el?.querySelector("[data-reveal-clip]")?.parentElement;
    if (!el || !clip || !animates(clip)) { setSettled(true); return; }
    const end = (event: Event) => { if ((event as TransitionEvent).propertyName === "grid-template-rows") setSettled(true); };
    el.addEventListener("transitionend", end);
    el.addEventListener("transitioncancel", end);
    return () => { el.removeEventListener("transitionend", end); el.removeEventListener("transitioncancel", end); };
  }, [open]);

  React.useEffect(() => {
    if (!settled || !focusOnSettle.current) return;
    focusOnSettle.current = false;
    root.current?.querySelector<HTMLElement>("[data-reveal-clip] :is(a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1']))")?.focus();
  }, [settled]);

  const toggle = (event: React.MouseEvent) => {
    const next = !open;
    // A click that came from the keyboard (Enter, Space) has no pointer position: its detail is 0.
    focusOnSettle.current = next && event.detail === 0;
    if (controlled === undefined) setInner(next);
    onOpenChange?.(next);
  };

  return {
    open,
    settled,
    id,
    toggle,
    button,
    root,
    rootProps: { "data-reveal": "", "data-open": open ? "" : undefined, "data-settled": settled ? "" : undefined } as const,
  };
}

export interface RevealButtonProps {
  open: boolean;
  controls: string;
  onToggle: (event: React.MouseEvent) => void;
  showLabel: React.ReactNode;
  hideLabel: React.ReactNode;
  buttonRef?: React.Ref<HTMLButtonElement>;
}

/** The button, on its own row under a rule. */
export function RevealFoot({ open, controls, onToggle, showLabel, hideLabel, buttonRef }: RevealButtonProps) {
  return (
    <div className="basalt-reveal-foot">
      <Button ref={buttonRef} variant="secondary" size="lg" aria-expanded={open} aria-controls={controls} onClick={onToggle}>
        {open ? hideLabel : showLabel}
      </Button>
    </div>
  );
}

export interface RevealProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** What is always shown. */
  children?: React.ReactNode;
  /** The rest, which opens in place under `children` and above the button. */
  rest: React.ReactNode;
  /** The button's words while closed, in the app's language: "Show all 30". The part does not count. */
  showLabel: React.ReactNode;
  /** The button's words while open: "Show fewer". */
  hideLabel: React.ReactNode;
  /** Controlled. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Opens the rest of a long list in place, from a button under it. The button is `aria-expanded` and `aria-controls` the rest. A
 * keyboard open (Enter, Space) moves focus to the first new row once the clip has let go; a pointer open leaves focus on the
 * button. Everything under it moves down when it opens, which is what the press asked for.
 */
export function Reveal({ children, rest, showLabel, hideLabel, open: controlled, defaultOpen, onOpenChange, className, ...props }: RevealProps) {
  const reveal = useReveal({ open: controlled, defaultOpen, onOpenChange });
  return (
    <div {...props} {...reveal.rootProps} ref={reveal.root} className={join("basalt-reveal", className)}>
      {children}
      <div className="basalt-reveal-panel" id={reveal.id} inert={!reveal.open}>
        <div className="basalt-reveal-clip" data-reveal-clip="">{rest}</div>
      </div>
      <RevealFoot open={reveal.open} controls={reveal.id} onToggle={reveal.toggle} showLabel={showLabel} hideLabel={hideLabel} buttonRef={reveal.button} />
    </div>
  );
}
