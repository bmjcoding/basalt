import * as React from "react";

import { Button } from "./button";
import { Field, Input } from "./field";
import { TextMorph } from "./text-morph";

export interface LivePreviewProps {
  /** Visible label for the field being edited. */
  label: string;
  /** The value last committed. The preview can run ahead of this. */
  saved: string;
  /** Called with the draft when the person saves. */
  onSave: (value: string) => void;
}

/**
 * Edit a value and see the result before it is saved. The preview is the draft.
 * Saving is what commits it. The surrounding controls stay put.
 */
export function LivePreview({ label, saved, onSave }: LivePreviewProps) {
  const [draft, setDraft] = React.useState(saved);
  React.useEffect(() => setDraft(saved), [saved]);
  const dirty = draft !== saved;
  return (
    <form
      className="basalt-preview"
      onSubmit={(event) => {
        event.preventDefault();
        if (dirty) onSave(draft);
      }}
    >
      <Field label={label} description="The preview updates as you type. Save commits it.">
        <Input value={draft} onChange={(event) => setDraft(event.target.value)} />
      </Field>
      <div className="basalt-preview-card">
        <span className="basalt-preview-kicker">Preview</span>
        <TextMorph text={draft.trim() ? draft : "Untitled"} />
      </div>
      <Button type="submit" variant="primary" disabled={!dirty}>
        Save
      </Button>
    </form>
  );
}
