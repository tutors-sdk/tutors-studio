import { buildCourseMap } from "../../domain/course-map.ts";
import { errorsFirst, withoutKindGuesses, type Finding } from "../../domain/finding.ts";
import type { Plan } from "../../domain/plan.ts";
import { arrangedSelection, arrangeSummary, type ArrangeAction } from "../../domain/arrange.ts";
import { BIN_FOLDER, binName, sameBytes, undoProblems, undoSummary, type Change } from "../../domain/history.ts";
import { AssistantUnavailable, type AssistantPort } from "../ports/assistant.ts";
import type {
  ApplyResult,
  ArrangePlan,
  AuthoringPort,
  HistoryEntry,
  UndoPlan,
  CourseView,
  PageEntry,
  Explanation,
  ItemPlan,
  MaterialPlan,
  OpenedQuiz,
  QuizPlan,
  QuizTarget,
} from "../ports/authoring.ts";
import { labelFor, type CourseFolder } from "../../domain/course-map.ts";
import { nextItemFolder, trayReason, type DroppedFile, type TrayFile } from "../../domain/material.ts";
import type { FileOp } from "../../domain/plan.ts";
import { emptyQuiz, type QuizForm } from "../../domain/quiz.ts";
import { slugify } from "../../domain/slug.ts";
import { plainWritingProblem } from "../../domain/plain-writing.ts";
import { plainFiles, plainFolder, plainKind, plainProblem, titleFromFolder, unknownWord, visibleChanges, visibleKinds } from "../../domain/plain-names.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { FileSystemPort } from "../ports/file-system.ts";
import type { MarkdownPort } from "../ports/markdown.ts";
import type { TelemetryPort } from "../ports/telemetry.ts";
import { applyPlan } from "./apply-plan.ts";
import { courseDetailsUseCases } from "./course-details.ts";

export interface AuthoringDeps {
  fs: FileSystemPort;
  rules: CourseRulesPort;
  assistant: AssistantPort;
  telemetry: TelemetryPort;
  /** Draws the markdown editor's preview; without it the preview is empty. */
  markdown?: MarkdownPort;
  /** Plan ids; injected so tests and replayed journeys get the same ids. */
  newId: () => string;
  /** The time a change is recorded at; injected so tests get the same times. */
  now?: () => Date;
}

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
const extensionOf = (name: string) => name.slice(name.lastIndexOf(".") + 1).toLowerCase();

const joined = (folder: string, name: string) => (folder === "" ? name : `${folder}/${name}`);
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Link files small enough to read for their address (.url, .webloc, .txt). */
const LINK_FILE = /\.(url|webloc|txt)$/i;
const LINK_LIMIT = 16 * 1024;

/** The topics of a course in reading order: the folders a week number maps onto. */
const topicsOf = (folder: CourseFolder): CourseFolder[] => [...(folder.kind === "topic" ? [folder] : []), ...folder.children.flatMap(topicsOf)];

const parentOf = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "");

