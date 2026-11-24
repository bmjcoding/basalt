import { Button as BaseButton } from "@base-ui/react/button";
import * as React from "react";

import { CheckGlyph } from "./glyphs/check";
import { ControlIcon, useGlyphSlot } from "./control-icon";
import { changes, glyphOf } from "./control-seat";
import { Icon } from "./icon";
import { NewTabGlyph, NewTabWords, newTabRender, newTabWords } from "./new-tab";
import { Reserve } from "./reserve";
import { Spinner } from "./spinner";
import type { IconComponent, PartProps } from "./types";
import { withClass } from "./utils";
import { takeClick, useJoinedRef, usePressWait } from "./wait";

/** `outline` is transparent with an input-boundary edge and primary ink (DECISIONS 154, A7): a button beside the primary one that must not look like a second primary. */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type ControlSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";

type BaseProps = Omit<PartProps<"button">, "children"> & {
  /** Set to false when `render` produces something other than a native `<button>`, such as a link. */
  nativeButton?: boolean;
  /** Stay focusable while disabled, so a keyboard user can still reach it and read why. */
  focusableWhenDisabled?: boolean;
  /**
   * Control height: 24, 28, 32, 36, 40, 44, 48, 52 or 56px (xs to 5xl). md (32px) is the app default. 2xl and up are radius 8 and,
   * on a button with text, 600 (DECISIONS 154). Compact density steps each one down: 56 to 52, 52 to 48, 48 to 44, 44 to 40.
   */
  size?: ControlSize;
  /** The button is as wide as the space it is in, its label centred. Nothing else changes. */
  fullWidth?: boolean;
  /**
   * Shows the ring at once and ignores presses: the app's own busy flag, for work the button did not start. The label stays, so the width does
   * not jump. A press whose `onClick` returns a promise needs none of this: the button waits for it by itself (`waitForAnswer`). `loading` wins
   * over that wait: while it is set the ring shows at once.
   */
  loading?: boolean;
  /**
   * When `onClick` returns a promise, the button is busy until it settles (DECISIONS 260): further presses are ignored and the handler is never
   * called twice; it is `aria-busy`, keeps its focus, label and width; and the ring shows only once the wait has run 300ms, then stays at least
   * 400ms. A rejection ends the wait and is raised again, so say why in the app. A submit button waits for its `Form` the same way. On by
   * default; `false` calls the handler on every press.
   */
  waitForAnswer?: boolean;
  /**
   * The words a button rendered as a link with `target="_blank"` adds to its name, for translation. Default
   * "(opens in a new tab)". The arrow and the words come from the target alone; there is no prop for them.
   */
  newTabLabel?: string;
  /**
   * A ghost button that starts or ends a head, a bar, a band or a row (DECISIONS 336): what it shows (its glyph, or its words) goes on the
   * head's content line and its own box hangs into the head's padding, only as far as the head's `--basalt-edge-room` allows (none when the
   * head declares nothing). Its focus ring stays at +2 where the room keeps 4 and is drawn inside where it does not. Ghost only: with another
   * variant it does nothing (and warns once in development).
   */
  edge?: ButtonEdge;
};

/** The side of its head a ghost button is hung at. */
export type ButtonEdge = "start" | "end";

/**
 * A toggle: `pressed` writes `aria-pressed`. Only secondary and ghost buttons toggle (a latched primary would read as the
 * primary action, a latched danger as an error); on those two `pressed` is a type error.
 */
type Toggle = { variant?: "secondary" | "ghost"; pressed?: boolean } | { variant: "primary" | "danger" | "outline"; pressed?: never };

/**
 * Button's toggle, as `Toggle`, and a text toggle carries its glyph (DECISIONS 326): `pressed` needs `icon`, so the seat before the label is never empty. A caller that writes
 * `aria-pressed` itself, untyped, keeps the old seat (the check while pressed, empty while not) and is not warned.
 */
type ButtonToggle = { variant?: "secondary" | "ghost"; pressed: boolean; icon: IconComponent } | { variant?: ButtonVariant; pressed?: undefined; icon?: IconComponent };

