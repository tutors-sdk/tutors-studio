import type { MapNode } from "../../domain/course-map.ts";
import type { Finding } from "../../domain/finding.ts";
import type { Plan } from "../../domain/plan.ts";

export interface CourseView {
  map: MapNode;
  findings: Finding[];
}

export type ApplyResult = { ok: true } | { ok: false; blockedBy: string; reason: string };

/**
 * Driving port: everything a lecturer can do, as one facade. The UI, the headless CLI and (later) the
 * MCP server all call this, so a journey one of them drives is the journey the others drive.
 */
export interface AuthoringPort {
  /** Reads and checks the open course. */
  refresh(): Promise<CourseView>;
  /** The plan that would fix a finding, or null when the rules suggest no safe fix. Nothing is written. */
  planFix(finding: Finding): Plan | null;
  /** Applies an accepted plan, all of it or none of it. */
  apply(plan: Plan): Promise<ApplyResult>;
  /** A plainer explanation of a finding: the assistant's when one is bound, else the rule's own message. */
  explain(finding: Finding): Promise<string>;
}
