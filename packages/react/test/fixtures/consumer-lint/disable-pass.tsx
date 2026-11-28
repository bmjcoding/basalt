// A reasoned exception on the line before excuses that line, and only that rule.
import { Button } from "@srasyndicate/basalt";

export function Excused() {
  return (
    <>
      {/* basalt-lint-disable-next-line basalt/no-restyle -- the owner's recorded exception: the smoked Jump to latest button */}
      <Button style={{ background: "var(--basalt-surface-chrome)" }}>Jump to latest</Button>
      {/* basalt-lint-disable-next-line basalt/primitive, basalt/raw-value -- a native picker kept for the browser's own sheet, drawn at the platform's size */}
      <select style={{ minHeight: 44 }}><option>One</option></select>
    </>
  );
}
