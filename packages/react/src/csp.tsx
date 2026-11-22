import { CSPProvider as BaseCSPProvider } from "@base-ui/react/csp-provider";
import * as React from "react";

// A page under a content policy (DECISIONS 265, batch B0). Base UI writes one inline `<style>` (`.base-ui-disable-scrollbar`, with a Select's popup and a scroll area) and,
// in a server render, a small inline `<script>` for a few parts; a policy of `style-src 'self'` or `script-src 'self'` refuses both. This is Base UI's own provider
// with Basalt's types: give it the page's `nonce`, or turn the style elements off and let Basalt's stylesheet draw the class (components.css, "Base UI's one inline
// style"), with the same result on screen.

export interface CSPProviderProps {
  children?: React.ReactNode;
  /** The policy's nonce for this response, written on every inline `<style>` and `<script>` Base UI renders. */
  nonce?: string;
  /**
   * Render none of Base UI's inline `<style>` elements. What the one it writes draws (a hidden scrollbar on `.base-ui-disable-scrollbar`) is in Basalt's stylesheet,
   * in `@layer basalt`, so nothing on screen changes. Off by default.
   */
  disableStyleElements?: boolean;
}

/**
 * Base UI's content-policy settings for everything inside it. Put it once around the app, inside any theme or layer providers: `<CSPProvider disableStyleElements>`
 * for `style-src 'self'`, or `<CSPProvider nonce={nonce}>` when the policy carries a nonce. It draws nothing of its own.
 */
export function CSPProvider({ children, nonce, disableStyleElements }: CSPProviderProps) {
  return <BaseCSPProvider nonce={nonce} disableStyleElements={disableStyleElements}>{children}</BaseCSPProvider>;
}
