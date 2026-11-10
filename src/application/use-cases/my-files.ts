import type { DroppedFile } from "../../domain/material.ts";
import type { OwnFilesPort } from "../ports/own-files.ts";

/** One thing in the lecturer's own folder, as the My files panel lists it. */
export interface OwnEntry {
  name: string;
  /** Relative to the folder the lecturer chose. */
  path: string;
  kind: "file" | "dir";
}

/** Never material: version control, editors, dependencies, and anything hidden. */
const SKIPPED = new Set(["node_modules", "json", "html", "_site"]);
const joined = (dir: string, name: string) => (dir === "" ? name : `${dir}/${name}`);

/**
 * My files (feature 5): the lecturer's own folder beside the course, listed by name and read only, and what
 * they drag from it read as dropped files, so a week takes it through the same plan as a drop (planMaterial).
 */
export function createMyFiles(files: OwnFilesPort) {
  const under = async (dir: string, prefix: string): Promise<DroppedFile[]> => {
    const found: DroppedFile[] = [];
    for (const entry of await files.list(dir)) {
      if (entry.name.startsWith(".") || SKIPPED.has(entry.name)) continue;
      const path = joined(dir, entry.name);
      if (entry.kind === "dir") found.push(...(await under(path, joined(prefix, entry.name))));
      else found.push({ path: joined(prefix, entry.name), bytes: await files.read(path) });
    }
    return found;
  };
  return {
    /** Opens a folder the lecturer chose; its name for the panel's heading. */
    async open(folder: string): Promise<string> {
      await files.open(folder);
      return folder.split(/[\\/]/).filter(Boolean).pop() ?? folder;
    },

    /** A folder's contents, folders first, then files, each by name. */
    async listing(dir: string): Promise<OwnEntry[]> {
      return (await files.list(dir))
        .filter((entry) => !entry.name.startsWith(".") && !SKIPPED.has(entry.name))
        .map((entry) => ({ name: entry.name, path: joined(dir, entry.name), kind: entry.kind }))
        .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "dir" ? -1 : 1));
    },

    /** What dragging an entry brings: a file by its name, a folder with everything in it under the folder's name. */
    async dropped(entry: OwnEntry): Promise<DroppedFile[]> {
      if (entry.kind === "file") return [{ path: entry.name, bytes: await files.read(entry.path) }];
      return under(entry.path, entry.name);
    },
  };
}

export type MyFiles = ReturnType<typeof createMyFiles>;
