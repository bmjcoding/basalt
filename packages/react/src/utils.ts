/** A Base UI className: a string, or a function of the component's state. */
export type ClassName<State> = string | ((state: State) => string | undefined) | undefined;

/**
 * Basalt's class first, then the caller's, keeping Base UI's state-function form so
 * callers can still style by state.
 */
export function withClass<State>(base: string, className: ClassName<State>): string | ((state: State) => string) {
  if (typeof className === "function") return (state: State) => join(base, className(state));
  return join(base, className);
}

export function join(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
