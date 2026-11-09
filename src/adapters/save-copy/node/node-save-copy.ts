import { cp, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { SaveCopyOutcome, SaveCopyPort } from "../../../application/ports/save-copy.ts";

/** SaveCopyPort over Node's file system, for the headless CLI: copies from the course folder on disk. */
export function nodeSaveCopy(courseRoot: string): SaveCopyPort {
  return {
    async saveCopy(from, parent, name): Promise<SaveCopyOutcome> {
      for (let n = 1; n < 100; n++) {
        const folder = join(parent, n === 1 ? name : `${name}-${n}`);
        try {
          await mkdir(folder);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
          return { ok: false, reason: `Studio couldn't make a folder in ${parent}.`, detail: String(error) };
        }
        try {
          // The new folder is made first so no other copy can take the name; its contents go in after.
          for (const entry of await readdir(join(courseRoot, from)))
            await cp(join(courseRoot, from, entry), join(folder, entry), { recursive: true, errorOnExist: true, force: false });
          return { ok: true, folder };
        } catch (error) {
          return { ok: false, reason: `The website couldn't be saved in ${folder}.`, detail: String(error) };
        }
      }
      return { ok: false, reason: `${parent} already holds 99 copies of ${name}. Choose another folder.`, detail: "" };
    },
  };
}
