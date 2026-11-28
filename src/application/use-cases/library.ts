import {
  groupOf,
  itemsOf,
  LIBRARY_DEPTH,
  LIBRARY_MARKERS,
  lastPart,
  libraryOrder,
  NEVER_SEARCHED,
  NEVER_SEARCHED_STARTS,
  searchedFolder,
  type Library,
  type LibraryCourse,
  type LibraryProgress,
  relooked,
  rememberedIn,
  type RememberedLibrary,
  type UnreadLibrary,
} from "../../domain/library.ts";
import { isDriveFolder } from "../../domain/drive.ts";
import { CATALOGUE_FILE, indexPath, REGISTRY_FILE, type Catalogue, type RegistryIndex } from "../../domain/registry.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { DirEntry, FileSystemPort } from "../ports/file-system.ts";
import type { LibraryFound, LibraryLook, LibraryPort } from "../ports/library.ts";
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

/** One LibraryPort over folders on this computer and on Google Drive, each sent to the port that reaches it. */
export function routedLibrary(local: LibraryPort, drive: LibraryPort | null): LibraryPort {
  const to = (folder: string): LibraryPort => {
    if (!isDriveFolder(folder)) return local;
    if (drive === null) throw new Error("This copy of Studio can't reach Google Drive.");
    return drive;
  };
  const find = local.find;
  const routed: LibraryPort = { list: (folder, dir) => to(folder).list(folder, dir), read: (folder, path) => to(folder).read(folder, path) };
  // Drive is listed folder by folder; a folder on this computer is looked through in one go where the port can.
  if (find) routed.find = (folder, how, heard, stopped) => (isDriveFolder(folder) ? walk(to(folder), folder, heard, stopped) : find(folder, how, heard, stopped));
  return routed;
}

export interface LibraryDeps {
  library: LibraryPort;
  rules: CourseRulesPort;
}

/** Hears a library search as it goes (STU-0301, STU-0302) and may stop it (STU-0305). */
export interface LibraryWatch {
  progress?: (progress: LibraryProgress) => void;
  /** Each course as soon as it is checked, and each registry entry as soon as it is read. */
  course?: (course: LibraryCourse) => void;
  /** Asked as the search goes: true ends it, keeping what it found. */
  stopped?: () => boolean;
}

const look: LibraryLook = { depth: LIBRARY_DEPTH, skip: NEVER_SEARCHED, skipStarts: NEVER_SEARCHED_STARTS, markers: LIBRARY_MARKERS };

/**
 * The library folder's folders holding a course.md or a registry.json, by listing each folder: for a port that
 * can't look in one go. A folder that can't be opened below the library folder is passed over (STU-0304).
 */
async function walk(library: LibraryPort, folder: string, heard: (looked: number, found: number) => void, stopped: () => boolean): Promise<LibraryFound> {
  const found: LibraryFound["found"] = [];
  let looked = 0;
  const visit = async (dir: string, depth: number) => {
    if (stopped()) return;
    let entries: DirEntry[];
    try {
      entries = await library.list(folder, dir);
    } catch (error) {
      if (dir === "") throw error;
      return;
    }
    looked++;
    const marker = look.markers.find((name) => entries.some((entry) => entry.kind === "file" && entry.name === name));
    if (marker !== undefined) {
      found.push({ dir, marker });
      heard(looked, found.length);
      return;
    }
    heard(looked, found.length);
    if (depth >= look.depth) return;
    const dirs = entries.filter((entry) => entry.kind === "dir" && searchedFolder(entry.name)).map((entry) => entry.name);
    // In name order, as the Rust side looks, so a search goes the same way on every computer.
    for (const name of dirs.sort()) await visit(joined(dir, name), depth + 1);
  };
  await visit("", 0);
  return { found, looked };
}

/**
 * Every Tutors course in the lecturer's library folders and the folders below them, each checked with the
 * course rules (STU-0261). A folder holding a course.md is one course: Studio doesn't look inside it for more
 * (STU-0262). A folder Studio can't read is named with why, and the others are still searched (STU-0265), as is
 * a course it can't check (STU-0304). `watch` hears how far it has got and each course as it is checked
 * (STU-0301, STU-0302), and can stop it, keeping what it found (STU-0305).
 */
