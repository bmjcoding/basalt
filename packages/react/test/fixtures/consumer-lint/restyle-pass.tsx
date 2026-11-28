// basalt/no-restyle passes: layout on the component and its wrapper, a documented hook, the app's own custom property, appearance on the app's own element.
import { Button, Card, Stage } from "@srasyndicate/basalt";

export function Placed({ measured }: { measured: number }) {
  return (
    <div style={{ display: "grid", gap: "var(--basalt-space-4)", padding: "var(--basalt-space-6)" }}>
      <Button style={{ marginInlineStart: "auto", gridColumn: "2 / 3", width: "100%" }}>Save</Button>
      <Card style={{ minHeight: "100%", alignSelf: "stretch" }} />
      <Card style={{ blockSize: measured }} />
      <Stage style={{ "--basalt-stage-room": "var(--basalt-space-16)" }} />
      <Button style={{ "--app-slot": "1", display: "none" }}>Hidden</Button>
    </div>
  );
}
