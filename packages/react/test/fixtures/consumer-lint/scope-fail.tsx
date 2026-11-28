// Point 4: a Basalt import used where nothing shadows it is still Basalt's, and a `const` style in scope is read.
import { Button } from "@srasyndicate/basalt";

const loud = { color: "var(--basalt-text-primary)" };

export function Outer() {
  return <Button style={loud}>Save</Button>;
}
