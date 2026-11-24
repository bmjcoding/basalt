import * as React from "react";

import { Accordion, AccordionItem } from "./feedback";
import { formatReleaseDate } from "./release-date";
import type { ReleaseRecord } from "./release-types";
import { join } from "./utils";

// The versions (DECISIONS 320, 2.11): a `nav` named "Versions", one link a release, in the page's order: the number in mono and primary, the date
// at the row's end in tertiary, 13/18, 30 tall and 44 on touch; hover underlines the number. Beside the list it is `PaneLayout`'s pane, under a
// 13/18, 500 heading; where the pane would follow the page instead, it is a closed fold above the first release. A page draws both forms, the
// pane in `PaneLayout`'s pane and the fold before `ReleaseNotes`, and each shows only where it belongs:
//
//   <PaneLayout pane={<ReleaseIndex releases={releases} />} paneLabel="Versions">
//     <ReleaseIndex releases={releases} form="fold" />
//     <ReleaseNotes releases={releases} form="reference" product="Basalt" />
//   </PaneLayout>

export interface ReleaseIndexProps extends Omit<React.ComponentProps<"nav">, "children"> {
  releases: readonly Pick<ReleaseRecord, "version" | "date" | "unreleased">[];
  /** Default "Versions". */
  label?: string;
  /** "pane" (default): the list under its heading, for `PaneLayout`'s pane. "fold": a closed fold above the first release, where the pane is not beside the page. */
  form?: "pane" | "fold";
  /** The dates' locale. Default "en-US". */
  locale?: string;
  /** The word for the Unreleased row. Default "Unreleased". */
  unreleasedLabel?: string;
}

/** The versions of a release page. See the module note. */
export function ReleaseIndex({ releases, label = "Versions", form = "pane", locale = "en-US", unreleasedLabel = "Unreleased", className, ...props }: ReleaseIndexProps) {
  const titleId = React.useId();
  // Without script the fold is open; once the page runs it starts closed.
  const [open, setOpen] = React.useState<string[]>(["versions"]);
  const wired = React.useRef(false);
  React.useLayoutEffect(() => {
    if (wired.current || form !== "fold") return;
    wired.current = true;
    setOpen([]);
  }, [form]);
  const list = (
    <ul className="basalt-release-index-list">
      {releases.map((release) => {
        const id = release.unreleased ? "unreleased" : `v${release.version}`;
        return (
          <li key={id}>
            <a href={`#${id}`} className="basalt-release-index-link">
              <span className="basalt-release-index-number" data-words={release.unreleased ? "" : undefined}>{release.unreleased ? unreleasedLabel : release.version}</span>
              {release.date ? <><span className="basalt-visually-hidden">, </span><time dateTime={release.date}>{formatReleaseDate(release.date, locale)}</time></> : null}
            </a>
          </li>
        );
      })}
    </ul>
  );
  if (form === "fold") {
    return (
      <nav {...props} aria-label={label} data-form="fold" className={join("basalt-release-index", className)}>
        <Accordion hiddenUntilFound value={open} onValueChange={setOpen} className="basalt-release-fold">
          <AccordionItem value="versions" title={label} headingLevel={2}>{list}</AccordionItem>
        </Accordion>
      </nav>
    );
  }
  return (
    <nav {...props} aria-labelledby={titleId} data-form="pane" className={join("basalt-release-index", className)}>
      <h2 id={titleId} className="basalt-release-index-title">{label}</h2>
      {list}
    </nav>
  );
}
