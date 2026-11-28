// A className that only places the component, and Basalt's own documented classes.
import { Button } from "@srasyndicate/basalt";

export function Placed({ end }: { end: boolean }) {
  return (
    <header className="basalt-chrome basalt-sticky-bar">
      <Button className="save-action">Save</Button>
      <Button className={end ? "save-action" : "save-action"}>Save</Button>
      <Button className="basalt-visually-hidden">Skip</Button>
    </header>
  );
}
