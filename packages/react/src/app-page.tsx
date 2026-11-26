import * as React from "react";

import { AppTitleContext } from "./app-title";
import { DotLine } from "./dot-sep";
import { useMergedRef } from "./merged-ref";
import { join } from "./utils";

// An app page's rhythm (cimip-gaps-3 T5, items 1, 2, 6 and 8). The app page's heading ladder: the `h1` at 18/26 and 600 (the bar's title, and
// `AppPageHead`'s), a section at 16/24 and 600, a sub-section at 14/20 and 600. A head's size comes from its position, never from its outline
// level: `level` changes the tag alone. The shell's `main` keeps its `space-6` above and `space-16` below, so nothing here adds padding of its own.

/** How deep the section a head is in sits: 1 at the top, 2 in a sub-section. */
interface SectionContextValue { depth: number; id: string; named: (on: boolean) => void }
const SectionContext = /* @__PURE__ */ React.createContext<SectionContextValue | null>(null);

export interface AppSectionsProps extends React.ComponentProps<"div"> {}

/**
 * The sections of an app page: a column, `space-12` (48) apart from 720 and `space-8` (32) under it; inside a `TabsPanel` `space-10` (40) from 720,
 * by position, with no prop; inside an `AppSection` (sub-sections) `space-8` at every width. No padding of its own.
 */
export function AppSections({ className, ...props }: AppSectionsProps) {
  return <div {...props} className={join("basalt-app-sections", className)} />;
}

export interface AppSectionProps extends React.ComponentProps<"section"> {}

/**
 * One section of an app page: a `section`, its head then its body, `space-4` apart. It is named by its `AppSectionHead` (`aria-labelledby` the head's
 * title) unless it is given `aria-label` or `aria-labelledby`. An `AppSection` inside an `AppSection` is a sub-section: its head is 14/20.
 */
export function AppSection({ className, children, ...props }: AppSectionProps) {
  const parent = React.useContext(SectionContext);
  const id = React.useId();
  // The head says it is there once it has mounted, so the section never points at a title that is not in the page.
  const [headed, setHeaded] = React.useState(false);
  const value = React.useMemo<SectionContextValue>(() => ({ depth: (parent?.depth ?? 0) + 1, id: `${id}-title`, named: setHeaded }), [parent?.depth, id]);
  const own = props["aria-label"] !== undefined || props["aria-labelledby"] !== undefined;
  return (
    <section aria-labelledby={!own && headed ? value.id : undefined} {...props} className={join("basalt-app-section", className)}>
      <SectionContext.Provider value={value}>{children}</SectionContext.Provider>
    </section>
  );
}

type Level = 2 | 3 | 4 | 5 | 6;

export interface AppSectionHeadProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** The section's title. 16/24 at 600 at the top of a page, 14/20 at 600 in a sub-section: its position decides, never `level`. */
  title: React.ReactNode;
  /** A line under the title: 14/20 at 400 in secondary, `space-1` under it, at most `size-prose-width`. */
  description?: React.ReactNode;
  /**
   * `sm` controls at the head's end, their first row centred on the title's line; they wrap their own rows, each in the flow. Under 480px of the
   * head's own width they go under the title and the description, at the start. A ghost control last, with `edge="end"`, hangs on the page's line
   * when the head is a top-level head in the shell's `main`.
   */
  actions?: React.ReactNode;
  /** The outline level of the title's heading element. Default 2 at the top, 3 in a sub-section, one more per depth, to 6. It never changes the size. */
  level?: Level;
}

