/**
 * The lab builder (feature 10): a lab's steps are its numbered pages, 00.Setup.md, 01.Grid.md ..., shown
 * in file-name order. Studio adds, reorders, retitles and removes them by renaming files, so the lecturer
 * never types a step number. Pure.
 */
import type { DroppedFile } from "./material.ts";
import type { FileOp } from "./plan.ts";
import { stepName } from "./plain-names.ts";

const STEP = /^(\d{2})\.(.+)\.md$/;

export interface LabStep {
  /** The file's name in the lab's folder: "01.Setup.md". */
  file: string;
  number: number;
  /** As the lecturer reads it: "Setup", from the name. */
  title: string;
}

export const isStep = (name: string): boolean => STEP.test(name);

/** The steps among a lab's file names, in the order students see them. */
export function stepsOf(names: readonly string[]): LabStep[] {
  return names
    .filter(isStep)
    .sort()
    .map((file) => {
      const [, number, name] = STEP.exec(file)!;
      return { file, number: Number(number), title: name.replace(/[-_]+/g, " ").trim() };
    });
}

const pad = (n: number) => String(n).padStart(2, "0");
export const stepFileFor = (number: number, title: string) => `${pad(number)}.${stepName(title)}.md`;

/**
 * The moves that give steps, in their new order, the numbers from `first` up, keeping each step's name.
 * Each move goes through a waiting name first when another step's current name is in its way, so no
 * step is written over.
 */
export function renumbered(folder: string, ordered: readonly LabStep[], first: number): FileOp[] {
  const at = (name: string) => `${folder}/${name}`;
  const wanted = ordered.map((step, index) => ({ from: step.file, to: `${pad(first + index)}.${step.file.replace(STEP, "$2")}.md` })).filter((move) => move.from !== move.to);
  const current = new Set(ordered.map((step) => step.file));
  const blocked = wanted.some((move) => current.has(move.to));
  if (!blocked) return wanted.map((move) => ({ op: "move", from: at(move.from), to: at(move.to) }));
  return [
    ...wanted.map((move): FileOp => ({ op: "move", from: at(move.from), to: at(`${move.from}.moving`) })),
    ...wanted.map((move): FileOp => ({ op: "move", from: at(`${move.from}.moving`), to: at(move.to) })),
  ];
}

/** The steps with one moved a place earlier (-1) or later (+1); null at either end or for a step that isn't there. */
export function steppedOrder(steps: readonly LabStep[], file: string, by: -1 | 1): LabStep[] | null {
  const index = steps.findIndex((step) => step.file === file);
  const other = index + by;
  if (index === -1 || other < 0 || other >= steps.length) return null;
  const order = [...steps];
  [order[index], order[other]] = [order[other], order[index]];
  return order;
}

/** A step page with its first # heading set to the title, or a heading added when it has none. */
export function withHeading(markdown: string, title: string): string {
  const lines = markdown.split("\n");
  const at = lines.findIndex((line) => /^#\s/.test(line));
  if (at === -1) return `# ${title}\n\n${markdown}`;
  lines[at] = `# ${title}`;
  return lines.join("\n");
}

/** A step page with a picture added at its end, by the address of its copy in the lab's img folder. */
export const withPicture = (markdown: string, alt: string, address: string): string => `${markdown.replace(/\s*$/, "")}\n\n![${alt}](${address})\n`;

/** Studio's words for the lab builder's refusals; these are about building, not rules. */
export const labWords = {
  noTitle: "Give the step a title. Students see it at the top of the step.",
  oneLine: "Keep the title to one line.",
  missing: (file: string) => `There is no step called "${file}" in this lab.`,
  atEnd: "That step is already at that end of the lab.",
  same: "That is already the step's title.",
} as const;

/** What the lecturer asks of a lab's steps (feature 10). */
export type LabChange =
  | { do: "add"; title: string }
  | { do: "move"; file: string; by: -1 | 1 }
  | { do: "retitle"; file: string; title: string }
  | { do: "remove"; file: string }
  | { do: "picture"; file: string; picture: DroppedFile };
