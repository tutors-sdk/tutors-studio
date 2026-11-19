import { invoke } from "@tauri-apps/api/core";
import type { AgentPlansPort, WaitingPlan } from "../../../application/ports/agent-plans.ts";
import { planFromJson } from "../../../domain/plan.ts";

/**
 * The window's side of assistants' waiting plans, through Studio's Rust commands (src-tauri/src/agent.rs,
 * ADR 0052), over the same files the command line's server writes. The window never hands a plan itself.
 */
export const tauriAgentPlans: AgentPlansPort = {
  isOpen: () => Promise.reject(new Error("Only an assistant's server asks whether Studio is open.")),
  opened: (course) => invoke("agent_opened", { course }),
  hand: () => Promise.reject(new Error("Only an assistant's server hands Studio a plan.")),
  async waiting(course) {
    const found = await invoke<{ id: string; plan: string }[]>("agent_waiting", { course });
    return found.flatMap(({ id, plan }): WaitingPlan[] => {
      const read = planFromJson(plan);
      return read === null ? [] : [{ id, plan: read }];
    });
  },
  settle: (_course, id) => invoke("agent_settle", { id }),
};
