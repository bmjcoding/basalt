// basalt/no-restyle: static appearance on a Basalt component, found by its import binding (direct, aliased, namespace).
import { Button, Card as Panel } from "@srasyndicate/basalt";
import * as UI from "@srasyndicate/basalt";

export function Restyled() {
  return (
    <>
      <Button style={{ padding: "var(--basalt-space-3)" }}>Save</Button>
      <Panel style={{ background: "var(--basalt-surface-sunken)" }} />
      <UI.Badge style={{ borderRadius: "var(--basalt-radius-full)" }}>New</UI.Badge>
      <Button style={{ height: "var(--basalt-size-control-xl)" }}>Tall</Button>
      <div style={{ "--basalt-space-4": "var(--basalt-space-5)" }} />
    </>
  );
}
