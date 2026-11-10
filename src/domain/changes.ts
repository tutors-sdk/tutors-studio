import { labelFor, type CourseFolder } from "./course-map.ts";
import { titleFromFolder } from "./plain-names.ts";

/**
 * What changed in a course since it was last published (feature 8): a digest of its files at each publish,
 * and the items they belong to, compared in a lecturer's words. Pure.
 */

/** Each file's content hash, by its path in the course. */
export type Digest = Record<string, string>;

/** What Studio keeps of a course's last publish: when, and its files and items as they were then. */
export interface LastPublish {
  /** ISO time it went online. */
  at: string;
  digest: Digest;
  /** Each item's words ("Lab "Set up""), by its folder's path; "" is the course itself. */
  items: Record<string, string>;
}

/** What never reaches students or is Studio's own: built output, the bin, git, and the setup Studio adds. */
const LEFT_OUT = [/^json\//, /^html\//, /^\.git\//, /^\.tutors-bin\//, /^node_modules\//, /^\.netlify\//, /(^|\/)\.DS_Store$/, /^netlify\.toml$/, /^\.gitignore$/];
export const isPublishedFile = (path: string): boolean => !LEFT_OUT.some((pattern) => pattern.test(path));

/** A short, stable hash of a file's bytes (two FNV-1a passes), enough to tell an edited file from an unchanged one. */
export function hashOf(bytes: Uint8Array): string {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ bytes.length;
  for (const byte of bytes) {
    a = Math.imul(a ^ byte, 0x01000193) >>> 0;
    b = Math.imul(b ^ byte, 0x5bd1e995) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

/** Each item of the course in a lecturer's words, by folder path: topics are weeks, as the course map calls them. */
export function itemsOf(root: CourseFolder): Record<string, string> {
  const items: Record<string, string> = {};
  const walk = (folder: CourseFolder) => {
    if (!isPublishedFile(`${folder.path}/`) && folder.path !== "") return;
    if (folder.kind === "course") items[folder.path] = "The course page";
    else if (folder.kind !== null) {
      const title = folder.title ?? titleFromFolder(folder.name);
      // A week already called "Week 3" is named as it is, not "Week "Week 3"".
      items[folder.path] = folder.kind === "topic" && /^week\b/i.test(title) ? title : `${folder.kind === "topic" ? "Week" : labelFor(folder.kind)} "${title}"`;
    }
    folder.children.forEach(walk);
  };
  walk(root);
  return items;
}

/** The deepest item a file belongs to: the longest item folder that holds it, else the course. */
const itemOf = (path: string, folders: readonly string[]): string =>
  folders.filter((folder) => folder !== "" && path.startsWith(`${folder}/`)).sort((x, y) => y.length - x.length)[0] ?? "";

export interface Changes {
  added: string[];
  rewritten: string[];
  removed: string[];
}

/** The items added, rewritten and removed between the last publish and now. An item added inside a new week is the week's news, not its own. */
export function changesSince(before: LastPublish, digest: Digest, items: Record<string, string>): Changes {
  const folders = [...new Set([...Object.keys(before.items), ...Object.keys(items)])];
  const touched = new Set<string>();
  for (const path of new Set([...Object.keys(before.digest), ...Object.keys(digest)])) if (before.digest[path] !== digest[path]) touched.add(itemOf(path, folders));
  const isNew = (folder: string) => folder in items && !(folder in before.items);
  const isGone = (folder: string) => folder in before.items && !(folder in items);
  const under = (folder: string, test: (other: string) => boolean) => folders.some((other) => other !== "" && other !== folder && folder.startsWith(`${other}/`) && test(other));
  const all = [...folders].sort();
  return {
    added: all.filter((folder) => isNew(folder) && !under(folder, isNew)).map((folder) => items[folder]),
    rewritten: [...touched]
      .sort()
      .filter((folder) => !isNew(folder) && !isGone(folder) && !under(folder, isNew))
      .map((folder) => items[folder] ?? before.items[folder] ?? "The course page"),
    removed: all.filter((folder) => isGone(folder) && !under(folder, isGone)).map((folder) => before.items[folder]),
  };
}

/** The folders among `folders` holding a file added, rewritten or removed since the last publish (the course home's "Changed since you published"). */
export function changedFolders(before: LastPublish, digest: Digest, folders: readonly string[]): string[] {
  const paths = [...new Set([...Object.keys(before.digest), ...Object.keys(digest)])].filter((path) => before.digest[path] !== digest[path]);
  return folders.filter((folder) => paths.some((path) => path.startsWith(`${folder}/`)));
}

const listed = (names: string[]) => (names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);

/** The changes as the publish screen says them, one sentence each; a single sentence when nothing changed. */
export function changeLines(changes: Changes): string[] {
  const lines = [
    ...(changes.added.length > 0 ? [`Added: ${listed(changes.added)}.`] : []),
    ...(changes.rewritten.length > 0 ? [`Changed: ${listed(changes.rewritten)}.`] : []),
    ...(changes.removed.length > 0 ? [`Removed: ${listed(changes.removed)}.`] : []),
  ];
  return lines.length > 0 ? lines : ["Nothing has changed since you last published."];
}

/** A publish time as the lecturer reads it: "10 November 2026". */
export const publishedOn = (at: string): string => new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