export type ButtonProps = BaseProps &
  ButtonToggle & {
    /**
     * An icon before the label. On a toggle (`pressed`, which needs it) it is the toggle's glyph, shown at rest; pressed shows its selected form, or
     * the core check in the same seat where the glyph has none (an action glyph such as pause, a long-tail glyph not `fillSafe`). The two crossfade.
     */
    icon?: IconComponent;
    /** An icon after the label, e.g. a caret. A button that opens a new tab has no other trailing icon, so this is ignored there. */
    iconEnd?: IconComponent;
    /** `icon` is a long-tail glyph that keeps its silhouette when filled, so a pressed toggle may fill it. A core glyph needs no mark. */
    fillSafe?: boolean;
    /**
     * The "done" state of a button with `icon` and words: the words hold and the glyph is replaced by `doneIcon` (the core check), through the
     * same seat as `IconButton`'s `done`, so Copy and Check morph and any other pair crossfades over 100ms. Say what happened in a polite line
     * outside the button. Hold it for `CONFIRM_MS` (DECISIONS 336).
     */
    done?: boolean;
    /** The glyph shown while `done`. Default: the core check. */
    doneIcon?: IconComponent;
    /**
     * A quieter amount after the label ("Add to cart $49"), in tabular figures. It sits in a seat that holds the widest amount
     * named in `amountReserve`, so the label never moves when the amount changes. Put the amount in the button's name too (a
     * screen reader reads the amount with the label, in order).
     */
    amount?: React.ReactNode;
    /** Every other amount `amount` can take, so the seat is as wide as the widest. Name the widest; the rest are unseen. */
    amountReserve?: readonly React.ReactNode[];
    /**
     * A count in an outlined pill beside the label. The pill is `aria-hidden`: the button's name carries the count ("Cart, 3
     * items"). Its number is secondary at zero and primary above. It holds two tabular digits (0 to 99), so it does not move
     * while the count grows in that range.
     */
    count?: number;
    /**
     * A second line under the label, start-aligned, in secondary ink (13/18 over the label's 14/20), for a button that says where it goes and then
     * what it will do. In a container between `size-breakpoint-container-sm` and `size-breakpoint-container` wide the two share one line.
     * Give the container `container-type: inline-size`; with none, the button stays two lines. The note is part of the button's name.
     */
    note?: React.ReactNode;
    children: React.ReactNode;
  };

const iconSize = (size: ControlSize) => (size === "xl" ? 20 : 16);

declare const process: { env: { NODE_ENV?: string } };
let warnedBare = false;
let warnedEdge = false;

/** `data-edge` for a ghost button; any other variant gets none, and a development warning once. */
function edgeOf(edge: ButtonEdge | undefined, variant: ButtonVariant): ButtonEdge | undefined {
  if (edge === undefined) return undefined;
  if (variant === "ghost") return edge;
  if (process.env.NODE_ENV !== "production" && !warnedEdge) {
    warnedEdge = true;
    console.warn("Basalt Button: `edge` hangs a ghost button at its head's edge; with another variant it does nothing (DECISIONS 336)");
  }
  return undefined;
}

