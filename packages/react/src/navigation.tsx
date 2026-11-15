import { CaretLeftIcon } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { DotsThreeIcon } from "@phosphor-icons/react/dist/csr/DotsThree";
import * as React from "react";

import { Button } from "./button";
import { Icon } from "./icon";
import { NewTabGlyph, NewTabWords, hasVisibleText, newTabWords, opensNewTab } from "./new-tab";
import { join } from "./utils";

export interface LinkProps extends React.ComponentProps<"a"> {
  /**
   * The words a link that opens a new tab adds to its name, for translation. Default "(opens in a new tab)". There is no
   * prop for the arrow: it, and these words, come from `target="_blank"` and nothing else.
   */
  newTabLabel?: string;
}

/**
 * A link. A link with `target="_blank"` also draws the new-tab arrow after its label and says "(opens in a new tab)" in its
 * name: automatically, with no opt-out. A same-tab link to another site gets neither.
 */
export function Link({ className, target, rel, children, newTabLabel, ...props }: LinkProps) {
  const newTab = opensNewTab(target);
  const relationship = newTab ? [...new Set([...(rel?.split(/\s+/).filter(Boolean) ?? []), "noopener", "noreferrer"])].join(" ") : rel;
  if (!newTab) return <a {...props} target={target} rel={relationship} className={join("basalt-link", className)}>{children}</a>;
  // An aria-label replaces the content, so the words join the label itself. A link that holds only a logo keeps the words and skips the arrow.
  const label = props["aria-label"];
  return (
    <a {...props} target={target} rel={relationship} aria-label={label ? `${label}${newTabWords(newTabLabel)}` : undefined} data-new-tab="" className={join("basalt-link", className)}>
      <span className="basalt-link-label">{children}</span>
      {hasVisibleText(children) ? <NewTabGlyph /> : null}
      {label ? null : <NewTabWords label={newTabLabel} />}
    </a>
  );
}

export interface BreadcrumbItem {
  label: React.ReactNode;
  href?: string;
}
export interface BreadcrumbsProps extends React.ComponentProps<"nav"> {
  items: readonly BreadcrumbItem[];
}

/** A path through the app. The final item identifies the current page. */
export function Breadcrumbs({ items, className, "aria-label": label = "Breadcrumb", ...props }: BreadcrumbsProps) {
  return (
    <nav {...props} aria-label={label} className={join("basalt-breadcrumbs", className)}>
      <ol>
        {items.map((item, index) => (
          <li key={index}>
            {index ? <Icon icon={CaretRightIcon} size={16} /> : null}
            {item.href ? <Link href={item.href} aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</Link> : <span aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export interface PaginationProps extends Omit<React.ComponentProps<"nav">, "onChange" | "children"> {
  page: number;
  pageCount: number;
  onPageChange?: (page: number) => void;
  /** Provide for URL navigation; otherwise buttons paginate the app's current view. */
  hrefForPage?: (page: number) => string;
}

function pageItems(page: number, count: number): Array<number | "gap-before" | "gap-after"> {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const start = Math.min(Math.max(2, page - 1), count - 3);
  const end = Math.max(Math.min(count - 1, page + 1), 4);
  return [1, ...(start > 2 ? ["gap-before" as const] : []), ...Array.from({ length: end - start + 1 }, (_, i) => start + i), ...(end < count - 1 ? ["gap-after" as const] : []), count];
}

/** Bounded pagination: a constant-sized page window even for a very large result set. */
export function Pagination({ page, pageCount, onPageChange, hrefForPage, className, "aria-label": label = "Pagination", ...props }: PaginationProps) {
  const count = Number.isFinite(pageCount) ? Math.max(0, Math.floor(pageCount)) : 0;
  if (count <= 1) return null;
  const current = Math.max(1, Math.min(count, Math.floor(page) || 1));
  const control = (value: number, name: string, content: React.ReactNode, disabled = false) => {
    const selected = value === current && name.startsWith("Page ");
    if (hrefForPage && !disabled) return <Link href={hrefForPage(value)} aria-label={name} aria-current={selected ? "page" : undefined} className="basalt-page-link">{content}</Link>;
    return <Button size="sm" variant="ghost" aria-label={name} aria-current={selected ? "page" : undefined} disabled={disabled} onClick={() => onPageChange?.(value)}>{content}</Button>;
  };
  return (
    <nav {...props} aria-label={label} className={join("basalt-pagination", className)}>
      {control(current - 1, "Previous page", <Icon icon={CaretLeftIcon} />, current === 1)}
      {pageItems(current, count).map((item) => <React.Fragment key={item}>{typeof item === "number" ? control(item, `Page ${item}`, item) : <span className="basalt-pagination-gap" aria-hidden="true"><Icon icon={DotsThreeIcon} /></span>}</React.Fragment>)}
      {control(current + 1, "Next page", <Icon icon={CaretRightIcon} />, current === count)}
    </nav>
  );
}
