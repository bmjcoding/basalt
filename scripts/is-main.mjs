// True when the module whose `import.meta.url` is given is the script Node was started with. Both sides are real paths: Node resolves a module's URL through
// symlinks and not `process.argv[1]` (on macOS /tmp, /var and /etc are symlinks), so comparing them as written leaves a script started through a link
// running nothing and exiting 0 (A5-23).
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export function isMain(moduleUrl, entry = process.argv[1]) {
  if (!entry) return false;
  try {
    return fs.realpathSync(entry) === fs.realpathSync(fileURLToPath(moduleUrl));
  } catch {
    return false;
  }
}
