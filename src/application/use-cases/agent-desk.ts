import type { AgentAccessPort } from "../ports/agent-access.ts";
import type { AgentPlansPort, WaitingPlan } from "../ports/agent-plans.ts";
import type { Plan } from "../../domain/plan.ts";

/** An open course's side of assistants on this computer: the lecturer's switch, and plans waiting for them (ADRs 0051, 0052). */
export interface AgentDesk {
  /** Whether "Let an assistant on this computer work on this course" is on. */
  allowed(): Promise<boolean>;
  allow(on: boolean): Promise<void>;
  /** Tells an assistant's server this window has the course open, so its plans wait here (STU-0205). */
  open(): Promise<void>;
  close(): Promise<void>;
  waiting(): Promise<WaitingPlan[]>;
  /** Applies a waiting plan the lecturer accepted, once; false when it was gone or didn't apply. */
  accept(id: string, apply: (plan: Plan) => Promise<boolean>): Promise<boolean>;
  /** Discards a waiting plan, changing nothing (STU-0206). */
  decline(id: string): Promise<void>;
}

export function createAgentDesk(course: string, access: AgentAccessPort, plans: AgentPlansPort): AgentDesk {
  return {
    allowed: () => access.allowed(course),
    allow: (on) => access.set(course, on),
    open: () => plans.opened(course),
    close: () => plans.opened(null),
    waiting: () => plans.waiting(course),
    async accept(id, apply) {
      const found = (await plans.waiting(course)).find((entry) => entry.id === id);
      if (!found) return false;
      // Out of the queue before it applies, so a second press can't apply it twice.
      await plans.settle(course, id);
      return apply(found.plan);
    },
    decline: (id) => plans.settle(course, id),
  };
}
