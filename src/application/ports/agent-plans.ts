import type { Plan } from "../../domain/plan.ts";

/** A plan an assistant applied while Studio had the course open, waiting for the lecturer (STU-0205). */
export interface WaitingPlan {
  /** This plan's place in the queue; not the plan's own id, which only its session knew. */
  id: string;
  plan: Plan;
}

/**
 * Where an assistant's plan waits for the lecturer while Studio has the course open (ADR 0052). Kept for
 * this computer beside the access list (AgentAccessPort), outside every course, so waiting never writes
 * to a course: only the lecturer's Accept applies the plan, through applyPlan.
 */
export interface AgentPlansPort {
  /** Whether a Studio window has this course open now. */
  isOpen(course: string): Promise<boolean>;
  /** The window says which course it has open, or none. */
  opened(course: string | null): Promise<void>;
  /** Puts an assistant's plan in front of the lecturer. */
  hand(course: string, plan: Plan): Promise<void>;
  /** The plans waiting for this course, oldest first. */
  waiting(course: string): Promise<WaitingPlan[]>;
  /** Takes a plan out of the queue, accepted or not. */
  settle(course: string, id: string): Promise<void>;
}
