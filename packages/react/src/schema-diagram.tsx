import * as React from "react";

import { DiagramFigure } from "./diagram-figure";
import type { DiagramFigureProps } from "./diagram-figure";
import type { SchemaTable, DiagramPlacement, DiagramUnplaced } from "./diagram-core";

export type { DiagramLegend, SchemaColumn, SchemaTable } from "./diagram-core";

interface SchemaDiagramBase extends DiagramFigureProps {
  /**
   * The tables in the author's order. A foreign key is `references: "incidents.id"` on its column and nothing else: the row's "→ incidents",
   * the line, the sentence and the list all come from it. The referenced column must be one of the shown columns.
   */
  tables: SchemaTable[];
}

/**
 * Authored (the default): every card carries its `col` and `row`. Automatic (`layout: "auto"`, DECISIONS 306, 1.8): no card needs them, and none are read.
 */
export type SchemaDiagramProps = Omit<SchemaDiagramBase, "tables"> & (
  | { layout?: "authored"; direction?: never; placement?: never; tables: SchemaTable[] }
  | {
      /**
       * `"auto"` (DECISIONS 306, 1.8): elkjs gives each card a column and a row, and Basalt sizes, routes and seats the figure as it does an authored one; a
       * card's `col` and `row` are left out (and not read). Place at build time with `placeDiagram` from `@srasyndicate/basalt/diagram-layout` and pass
       * `placement`: then elkjs never loads in the browser. Without it the layout module loads on demand at 640 or wider.
       */
      layout: "auto";
      /** Under `"auto"`: the one direction tried. Left out, the type's own (right for an architecture and a schema, down for a flowchart), then the other. */
      direction?: "right" | "down";
      /** Under `"auto"`: `placeDiagram`'s answer for one direction or both. */
      placement?: DiagramPlacement | DiagramPlacement[];
      tables: Array<DiagramUnplaced<SchemaTable>>;
    }
);

/** A database schema (DECISIONS 281): table cards with keys and a few columns; drawn, a line from each foreign key to the key it references. */
export function SchemaDiagram({ tables, motion, entrance, layout, direction, placement, title, heading, legend, ...props }: SchemaDiagramProps) {
  const spec = React.useMemo(() => ({ type: "schema" as const, title, heading, legend, tables: tables as SchemaTable[], motion, entrance, layout, direction, placement }), [title, heading, legend, tables, motion, entrance, layout, direction, placement]);
  return <DiagramFigure {...props} entrance={entrance} title={title} heading={heading} legend={legend} spec={spec} component="SchemaDiagram" />;
}
