import * as React from "react";

import { join } from "./utils";

export interface FormPreviewProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** What the form writes, drawn by the app from its values. Output only: no field, action or focus stop, and never a live region. */
  preview: React.ReactNode;
  /** The preview's heading. Default "Preview". */
  previewLabel?: string;
  /** Its level. Default 3 (under a dialog's h2). */
  previewHeading?: 2 | 3 | 4 | 5 | 6;
  /** The split, as `FormGrid` writes a ratio: "1-1" (default), "3-2", "2-3". */
  columns?: "1-1" | "3-2" | "2-3";
  /** The fields. */
  children: React.ReactNode;
}

const TEMPLATES = { "1-1": "minmax(0, 1fr) minmax(0, 1fr)", "3-2": "minmax(0, 3fr) minmax(0, 2fr)", "2-3": "minmax(0, 2fr) minmax(0, 3fr)" } as const;

/**
 * A form beside what it writes (cimip-gaps-3 t4, item 5): the fields at the start and the preview at the end, `space-8` apart, where its own width is at least
 * `size-breakpoint-container-lg` (640) and the window at least 720 (`FormGrid`'s guard); one column anywhere else, the preview under a divider. The preview is a
 * `section` named by its heading, drawn as the preview kicker; the part draws no rim or fill (a `Card` inside is a panel by the ordinary rule). In two columns
 * the preview is sticky, `space-5` from the top of the scroller (a page with a sticky bar sets `--_form-preview-top`). Nothing in it is live or focusable.
 */
export function FormPreview({ preview, previewLabel = "Preview", previewHeading = 3, columns = "1-1", children, className, style, ...props }: FormPreviewProps) {
  const headingId = React.useId();
  const Heading = `h${previewHeading}` as "h3";
  const own = { "--_fp-columns": TEMPLATES[columns] ?? TEMPLATES["1-1"] } as React.CSSProperties;
  return (
    <div className="basalt-form-preview-frame">
      <div {...props} style={{ ...own, ...style }} className={join("basalt-form-preview", className)}>
        <div className="basalt-form-preview-fields">{children}</div>
        <section aria-labelledby={headingId} className="basalt-form-preview-pane">
          <Heading id={headingId} className="basalt-form-preview-heading">{previewLabel}</Heading>
          {preview}
        </section>
      </div>
    </div>
  );
}
