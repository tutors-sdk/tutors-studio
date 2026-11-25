/**
 * Driven port: writing into a folder registry (ADR 0063), the one kind of library folder Studio writes to, and
 * only through a plan the lecturer accepted. Reads go through the LibraryPort. Paths are "/"-separated and
 * relative to the registry's folder. A write makes any folders the path needs.
 */
export interface RegistryPort {
  write(folder: string, path: string, bytes: Uint8Array): Promise<void>;
  /** Removes one file: only to undo a write when a share fails part-way. */
  remove(folder: string, path: string): Promise<void>;
}
