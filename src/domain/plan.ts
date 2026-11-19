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

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};
const fromBase64 = (text: string): Uint8Array => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

/** A plan as text, to wait outside the process that made it (an assistant's plan for the lecturer, ADR 0052). */
export function planToJson(plan: Plan): string {
  const ops = plan.ops.map((op) => (op.op === "write" ? { op: "write", path: op.path, base64: toBase64(op.content) } : op));
  return JSON.stringify({ id: plan.id, summary: plan.summary, ops });
}

/** The plan planToJson wrote, or null for anything else. Whether it is safe to apply is still checkPlan's call. */
export function planFromJson(text: string): Plan | null {
  try {
    const raw = JSON.parse(text) as { id?: unknown; summary?: unknown; ops?: unknown };
    if (typeof raw.id !== "string" || typeof raw.summary !== "string" || !Array.isArray(raw.ops)) return null;
    const ops: FileOp[] = [];
    for (const op of raw.ops as Record<string, unknown>[]) {
      if (op?.op === "write" && typeof op.path === "string" && typeof op.base64 === "string") ops.push({ op: "write", path: op.path, content: fromBase64(op.base64) });
      else if (op?.op === "move" && typeof op.from === "string" && typeof op.to === "string") ops.push({ op: "move", from: op.from, to: op.to });
      else return null;
    }
    return { id: raw.id, summary: raw.summary, ops };
  } catch {
    return null;
  }
}
