import * as React from "react";

import { DiagramFigure } from "./diagram-figure";
import type { DiagramFigureProps } from "./diagram-figure";
import type { SchemaTable } from "./diagram-core";

export type { DiagramLegend, SchemaColumn, SchemaTable } from "./diagram-core";

export interface SchemaDiagramProps extends DiagramFigureProps {
  /**
   * The tables in the author's order. A foreign key is `references: "incidents.id"` on its column and nothing else: the row's "→ incidents",
   * the line, the sentence and the list all come from it. The referenced column must be one of the shown columns.
   */
  tables: SchemaTable[];
}

/** A database schema (DECISIONS 269): table cards with keys and a few columns; drawn, a line from each foreign key to the key it references. */
export function SchemaDiagram({ tables, title, heading, legend, ...props }: SchemaDiagramProps) {
  const spec = React.useMemo(() => ({ type: "schema" as const, title, heading, legend, tables }), [title, heading, legend, tables]);
  return <DiagramFigure {...props} title={title} heading={heading} legend={legend} spec={spec} component="SchemaDiagram" />;
}
