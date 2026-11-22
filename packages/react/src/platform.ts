// Which key is a shortcut's modifier on this machine (DECISIONS 244): Command on Apple's systems (macOS, and iPadOS or iOS with a keyboard),
// Control on Windows, Linux and ChromeOS. One place decides it, so the chips a person sees ("Mod+Enter" drawn as ⌘↵ or Ctrl Enter), the
// `aria-keyshortcuts` and the key an app listens for always agree. Plain functions with no React and nothing run at import, so a Server
// Component may load them (on the server there is no machine to ask, and the answer is "not Apple's").

/**
 * Whether this machine is Apple's, so its shortcut modifier is Command. Reads `navigator.userAgentData.platform` where the browser has it (Chromium),
 * else `navigator.platform`, else the user agent string. False where there is no `navigator` (a server).
 */
export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  return /mac|iphone|ipad|ipod/i.test(data?.platform || navigator.platform || navigator.userAgent);
}

/**
 * Whether the shortcut modifier was held, and only it: Command on Apple's systems, Control elsewhere, with no stray key of the other kind.
 * Bind with it, and write the shortcut as "Mod+K", so the hint and the binding cannot disagree. Test Shift, Alt and the key yourself.
 */
export function isModKey(event: { metaKey: boolean; ctrlKey: boolean }): boolean {
  return isApplePlatform() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
}
