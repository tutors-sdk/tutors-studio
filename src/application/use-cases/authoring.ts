import { buildCourseMap } from "../../domain/course-map.ts";
import { errorsFirst, type Finding } from "../../domain/finding.ts";
import type { Plan } from "../../domain/plan.ts";
import type { AssistantPort } from "../ports/assistant.ts";
import type { ApplyResult, AuthoringPort, CourseView } from "../ports/authoring.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { FileSystemPort } from "../ports/file-system.ts";
import type { TelemetryPort } from "../ports/telemetry.ts";
import { applyPlan } from "./apply-plan.ts";

export interface AuthoringDeps {
  fs: FileSystemPort;
  rules: CourseRulesPort;
  assistant: AssistantPort;
  telemetry: TelemetryPort;
  /** Plan ids; injected so tests and replayed journeys get the same ids. */
  newId: () => string;
}

const parentOf = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "");

/** The authoring use cases over whichever adapters the composition root bound. */
export function createAuthoring(deps: AuthoringDeps): AuthoringPort {
  const { fs, rules, assistant, telemetry } = deps;
  return {
    async refresh(): Promise<CourseView> {
      const [tree, findings] = await Promise.all([rules.buildTree(fs), rules.validate(fs)]);
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

    async explain(finding: Finding): Promise<string> {
      const text = await assistant.explain(finding);
      return text === "" ? finding.message : text;
    },
  };
}
