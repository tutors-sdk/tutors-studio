import type { AuthoringPort } from "../application/ports/authoring.ts";
import { firstOpen, guideProgress, guideSteps, nextOpen, stepDone, stillToDo, type GuideStep } from "../domain/guided.ts";

/** Where a step points on the course map: the week it names, the item it fills, or the course home for the check. */
export const placeOf = (step: GuideStep): string => (step.do === "check" ? "" : step.do === "name-week" ? step.week.path : step.item.path);
const keyOf = (step: GuideStep) => `${step.do}:${placeOf(step)}`;

/**
 * The guide through an open course (ADR 0071, STU-0348 to STU-0352): its steps read from the course, the step
 * the lecturer is on, and moving on as each step is done. The course map stays free to use while it runs.
 */
export class GuideSession {
  steps = $state<GuideStep[]>([]);
  at = $state(0);
  active = $state(false);
  /** Set when a course made in guided mode opens: the guide starts as soon as the course is on screen (STU-0348). */
  startPending = $state(false);

  readonly step = $derived(this.active && this.steps.length > 0 ? this.steps[Math.min(this.at, this.steps.length - 1)] : null);
  readonly progress = $derived(guideProgress(this.steps));
  readonly toDo = $derived(stillToDo(this.steps));

  constructor(private readonly authoring: () => AuthoringPort | null) {}

  /** Starts, or goes back to, the guide at the first step not done (STU-0348, STU-0352). */
  async start(): Promise<GuideStep | null> {
    const authoring = this.authoring();
    if (!authoring) return null;
    this.steps = guideSteps(await authoring.guide());
    this.at = firstOpen(this.steps);
    this.active = true;
    return this.step;
  }

  /**
   * Reads the course again after a change. When the step the lecturer is on is now done, the guide moves on to
   * the next step not done and returns it, so the screen can follow (STU-0350); otherwise it returns null.
   */
  async refresh(): Promise<GuideStep | null> {
    const authoring = this.authoring();
    if (!this.active || !authoring) return null;
    const was = this.step;
    const steps = guideSteps(await authoring.guide());
    const same = was === null ? -1 : steps.findIndex((step) => keyOf(step) === keyOf(was));
    this.steps = steps;
    if (same === -1) {
      this.at = firstOpen(steps);
      return this.step;
    }
    this.at = same;
    if (!stepDone(steps[same])) return null;
    this.at = nextOpen(steps, same);
    return this.step;
  }

  /** Leaves this step for later and goes on to the next not done (STU-0351). */
  skip(): GuideStep | null {
    this.at = nextOpen(this.steps, this.at);
    return this.step;
  }

  /** Back to the step before, done or not. */
  back(): GuideStep | null {
    this.at = Math.max(0, this.at - 1);
    return this.step;
  }

  /** Straight to one step, from the list still to do at the end. */
  goTo(step: GuideStep): GuideStep | null {
    const index = this.steps.findIndex((candidate) => keyOf(candidate) === keyOf(step));
    if (index !== -1) this.at = index;
    return this.step;
  }

  /** Leaves the guide; everything done so far stays, and the course map is free to use. */
  leave() {
    this.active = false;
  }
}
