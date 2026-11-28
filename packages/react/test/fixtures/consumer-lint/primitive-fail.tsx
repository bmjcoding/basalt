// basalt/primitive (advice): a competing import, a Phosphor icon the core set draws, and native elements where Basalt has a proven part.
import * as Dialog from "@radix-ui/react-dialog";
import { Toaster } from "sonner";
import { X } from "lucide-react";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";

export function Native() {
  return (
    <form>
      <button type="button" onClick={() => {}}>Save</button>
      <input type="checkbox" />
      <select><option>One</option></select>
      <textarea />
      <hr />
      <progress value={0.5} />
    </form>
  );
}