/** A button. Its label says what happens: "Deploy", not "OK". */
export function Button({ variant = "secondary", size = "md", fullWidth, edge, icon, iconEnd, fillSafe, done, doneIcon = CheckGlyph, pressed, amount, amountReserve, count, note, loading: loadingProp = false, waitForAnswer = true, disabled, onClick, className, children, newTabLabel, render, ref, ...props }: ButtonProps) {
  // A button rendered as a link that opens a new tab draws the arrow in its trailing slot and says so in its name.
  // A handler on the rendered element is taken into the press, so the wait guards it too.
  const [rendered, handler] = takeClick(render, onClick);
  const link = newTabRender(rendered);
  const toggles = (variant === "secondary" || variant === "ghost") && (pressed !== undefined || props["aria-pressed"] !== undefined);
  const isPressed = toggles && (pressed ?? (props["aria-pressed"] === true || props["aria-pressed"] === "true"));
  if (process.env.NODE_ENV !== "production" && toggles && pressed !== undefined && !icon && !warnedBare) {
    warnedBare = true;
    console.warn("Basalt Button: `pressed` needs `icon`, so the seat is never empty (DECISIONS 326)");
  }
  // A glyph with a selected form of its own (a core glyph that closes or fills, a long-tail one marked fillSafe) shows it; any other hands its seat to the check.
  const data = icon ? glyphOf(icon) : undefined;
  const own = data ? changes(data) : Boolean(fillSafe);
  const wait = usePressWait(handler, { loading: loadingProp, waitForAnswer, submits: props.type === "submit", form: props.form });
  const loading = wait.shown;
  return (
    <BaseButton
      {...props}
      ref={useJoinedRef(ref, wait.ref)}
      render={link.render}
      disabled={disabled}
      aria-disabled={disabled || wait.busy || props["aria-disabled"] || undefined}
      aria-busy={wait.busy ? true : props["aria-busy"]}
      data-busy={wait.busy || wait.shown ? "" : undefined}
      aria-pressed={toggles ? isPressed : undefined}
      data-loading={loading ? "" : undefined}
      data-variant={variant}
      data-size={size}
      data-full-width={fullWidth ? "" : undefined}
      data-edge={edgeOf(edge, variant)}
      data-done={icon && done ? "" : undefined}
      data-lines={note ? "" : undefined}
      className={withClass("basalt-button", className)}
      onClick={wait.press}
    >
      {icon && done !== undefined && !toggles ? <DoneSeat icon={icon} doneIcon={doneIcon} done={done} size={iconSize(size)} selected={false} fillSafe={fillSafe} /> : null}
      {icon && !(toggles && !own) && !(done !== undefined && !toggles) ? <ControlIcon icon={icon} size={iconSize(size)} selected={isPressed} fillSafe={fillSafe} eager={toggles} /> : null}
      {/* A text toggle's seat holds its glyph at rest and, pressed, the check where the glyph has no selected form; the two crossfade, so both states are one width. */}
      {toggles && icon && !own ? (
        <span className="basalt-button-check" data-glyph="" aria-hidden="true">
          <Icon icon={icon} size={iconSize(size)} />
          <Icon icon={CheckGlyph} size={iconSize(size)} />
        </span>
      ) : null}
      {/* Untyped (aria-pressed with no icon): the old seat, the check while pressed and empty while not. */}
      {toggles && !icon ? <span className="basalt-button-check" aria-hidden="true"><Icon icon={CheckGlyph} size={16} /></span> : null}
      {note ? (
        <span className="basalt-button-lines">
          <span className="basalt-button-label">
            {children}
            {link.newTab ? <NewTabWords label={newTabLabel} /> : null}
          </span>
          <span className="basalt-button-note">{note}</span>
        </span>
      ) : (
        <span className="basalt-button-label">
          {children}
          {link.newTab ? <NewTabWords label={newTabLabel} /> : null}
        </span>
      )}
      {amount !== undefined ? (
        <Reserve
          className="basalt-button-amount"
          show="now"
          alternatives={{ now: amount, ...Object.fromEntries((amountReserve ?? []).map((other, at) => [`reserve-${at}`, other])) }}
        />
      ) : null}
      {count !== undefined ? <span className="basalt-button-count" aria-hidden="true" data-zero={count === 0 ? "" : undefined}><span>{count}</span></span> : null}
      {link.newTab ? <NewTabGlyph size={iconSize(size)} /> : iconEnd ? <Icon icon={iconEnd} size={iconSize(size)} /> : null}
      {loading ? <span className="basalt-button-spinner" aria-hidden="true"><Spinner size={size === "xl" ? 20 : 16} /></span> : null}
    </BaseButton>
  );
}

export type IconButtonProps = BaseProps &
  Toggle & {
    icon: IconComponent;
    /**
     * The "done" state: the glyph is replaced by `doneIcon` (the core check) in the button's own ink. A core pair the morphs allow (Copy and
     * Check) morphs; any other pair crossfades over 100ms, which stays under reduced motion. No fill, no
     * plate and no change of name: say what happened in a polite line outside the button (a `StatusLine`). Hold it for `CONFIRM_MS`
     * with `useConfirm`. Both glyphs share one seat, so nothing moves.
     */
    done?: boolean;
    /** The glyph shown while `done`. Default: the core check. */
    doneIcon?: IconComponent;
    /** `icon` is a long-tail glyph that keeps its silhouette when filled, so a pressed toggle may fill it. A core glyph needs no mark. */
    fillSafe?: boolean;
    /** Required: an icon-only button has no visible text, so this is its name. Also shown as its tooltip by convention. For a button that opens a new tab, the words are added to it. */
    label: string;
  };

