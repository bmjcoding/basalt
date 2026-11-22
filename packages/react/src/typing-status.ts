// Who is typing, in words: a plain function with no React, so a server can write the line too (cimip-gaps-2, B3).

/** Who is typing, in words: "Ana is typing", "Ana and Ben are typing", "Ana, Ben, and Cy are typing", "4 people are typing". Empty for
 * nobody. US English; an app in another language writes its own line. */
export function typingStatus(names: readonly string[]): string {
  if (names.length === 0) return "";
  if (names.length > 3) return `${names.length} people are typing`;
  const list = new Intl.ListFormat("en-US", { type: "conjunction" }).format(names);
  return `${list} ${names.length === 1 ? "is" : "are"} typing`;
}
