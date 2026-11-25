import { groupOf, itemsOf, LIBRARY_DEPTH, lastPart, libraryOrder, searchedFolder, type Library, type LibraryCourse, type UnreadLibrary } from "../../domain/library.ts";
import { CATALOGUE_FILE, indexPath, REGISTRY_FILE, type Catalogue, type RegistryIndex } from "../../domain/registry.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { FileSystemPort } from "../ports/file-system.ts";
import type { LibraryPort } from "../ports/library.ts";
import type { SettingsPort } from "../ports/settings.ts";

const joined = (dir: string, name: string) => (dir === "" ? name : `${dir}/${name}`);
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * A course inside a library folder as a file system the rules can read. Every write refuses: Studio only
 * reads a library folder (STU-0264).
 */
export function libraryCourseFiles(library: LibraryPort, folder: string, course: string): FileSystemPort {
  const at = (path: string) => joined(course, path);
  const refuse = async () => {
    throw new Error("Studio only reads your library folders.");
  };
  return {
    list: (dir) => library.list(folder, at(dir)),
    read: (path) => library.read(folder, at(path)),
    exists: async (path) => {
      const slash = path.lastIndexOf("/");
      const dir = slash < 0 ? "" : path.slice(0, slash);
      try {
        return (await library.list(folder, at(dir))).some((entry) => entry.name === path.slice(slash + 1));
      } catch {
        return false;
      }
    },
    write: refuse,
    move: refuse,
    remove: refuse,
    watch: () => () => {},
  };
}

export interface LibraryDeps {
  library: LibraryPort;
  rules: CourseRulesPort;
}

/**
 * Every Tutors course in the lecturer's library folders and the folders below them, each checked with the
 * course rules (STU-0261). A folder holding a course.md is one course: Studio doesn't look inside it for more
 * (STU-0262). A folder Studio can't read is named with why, and the others are still searched (STU-0265).
 */
export async function searchLibrary(deps: LibraryDeps, folders: readonly string[]): Promise<Library> {
  const courses: LibraryCourse[] = [];
  const unread: UnreadLibrary[] = [];
  for (const folder of folders) {
    const found: string[] = [];
    const registries: string[] = [];
    const walk = async (dir: string, depth: number) => {
      const entries = await deps.library.list(folder, dir);
      // A folder registry (ADR 0063): its entries are listed from its catalogue, and nothing inside it is searched.
      if (entries.some((entry) => entry.kind === "file" && entry.name === REGISTRY_FILE)) {
        registries.push(dir);
        return;
      }
      if (entries.some((entry) => entry.kind === "file" && entry.name === "course.md")) {
        found.push(dir);
        return;
      }
      if (depth >= LIBRARY_DEPTH) return;
      for (const entry of entries) if (entry.kind === "dir" && searchedFolder(entry.name)) await walk(joined(dir, entry.name), depth + 1);
    };
    try {
      await walk("", 0);
    } catch (error) {
      unread.push({ library: folder, message: message(error) });
      continue;
    }
    for (const path of found) courses.push(await checked(deps, folder, path));
    for (const dir of registries) {
      try {
        courses.push(...(await registryEntries(deps.library, folder, dir)));
      } catch (error) {
        unread.push({ library: joined(folder, dir), message: message(error) });
      }
    }
  }
  return { courses: libraryOrder(courses), unread };
}

/**
 * The entries of a folder registry as library courses, each at its latest version (STU-0275). They were ready
 * when shared, so they are ready to borrow from; their files are read from where they are stored.
 */
async function registryEntries(library: LibraryPort, folder: string, dir: string): Promise<LibraryCourse[]> {
  const text = async (path: string) => new TextDecoder().decode(await library.read(folder, joined(dir, path)));
  const listing = await library.list(folder, dir);
  if (!listing.some((entry) => entry.name === CATALOGUE_FILE)) return [];
  const catalogue = JSON.parse(await text(CATALOGUE_FILE)) as Catalogue;
  const entries: LibraryCourse[] = [];
  for (const listed of catalogue.entries) {
    const index = JSON.parse(await text(indexPath(listed.publisher, listed.name))) as RegistryIndex;
    const latest = index.versions[index.versions.length - 1];
    if (latest === undefined) continue;
    entries.push({
      library: folder,
      path: joined(dir, indexPath(index.publisher, index.name).replace(/\.json$/, "")),
      title: latest.title,
      group: "ready",
      errors: 0,
      warnings: 0,
      items: latest.items,
      entry: { registry: dir, publisher: index.publisher, name: index.name, version: latest.version, licence: latest.licence, from: latest.from, folders: latest.folders },
    });
  }
  return entries;
}

async function checked(deps: LibraryDeps, folder: string, path: string): Promise<LibraryCourse> {
  const fs = libraryCourseFiles(deps.library, folder, path);
  const [findings, tree] = await Promise.all([deps.rules.validate(fs), deps.rules.buildTree(fs)]);
  const group = groupOf(findings);
  return {
    library: folder,
    path,
    title: tree.title?.trim() || lastPart(path === "" ? folder : path),
    group,
    errors: findings.filter((finding) => finding.severity === "error").length,
    warnings: findings.filter((finding) => finding.severity === "warn").length,
    // A course that needs fixing lends nothing until it is fixed (STU-0263).
    items: group === "ready" ? itemsOf(tree) : [],
  };
}

/** The library folders with one more, each once, in the order added. Pure. */
export const withLibraryFolder = (folders: readonly string[], folder: string): string[] => (folders.includes(folder) ? [...folders] : [...folders, folder]);

/** The library folders without one; nothing on disk changes. Pure. */
export const withoutLibraryFolder = (folders: readonly string[], folder: string): string[] => folders.filter((other) => other !== folder);

/** The library as Settings and the Library screen use it: the folders the lecturer added, and what is in them. */
export function createLibrary(deps: LibraryDeps & { settings: SettingsPort }) {
  return {
    folders: () => deps.settings.get("libraryFolders"),
    async add(folder: string): Promise<string[]> {
      const next = withLibraryFolder(await deps.settings.get("libraryFolders"), folder);
      await deps.settings.set("libraryFolders", next);
      return next;
    },
    /** Takes a folder out of the library; its files stay where they are. */
    async remove(folder: string): Promise<string[]> {
      const next = withoutLibraryFolder(await deps.settings.get("libraryFolders"), folder);
      await deps.settings.set("libraryFolders", next);
      return next;
    },
    async search(): Promise<Library> {
      return searchLibrary(deps, await deps.settings.get("libraryFolders"));
    },
  };
}

export type LibraryShelf = ReturnType<typeof createLibrary>;
