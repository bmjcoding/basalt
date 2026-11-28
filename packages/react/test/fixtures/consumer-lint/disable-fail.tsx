// basalt/disable: an exception with no reason, one that names no rule, and one that excuses nothing all fail.
import { Button } from "@srasyndicate/basalt";

export function Exceptions() {
  return (
    <>
      {/* basalt-lint-disable-next-line basalt/no-restyle */}
      <Button style={{ color: "var(--basalt-text-primary)" }}>No reason</Button>
      {/* basalt-lint-disable-next-line basalt/not-a-rule -- a rule that does not exist */}
      <Button>Unknown rule</Button>
      {/* basalt-lint-disable-next-line basalt/no-restyle -- nothing on the next line restyles */}
      <Button>Nothing</Button>
    </>
  );
}
