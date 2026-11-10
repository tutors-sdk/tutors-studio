/**
 * A course's details and its cards' pictures, as Tutors reads them (STU-0104 to STU-0108): the title is the
 * first line of course.md, the credits a line in properties.yaml, the dates calendar.yaml, and a card shows
 * the first picture in its folder unless an icon is set, which Tutors shows instead.
 */

export interface CourseDetails {
  title: string;
  /** Who the course is by, shown under its title. Empty for none. */
  credits: string;
  /** The Monday teaching starts, YYYY-MM-DD, or null for a course with no calendar. */
  start: string | null;
  /** The weeks a calendar would date: one per topic in the course. */
  weeks: number;
}

/** What a card shows: a picture in its folder (by name, never drawn), an icon set in its settings, or the kind's usual icon. */
export type CardPicture = { kind: "picture"; name: string } | { kind: "icon" } | { kind: "usual" };

/** The kinds of file a card can show as its picture. */
export const PICTURE_TYPES = ["png", "jpg", "jpeg", "gif", "svg"] as const;

const extensionOf = (name: string) => (name.includes(".") ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "");

export const isPicture = (name: string): boolean => (PICTURE_TYPES as readonly string[]).includes(extensionOf(name));

/** A picture's name as it is kept in the course: lower case, words joined by hyphens, its kind kept. */
export function pictureName(name: string): string {
  const base = name.slice(name.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  const stem =
    base
      .slice(0, dot)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "picture";
  return `${stem}.${extensionOf(base)}`;
}

/** The sentence for a file a card can't show. */
export const notAPicture = (name: string) =>
  `"${name.slice(name.lastIndexOf("/") + 1)}" is not a picture a card can show. Choose a ${PICTURE_TYPES.slice(0, -1)
    .map((type) => type.toUpperCase())
    .join(", ")} or ${PICTURE_TYPES.at(-1)!.toUpperCase()} file.`;

/** The credits line of properties.yaml, or "" when there is none (a commented example counts as none). */
export function creditsOf(yaml: string): string {
  const line = yaml.split("\n").find((candidate) => /^credits:/.test(candidate));
  return line === undefined ? "" : unquote(line.slice("credits:".length).trim());
}

const unquote = (value: string) => (/^(["']).*\1$/.test(value) ? value.slice(1, -1) : value);
const quoted = (value: string) => (/^[\w .,'()&-]*$/.test(value) && !/^[-'&]/.test(value) ? value : JSON.stringify(value));

/** properties.yaml with its credits set (replacing the line, or a commented example of it, or added at the end), or taken out when empty. */
export function withCredits(yaml: string, credits: string): string {
  const clean = credits.replace(/\s+/g, " ").trim();
  const lines = yaml.split("\n");
  const at = lines.findIndex((line) => /^credits:/.test(line));
  if (clean === "") return at === -1 ? yaml : lines.filter((_, index) => index !== at).join("\n");
  const line = `credits: ${quoted(clean)}`;
  if (at !== -1) return lines.map((candidate, index) => (index === at ? line : candidate)).join("\n");
  const example = lines.findIndex((candidate) => /^#\s*credits:/.test(candidate));
  if (example !== -1) return lines.map((candidate, index) => (index === example ? line : candidate)).join("\n");
  return `${yaml}${yaml === "" || yaml.endsWith("\n") ? "" : "\n"}${line}\n`;
}

/** The first date a calendar.yaml gives, which is when teaching starts; null for none. */
export function startOf(calendar: string): string | null {
  return /^\s*-\s*date:\s*(\d{4}-\d{2}-\d{2})\s*$/m.exec(calendar)?.[1] ?? null;
}

/** True for a real date written YYYY-MM-DD. */
export function isDate(text: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match === null) return false;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).toISOString().slice(0, 10) === text;
}

/** YAML with a top-level `icon:` entry, and everything indented under it, taken out. */
export function withoutIcon(yaml: string): string {
  const lines = yaml.split("\n");
  const kept: string[] = [];
  let skipping = false;
  for (const line of lines) {
    if (/^icon:/.test(line)) {
      skipping = true;
      continue;
    }
    if (skipping && /^\s+\S/.test(line)) continue;
    skipping = false;
    kept.push(line);
  }
  return kept.join("\n");
}

export const hasIcon = (yaml: string): boolean => /^icon:/m.test(yaml);

const FRONT = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

/** A page's front matter (the YAML between its opening --- lines), or "" for none. */
export const frontMatterOf = (markdown: string): string => FRONT.exec(markdown)?.[1] ?? "";

/** A page with the icon taken out of its front matter; front matter left empty goes too. */
export function pageWithoutIcon(markdown: string): string {
  const match = FRONT.exec(markdown);
  if (match === null) return markdown;
  const rest = markdown.slice(match[0].length);
  const front = withoutIcon(match[1]).trim();
  return front === "" ? rest.replace(/^\r?\n/, "") : `---\n${front}\n---\n${rest}`;
}
