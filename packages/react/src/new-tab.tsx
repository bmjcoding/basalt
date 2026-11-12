// The new-tab cue (DECISIONS 95). The arrow means "this opens in a new tab" and nothing else, so it comes from the one
// attribute that causes the behaviour (`target="_blank"`) and is never a prop. Link and Button share it.
import * as React from "react";

import { ExternalGlyph } from "./glyphs/external";
import { Icon } from "./icon";
import type { IconSize } from "./icon";

/** The words a new-tab link or button adds to its name, in the app's language when `newTabLabel` says so. */
export const NEW_TAB_LABEL = "(opens in a new tab)";

/** True when the target makes a new browsing context. */
export const opensNewTab = (target: string | null | undefined) => target === "_blank";

/** The words, spoken after the visible label: " (opens in a new tab)". */
export const newTabWords = (label: string | undefined) => ` ${label?.trim() || NEW_TAB_LABEL}`;

/** True when a link's children hold any text a reader sees. A link that holds only a logo has none. */
export function hasVisibleText(node: React.ReactNode): boolean {
  if (typeof node === "string") return node.trim() !== "";
  if (typeof node === "number") return true;
  if (Array.isArray(node)) return node.some(hasVisibleText);
  if (React.isValidElement(node)) {
    const type = node.type;
    if (type === "img" || type === "svg" || type === "picture" || type === "canvas") return false;
    return hasVisibleText((node.props as { children?: React.ReactNode }).children);
  }
  return false;
}

/**
 * The arrow: the core `external` glyph, after the label, never underlined. In running text it adds no space of its own:
 * the glyph's side bearing is the gap, a word joiner (U+2060) keeps it with the last word, and `nowrap` keeps it whole, so
 * it never starts a line alone.
 */
export function NewTabGlyph({ size = 16 }: { size?: IconSize }) {
  return (
    <span className="basalt-external" aria-hidden="true">
      {"\u2060"}
      <Icon icon={ExternalGlyph} size={size} />
    </span>
  );
}

/** The spoken half of the cue: visually hidden, inside the link, after the label. */
export function NewTabWords({ label }: { label?: string }) {
  return <span className="basalt-visually-hidden">{newTabWords(label)}</span>;
}

/**
 * What a Button rendered as a link needs: whether its target opens a new tab, and the element to render with the safe `rel`
 * Link adds. A function `render` can't be read, so it counts as same-tab.
 */
export function newTabRender<R>(render: R): { newTab: boolean; render: R } {
  if (!React.isValidElement(render)) return { newTab: false, render };
  const props = render.props as { target?: string; rel?: string };
  if (!opensNewTab(props.target)) return { newTab: false, render };
  const rel = [...new Set([...(props.rel?.split(/\s+/).filter(Boolean) ?? []), "noopener", "noreferrer"])].join(" ");
  return { newTab: true, render: React.cloneElement(render, { rel } as object) as R };
}
