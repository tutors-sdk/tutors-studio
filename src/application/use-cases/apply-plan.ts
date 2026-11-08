import { checkPlan, type FileOp, type Plan } from "../../domain/plan.ts";
import type { ApplyResult } from "../ports/authoring.ts";
import type { FileSystemPort } from "../ports/file-system.ts";

type Undo = () => Promise<void>;

async function run(fs: FileSystemPort, op: FileOp): Promise<Undo> {
  if (op.op === "move") {
    await fs.move(op.from, op.to);
    return () => fs.move(op.to, op.from);
  }
  const previous = (await fs.exists(op.path)) ? await fs.read(op.path) : null;
  await fs.write(op.path, op.content);
  return previous === null ? () => fs.remove(op.path) : () => fs.write(op.path, previous);
}

const pathOf = (op: FileOp): string => (op.op === "write" ? op.path : op.from);
const reasonOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Applies a plan whole or not at all (ADR 0004, STU-0004). A plan that fails checkPlan is refused before
 * anything runs. If an op fails part-way, every op already applied is undone in reverse order, and the
 * result names the file that blocked it.
 */
export async function applyPlan(fs: FileSystemPort, plan: Plan): Promise<ApplyResult> {
  const problems = checkPlan(plan);
  if (problems.length > 0) {
    const first = problems[0];
    return { ok: false, blockedBy: "path" in first ? first.path : "", reason: `the plan was refused before anything changed (${first.kind})` };
  }
  const undo: Undo[] = [];
  for (const op of plan.ops) {
    try {
      undo.push(await run(fs, op));
    } catch (error) {
      for (const step of undo.reverse()) await step();
      return { ok: false, blockedBy: pathOf(op), reason: reasonOf(error) };
    }
  }
  return { ok: true };
}
