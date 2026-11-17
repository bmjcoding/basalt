import * as React from "react";

import { Select } from "./choice";
import { join } from "./utils";

export interface LinkTabsProps extends Omit<React.ComponentProps<"nav">, "aria-label"> {
  /** Names the navigation ("What it is"). Required: a page can hold several. The `Select` under 720px wide has the same name. */
  "aria-label": string;
  /** The height of a tab: `lg` (36px), `3xl` (48px) or `5xl` (56px). Same sizes and type as `Tabs`. Default `lg`. */
  size?: "lg" | "3xl" | "5xl";
  /**
   * Called with a link's `href` when the `Select` under 720px wide chooses it, in place of the default, which is `window.location.assign(href)`. Give it
   * to navigate with an app's router. Focus is never moved: it stays on the `Select`. The row's own links are ordinary links and need no callback.
   */
  onNavigate?: (href: string) => void;
  /**
   * The words before the current page's name in the `Select` under 720 ("Go to"), so a reader is told before choosing that choosing goes there: WCAG 3.2.2's
   * exception for a change of context a user has been advised of. They are in the Select's visible label and its accessible name (WCAG 2.5.3), which reads
   * "Go to Everything". Translate or replace them here. Default "Go to".
   */
  goToLabel?: string;
  children: React.ReactNode;
}

/**
 * The Select's size for each row size: Castle's 44 (`2xl`) for Castle's own 48 row (`3xl`; Castle's kind Select is 44 on every pointer), the row's own 36 (`lg`)
 * for the 36 row, and 48 (`3xl`, the bar's narrow-container height) for the 56 row. What is below the component moves across 720 by the row's height less the
 * Select's: 0 at 36, 4px at 48, 8px at 56 (0 where the 56 row is already 48, in a container under 640). A 36 Select is 44 on a coarse pointer, as Basalt's is.
 */
const SELECT_SIZE = { lg: "lg", "3xl": "2xl", "5xl": "3xl" } as const;

/** The part of a `LinkTab` element the `Select` needs: where it goes, what it says, and whether it is the page you are on. */
function linkOf(child: React.ReactNode) {
  if (!React.isValidElement<LinkTabProps>(child)) return null;
  const { href, current, children, render } = child.props;
  const own = render?.props as { href?: unknown; to?: unknown } | undefined;
  const target = href ?? (typeof own?.href === "string" ? own.href : typeof own?.to === "string" ? own.to : undefined);
  return target === undefined ? null : { value: target, label: children, current: Boolean(current) };
}

/**
 * Tabs that are links (DECISIONS 154, D12): a `nav` holding a list of links, one of them current, on a hairline. Each link goes to a page, so
 * this is not a `tablist`: no roving focus and no panels, every link is a tab stop and the current one is `aria-current="page"`. The current
 * link has a 2px underline that does not slide (the links are routes; the list is drawn again with each page).
 *
 * Under 720px wide the row is replaced by a `Select` of the same links (A15, 3 to 1: Castle's form). Both are in the markup the server sends, and
 * CSS alone picks between them at `size-breakpoint-md`, so nothing moves or flashes on load; the one that is not shown is `display: none`, so it is
 * out of the accessibility tree and the Tab order. The `Select` navigates at once and says so first (DECISIONS 158, Q2, 3 to 1: WCAG 3.2.2's exception
 * for a change a user has been advised of): a "Go to" label (`goToLabel`) before the current page's name, in its visible label and its accessible name.
 * Only a choice from the open list (a click, or Enter on the highlighted option) navigates; no key on the closed `Select` does, a typed letter included. The
 * value is the current link's `href` and always agrees with the row's `aria-current`. Navigating is `onNavigate`, else `window.location.assign`: with
 * `onNavigate` routing in place focus stays on the `Select`; on the default a new page loads and focus starts over there.
 */
export function LinkTabs({ size = "lg", onNavigate, goToLabel = "Go to", className, children, "aria-label": label, ...props }: LinkTabsProps) {
  const links = React.Children.toArray(children).map(linkOf).filter((link): link is NonNullable<typeof link> => link !== null);
  const current = links.find((link) => link.current);
  return (
    <nav {...props} aria-label={label} data-size={size === "lg" ? undefined : size} className={join("basalt-link-tabs", className)}>
      <ul>{children}</ul>
      <div className="basalt-link-tabs-select">
        <Select
          valuePrefix={goToLabel}
          controlSize={SELECT_SIZE[size]}
          options={links.map(({ value, label: words }) => ({ value, label: words }))}
          value={current?.value ?? null}
          onValueChange={(value, details) => {
            // Only a real choice goes anywhere: a click on an option or Enter on the highlighted one (reason "item-press"). A letter typed on the closed Select
            // also changes Base UI's value (reason "none") and would navigate at once, so it is held: the value stays the current page's.
            if (details.reason !== "item-press") return;
            if (value === null || value === current?.value) return;
            if (onNavigate) onNavigate(value);
            else window.location.assign(value);
          }}
        />
      </div>
    </nav>
  );
}

export interface LinkTabProps extends Omit<React.ComponentProps<"a">, "aria-current"> {
  /** This link is the page the person is on: `aria-current="page"` and the underline. */
  current?: boolean;
  /** Draw the link with an element of your own (a router's link): it receives the link's props and its content. */
  render?: React.ReactElement<Record<string, unknown>>;
}

/** One link of a `LinkTabs`. The first one has no padding at its start, so its label sits on the content's edge. */
export function LinkTab({ current = false, render, className, children, ...props }: LinkTabProps) {
  const content = (
    <>
      <span className="basalt-link-tab-label">{children}</span>
      <span className="basalt-link-tab-line" aria-hidden="true" />
    </>
  );
  const linkProps = { ...props, "aria-current": current ? ("page" as const) : undefined, className: join("basalt-link-tab", className) };
  return <li>{render ? React.cloneElement(render, linkProps, content) : <a {...linkProps}>{content}</a>}</li>;
}
