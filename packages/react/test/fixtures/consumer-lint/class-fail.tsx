// A className on a Basalt component: an error when the checked CSS shows it sets appearance, advice when the lint cannot tell.
import { Button } from "@srasyndicate/basalt";

export function Classes({ tone }: { tone: string }) {
  return (
    <>
      <Button className="loud-action">Loud</Button>
      <Button className="tight-action">Tight</Button>
      <Button className={tone}>Computed</Button>
      <Button className="not-in-any-sheet">Unknown</Button>
    </>
  );
}
