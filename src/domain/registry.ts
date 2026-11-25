import type { LibraryItem, StoredFolder } from "./library.ts";
import { slugify } from "./slug.ts";

/**
 * A folder registry (ADR 0063): Tutors courses and items shared as plain files in a folder, a shared drive or a
 * USB stick, in the layout the design doc gives every registry, local or hosted:
 *
 *   registry.json                          the format and the registry's name
 *   catalogue.json                         the latest version of every entry, for browsing
 *   index/<publisher>/<name>.json          every version of one entry
 *   items/<sha256>/...                     one learning object's files, stored once under their digest
 */

export const REGISTRY_FILE = "registry.json";
export const CATALOGUE_FILE = "catalogue.json";
export const REGISTRY_FORMAT = 1;

export type { StoredFolder };

/** registry.json */
export interface RegistryFile {
  format: number;
  name: string;
}

/** One version of an entry, as its index file keeps it. */
export interface RegistryVersion {
  version: number;
  /** YYYY-MM-DD */
  published: string;
  /** An SPDX licence identifier or expression: required to share (STU-0272). */
  licence: string;
  title: string;
  /** "course" for a whole course, or the kind of the one item shared. */
  kind: string;
  /** The course the entry was shared from, by title. */
  from: string;
  folders: StoredFolder[];
  /** Every week and item that can be picked from it, with paths inside the entry. */
  items: LibraryItem[];
}

export interface RegistryIndex {
  name: string;
  publisher: string;
  versions: RegistryVersion[];
}

export interface CatalogueEntry {
  name: string;
  publisher: string;
  title: string;
  kind: string;
  version: number;
  licence: string;
  published: string;
}

export interface Catalogue {
  format: number;
  entries: CatalogueEntry[];
}

/** The folder under items/ that holds a stored folder's files. Pure. */
export const itemsFolder = (digest: string): string => `items/${digest.replace(/^sha256:/, "")}`;

/** Where an entry's index file lives. Pure. */
export const indexPath = (publisher: string, name: string): string => `index/${publisher}/${name}.json`;

/** A publisher's or an entry's name as a registry stores it: lower-case letters, digits and hyphens. Pure. */
export const registryName = (text: string): string => slugify(text);

/**
 * Files never shared: Tutors' build output, hidden files and folders, the term's dates, student lists, hosting
 * settings and environment files (STU-0274). `path` is relative to the course. Pure.
 */
export function neverShared(path: string): boolean {
  const parts = path.split("/");
  if (parts.some((part) => part.startsWith(".") || part === "node_modules")) return true;
  if (["json", "html", "_site"].includes(parts[0])) return true;
  return parts.length === 1 && ["calendar.yaml", "enrollment.yaml", "netlify.toml"].includes(parts[0]);
}

/** Licence identifiers Studio suggests; any SPDX identifier or expression is accepted. */
export const SUGGESTED_LICENCES = ["CC-BY-4.0", "CC-BY-SA-4.0", "CC-BY-NC-4.0", "CC-BY-NC-SA-4.0", "CC0-1.0", "MIT", "Apache-2.0"];

/** Whether a licence reads as an SPDX identifier or expression ("CC-BY-4.0", "MIT OR Apache-2.0", "LicenseRef-x"). Pure. */
export function isLicence(text: string): boolean {
  const id = "[A-Za-z0-9][A-Za-z0-9.+-]*";
  return new RegExp(`^${id}( (AND|OR|WITH) ${id})*$`).test(text.trim());
}

/** The catalogue with an entry's latest version put in, replacing any earlier one, ordered by name. Pure. */
export function withEntry(catalogue: Catalogue, index: RegistryIndex): Catalogue {
  const latest = index.versions[index.versions.length - 1];
  const entry: CatalogueEntry = {
    name: index.name,
    publisher: index.publisher,
    title: latest.title,
    kind: latest.kind,
    version: latest.version,
    licence: latest.licence,
    published: latest.published,
  };
  const others = catalogue.entries.filter((other) => !(other.publisher === index.publisher && other.name === index.name));
  return { format: REGISTRY_FORMAT, entries: [...others, entry].sort((a, b) => `${a.publisher}/${a.name}`.localeCompare(`${b.publisher}/${b.name}`)) };
}

/** The stored folder an item's files are in, and its path inside that folder; null when none holds it. Pure. */
export function storedFolderOf(folders: readonly StoredFolder[], path: string): { folder: StoredFolder; rest: string } | null {
  const holders = folders.filter((folder) => folder.path !== "" && (path === folder.path || path.startsWith(`${folder.path}/`)));
  const best = holders.sort((a, b) => b.path.length - a.path.length)[0];
  if (best === undefined) return null;
  return { folder: best, rest: path === best.path ? "" : path.slice(best.path.length + 1) };
}
