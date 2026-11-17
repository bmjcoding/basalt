// How every render and browser test of this repository launches Chromium, so the pixels do not depend on what is plugged in.
//
// On macOS, Chromium takes its scrollbar style from the system's "Show scroll bars" setting, and on Automatic that setting follows the
// mouse: undocked, overlay scrollbars that take no room; with a mouse connected, classic ones that take 15px, so a page with
// `scrollbar-gutter: stable` draws 7.5px to one side of where it was drawn undocked (found 14 Nov 2026, when one round was rendered
// docked and its base undocked). Headless Chromium's own `--hide-scrollbars` hides the bars but does not stop them taking room.
// Blink's `forceAndroidOverlayScrollbar` setting does: it makes every scrollbar an overlay one, whatever the system says (proved on
// macOS with the setting on Always, Automatic with a mouse and Automatic without one: the same pixels in all three).
//
// The second flag is for stills. Chromium repaints a changed region of a tile over the tile's old pixels (partial raster), so a rounded corner that
// is translucent (a key chip, a button's rim, a list's edge) comes out 1 to 3 levels different depending on whether it was painted once or twice before the
// shot, and that depends on timing: the same page, 30 shots under load, gave two images (4 pixels apart) until `--disable-partial-raster` made it 50 of 50
// the same. The cost is that a changed tile is drawn whole, which a still does not notice.
//
// A test of classic scrollbars (it launches with `ignoreDefaultArgs: ["--hide-scrollbars"]` to see them) does not use this.
export const OVERLAY_SCROLLBARS = "--blink-settings=forceAndroidOverlayScrollbar=true";
export const FULL_RASTER = "--disable-partial-raster";

/** Launch options for `chromium.launch(...)`: the given ones, with overlay scrollbars forced and full raster. */
export function launchOptions(options = {}) {
  return { ...options, args: [OVERLAY_SCROLLBARS, FULL_RASTER, ...(options.args ?? [])] };
}