export async function searchLibrary(deps: LibraryDeps, folders: readonly string[], watch: LibraryWatch = {}): Promise<Library> {
  const courses: LibraryCourse[] = [];
  const unread: UnreadLibrary[] = [];
  const stopped = watch.stopped ?? (() => false);
  const found = (course: LibraryCourse) => {
    courses.push(course);
    watch.course?.(course);
  };
  for (const folder of folders) {
    if (stopped()) break;
    const heard = (looked: number, count: number) => watch.progress?.({ stage: "looking", library: folder, looked, found: count });
    let looked: LibraryFound;
    try {
      looked = deps.library.find ? await deps.library.find(folder, look, heard, stopped) : await walk(deps.library, folder, heard, stopped);
    } catch (error) {
      unread.push({ library: folder, message: message(error) });
      continue;
    }
    const paths = looked.found.filter((one) => one.marker === "course.md").map((one) => one.dir);
    const registries = looked.found.filter((one) => one.marker === REGISTRY_FILE).map((one) => one.dir);
    for (const [index, path] of paths.entries()) {
      if (stopped()) break;
      watch.progress?.({ stage: "checking", library: folder, checking: index + 1, of: paths.length, course: path === "" ? lastPart(folder) : path });
      try {
        found(await checked(deps, folder, path));
      } catch (error) {
        unread.push({ library: joined(folder, path), message: message(error) });
      }
    }
    for (const dir of registries) {
      if (stopped()) break;
      try {
        for (const entry of await registryEntries(deps.library, folder, dir)) found(entry);
      } catch (error) {
        unread.push({ library: joined(folder, dir), message: message(error) });
      }
    }
  }
  return { courses: libraryOrder(courses), unread, ...(stopped() ? { stopped: true } : {}) };
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

/**
 * The library as Settings and the Library screen use it: the folders the lecturer added, and what is in them.
 * What a look finds is remembered, so the library shows at once next time (STU-0328); adding a folder looks only
 * in it (STU-0329), and taking one out drops what was found there without looking again (STU-0330).
 */
export function createLibrary(deps: LibraryDeps & { settings: SettingsPort; now?: () => Date }) {
  const now = deps.now ?? (() => new Date());
  const folders = () => deps.settings.get("libraryFolders");
  /** Keeps what a look found, unless the lecturer stopped it: a stopped look didn't see everything. */
  const remember = async (library: Library) => {
    if (!library.stopped) await deps.settings.set("libraryFound", { looked: now().toISOString(), library });
    return library;
  };
  const kept = async (): Promise<Library> => (await deps.settings.get("libraryFound"))?.library ?? { courses: [], unread: [] };
  return {
    folders,
    async add(folder: string): Promise<string[]> {
      const next = withLibraryFolder(await folders(), folder);
      await deps.settings.set("libraryFolders", next);
      return next;
    },
    /** Takes a folder out of the library; its files stay where they are, and what was found in it is dropped. */
    async remove(folder: string): Promise<string[]> {
      const next = withoutLibraryFolder(await folders(), folder);
      await deps.settings.set("libraryFolders", next);
      const remembered = await deps.settings.get("libraryFound");
      if (remembered !== null) await deps.settings.set("libraryFound", { ...remembered, library: relooked(remembered.library, [folder], null) });
      return next;
    },
    /** What Studio found when it last looked, for the folders in the library now; null when it hasn't looked. */
    async remembered(): Promise<RememberedLibrary | null> {
      const remembered = await deps.settings.get("libraryFound");
      return remembered === null ? null : { ...remembered, library: rememberedIn(remembered.library, await folders()) };
    },
    /** Looks through every library folder again (STU-0331). */
    async search(watch: LibraryWatch = {}): Promise<Library> {
      return remember(await searchLibrary(deps, await folders(), watch));
    },
    /** Looks only in `folder`, keeping what was found in the others (STU-0329). */
    async searchOne(folder: string, watch: LibraryWatch = {}): Promise<Library> {
      const fresh = await searchLibrary(deps, [folder], watch);
      const library = { ...relooked(rememberedIn(await kept(), await folders()), [folder], fresh), ...(fresh.stopped ? { stopped: true } : {}) };
      if (!fresh.stopped) await deps.settings.set("libraryFound", { looked: now().toISOString(), library });
      return library;
    },
  };
}

export type LibraryShelf = ReturnType<typeof createLibrary>;
