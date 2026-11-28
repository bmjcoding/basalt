// Point 4: a parameter or a local that shadows an import is not Basalt's, and a style object only counts when the binding in scope is a `const`.
import { Button } from "@srasyndicate/basalt";
import type { ComponentType, CSSProperties } from "react";

const loud = { color: "var(--basalt-text-primary)" };

export function Param({ Button }: { Button: ComponentType<{ style?: CSSProperties }> }) {
  return <Button style={{ color: "var(--basalt-text-primary)" }} />;
}

export function Local() {
  const Button = (props: { style?: CSSProperties }) => <span {...props} />;
  return <Button style={{ color: "var(--basalt-text-primary)" }} />;
}

export function Shadowed({ loud }: { loud: CSSProperties }) {
  return <BasaltButton style={loud} />;
}

export function NotConst() {
  let quiet: CSSProperties = { margin: 0 };
  quiet = { color: "var(--basalt-text-primary)" };
  return <BasaltButton style={quiet} />;
}

const BasaltButton = Button;
export { loud };
