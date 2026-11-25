import type { FileSystemPort } from "../../../application/ports/file-system.ts";
import type { LibraryPort } from "../../../application/ports/library.ts";

/** Library folders held in memory, by name: the browser preview's library, and tests. */
export function memoryLibrary(folders: Record<string, Pick<FileSystemPort, "list" | "read">>): LibraryPort {
  const folder = (name: string) => {
    const found = folders[name];
    if (found === undefined) throw new Error(`${name}: not a folder`);
    return found;
  };
  return {
    list: async (name, dir) => folder(name).list(dir),
    read: async (name, path) => folder(name).read(path),
  };
}
