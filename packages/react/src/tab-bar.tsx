import * as React from "react";

import { ControlIcon } from "./control-icon";
import { MoreNavGlyph } from "./glyphs/more-nav";
import { CloseGlyph } from "./glyphs/close";
import { IconButton } from "./button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "./overlays";
import { Nav } from "./nav";
import type { IconComponent } from "./types";
import { useKeysMark } from "./use-media";
import { join } from "./utils";

// The phone tab bar (decisions 96): the destinations of an app under 720, always glyph over label. It is navigation, so a
// `nav` of links with `aria-current="page"`, never a tablist. Solid `surface-page` with a hairline on top: the header is the
// one smoked surface, and nothing translucent sits under the thumb.

export interface TabBarProps extends Omit<React.ComponentProps<"nav">, "aria-label" | "aria-labelledby"> {
  /** The landmark's name. Default "Primary". */
  "aria-label"?: string;
  /** Three to five `TabBarItem`s; with more than five destinations, four of them and then a `TabBarMore` holding the rest. */
  children: React.ReactNode;
}

/**
 * The phone tab bar: fixed to the bottom under 720, 56px with its hairline inside plus the bottom safe area, and the side
 * insets in landscape. Not shown from 720 up or in print. Content pads past it by the bar, the inset and `space-6`, and
 * toasts sit above it, when it is a child of `AppShell` (`tabBar`).
 */
export function TabBar({ "aria-label": label = "Primary", className, children, ref, ...props }: TabBarProps) {
  const node = React.useRef<HTMLElement | null>(null);
  useKeysMark(node);
  const setRef = React.useCallback(
    (element: HTMLElement | null) => {
      node.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = element;
    },
    [ref],
  );
  return (
    <nav {...props} ref={setRef} aria-label={label} className={join("basalt-tabbar", className)}>
      <ul className="basalt-tabbar-list">{children}</ul>
    </nav>
  );
}

export interface TabBarItemProps extends Omit<React.ComponentProps<"a">, "children"> {
  /** The destination's glyph: a core glyph, drawn at 24 and in its selected form when it is the current page. */
  icon: IconComponent;
  /** The label, drawn at 12/16 under the glyph. One word where it can be. */
  children: string;
  /** This destination is the current page: `aria-current="page"`, the selected glyph and a 600 label, with no wash, pill or bar. */
  current?: boolean;
  /** Something new here: a 6px dot in the label's ink at the glyph's top end. These words are spoken with the name ("New activity"). Counts are spoken, never drawn. */
  dot?: string;
}

/** The cell's glyph, label and dot, shared by a link and by More. */
function Cell({ icon, label, current, dot }: { icon: IconComponent; label: string; current: boolean; dot?: string }) {
  return (
    <>
      <span className="basalt-tabbar-glyph">
        <ControlIcon icon={icon} size={24} selected={current} eager={current} />
        {dot ? <span className="basalt-tabbar-dot" aria-hidden="true" /> : null}
      </span>
      <span className="basalt-tabbar-label" data-label={label}>{label}</span>
    </>
  );
}

/** One destination: a link that fills its cell. */
export function TabBarItem({ icon, children, current = false, dot, className, ...props }: TabBarItemProps) {
  return (
    <li className="basalt-tabbar-entry">
      <a {...props} aria-current={current ? "page" : props["aria-current"]} className={join("basalt-tabbar-item", className)}>
        <Cell icon={icon} label={children} current={current} dot={dot} />
        {dot ? <span className="basalt-visually-hidden">, {dot}</span> : null}
      </a>
    </li>
  );
}

export interface TabBarMoreProps {
  /** The cell's glyph. Default: the core set's More. */
  icon?: IconComponent;
  /** The cell's label and the sheet's title. Default "More". */
  label?: string;
  /** The label of the page under More that is current, if one is: More then takes the current look, and its name says which. */
  current?: string;
  /** Something new under More, drawn as the cell's dot. */
  dot?: string;
  /** The destinations that did not fit: `NavItem`s, drawn as `Nav` rows in the bottom sheet. */
  children: React.ReactNode;
}

/** The last cell when there are more than five destinations: a button that opens the rest in a bottom `Sheet`. */
export function TabBarMore({ icon = MoreNavGlyph, label = "More", current, dot, children }: TabBarMoreProps) {
  const [open, setOpen] = React.useState(false);
  const name = current ? `${label}, ${current}, current page` : label;
  return (
    <li className="basalt-tabbar-entry">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger aria-label={name} data-current={current ? "" : undefined} className="basalt-tabbar-item basalt-tabbar-more">
          <Cell icon={icon} label={label} current={Boolean(current)} dot={dot} />
          {dot ? <span className="basalt-visually-hidden">, {dot}</span> : null}
        </SheetTrigger>
        <SheetContent side="bottom" className="basalt-tabbar-sheet">
          <div className="basalt-tabbar-sheet-head">
            <SheetTitle>{label}</SheetTitle>
            <SheetClose render={<IconButton icon={CloseGlyph} label={`Close ${label.toLowerCase()}`} />} />
          </div>
          <Nav aria-label={label} onClick={(event) => { if ((event.target as Element).closest("a")) setOpen(false); }}>{children}</Nav>
        </SheetContent>
      </Sheet>
    </li>
  );
}