interface DoneSeatProps {
  icon: IconComponent;
  doneIcon: IconComponent;
  done: boolean;
  size: 16 | 20;
  selected: boolean;
  fillSafe?: boolean;
}

/**
 * The seat of `done`: rest and done share one cell of the glyph's size and swap by opacity (the stylesheet), so the button never changes. Both
 * glyphs stay mounted whatever they are, which is what lets the stylesheet's crossfade run for a pair the morphs do not allow (core and
 * long-tail, or any other). A pair they allow (Copy and Check) runs through the engine, whose frame is drawn over the cell, the glyphs out of sight.
 */
function DoneSeat({ icon, doneIcon, done, size, selected, fillSafe }: DoneSeatProps) {
  const [Morph, from] = useGlyphSlot(done ? { icon: doneIcon, selected: false } : { icon, selected }, Boolean(glyphOf(icon) && glyphOf(doneIcon)));
  return (
    <span className="basalt-button-swap" aria-hidden="true">
      <Icon icon={icon} size={size} selected={selected} fillSafe={fillSafe} />
      <Icon icon={doneIcon} size={size} />
      {Morph ? <Morph overlay icon={done ? doneIcon : icon} selected={done ? false : selected} size={size} from={from} /> : null}
    </span>
  );
}

/** A square button with only an icon. As a toggle it has no check: the plate, the ink step and the glyph's selected form say pressed. */
export function IconButton({ variant = "ghost", size = "md", fullWidth, edge, icon, done, doneIcon = CheckGlyph, fillSafe, pressed, label, loading: loadingProp = false, waitForAnswer = true, disabled, onClick, className, newTabLabel, render, ref, ...props }: IconButtonProps) {
  // A handler on the rendered element is taken into the press, so the wait guards it too.
  const [rendered, handler] = takeClick(render, onClick);
  const link = newTabRender(rendered);
  const toggles = (variant === "secondary" || variant === "ghost") && (pressed !== undefined || props["aria-pressed"] !== undefined);
  const isPressed = toggles && (pressed ?? (props["aria-pressed"] === true || props["aria-pressed"] === "true"));
  const wait = usePressWait(handler, { loading: loadingProp, waitForAnswer, submits: props.type === "submit", form: props.form });
  const loading = wait.shown;
  return (
    <BaseButton
      {...props}
      ref={useJoinedRef(ref, wait.ref)}
      render={link.render}
      disabled={disabled}
      aria-disabled={disabled || wait.busy || props["aria-disabled"] || undefined}
      aria-busy={wait.busy ? true : props["aria-busy"]}
      data-busy={wait.busy || wait.shown ? "" : undefined}
      aria-pressed={toggles ? isPressed : undefined}
      aria-label={link.newTab ? `${label}${newTabWords(newTabLabel)}` : label}
      data-loading={loading ? "" : undefined}
      data-variant={variant}
      data-size={size}
      data-icon-only=""
      data-full-width={fullWidth ? "" : undefined}
      data-edge={edgeOf(edge, variant)}
      data-done={done ? "" : undefined}
      className={withClass("basalt-button", className)}
      onClick={wait.press}
    >
      {done !== undefined ? (
        <DoneSeat icon={icon} doneIcon={doneIcon} done={done} size={iconSize(size)} selected={isPressed} fillSafe={fillSafe} />
      ) : (
        <ControlIcon icon={icon} size={iconSize(size)} selected={isPressed} fillSafe={fillSafe} eager={toggles} />
      )}
      {loading ? <span className="basalt-button-spinner" aria-hidden="true"><Spinner size={size === "xl" ? 20 : 16} /></span> : null}
    </BaseButton>
  );
}
