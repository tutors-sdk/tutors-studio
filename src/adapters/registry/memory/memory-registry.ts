import type { FileSystemPort } from "../../../application/ports/file-system.ts";
import type { RegistryPort } from "../../../application/ports/registry.ts";

/** Folder registries held in memory, by name: the browser preview's registry, and tests. */
export function memoryRegistry(folders: Record<string, Pick<FileSystemPort, "write" | "remove">>): RegistryPort {
  const folder = (name: string) => {
    const found = folders[name];
    if (found === undefined) throw new Error(`${name}: not a folder`);
    return found;
  };
  return {
    write: async (name, path, bytes) => folder(name).write(path, bytes),
    remove: async (name, path) => folder(name).remove(path),
  };
}
