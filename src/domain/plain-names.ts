/**
 * Plain names: the words a lecturer uses for what they add ("Lecture", "Lab", "Reading"), each mapped to
 * the kind Tutors reads from a folder's name (talk, lab, note). The lecturer never types `lab-` or
 * `talk-`; Studio names the folder and writes the files Tutors needs. Pure.
 */
import { nextItemFolder } from "./material.ts";
import { slugify } from "./slug.ts";

export interface PlainKind {
  /** The word Studio shows: what a lecturer calls it. */
  word: string;
  /** Other words lecturers use for the same thing. */
  also: string[];
  /** The kind Tutors reads from the folder's name. */
  kind: "topic" | "unit" | "talk" | "lab" | "note" | "web" | "github" | "panelvideo";
  /** Where it goes: a week goes in the course or a unit, everything else in a week. */
  goesIn: "course" | "week";
  /** What it needs beyond a title: a web address, a repository, a video's address, or nothing. */
  address: "none" | "web" | "github" | "video";
}

/** What a lecturer can add by name, in the order the picker shows them. */
export const plainKinds: readonly PlainKind[] = [
  { word: "Lecture", also: ["Slides", "Talk", "Presentation"], kind: "talk", goesIn: "week", address: "none" },
  { word: "Lab", also: ["Practical", "Workshop", "Exercise", "Tutorial sheet"], kind: "lab", goesIn: "week", address: "none" },
  { word: "Reading", also: ["Notes", "Handout", "Page"], kind: "note", goesIn: "week", address: "none" },
  { word: "Link", also: ["Website", "Web link"], kind: "web", goesIn: "week", address: "web" },
  { word: "Code repository", also: ["Repository", "Repo", "GitHub"], kind: "github", goesIn: "week", address: "github" },
  { word: "Video link", also: ["Video", "YouTube", "Recording"], kind: "panelvideo", goesIn: "week", address: "video" },
  { word: "Week", also: ["Topic", "Module"], kind: "topic", goesIn: "course", address: "none" },
  { word: "Section", also: ["Unit", "Part", "Block"], kind: "unit", goesIn: "course", address: "none" },
];

/** The plain kind a lecturer's word names, ignoring case and spaces at the ends; undefined for a word Studio doesn't know. */
export function plainKind(word: string): PlainKind | undefined {
  const wanted = word.trim().toLowerCase();
  return plainKinds.find((plain) => [plain.word, ...plain.also].some((name) => name.toLowerCase() === wanted));
}

/** A lab step's name from its title, keeping the lecturer's case as Tutors shows it: "CSS grid" becomes "CSS-grid". */
export const stepName = (title: string): string =>
  title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "Introduction";

/** A lab's first step file from its title: "CSS grid" becomes "00.CSS-grid.md". */
const stepFile = (title: string) => `00.${stepName(title)}.md`;

/**
 * The folder for a new item among the names already in its parent: a week is numbered (topic-04), an
 * item is numbered and named from its title (lab-02-css-grid), so the folder still reads well in Git.
 */
export function plainFolder(plain: PlainKind, title: string, taken: readonly string[]): string {
  const numbered = nextItemFolder(plain.kind, taken);
  const slug = plain.kind === "topic" || plain.kind === "unit" ? "" : slugify(title);
  return slug === "" ? numbered : `${numbered}-${slug}`;
}

/** The files a new item starts with, relative to its own folder: enough for Tutors to show it, and a line saying what goes there. */
export function plainFiles(plain: PlainKind, title: string, address: string): { path: string; content: string }[] {
  const heading = `# ${title}\n`;
  switch (plain.kind) {
    case "topic":
      return [{ path: "topic.md", content: `${heading}\nWhat students learn this week.\n` }];
    case "unit":
      return [{ path: "unit.md", content: `${heading}\nThe weeks this section groups.\n` }];
    case "panelvideo":
      return [
        { path: "panelvideo.md", content: heading },
        { path: "videoid", content: `${videoIdFrom(address)}\n` },
      ];
    case "talk":
      return [
        { path: "talk.md", content: `${heading}\nWhat this lecture covers.\n` },
        { path: "slides.marp", content: `---\nmarp: true\npaginate: true\n---\n\n${heading}\n---\n\n## First point\n\n- Something students will take away\n` },
      ];
    case "lab":
      return [{ path: stepFile(title), content: `${heading}\nWhat students build in this lab, and what they need before they start.\n` }];
    case "note":
      return [{ path: "note.md", content: `${heading}\nWrite the reading here.\n` }];
    case "web":
      return [
        { path: "web.md", content: heading },
        { path: "weburl", content: `${address}\n` },
      ];
    case "github":
      return [
        { path: "github.md", content: heading },
        { path: "githubid", content: `${address}\n` },
      ];
  }
}

