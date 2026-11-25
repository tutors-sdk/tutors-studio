import { isDriveFolder } from "../../domain/drive.ts";
import { lastPart, type LibraryCourse, type LibraryItem, type StoredFolder } from "../../domain/library.ts";
import type { FileOp, Plan } from "../../domain/plan.ts";
import {
  CATALOGUE_FILE,
  indexPath,
  isLicence,
  itemsFolder,
  neverShared,
  REGISTRY_FILE,
  REGISTRY_FORMAT,
  registryName,
  withEntry,
  type Catalogue,
  type RegistryFile,
  type RegistryIndex,
  type RegistryVersion,
} from "../../domain/registry.ts";
import type { FileSystemPort } from "../ports/file-system.ts";
import type { LibraryPort } from "../ports/library.ts";
import type { RegistryPort } from "../ports/registry.ts";
import { applyPlan } from "./apply-plan.ts";
import { digestOf, folderFiles, type StoredFile } from "./stored-files.ts";

/** What a lecturer shares: a ready course whole, or one of its items, into a registry folder under a licence. */
export interface ShareRequest {
  course: LibraryCourse;
  /** The item's path in the course; null shares the whole course. */
  item: string | null;
  /** The registry's folder: an empty folder starts a registry. */
  registry: string;
  publisher: string;
  /** The entry's name; empty takes it from the title. */
  name?: string;
  licence: string;
}

export type ShareProblem = { field: "course" | "item" | "registry" | "publisher" | "licence"; message: string };

export interface ShareDeps {
  library: LibraryPort;
  registry: RegistryPort;
  newId: () => string;
  /** Today (YYYY-MM-DD). */
  today: () => string;
}

export interface SharePlan {
  plan: Plan;
  /** Sentences to read before accepting. */
  notes: string[];
  publisher: string;
  name: string;
  version: number;
}

const joined = (dir: string, name: string) => (dir === "" ? name : `${dir}/${name}`);
const encoder = new TextEncoder();
const json = (value: unknown) => encoder.encode(`${JSON.stringify(value, null, 2)}\n`);

async function readJson<T>(library: LibraryPort, folder: string, path: string): Promise<T | null> {
  try {
    return JSON.parse(new TextDecoder().decode(await library.read(folder, path))) as T;
  } catch {
    return null;
  }
}

async function listed(library: LibraryPort, folder: string, dir: string) {
  try {
    return await library.list(folder, dir);
  } catch {
    return null;
  }
}

/** One RegistryPort over registries on this computer and on Google Drive, each sent to the port that reaches it. */
export function routedRegistry(local: RegistryPort, drive: RegistryPort | null): RegistryPort {
  const to = (folder: string): RegistryPort => {
    if (!isDriveFolder(folder)) return local;
    if (drive === null) throw new Error("This copy of Studio can't reach Google Drive.");
    return drive;
  };
  return { write: (folder, path, bytes) => to(folder).write(folder, path, bytes), remove: (folder, path) => to(folder).remove(folder, path) };
}

/** A registry folder as a file system: read through the library, written through the registry port (ADR 0063). */
export function registryFiles(library: LibraryPort, registry: RegistryPort, folder: string): FileSystemPort {
  return {
    list: (dir) => library.list(folder, dir),
    read: (path) => library.read(folder, path),
    exists: async (path) => {
      const slash = path.lastIndexOf("/");
      const entries = await listed(library, folder, slash < 0 ? "" : path.slice(0, slash));
      return entries?.some((entry) => entry.name === path.slice(slash + 1)) ?? false;
    },
    write: (path, bytes) => registry.write(folder, path, bytes),
    move: async () => {
      throw new Error("Studio never moves files in a registry.");
    },
    remove: (path) => registry.remove(folder, path),
    watch: () => () => {},
  };
}

/** The folders a share stores, with their files: each top-level learning object and the course's own files, or the one item. */
async function sharedFolders(
  library: LibraryPort,
  course: LibraryCourse,
  item: LibraryItem | null,
): Promise<{ folders: { path: string; files: StoredFile[] }[]; leftOut: string[] }> {
  const skipIn = (folder: string) => (path: string) => neverShared(joined(folder, path));
  if (item !== null) return { folders: [{ path: item.path, files: await folderFiles(library, course.library, joined(course.path, item.path), skipIn(item.path)) }], leftOut: [] };
  const top = await library.list(course.library, course.path);
  const leftOut = top.filter((entry) => !entry.name.startsWith(".") && neverShared(entry.name)).map((entry) => entry.name);
  const own: StoredFile[] = [];
  const folders: { path: string; files: StoredFile[] }[] = [];
  for (const entry of top) {
    if (neverShared(entry.name)) continue;
    if (entry.kind === "file") own.push({ path: entry.name, bytes: await library.read(course.library, joined(course.path, entry.name)) });
    else folders.push({ path: entry.name, files: await folderFiles(library, course.library, joined(course.path, entry.name), skipIn(entry.name)) });
  }
  return { folders: [{ path: "", files: own.sort((a, b) => (a.path < b.path ? -1 : 1)) }, ...folders.filter((folder) => folder.files.length > 0)], leftOut: leftOut.sort() };
}

/**
 * The plan for sharing a ready course, or one item of it, into a folder registry (STU-0271): each folder stored
 * once under its digest (STU-0273), never the files a course keeps to itself (STU-0274), under the licence the
 * lecturer chose, which nothing shares without (STU-0272). Reads the library and the registry; writes nothing.
 */
