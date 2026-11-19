import type { AgentAccessPort } from "../../../application/ports/agent-access.ts";

/** The courses an assistant may work on, in memory: tests and the browser preview. */
export function memoryAgentAccess(allowed: string[] = []): AgentAccessPort {
  const courses = new Set(allowed);
  return {
    allowed: async (course) => courses.has(course),
    set: async (course, on) => void (on ? courses.add(course) : courses.delete(course)),
  };
}
