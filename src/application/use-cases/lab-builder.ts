import { findFolder } from "../../domain/arrange.ts";
import { isPicture, notAPicture, pictureName } from "../../domain/course-details.ts";
import { BIN_FOLDER, binName } from "../../domain/history.ts";
import { labWords, renumbered, stepFileFor, steppedOrder, stepsOf, withHeading, withPicture, type LabChange, type LabStep } from "../../domain/lab-steps.ts";
import type { FileOp } from "../../domain/plan.ts";
import type { ArrangePlan } from "../ports/authoring.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { FileSystemPort } from "../ports/file-system.ts";

/** Where a lab keeps the pictures its steps show, beside the steps (the lab's own card picture stays its own). */
export const LAB_PICTURES = "img";

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
const encode = (text: string) => new TextEncoder().encode(text);

/** The lab builder: a lab's steps read from its folder, and every change to them planned, never written (ADR 0004). */
export function labBuilderUseCases(deps: { fs: FileSystemPort; rules: CourseRulesPort; newId: () => string }) {
  const { fs, rules } = deps;
  const stepsIn = async (lab: string) => stepsOf((await fs.list(lab)).filter((entry) => entry.kind === "file").map((entry) => entry.name));
  const planned = (lab: string, summary: string, ops: FileOp[]): ArrangePlan => ({ ok: true, plan: { id: deps.newId(), summary, ops }, notes: [], select: lab });
  const refuse = (message: string): ArrangePlan => ({ ok: false, message });
  const titleProblem = (title: string) => (title.trim() === "" ? labWords.noTitle : /[\r\n]/.test(title) ? labWords.oneLine : null);
  const firstNumber = (steps: readonly LabStep[]) => steps[0]?.number ?? 1;

  return {
    /** A lab's steps in the order students see them. Reads only. */
    async labSteps(lab: string): Promise<LabStep[]> {
      return stepsIn(lab);
    },

    async planLabStep(lab: string, change: LabChange): Promise<ArrangePlan> {
      const folder = findFolder(await rules.buildTree(fs), lab);
      if (folder === undefined || folder.kind !== "lab") return refuse(`Studio can't find the lab "${lab}" in this course.`);
      const labTitle = folder.title ?? folder.name;
      const steps = await stepsIn(lab);
      if (change.do === "add") {
        const problem = titleProblem(change.title);
        if (problem) return refuse(problem);
        const title = change.title.trim();
        const file = stepFileFor(steps.length === 0 ? 1 : steps[steps.length - 1].number + 1, title);
        return planned(lab, `Add the step "${title}" at the end of "${labTitle}"`, [
          { op: "write", path: `${lab}/${file}`, content: encode(`# ${title}\n\nWhat students do in this step.\n`) },
        ]);
      }
      const step = steps.find((candidate) => candidate.file === change.file);
      if (step === undefined) return refuse(labWords.missing(change.file));
      if (change.do === "move") {
        const order = steppedOrder(steps, step.file, change.by);
        if (order === null) return refuse(labWords.atEnd);
        return planned(lab, `Move the step "${step.title}" ${change.by < 0 ? "earlier" : "later"} in "${labTitle}"`, renumbered(lab, order, firstNumber(steps)));
      }
      if (change.do === "retitle") {
        const problem = titleProblem(change.title);
        if (problem) return refuse(problem);
        const title = change.title.trim();
        const to = stepFileFor(step.number, title);
        const page = withHeading(decode(await fs.read(`${lab}/${step.file}`)), title);
        if (to === step.file && page === decode(await fs.read(`${lab}/${step.file}`))) return refuse(labWords.same);
        // The page is rewritten where it is, then renamed: a plan never writes and moves onto the same path.
        const ops: FileOp[] = [{ op: "write", path: `${lab}/${step.file}`, content: encode(page) }];
        if (to !== step.file) ops.push({ op: "move", from: `${lab}/${step.file}`, to: `${lab}/${to}` });
        return planned(lab, `Call the step "${step.title}" "${title}"`, ops);
      }
      if (change.do === "remove") {
        const binned = new Set((await fs.exists(BIN_FOLDER)) ? (await fs.list(BIN_FOLDER)).map((entry) => entry.name) : []);
        const rest = steps.filter((candidate) => candidate !== step);
        return planned(lab, `Remove the step "${step.title}" from "${labTitle}" to the bin`, [
          { op: "move", from: `${lab}/${step.file}`, to: `${BIN_FOLDER}/${binName(step.file, binned)}` },
          ...renumbered(lab, rest, firstNumber(steps)),
        ]);
      }
      if (!isPicture(change.picture.path)) return refuse(notAPicture(change.picture.path));
      const pictures = `${lab}/${LAB_PICTURES}`;
      const taken = new Set((await fs.exists(pictures)) ? (await fs.list(pictures)).map((entry) => entry.name) : []);
      const name = binName(pictureName(change.picture.path), taken);
      const page = withPicture(decode(await fs.read(`${lab}/${step.file}`)), name.replace(/\.[^.]+$/, "").replace(/-/g, " "), `${LAB_PICTURES}/${name}`);
      return planned(lab, `Show ${name} at the end of the step "${step.title}"`, [
        { op: "write", path: `${pictures}/${name}`, content: change.picture.bytes },
        { op: "write", path: `${lab}/${step.file}`, content: encode(page) },
      ]);
    },
  };
}