/** The shared anatomy of a section head and a page head: the text (a title, then a description or facts) and the actions, in a head that answers its own width. */
function Head({ kind, title, below, actions, className, children, ...props }: { kind: "section" | "page"; title: React.ReactNode; below?: React.ReactNode; actions?: React.ReactNode } & Omit<React.ComponentProps<"div">, "title">) {
  return (
    <div {...props} data-actions={actions != null ? "" : undefined} className={join(`basalt-app-head basalt-app-${kind}-head`, className)}>
      <div className="basalt-app-head-row">
        <div className="basalt-app-head-text">
          {title}
          {below}
        </div>
        {actions != null ? <div className="basalt-app-head-actions">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** A section's head: its title, a description and its actions. See `AppSectionHeadProps`. */
export function AppSectionHead({ title, description, actions, level, className, ...props }: AppSectionHeadProps) {
  const section = React.useContext(SectionContext);
  const depth = section?.depth ?? 1;
  const tag = `h${level ?? Math.min(6, depth + 1)}` as `h${Level}`;
  React.useLayoutEffect(() => {
    section?.named(true);
    return () => section?.named(false);
  }, [section]);
  const heading = React.createElement(tag, { id: section?.id, className: "basalt-app-section-title" }, title);
  return (
    <Head
      {...props}
      kind="section"
      data-sub={depth > 1 ? "" : undefined}
      className={className}
      title={heading}
      below={description != null ? <p className="basalt-app-section-description">{description}</p> : null}
      actions={actions}
    />
  );
}

export interface ClusterProps extends React.ComponentProps<"div"> {
  /** Which end the row's controls gather at. Default "start". */
  align?: "start" | "end";
}

/** A wrapping row of controls: `space-2` apart, centred on one line, wrapping onto the next. Layout only, with no role. */
export function Cluster({ align = "start", className, ...props }: ClusterProps) {
  return <div {...props} data-align={align === "end" ? "end" : undefined} className={join("basalt-cluster", className)} />;
}

export interface AppPageHeadProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** The page's `h1`: 18/26 at 600, balanced, wrapped and never cut. It takes `tabIndex={-1}` for `useRouteFocus` and draws no ring. */
  title: React.ReactNode;
  /** Facts under the title, joined by dots (the bar's `DotLine` drawing), 13/18 in secondary, `space-1` under it; they wrap. */
  facts?: readonly React.ReactNode[];
  /** Controls at the head's end, with a section head's mechanics. */
  actions?: React.ReactNode;
  /** The `h1`, for `useRouteFocus`'s `target` (with `shownHeading` when the bar draws the title too). */
  titleRef?: React.Ref<HTMLHeadingElement>;
  /**
   * The page's form of a title the bar shows from 720 (`AppHeader phoneTitle="page"`): drawn under 720 only. Put it first in the shell's `main`,
   * with the bar's `title` and `facts`. It registers its `h1` with the shell, so the bar echoes the title once it has scrolled under the bar.
   */
  phoneOnly?: boolean;
}

/**
 * A page's own head in the flow: its `h1`, its facts and its actions; `space-8` below it from 720 and `space-6` under 720. It has no padding above
 * (its container gives it). With `phoneOnly` it is drawn under 720 only.
 */
export function AppPageHead({ title, facts, actions, titleRef, phoneOnly = false, className, ...props }: AppPageHeadProps) {
  const shell = React.useContext(AppTitleContext);
  const own = React.useRef<HTMLHeadingElement | null>(null);
  const ref = useMergedRef(own, titleRef);
  const setHeading = shell?.setHeading;
  React.useLayoutEffect(() => {
    if (!phoneOnly || !setHeading) return undefined;
    const node = own.current;
    setHeading(node);
    return () => setHeading((current) => (current === node ? null : current));
  }, [phoneOnly, setHeading]);
  const shown = facts?.filter((fact) => fact !== null && fact !== undefined && fact !== false && fact !== "") ?? [];
  return (
    <Head
      {...props}
      kind="page"
      data-phone-only={phoneOnly ? "" : undefined}
      className={className}
      title={<h1 ref={ref} tabIndex={-1} className="basalt-app-page-title">{title}</h1>}
      below={shown.length > 0 ? <p className="basalt-app-page-facts"><DotLine>{shown.map((fact, index) => <React.Fragment key={index}>{fact}</React.Fragment>)}</DotLine></p> : null}
      actions={actions}
    />
  );
}

export interface AppPageProps extends React.ComponentProps<"main"> {}

/**
 * The `main` of an app page that sits under a `SiteHeader` (no `AppShell`): the page row (`size-page-width`, the gutter inside) with the shell main's
 * block padding, `space-6` above and `space-16` below. Inside it: an `AppPageHead`, then `AppSections`.
 */
export function AppPage({ className, ...props }: AppPageProps) {
  return <main {...props} className={join("basalt-page-row basalt-app-page", className)} />;
}

export interface MessagePageProps extends Omit<React.ComponentProps<"main">, "title"> {
  /** The app's lockup or mark above the title, `space-6` over it. */
  brand?: React.ReactNode;
  /** The page's `h1`: 18/26 at 600, balanced. */
  title: React.ReactNode;
  /** A line under the title: 14/20 in secondary, `space-2` under it. */
  description?: React.ReactNode;
  /** Buttons at the foot, in a `Cluster`, `space-6` under what is above. */
  actions?: React.ReactNode;
  /** A form or a `Callout`, `space-4` under the description. A card, if the app wants one, is a child. */
  children?: React.ReactNode;
}

/**
 * One message on the page's surface when there is no app to show: signed out, no access, maintenance, a link that expired. Never a loading screen (a
 * reload that waits on code is `PageWait`). The root is the page's one `main`, at least the window's height; the block is at most `size-prose-width`,
 * centred both ways by auto margins that fall to 0 when it is taller than the window, so its top is never cut. Its lines start on its start edge.
 * No panel, rim, header, tab bar or smoke.
 */
export function MessagePage({ brand, title, description, actions, className, children, ...props }: MessagePageProps) {
  return (
    <main {...props} className={join("basalt-message-page", className)}>
      <div className="basalt-message-page-body">
        {brand != null ? <div className="basalt-message-page-brand">{brand}</div> : null}
        <h1 className="basalt-message-page-title">{title}</h1>
        {description != null ? <p className="basalt-message-page-description">{description}</p> : null}
        {children != null ? <div className="basalt-message-page-content">{children}</div> : null}
        {actions != null ? <Cluster className="basalt-message-page-actions">{actions}</Cluster> : null}
      </div>
    </main>
  );
}
