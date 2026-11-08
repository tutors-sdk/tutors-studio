/**
 * Every change Studio makes to a course is a FileOp in a Plan. A plan is shown, accepted, then applied
 * as a whole or not at all (ADR 0004). No adapter writes on its own initiative.
 */
export type FileOp = { op: "write"; path: string; content: Uint8Array } | { op: "move"; from: string; to: string };

export interface Plan {
  id: string;
  /** One line for the lecturer: "Rename Week 3 to topic-week-3". */
  summary: string;
  ops: FileOp[];
}

export type PlanProblem = { kind: "empty" } | { kind: "unsafe-path"; path: string } | { kind: "same-target"; path: string } | { kind: "move-onto-itself"; path: string };

/** A course-relative path Studio may touch: no absolute paths, no "..", no empty segments, no drive letters. */
export function isSafePath(path: string): boolean {
  if (path === "" || path.startsWith("/") || path.includes("\\") || /^[a-zA-Z]:/.test(path)) return false;
  return path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

const targetOf = (op: FileOp): string => (op.op === "write" ? op.path : op.to);

/**
 * Checks a plan is total before anything runs: every path is safe, no two ops land on the same path,
 * and no move is a no-op. A plan with a problem is rejected whole.
 */
export function checkPlan(plan: Plan): PlanProblem[] {
  if (plan.ops.length === 0) return [{ kind: "empty" }];
  const problems: PlanProblem[] = [];
  const targets = new Set<string>();
  for (const op of plan.ops) {
    const paths = op.op === "write" ? [op.path] : [op.from, op.to];
    for (const path of paths) if (!isSafePath(path)) problems.push({ kind: "unsafe-path", path });
    if (op.op === "move" && op.from === op.to) problems.push({ kind: "move-onto-itself", path: op.from });
    const target = targetOf(op);
    if (targets.has(target)) problems.push({ kind: "same-target", path: target });
    targets.add(target);
  }
  return problems;
}
