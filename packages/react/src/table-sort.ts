import type { SortDirection } from "./display";

/** What a row holds in the sorted column. `null`, `undefined` and an empty string are not observed: they sort after every observed value. */
export type SortValue = string | number | null | undefined;

/**
 * The rows in a column's order, sorted from the table's own order (DECISIONS 261). Pass the rows in the order the table loaded them,
 * every time, never the order on screen: ties then keep that order, and `direction` `undefined` (the third press, no column lit) returns
 * the rows as loaded, row for row. Numbers compare as numbers and text in natural order (`item 2` before `item 10`), and a value that was
 * not observed goes after every observed value in both directions (foundations, "Table additions"). A new array; `rows` is not changed.
 */
export function sortRows<Row>(rows: readonly Row[], value: (row: Row) => SortValue, direction: SortDirection | undefined): Row[] {
  if (!direction) return rows.slice();
  const sign = direction === "ascending" ? 1 : -1;
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const keyed = rows.map((row, index) => {
    const v = value(row);
    return { row, index, v: v === "" || v === undefined ? null : v };
  });
  keyed.sort((a, b) => {
    if (a.v === null || b.v === null) return a.v === b.v ? a.index - b.index : a.v === null ? 1 : -1;
    const c = typeof a.v === "number" && typeof b.v === "number" ? a.v - b.v : collator.compare(String(a.v), String(b.v));
    return c ? sign * c : a.index - b.index;
  });
  return keyed.map((k) => k.row);
}
