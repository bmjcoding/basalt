import * as React from "react";

/**
 * Basalt's mark on the hidden form input of its own controls. Base UI renders one beside each Checkbox, Switch, Radio, Select, Combobox
 * and NumberField (aria-hidden, tabindex -1, `position: fixed` in an inline style), and Chrome gives every fixed element a layer of its own:
 * 47% of the time to tick a row of a 1,000-row table with a checkbox in each row (88% at 5,000). The stylesheet makes an input that carries
 * this attribute `position: absolute` at its place in the flow, which is as invisible and is not a layer (`.basalt-` rule "mirror input").
 *
 * The mark is set through the `inputRef` Base UI gives for that input, so it is on the one element Basalt's own control rendered and on no
 * other: an input a foreign component renders beside the control (through `render`), the focus guards an open Select inserts, the
 * `uncheckedValue` input and the Slider's range input carry no mark and stay where their owner put them. A ref runs on the client, so a page
 * rendered on the server keeps Base UI's styles until it hydrates; the two draw the same pixels.
 */
export const MIRROR_ATTRIBUTE = "data-basalt-mirror";

/** The ref for a control whose `inputRef` is Basalt's alone: marks the input. */
export function markMirror(input: HTMLInputElement | null): void {
  input?.setAttribute(MIRROR_ATTRIBUTE, "");
}

/**
 * A ref for Base UI's `inputRef` that marks the input and then hands it to the app's own `inputRef`, if it gave one. It is stable while the
 * app's ref is, so Base UI does not detach and attach its own refs on every render.
 */
export function useMirrorRef(inputRef: React.Ref<HTMLInputElement> | undefined): React.RefCallback<HTMLInputElement> {
  return React.useCallback(
    (input: HTMLInputElement | null) => {
      markMirror(input);
      if (typeof inputRef === "function") inputRef(input);
      else if (inputRef) (inputRef as React.RefObject<HTMLInputElement | null>).current = input;
    },
    [inputRef],
  );
}
