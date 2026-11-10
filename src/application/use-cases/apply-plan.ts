import type { UndoStep } from "../../domain/history.ts";
import { checkPlan, type FileOp, type Plan } from "../../domain/plan.ts";
import type { FileSystemPort } from "../ports/file-system.ts";

type Undo = () => Promise<void>;

/** What applyPlan did: on success, the steps that would put it back later (newest first), for the history. */
export type Applied = { ok: true; undo: UndoStep[] } | { ok: false; blockedBy: string; reason: string };

async function run(fs: FileSystemPort, op: FileOp): Promise<{ rollback: Undo; step: UndoStep }> {
  if (op.op === "move") {
    await fs.move(op.from, op.to);
    return { rollback: () => fs.move(op.to, op.from), step: { kind: "move-back", now: op.to, was: op.from } };
  }
  const previous = (await fs.exists(op.path)) ? await fs.read(op.path) : null;
  await fs.write(op.path, op.content);
  return previous === null
    ? { rollback: () => fs.remove(op.path), step: { kind: "bin", path: op.path, written: op.content } }
    : { rollback: () => fs.write(op.path, previous), step: { kind: "restore", path: op.path, content: previous, written: op.content } };
}

const pathOf = (op: FileOp): string => (op.op === "write" ? op.path : op.from);
const reasonOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Applies a plan whole or not at all (ADR 0004, STU-0004). A plan that fails checkPlan is refused before
 * anything runs. If an op fails part-way, every op already applied is undone in reverse order, and the
 * result names the file that blocked it. A plan that applies returns the steps that put it back (STU-0091).
 */
export async function applyPlan(fs: FileSystemPort, plan: Plan): Promise<Applied> {
  const problems = checkPlan(plan);
  if (problems.length > 0) {
    const first = problems[0];
    return { ok: false, blockedBy: "path" in first ? first.path : "", reason: `the plan was refused before anything changed (${first.kind})` };
  }
  const done: { rollback: Undo; step: UndoStep }[] = [];
  for (const op of plan.ops) {
    try {
      done.push(await run(fs, op));
    } catch (error) {
      for (const { rollback } of done.reverse()) await rollback();
      return { ok: false, blockedBy: pathOf(op), reason: reasonOf(error) };
    }
  }
  return { ok: true, undo: done.reverse().map(({ step }) => step) };
}
