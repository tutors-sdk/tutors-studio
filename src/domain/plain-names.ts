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
  kind: "topic" | "talk" | "lab" | "note" | "web" | "github";
  /** Where it goes: a week goes in the course or a unit, everything else in a week. */
  goesIn: "course" | "week";
  /** What it needs beyond a title: a web address, or nothing. */
  address: "none" | "web" | "github";
}

/** What a lecturer can add by name, in the order the picker shows them. */
export const plainKinds: readonly PlainKind[] = [
  { word: "Lecture", also: ["Slides", "Talk", "Presentation"], kind: "talk", goesIn: "week", address: "none" },
  { word: "Lab", also: ["Practical", "Workshop", "Exercise", "Tutorial sheet"], kind: "lab", goesIn: "week", address: "none" },
  { word: "Reading", also: ["Notes", "Handout", "Page"], kind: "note", goesIn: "week", address: "none" },
  { word: "Link", also: ["Website", "Web link"], kind: "web", goesIn: "week", address: "web" },
  { word: "Code repository", also: ["Repository", "Repo", "GitHub"], kind: "github", goesIn: "week", address: "github" },
  { word: "Week", also: ["Topic", "Module"], kind: "topic", goesIn: "course", address: "none" },
];

/** The plain kind a lecturer's word names, ignoring case and spaces at the ends; undefined for a word Studio doesn't know. */
export function plainKind(word: string): PlainKind | undefined {
  const wanted = word.trim().toLowerCase();
  return plainKinds.find((plain) => [plain.word, ...plain.also].some((name) => name.toLowerCase() === wanted));
}

/** A lab step's file name from its title, keeping the lecturer's case as Tutors shows it: "CSS grid" becomes "00.CSS-grid.md". */
const stepFile = (title: string) => {
  const name = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `00.${name === "" ? "Introduction" : name}.md`;
};

/**
 * The folder for a new item among the names already in its parent: a week is numbered (topic-04), an
 * item is numbered and named from its title (lab-02-css-grid), so the folder still reads well in Git.
 */
export function plainFolder(plain: PlainKind, title: string, taken: readonly string[]): string {
  const numbered = nextItemFolder(plain.kind, taken);
  const slug = plain.kind === "topic" ? "" : slugify(title);
  return slug === "" ? numbered : `${numbered}-${slug}`;
}

/** The files a new item starts with, relative to its own folder: enough for Tutors to show it, and a line saying what goes there. */
export function plainFiles(plain: PlainKind, title: string, address: string): { path: string; content: string }[] {
  const heading = `# ${title}\n`;
  switch (plain.kind) {
    case "topic":
      return [{ path: "topic.md", content: `${heading}\nWhat students learn this week.\n` }];
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

/** Why the lecturer's answers can't become an item yet, in Studio's words, or null when they can. */
export function plainProblem(plain: PlainKind, title: string, address: string): string | null {
  if (title.trim() === "") return `Give the ${plain.word.toLowerCase()} a title. Students see it on its card.`;
  if (/[\r\n]/.test(title)) return "Keep the title to one line.";
  if (plain.address === "web" && !/^https?:\/\/\S+$/.test(address.trim())) return "Paste the full web address, starting with https://.";
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
