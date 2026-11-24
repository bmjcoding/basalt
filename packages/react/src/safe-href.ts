/** A destination Basalt itself may send the page to: relative, http, https or mailto, read the way the browser reads it. javascript:, data: and the rest are refused. */
export function safeHref(href: string): boolean {
  try {
    return /^(https?|mailto):$/.test(new URL(href, typeof location === "undefined" ? "https://basalt.invalid/" : location.href).protocol);
  } catch {
    return false;
  }
}