/** The authoring use cases over whichever adapters the composition root bound. */
export function createAuthoring(deps: AuthoringDeps): AuthoringPort {
  const { fs, rules, assistant, telemetry } = deps;
  const now = deps.now ?? (() => new Date());
  /** The changes applied since the course opened, newest first, and which change each undo plan puts back. */
  const changes: Change[] = [];
  const undoes = new Map<string, string>();

  /** Every file under a folder, at any depth. */
  const filesUnder = async (folder: string): Promise<string[]> =>
    (await Promise.all((await fs.list(folder)).map((entry) => (entry.kind === "file" ? [joined(folder, entry.name)] : filesUnder(joined(folder, entry.name)))))).flat();

  /** For each added file, the highest folder above it that holds only files the same change added. */
  const wholeFolders = async (added: readonly string[]): Promise<Map<string, string>> => {
    const adds = new Set(added);
    const found = new Map<string, string>();
    for (const path of added) {
      const parts = path.split("/");
      for (let depth = 1; depth < parts.length; depth++) {
        const folder = parts.slice(0, depth).join("/");
        if ((await filesUnder(folder)).every((file) => adds.has(file))) {
          found.set(path, folder);
          break;
        }
      }
    }
    return found;
  };
  return {
    ...courseDetailsUseCases(deps),
    async refresh(): Promise<CourseView> {
      const [tree, findings] = await Promise.all([rules.buildTree(fs), rules.validate(fs).then(withoutKindGuesses)]);
      telemetry.event("course.validated", { errors: findings.filter((f) => f.severity === "error").length, findings: findings.length });
      return { map: buildCourseMap(tree, findings), findings: errorsFirst(findings) };
    },

    planFix(given: Finding): Plan | null {
      const [finding] = withoutKindGuesses([given]);
      if (finding.suggestedName === undefined && finding.fix?.op === "write") {
        const { path, content } = finding.fix;
        return { id: deps.newId(), summary: `Add ${path}`, ops: [{ op: "write", path, content: new TextEncoder().encode(content) }] };
      }
      if (finding.suggestedName === undefined || finding.path === "") return null;
      const name = finding.path.slice(finding.path.lastIndexOf("/") + 1);
      const to = parentOf(finding.path) + finding.suggestedName;
      return { id: deps.newId(), summary: `Rename ${name} to ${finding.suggestedName}`, ops: [{ op: "move", from: finding.path, to }] };
    },

    async planFixAll(): Promise<Plan | null> {
      const fixes = withoutKindGuesses(await rules.validate(fs)).flatMap((finding) => (finding.fix === undefined ? [] : [finding.fix]));
      const depth = (path: string) => path.split("/").length;
      // Deepest first, so renaming a folder never moves a path a later rename still names.
      const moves = fixes.flatMap((fix) => (fix.op === "move" ? [fix] : [])).sort((a, b) => depth(b.from) - depth(a.from) || a.from.localeCompare(b.from));
      const writes = fixes.flatMap((fix) => (fix.op === "write" ? [{ op: "write" as const, path: fix.path, content: new TextEncoder().encode(fix.content) }] : []));
      const ops = [...moves, ...writes];
      if (ops.length === 0) return null;
      return { id: deps.newId(), summary: `Make the ${ops.length} safe fix${ops.length === 1 ? "" : "es"} the course map suggests`, ops };
    },

    async apply(plan: Plan): Promise<ApplyResult> {
      const result = await applyPlan(fs, plan);
      telemetry.event(result.ok ? "plan.applied" : "plan.rolled-back", { plan: plan.id, ops: plan.ops.length });
      if (!result.ok) return result;
      changes.unshift({ id: plan.id, summary: plan.summary, at: now().toISOString(), steps: result.undo });
      const undone = changes.find((change) => change.id === undoes.get(plan.id));
      if (undone !== undefined) undone.undoneBy = plan.id;
      return { ok: true };
    },

    async planArrange(action: ArrangeAction): Promise<ArrangePlan> {
      const planned = await rules.rewire(fs, action);
      if (!planned.ok) return { ok: false, message: planned.reason };
      if (planned.ops.length === 0) return { ok: false, message: "That is already how the course is." };
      const summary = arrangeSummary(await rules.buildTree(fs), action);
      return { ok: true, plan: { id: deps.newId(), summary, ops: planned.ops }, notes: planned.notes, select: arrangedSelection(action, planned.ops) };
    },

    history(): HistoryEntry[] {
      return changes.map(({ id, summary, at, undoneBy }) => ({ id, summary, at, undone: undoneBy !== undefined }));
    },

    async planUndo(id: string): Promise<UndoPlan> {
      const change = changes.find((entry) => entry.id === id);
      if (change === undefined) return { ok: false, message: undoProblems.unknown() };
      if (change.undoneBy !== undefined) return { ok: false, message: undoProblems.alreadyUndone() };
      const ops: FileOp[] = [];
      const binned = new Set((await fs.exists(BIN_FOLDER)) ? (await fs.list(BIN_FOLDER)).map((entry) => entry.name) : []);
      const added = change.steps.flatMap((step) => (step.kind === "bin" ? [step.path] : []));
      const wholes = await wholeFolders(added);
      const binnedFolders = new Set<string>();
      for (const step of change.steps) {
        if (step.kind === "move-back") {
          if (!(await fs.exists(step.now))) return { ok: false, message: undoProblems.movedSince(step.now) };
          if (await fs.exists(step.was)) return { ok: false, message: undoProblems.occupied(step.was) };
          ops.push({ op: "move", from: step.now, to: step.was });
          continue;
        }
        // A file this change wrote: put back only what still holds exactly what it wrote.
        if (!(await fs.exists(step.path)) || !sameBytes(await fs.read(step.path), step.written)) return { ok: false, message: undoProblems.changedSince(step.path) };
        if (step.kind === "restore") {
          ops.push({ op: "write", path: step.path, content: step.content });
        } else {
          // A folder the change made, holding nothing else, goes to the bin whole rather than file by file.
          const from = wholes.get(step.path) ?? step.path;
          if (binnedFolders.has(from)) continue;
          binnedFolders.add(from);
          const name = binName(from.slice(from.lastIndexOf("/") + 1), binned);
          binned.add(name);
          ops.push({ op: "move", from, to: `${BIN_FOLDER}/${name}` });
        }
      }
      const plan = { id: deps.newId(), summary: undoSummary(change.summary), ops };
      undoes.set(plan.id, change.id);
      return { ok: true, plan };
    },

    async openQuiz(folder: string): Promise<OpenedQuiz> {
      const pages = (await fs.list(folder))
        .filter((entry) => entry.kind === "file" && extensionOf(entry.name) === "md")
        .map((entry) => entry.name)
        .sort();
      if (pages.length === 0) return { page: null, form: emptyQuiz(), leftOut: [] };
      const page = joined(folder, pages[0]);
      return { page, ...rules.readQuiz(text(await fs.read(page))) };
    },

    async planQuiz(target: QuizTarget, form: QuizForm): Promise<QuizPlan> {
      const heading = form.heading.trim() === "" ? "Quiz" : form.heading;
      const written = rules.writeQuiz({ ...form, heading });
      if (!written.ok) return written;
      const content = new TextEncoder().encode(written.markdown);
      const questions = plural(form.questions.length, "question");
      if ("page" in target) {
        return { ok: true, plan: { id: deps.newId(), summary: `Save the quiz's ${questions} to ${target.page}`, ops: [{ op: "write", path: target.page, content }] } };
      }
      // A fresh quiz- folder in the topic, numbered when the name is taken, so nothing already there is touched.
      const taken = new Set((await fs.list(target.newIn)).map((entry) => entry.name));
      const base = `quiz-${slugify(heading) || "quiz"}`;
      let name = base;
      for (let n = 2; taken.has(name); n++) name = `${base}-${n}`;
      const page = joined(joined(target.newIn, name), "quiz.md");
      return { ok: true, plan: { id: deps.newId(), summary: `Add a quiz with ${questions} as ${joined(target.newIn, name)}`, ops: [{ op: "write", path: page, content }] } };
    },

    async planItem(folder: string, word: string, title: string, address = ""): Promise<ItemPlan> {
      const plain = plainKind(word);
      if (plain === undefined) return { ok: false, message: unknownWord(word) };
      const find = (node: CourseFolder): CourseFolder | undefined => (node.path === folder ? node : node.children.map(find).find((found) => found !== undefined));
      const parent = find(await rules.buildTree(fs));
      const fits = plain.goesIn === "week" ? parent?.kind === "topic" : parent?.kind === "course" || parent?.kind === "unit" || parent?.kind === "side";
      if (!fits)
        return {
          ok: false,
          message:
            plain.goesIn === "week"
              ? `A ${plain.word.toLowerCase()} goes in a week. Open the week and add it there.`
              : "A week goes in the course or in a unit, not inside another week.",
        };
      const problem = plainProblem(plain, title, address);
      if (problem !== null) return { ok: false, message: problem };
      const name = plainFolder(
        plain,
        title.trim(),
        (await fs.list(folder)).map((entry) => entry.name),
      );
      const at = joined(folder, name);
      const ops: FileOp[] = plainFiles(plain, title.trim(), address.trim()).map((file) => ({
        op: "write",
        path: joined(at, file.path),
        content: new TextEncoder().encode(file.content),
      }));
      return { ok: true, folder: at, plan: { id: deps.newId(), summary: `Add the ${plain.word.toLowerCase()} "${title.trim()}" as ${at}`, ops } };
    },

    async planVisible(folder: string, word: string): Promise<ItemPlan> {
      const plain = plainKind(word);
      if (plain === undefined) return { ok: false, message: unknownWord(word) };
      const tree = await rules.buildTree(fs);
      const parentPath = folder.includes("/") ? folder.slice(0, folder.lastIndexOf("/")) : "";
      const find = (node: CourseFolder, path: string): CourseFolder | undefined =>
        node.path === path ? node : node.children.map((child) => find(child, path)).find((found) => found !== undefined);
      const parent = find(tree, parentPath);
      const own = parent?.children.find((child) => child.path === folder);
      if (parent === undefined || own === undefined) return { ok: false, message: "Studio can't find that folder any more. Check the course again." };
      if (own.kind !== null) return { ok: false, message: `Students already see this as a ${(labelFor(own.kind) ?? own.kind).toLowerCase()}.` };
      const scope = parent.kind === "topic" ? "week" : ["course", "unit", "side"].includes(parent.kind ?? "") ? "course" : null;
      const offered = scope === null ? [] : visibleKinds(scope);
      if (!offered.includes(plain)) {
        if (offered.length === 0) return { ok: false, message: "This sits inside something students can't see. Sort that out first." };
        const names = offered.map((p) => p.word);
        return {
          ok: false,
          message: `Here it can be ${
            names.length === 1
              ? `a ${names[0].toLowerCase()}`
              : `${names
                  .slice(0, -1)
                  .map((n) => `a ${n.toLowerCase()}`)
                  .join(", ")} or a ${names[names.length - 1].toLowerCase()}`
          }.`,
        };
      }
      const title = titleFromFolder(own.name);
      const name = plainFolder(
        plain,
        title,
        parent.children.filter((child) => child.path !== folder).map((child) => child.name),
      );
      const at = joined(parentPath, name);
      const changes = visibleChanges(
        plain,
        title,
        own.files.map((file) => file.name),
      );
      const ops: FileOp[] = [
        ...changes.moves.map((move) => ({ op: "move" as const, from: joined(folder, move.from), to: joined(folder, move.to) })),
        ...changes.writes.map((file) => ({ op: "write" as const, path: joined(folder, file.path), content: new TextEncoder().encode(file.content) })),
        { op: "move", from: folder, to: at },
      ];
      return { ok: true, folder: at, plan: { id: deps.newId(), summary: `Make "${title}" a ${plain.word.toLowerCase()} students see, as ${at}`, ops } };
    },

    async pages(folder: string): Promise<PageEntry[]> {
      const paths = (await fs.list(folder))
        .filter((entry) => entry.kind === "file" && extensionOf(entry.name) === "md")
        .map((entry) => joined(folder, entry.name))
        .sort();
      return Promise.all(paths.map(async (path) => ({ path, written: !rules.hasStarterText(text(await fs.read(path))) })));
    },

    async openPage(path: string) {
      const markdown = text(await fs.read(path));
      return { path, markdown, plainProblem: plainWritingProblem(markdown) };
    },

    renderPage: (markdown: string) => deps.markdown?.render(markdown) ?? "",

    async planPage(opened, markdown) {
      if (text(await fs.read(opened.path)) !== opened.markdown)
        return { ok: false, message: "This page changed on your computer after you opened it. Close it and open it again so nothing is lost." };
      if (markdown === opened.markdown) return { ok: false, message: "There are no changes to save." };
      return {
        ok: true,
        plan: { id: deps.newId(), summary: `Save your changes to ${opened.path}`, ops: [{ op: "write", path: opened.path, content: new TextEncoder().encode(markdown) }] },
      };
    },

    async planMaterial(folder: string, dropped: DroppedFile[]): Promise<MaterialPlan> {
      const onTopic = folder !== "";
      const shape = rules.shapeMaterial(
        dropped.map((file) => (LINK_FILE.test(file.path) && file.bytes.length <= LINK_LIMIT ? { path: file.path, text: text(file.bytes) } : { path: file.path })),
        onTopic,
      );
      const bytesOf = new Map(dropped.map((file) => [file.path, file.bytes]));
      const tray: TrayFile[] = [...shape.tray];
      const topics = onTopic ? [] : topicsOf(await rules.buildTree(fs));
      const taken = new Map<string, string[]>();
      const ops: FileOp[] = [];
      const placed: MaterialPlan["placed"] = [];
      for (const item of shape.items) {
        const topic = onTopic ? folder : topics[(item.week ?? 0) - 1]?.path;
        if (topic === undefined) {
          tray.push(...item.copies.map((copy) => ({ path: copy.from, reason: "no-topic" as const, week: item.week ?? undefined })));
          continue;
        }
        if (!taken.has(topic))
          taken.set(
            topic,
            (await fs.list(topic)).map((entry) => entry.name),
          );
        const name = nextItemFolder(item.kind, taken.get(topic)!);
        taken.get(topic)!.push(name);
        const at = joined(topic, name);
        for (const write of item.writes) ops.push({ op: "write", path: joined(at, write.path), content: new TextEncoder().encode(write.content) });
        for (const copy of item.copies) ops.push({ op: "write", path: joined(at, copy.to), content: bytesOf.get(copy.from)! });
        placed.push({ title: item.title, label: labelFor(item.kind) ?? item.kind, folder: at });
      }
      const where = onTopic ? folder : "the course";
      const plan = ops.length === 0 ? null : { id: deps.newId(), summary: `Add ${plural(placed.length, "item")} to ${where}`, ops };
      return { plan, placed, tray: tray.map((file) => ({ ...file, message: trayReason(file) })) };
    },

    async explain(finding: Finding): Promise<Explanation> {
      try {
        const text = await assistant.explain(finding);
        return text === "" ? { text: finding.message, by: "rules", problem: "" } : { text, by: "assistant", problem: "" };
      } catch (error) {
        if (!(error instanceof AssistantUnavailable)) throw error;
        return { text: finding.message, by: "rules", problem: error.message };
      }
    },
  };
}
