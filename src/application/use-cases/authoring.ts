import { buildCourseMap } from "../../domain/course-map.ts";
import { errorsFirst, type Finding } from "../../domain/finding.ts";
import type { Plan } from "../../domain/plan.ts";
import { AssistantUnavailable, type AssistantPort } from "../ports/assistant.ts";
import type { ApplyResult, AuthoringPort, CourseView, Explanation, MaterialPlan, OpenedQuiz, Preview, QuizPlan, QuizTarget } from "../ports/authoring.ts";
import { labelFor, type CourseFolder } from "../../domain/course-map.ts";
import { nextItemFolder, trayReason, type DroppedFile, type TrayFile } from "../../domain/material.ts";
import type { FileOp } from "../../domain/plan.ts";
import { emptyQuiz, type QuizForm } from "../../domain/quiz.ts";
import { slugify } from "../../domain/slug.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { DiagramPort } from "../ports/diagrams.ts";
import type { FileSystemPort } from "../ports/file-system.ts";
import type { SlidesPort } from "../ports/slides.ts";
import type { MarkdownPort } from "../ports/markdown.ts";
import type { TelemetryPort } from "../ports/telemetry.ts";
import { applyPlan } from "./apply-plan.ts";

export interface AuthoringDeps {
  fs: FileSystemPort;
  rules: CourseRulesPort;
  assistant: AssistantPort;
  telemetry: TelemetryPort;
  /** Checks and draws Mermaid diagrams; without it neither happens. */
  diagrams?: DiagramPort;
  /** Renders Marp decks for preview; without it decks are not previewed. */
  slides?: SlidesPort;
  /** Draws the markdown editor's preview; without it the preview is empty. */
  markdown?: MarkdownPort;
  /** Plan ids; injected so tests and replayed journeys get the same ids. */
  newId: () => string;
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
  return {
    async refresh(): Promise<CourseView> {
      const [tree, findings] = await Promise.all([rules.buildTree(fs), rules.validate(fs, deps.diagrams)]);
      telemetry.event("course.validated", { errors: findings.filter((f) => f.severity === "error").length, findings: findings.length });
      return { map: buildCourseMap(tree, findings), findings: errorsFirst(findings) };
    },

    planFix(finding: Finding): Plan | null {
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
      const fixes = (await rules.validate(fs, deps.diagrams)).flatMap((finding) => (finding.fix === undefined ? [] : [finding.fix]));
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
      return result;
    },

    async previews(folder: string): Promise<Preview[]> {
      const files = (await fs.list(folder))
        .filter((entry) => entry.kind === "file")
        .map((entry) => entry.name)
        .sort();
      const previews: Preview[] = [];
      for (const name of files) {
        const file = folder === "" ? name : `${folder}/${name}`;
        const extension = extensionOf(name);
        if (extension === "marp" && deps.slides) previews.push({ kind: "slides", file, ...deps.slides.render(text(await fs.read(file))) });
        if ((extension === "md" || extension === "marp") && deps.diagrams) {
          const blocks = rules.diagramsIn(text(await fs.read(file))).filter((block) => block.source.trim() !== "");
          if (blocks.length === 0) continue;
          const diagrams = [];
          for (const block of blocks) {
            const drawing = await deps.diagrams.draw(block.source);
            diagrams.push({ line: block.line, svg: drawing.ok ? drawing.svg : null });
          }
          previews.push({ kind: "diagrams", file, diagrams });
        }
      }
      return previews;
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

    async pages(folder: string): Promise<string[]> {
      return (await fs.list(folder))
        .filter((entry) => entry.kind === "file" && extensionOf(entry.name) === "md")
        .map((entry) => joined(folder, entry.name))
        .sort();
    },

    async openPage(path: string) {
      return { path, markdown: text(await fs.read(path)) };
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
