import type * as React from "react";

import type { PartClassName, PartState, PartStyle } from "./types";

/**
 * Basalt's class first, then the caller's, keeping Base UI's state-function form so
 * callers can still style by state. The state is whatever the primitive passes.
 */
// The state type belongs to whichever primitive the class lands on, so it is `any` here.
export function withClass(base: string, className: PartClassName): string | ((state: any) => string) {
  if (typeof className === "function") return (state: any) => join(base, className(state as PartState));
  return join(base, className);
}

export function join(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function withStyle(base: React.CSSProperties, style?: PartStyle): React.CSSProperties | ((state: any) => React.CSSProperties) {
  return typeof style === "function" ? (state: any) => ({ ...base, ...style(state as PartState) }) : { ...base, ...style };
}

/** A destination Basalt itself may send the page to: relative, http, https or mailto, read the way the browser reads it. javascript:, data: and the rest are refused. */
export function safeHref(href: string): boolean {
  try {
    return /^(https?|mailto):$/.test(new URL(href, typeof location === "undefined" ? "https://basalt.invalid/" : location.href).protocol);
  } catch {
    return false;
  }
}
