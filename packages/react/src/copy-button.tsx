// A copy button with words (DECISIONS 152, X8): a `Button` that copies a string, reads "Copy …", then "Copied", with a spoken status.
// Both words stand in one grid cell (`Reserve`), so the button never changes width. It says "Copied" only after the write succeeded.
import * as React from "react";

import { Button } from "./button";
import type { ButtonVariant, ControlSize } from "./button";
import { COPIED_MS } from "./constants";
import { Reserve } from "./reserve";
import { join } from "./utils";

export interface CopyButtonProps extends Omit<React.ComponentProps<"button">, "children" | "onClick" | "type" | "color"> {
  /** What is copied. */
  text: string;
  /** The words at rest, in the app's language: "Copy address". Default "Copy". */
  children?: React.ReactNode;
  /** The words after the copy: default "Copied". */
  copiedLabel?: React.ReactNode;
  /** What a screen reader is told after the copy, in a status the page already has: "Address copied". Default "Copied to clipboard". */
  statusLabel?: string;
  variant?: ButtonVariant;
  size?: ControlSize;
  /** Called after the write has succeeded. */
  onCopy?: () => void;
}

/**
 * A button that copies `text` and says so. A refused or missing clipboard leaves the button as it was. A second press while it says
 * "Copied" starts the time again. Of any variant and size: the app chooses (secondary and large, or primary).
 */
export function CopyButton({ text, children = "Copy", copiedLabel = "Copied", statusLabel = "Copied to clipboard", variant = "secondary", size = "md", onCopy, className, ...props }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard refused (an insecure context or no permission): leave the button as it was
      return;
    }
    setCopied(true);
    onCopy?.();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };
  return (
    <>
      <Button {...props} variant={variant} size={size} className={join("basalt-copy-button", className)} onClick={copy}>
        <Reserve className="basalt-copy-words" show={copied ? "copied" : "rest"} alternatives={{ rest: children, copied: copiedLabel }} />
      </Button>
      <span className="basalt-visually-hidden" role="status">{copied ? statusLabel : ""}</span>
    </>
  );
}
