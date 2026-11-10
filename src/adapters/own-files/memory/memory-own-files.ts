import type { FileSystemPort } from "../../../application/ports/file-system.ts";
import type { OwnFilesPort } from "../../../application/ports/own-files.ts";

/** A folder of the lecturer's own held in memory: the browser preview's sample material, and tests. */
export function memoryOwnFiles(folders: Record<string, Pick<FileSystemPort, "list" | "read">>): OwnFilesPort {
  let open: Pick<FileSystemPort, "list" | "read"> | null = null;
  const current = () => {
    if (open === null) throw new Error("no folder of your files is open");
    return open;
  };
  return {
    async open(folder) {
      const found = folders[folder];
      if (found === undefined) throw new Error(`${folder}: not a folder`);
      open = found;
    },
    list: (dir) => current().list(dir),
    read: (path) => current().read(path),
  };
}
