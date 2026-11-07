// A shortcut written as "⌘K", "Ctrl+K" or "⇧⌘P", read three ways: the keys to draw as chips, the words
// a screen reader says ("Command K"), and the ARIA shortcut syntax ("Meta+K"). Plain functions, so a
// menu row can describe its shortcut without loading the chips.

const SPOKEN: Record<string, string> = {
  "⌘": "Command", "⌥": "Option", "⌃": "Control", "⇧": "Shift", "↵": "Return", "⌫": "Delete", "⇥": "Tab",
  "←": "Left arrow", "↑": "Up arrow", "→": "Right arrow", "↓": "Down arrow", "Esc": "Escape",
};

const ARIA: Record<string, string> = {
  "⌘": "Meta", "⌥": "Alt", "⌃": "Control", "⇧": "Shift", "↵": "Enter", "⌫": "Backspace", "⇥": "Tab",
  "←": "ArrowLeft", "↑": "ArrowUp", "→": "ArrowRight", "↓": "ArrowDown", "Esc": "Escape",
  "Cmd": "Meta", "Command": "Meta", "Ctrl": "Control", "Option": "Alt", "Opt": "Alt", "Return": "Enter", "Del": "Delete",
};

/** "⌘K" becomes ["⌘", "K"]; "Ctrl+K" becomes ["Ctrl", "K"]; a word such as "Esc" or "F12" is one key. */
export function shortcutKeys(shortcut: string): string[] {
  return shortcut
    .split(/[\s+]+/)
    .filter(Boolean)
    .flatMap((piece) => (piece.length > 1 && /^[A-Za-z0-9]+$/.test(piece) ? [piece === "Escape" ? "Esc" : piece] : Array.from(piece)));
}

/** The words a screen reader says: "Command K". */
export function spokenShortcut(keys: readonly string[]): string {
  return keys.map((key) => SPOKEN[key] ?? key).join(" ");
}

/** The value of `aria-keyshortcuts`: "Meta+K". */
export function ariaShortcut(keys: readonly string[]): string {
  return keys.map((key) => ARIA[key] ?? (key.length === 1 ? key.toUpperCase() : key)).join("+");
}
