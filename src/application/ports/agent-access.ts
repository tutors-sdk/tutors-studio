/**
 * Which courses the lecturer lets an assistant on this computer work on (ADR 0051). Kept for this computer,
 * outside every course, so copying or sharing a course never carries the permission with it. Off for a
 * course until the lecturer turns it on.
 */
export interface AgentAccessPort {
  allowed(course: string): Promise<boolean>;
  set(course: string, allowed: boolean): Promise<void>;
}
