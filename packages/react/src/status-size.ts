import * as React from "react";

/** The size of a mark beside a status word: the 6px dot's seat is 6, 9 or 12 wide, and braille is drawn at the same size. */
export type StatusSize = 16 | 20 | 24;

/**
 * A plain `Badge` provides its `size`, and a braille `Spinner` inside it takes it, so the mark and the seat cannot disagree.
 * Undefined outside a plain Badge, where a Spinner uses its own `size`.
 */
export const StatusSizeContext = React.createContext<StatusSize | undefined>(undefined);
