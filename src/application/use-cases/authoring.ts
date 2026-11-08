import { buildCourseMap } from "../../domain/course-map.ts";
import { errorsFirst, type Finding } from "../../domain/finding.ts";
import type { Plan } from "../../domain/plan.ts";
import type { AssistantPort } from "../ports/assistant.ts";
import type { ApplyResult, AuthoringPort, CourseView, Preview } from "../ports/authoring.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { DiagramPort } from "../ports/diagrams.ts";
import type { FileSystemPort } from "../ports/file-system.ts";
import type { SlidesPort } from "../ports/slides.ts";
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
  /** Plan ids; injected so tests and replayed journeys get the same ids. */
  newId: () => string;
}

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
const extensionOf = (name: string) => name.slice(name.lastIndexOf(".") + 1).toLowerCase();

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
      if (finding.suggestedName === undefined || finding.path === "") return null;
      const name = finding.path.slice(finding.path.lastIndexOf("/") + 1);
      const to = parentOf(finding.path) + finding.suggestedName;
      return { id: deps.newId(), summary: `Rename ${name} to ${finding.suggestedName}`, ops: [{ op: "move", from: finding.path, to }] };
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

    async explain(finding: Finding): Promise<string> {
      const text = await assistant.explain(finding);
      return text === "" ? finding.message : text;
    },
  };
}
