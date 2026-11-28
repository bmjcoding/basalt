// basalt/primitive passes: a row action, a hidden file input, a render target, an element with its own role, a spread wrapper, a long-tail icon.
import { useRef, type ComponentProps } from "react";
import { Button } from "@srasyndicate/basalt";
import { RocketIcon } from "@phosphor-icons/react";

export function Rows({ rows }: { rows: { id: string; name: string }[] }) {
  const file = useRef<HTMLInputElement>(null);
  return (
    <ul role="list">
      {rows.map((row) => (
        <li key={row.id}>
          <button type="button" className="row-button">{row.name}</button>
        </li>
      ))}
      <input ref={file} type="file" className="basalt-visually-hidden" tabIndex={-1} aria-hidden="true" />
      <Button nativeButton={false} render={<a href="#top" />} icon={RocketIcon}>Top</Button>
      <Button render={<button type="submit" />}>Send</Button>
      <button type="button" role="tab">Tab</button>
      <input type="hidden" name="token" />
    </ul>
  );
}

export function Forward(props: ComponentProps<"button">) {
  return <button type="button" {...props} />;
}
