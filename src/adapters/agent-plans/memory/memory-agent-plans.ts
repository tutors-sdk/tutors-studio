import type { AgentPlansPort, WaitingPlan } from "../../../application/ports/agent-plans.ts";

/** Assistants' plans waiting in memory: tests, where the "window" and the agent share one process. */
export function memoryAgentPlans(): AgentPlansPort {
  let open: string | null = null;
  let n = 0;
  const queue: (WaitingPlan & { course: string })[] = [];
  return {
    isOpen: async (course) => open === course,
    opened: async (course) => void (open = course),
    hand: async (course, plan) => void queue.push({ id: `waiting-${++n}`, course, plan }),
    waiting: async (course) => queue.filter((entry) => entry.course === course).map(({ id, plan }) => ({ id, plan })),
    async settle(course, id) {
      const at = queue.findIndex((entry) => entry.course === course && entry.id === id);
      if (at >= 0) queue.splice(at, 1);
    },
  };
}
