import { durationConfirm } from "@srasyndicate/basalt-tokens/durations";

// The numbers and words a package consumer reads: plain values, no component and no hook, in a module of its own that carries no `"use client"`,
// so a React Server Component can read them (a value exported from a client module is a reference there, and arithmetic on it is NaN).

/**
 * How long a confirmation holds before it returns to rest, in milliseconds: the `duration-confirm` token, read from the tokens package, never
 * written again here. A hold is not an animation, so reduced motion does not change it. The copy buttons and `IconButton`'s `done` state
 * share it (DECISIONS 154, D11c).
 */
export const CONFIRM_MS: number = durationConfirm;

/** How long "Copied" stays, in milliseconds: the same as `CodeBlock` and `Terminal` (DECISIONS 152, vote 6), so the same token as `CONFIRM_MS`. */
export const COPIED_MS: number = CONFIRM_MS;

/** How long a message the app has also written to its log stays: the toast's own timer. */
export const STATUS_MESSAGE_MS = 5000;

/** Past this many items that would move on screen, a change lands at once. A chosen limit, not a measured budget. */
export const REFLOW_BOUND = 48;

/** The loops toggle's fixed name, in every form and in every state: it is the toggle's name, and "pressed" says it is on. */
export const LOOPS_TOGGLE_NAME = "Pause animations";

/** The settings row's description. */
export const LOOPS_TOGGLE_DESCRIPTION = "Moving art and spinners hold still. Your work keeps running.";
