import type { Finding, Severity } from "./finding.ts";

/** A folder of the course as course-rules reads it: the shape the rules adapter hands the domain. */
export interface CourseFolder {
  name: string;
  path: string;
  /** The learning-object kind the folder's name declares, "course" for the root, null for none. */
  kind: string | null;
  /** The title its card shows (the first line of its descriptor), or null when it has none. */
  title?: string | null;
  files: { name: string; path: string }[];
  children: CourseFolder[];
}

/** What the lecturer sees for one folder on the course map. */
export interface MapNode {
  path: string;
  name: string;
  /** The title its card shows, or null when it has none: the map shows this before the folder name. */
  title: string | null;
  /** The learning-object kind the folder's name declares ("course" for the root), null for none. */
  kind: string | null;
  /** "Topic", "Talk", "Lab" ... or null for a folder Tutors won't publish. */
  label: string | null;
  /** True when Tutors leaves the folder out of the course (a V002 or V018 finding). */
  unpublished: boolean;
  /** True for an unpublished folder and everything inside it: none of it reaches the course, whatever its name. */
  excluded: boolean;
  /** The worst severity among findings on this folder or the files directly in it. */
  status: Severity | "ok";
  findings: Finding[];
  children: MapNode[];
}

const labels: Record<string, string> = {
  course: "Course",
  unit: "Unit",
  side: "Side unit",
  topic: "Topic",
  talk: "Talk",
  paneltalk: "Panel talk",
  note: "Note",
  panelnote: "Panel note",
  lab: "Lab",
  web: "Web link",
  github: "GitHub link",
  archive: "Archive",
  video: "Video",
  panelvideo: "Panel video",
  podcast: "Podcast",
  tutorial: "Tutorial",
  notebook: "Notebook",
  whiteboard: "Whiteboard",
  quiz: "Quiz",
};

export const labelFor = (kind: string | null): string | null => (kind === null ? null : (labels[kind] ?? kind));

const worst = (findings: Finding[]): Severity | "ok" =>
  findings.some((f) => f.severity === "error") ? "error" : findings.some((f) => f.severity === "warn") ? "warn" : findings.some((f) => f.severity === "info") ? "info" : "ok";

/**
 * Joins the folder tree with the findings into the map the lecturer sees. Every finding lands on exactly
 * one node: the folder it names, or the folder holding the file it names. Pure: the same tree and
 * findings always give the same map.
 */
export function buildCourseMap(root: CourseFolder, findings: readonly Finding[]): MapNode {
  const folderPaths = new Set<string>();
  const collect = (folder: CourseFolder) => {
    folderPaths.add(folder.path);
    folder.children.forEach(collect);
  };
  collect(root);
  const owner = (path: string): string => {
    if (folderPaths.has(path)) return path;
    const slash = path.lastIndexOf("/");
    return slash === -1 ? "" : owner(path.slice(0, slash));
  };
  const byFolder = new Map<string, Finding[]>();
  for (const finding of findings) {
    const at = owner(finding.path);
    byFolder.set(at, [...(byFolder.get(at) ?? []), finding]);
  }
  const toNode = (folder: CourseFolder, insideExcluded: boolean): MapNode => {
    const own = byFolder.get(folder.path) ?? [];
    const unpublished = own.some((f) => (f.rule === "V002" || f.rule === "V018") && f.path === folder.path);
    const excluded = insideExcluded || unpublished;
    return {
      path: folder.path,
      name: folder.name,
      title: excluded ? null : (folder.title ?? null) || null,
      kind: folder.kind,
      label: excluded ? null : labelFor(folder.kind),
      unpublished,
      excluded,
      status: worst(own),
      findings: own,
      children: folder.children.map((child) => toNode(child, excluded)),
    };
  };
  return toNode(root, false);
}

/** A folder's children as a lecturer reads them: what will be published, in course order, then what won't. */
/** What to call the place a finding names, in the lecturer's words: the nearest titled part of the course holding it. */
export function placeName(map: MapNode, path: string): string {
  if (path === "") return "The whole course";
  const holder = flatten(map)
    .filter((node) => node.path !== "" && (node.path === path || path.startsWith(`${node.path}/`)))
    .sort((a, b) => b.path.length - a.path.length)[0];
  if (!holder) return "The whole course";
  return holder.title ?? (holder.unpublished ? holder.name : (labelFor(holder.kind) ?? "Part of the course"));
}

export const publishedFirst = (nodes: readonly MapNode[]): MapNode[] => [...nodes.filter((node) => !node.excluded), ...nodes.filter((node) => node.excluded)];

/** Every node of the map, depth first: what a test or the a11y tree walks. */
export function flatten(node: MapNode): MapNode[] {
  return [node, ...node.children.flatMap(flatten)];
}

/** How far along a week is, as the course home shows it (feature 9): empty, holding pages still to write, or written. */
export type WeekState = "empty" | "not-written" | "written";

/**
 * What the course home says beside a week, worst first: what stops it, then what is missing, then that it
 * is ready, saying so when it has changed since the course was last published.
 */
export function weekFlag(week: MapNode, state: WeekState | undefined, needsFixing: boolean, changed = false): string | null {
  if (week.unpublished) return "Won't be published";
  if (needsFixing) return "Needs sorting out";
  if (state === "empty") return "Empty so far";
  if (state === "not-written") return "Still to write";
  if (changed) return "Changed since you published";
  if (state === "written") return "Written";
  return null;
}
