// With `sources: ["./sources/barrel.ts"]`, a Basalt component imported through the app's barrel is checked; the app's own part is not.
import { AppNote, Button } from "./barrel.ts";

export function ThroughBarrel() {
  return (
    <>
      <Button style={{ padding: "var(--basalt-space-1)" }}>Save</Button>
      <AppNote style={{ padding: "var(--basalt-space-1)" }} />
    </>
  );
}