/**
 * What a video link's videoid file holds: the YouTube id from a YouTube address (watch, youtu.be, embed or
 * shorts), the address itself for any other https video, or a bare id as given; "" for anything else.
 */
export function videoIdFrom(address: string): string {
  const text = address.trim();
  const youtube = /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(text);
  if (youtube) return youtube[1];
  if (/^https:\/\/\S+$/.test(text)) return text;
  return /^[\w-]{6,}$/.test(text) ? text : "";
}

/** Why the lecturer's answers can't become an item yet, in Studio's words, or null when they can. */
export function plainProblem(plain: PlainKind, title: string, address: string): string | null {
  if (title.trim() === "") return `Give the ${plain.word.toLowerCase()} a title. Students see it on its card.`;
  if (/[\r\n]/.test(title)) return "Keep the title to one line.";
  if (plain.address === "web" && !/^https?:\/\/\S+$/.test(address.trim())) return "Paste the full web address, starting with https://.";
  if (plain.address === "video" && videoIdFrom(address) === "") return "Paste the video's address, like https://www.youtube.com/watch?v=… or https://youtu.be/….";
  if (plain.address === "github" && !/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+/.test(address.trim()))
    return "Paste the repository's address on GitHub, starting with https://github.com/.";
  return null;
}

/** What Studio says for a word it doesn't know. */
export const unknownWord = (word: string): string =>
  `Studio doesn't know "${word.trim()}" yet. Try ${plainKinds
    .map((plain) => plain.word)
    .slice(0, -1)
    .join(", ")} or ${plainKinds[plainKinds.length - 1].word}.`;

/** The words a folder students can't see can be made into: the kinds Tutors shows from a folder's files alone. */
export const visibleKinds = (scope: "week" | "course"): readonly PlainKind[] => plainKinds.filter((plain) => plain.goesIn === scope && plain.address === "none");

/** A title from a folder's own name: "css_grid-practical" reads "css grid practical". */
export const titleFromFolder = (name: string): string => name.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();

const LAB_STEP = /^\d{2}\.[^.].*\.md$/;

/**
 * What a folder of the lecturer's own needs before Tutors shows it as `plain`, relative to the folder: the
 * files its kind still lacks, and, for a lab, its unnumbered pages numbered as steps in name order after
 * any steps it already has. What is already there is kept; nothing is written over. Pure.
 */
export function visibleChanges(plain: PlainKind, title: string, files: readonly string[]): { writes: { path: string; content: string }[]; moves: { from: string; to: string }[] } {
  const md = files.filter((name) => name.endsWith(".md")).sort();
  const starting = plainFiles(plain, title, "");
  const has = (extension: string) => files.some((name) => name.endsWith(`.${extension}`));
  if (plain.kind === "lab") {
    const steps = md.filter((name) => LAB_STEP.test(name));
    const loose = md.filter((name) => !LAB_STEP.test(name));
    if (md.length === 0) return { writes: starting, moves: [] };
    let next = steps.length === 0 ? 1 : Math.max(...steps.map((name) => Number(name.slice(0, 2)))) + 1;
    const moves = loose.map((name) => ({ from: name, to: `${String(next++).padStart(2, "0")}.${name.replace(/\s+/g, "-")}` }));
    return { writes: [], moves };
  }
  if (plain.kind === "talk") {
    const writes = [
      ...(md.length === 0 ? starting.filter((file) => file.path.endsWith(".md")) : []),
      ...(has("pdf") || has("marp") || files.includes("videoid") ? [] : starting.filter((file) => file.path.endsWith(".marp"))),
    ];
    return { writes, moves: [] };
  }
  return { writes: md.length === 0 ? starting : [], moves: [] };
}