export async function planShare(
  deps: Pick<ShareDeps, "library" | "newId" | "today">,
  request: ShareRequest,
): Promise<{ ok: true; share: SharePlan } | { ok: false; problems: ShareProblem[] }> {
  const problems: ShareProblem[] = [];
  const { course } = request;
  if (course.entry) problems.push({ field: "course", message: `${course.title} is already in a registry: share the course it came from instead.` });
  else if (course.group !== "ready") problems.push({ field: "course", message: `${course.title} needs fixing before it can be shared.` });
  const item = request.item === null ? null : (course.items.find((found) => found.path === request.item) ?? null);
  if (request.item !== null && item === null && course.group === "ready") problems.push({ field: "item", message: `${course.title} has no item at "${request.item}".` });
  const licence = request.licence.trim();
  if (licence === "") problems.push({ field: "licence", message: "Choose a licence. Studio shares nothing without one, so others know how they may use it." });
  else if (!isLicence(licence)) problems.push({ field: "licence", message: `"${licence}" doesn't read as a licence identifier, such as CC-BY-4.0 or MIT.` });
  const publisher = registryName(request.publisher);
  if (publisher === "") problems.push({ field: "publisher", message: "Give a publisher name with at least one letter or number, such as your name or your department." });
  const title = item?.title ?? course.title;
  const name = registryName(request.name?.trim() || title);
  const top = await listed(deps.library, request.registry, "");
  const known = top === null ? null : await readJson<RegistryFile>(deps.library, request.registry, REGISTRY_FILE);
  if (top === null) problems.push({ field: "registry", message: `Studio can't open ${request.registry}.` });
  else if (known === null && top.some((entry) => !entry.name.startsWith(".")))
    problems.push({ field: "registry", message: `${lastPart(request.registry)} isn't a registry and isn't empty: choose an empty folder to start one.` });
  if (problems.length > 0) return { ok: false, problems };

  const { folders, leftOut } = await sharedFolders(deps.library, course, item);
  const stored: StoredFolder[] = [];
  for (const folder of folders) stored.push({ path: folder.path, digest: await digestOf(folder.files) });
  const index = (await readJson<RegistryIndex>(deps.library, request.registry, indexPath(publisher, name))) ?? { name, publisher, versions: [] };
  const last = index.versions[index.versions.length - 1];
  const same = (a: StoredFolder[], b: StoredFolder[]) => JSON.stringify(a) === JSON.stringify(b);
  if (last !== undefined && last.licence === licence && last.title === title && same(last.folders, stored))
    return { ok: false, problems: [{ field: "course", message: `${title} is already shared as ${publisher}/${name} version ${last.version}, and nothing has changed since.` }] };

  const version: RegistryVersion = {
    version: (last?.version ?? 0) + 1,
    published: deps.today(),
    licence,
    title,
    kind: item === null ? "course" : item.kind,
    from: course.title,
    folders: stored,
    items: item === null ? course.items : course.items.filter((found) => found.path === item.path || found.path.startsWith(`${item.path}/`)),
  };
  const next: RegistryIndex = { ...index, versions: [...index.versions, version] };
  const ops: FileOp[] = [];
  if (known === null) ops.push({ op: "write", path: REGISTRY_FILE, content: json({ format: REGISTRY_FORMAT, name: lastPart(request.registry) } satisfies RegistryFile) });
  const already = new Set((await listed(deps.library, request.registry, "items"))?.map((entry) => entry.name) ?? []);
  const kept = new Set<string>();
  for (const [at, folder] of folders.entries()) {
    const where = itemsFolder(stored[at].digest);
    // The same files are stored once, however many entries and versions hold them (STU-0273).
    if (already.has(where.slice("items/".length)) || kept.has(where)) continue;
    kept.add(where);
    for (const file of folder.files) ops.push({ op: "write", path: `${where}/${file.path}`, content: file.bytes });
  }
  const catalogue = (await readJson<Catalogue>(deps.library, request.registry, CATALOGUE_FILE)) ?? { format: REGISTRY_FORMAT, entries: [] };
  ops.push({ op: "write", path: indexPath(publisher, name), content: json(next) });
  ops.push({ op: "write", path: CATALOGUE_FILE, content: json(withEntry(catalogue, next)) });

  const reused = folders.length - kept.size;
  const notes = [
    `Studio copies ${item === null ? "the course" : "it"} into the registry. Anyone who can open ${lastPart(request.registry)} can use it under ${licence}; your course stays as it is.`,
    ...(leftOut.length > 0 ? [`Left out, because a course keeps them to itself: ${leftOut.join(", ")}.`] : []),
    ...(reused > 0 ? [`${reused} of ${folders.length} folders are already in the registry, so they are stored once.`] : []),
  ];
  return {
    ok: true,
    share: {
      plan: { id: deps.newId(), summary: `Share ${title} to ${lastPart(request.registry)} as ${publisher}/${name} version ${version.version}, under ${licence}`, ops },
      notes,
      publisher,
      name,
      version: version.version,
    },
  };
}

export type ShareResult = { ok: true; share: SharePlan } | { ok: false; problems: ShareProblem[]; reason: string };

/** Shares as planned: the plan applied whole to the registry folder, or not at all (ADR 0004). */
export async function share(deps: ShareDeps, request: ShareRequest): Promise<ShareResult> {
  const planned = await planShare(deps, request);
  if (!planned.ok) return { ok: false, problems: planned.problems, reason: planned.problems[0].message };
  const applied = await applyPlan(registryFiles(deps.library, deps.registry, request.registry), planned.share.plan);
  if (!applied.ok) return { ok: false, problems: [], reason: `Nothing was shared: ${applied.blockedBy} (${applied.reason})` };
  return { ok: true, share: planned.share };
}
