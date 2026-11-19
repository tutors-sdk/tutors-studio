import { invoke } from "@tauri-apps/api/core";
import type { AgentAccessPort } from "../../../application/ports/agent-access.ts";

/** The lecturer's switch in the window, through Studio's Rust commands over agent-courses.json (src-tauri/src/agent.rs, ADR 0051). */
export const tauriAgentAccess: AgentAccessPort = {
  allowed: (course) => invoke<boolean>("agent_allowed", { course }),
  set: (course, allowed) => invoke("agent_set", { course, allowed }),
};
