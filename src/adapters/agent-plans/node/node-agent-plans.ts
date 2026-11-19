import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { AgentPlansPort, WaitingPlan } from "../../../application/ports/agent-plans.ts";
import { courseKey } from "../../../domain/agent.ts";
import { planFromJson, planToJson } from "../../../domain/plan.ts";

const QUEUE_ID = /^[a-z0-9-]+$/;

/** Whether the process that wrote the open-course file is still running (EPERM: running, someone else's). */
function running(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * Assistants' plans waiting for the lecturer, in Studio's config folder beside agent-courses.json
 * (ADR 0052): `studio-open.json` says which course a window has open (`{ course, pid }`, written by the
 * app's Rust side, src-tauri/src/agent.rs), and each waiting plan is `agent-plans/<queue id>.json`
 * (`{ course, plan }`, the plan as planToJson writes it). Courses are spelled by courseKey.
 */
export function nodeAgentPlans(folder: string, pid: () => number = () => process.pid): AgentPlansPort {
  const key = (course: string) => courseKey(resolve(course), process.platform === "win32");
  const openFile = join(folder, "studio-open.json");
  const queue = join(folder, "agent-plans");
  const json = async (file: string): Promise<Record<string, unknown> | null> => {
    try {
      return JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
    } catch {
      return null;
    }
  };
  return {
    async isOpen(course) {
      const open = await json(openFile);
      return open !== null && open.course === key(course) && typeof open.pid === "number" && running(open.pid);
    },
    async opened(course) {
      if (course === null) return rm(openFile, { force: true });
      await mkdir(folder, { recursive: true });
      await writeFile(openFile, `${JSON.stringify({ course: key(course), pid: pid() })}\n`);
    },
    async hand(course, plan) {
      await mkdir(queue, { recursive: true });
      const id = `${Date.now().toString(36).padStart(10, "0")}-${randomUUID().slice(0, 8)}`;
      await writeFile(join(queue, `${id}.json`), `${JSON.stringify({ course: key(course), plan: JSON.parse(planToJson(plan)) })}\n`);
    },
    async waiting(course) {
      const names = await readdir(queue).catch(() => [] as string[]);
      const found: WaitingPlan[] = [];
      for (const name of names.filter((name) => name.endsWith(".json")).sort()) {
        const entry = await json(join(queue, name));
        const plan = entry?.course === key(course) ? planFromJson(JSON.stringify(entry.plan)) : null;
        if (plan !== null) found.push({ id: name.slice(0, -".json".length), plan });
      }
      return found;
    },
    async settle(_course, id) {
      if (QUEUE_ID.test(id)) await rm(join(queue, `${id}.json`), { force: true });
    },
  };
}
