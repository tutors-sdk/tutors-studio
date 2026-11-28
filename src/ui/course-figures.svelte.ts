import type { WeekEngagement } from "../application/ports/engagement.ts";
import type { WeekState } from "../domain/course-map.ts";
import type { OpenedCourse } from "./app-props.ts";

/**
 * What the course home shows beside each week, read again with every new reading of the course (feature 9): its
 * state, whether it changed since the course was last published (STU-0139), and how students used it while an
 * engagement adapter has figures (STU-0200, STU-0201). A reading replaced before its figures arrive keeps none.
 */
export class CourseFigures {
  weekStates = $state<Record<string, WeekState>>({});
  weeksChanged = $state<string[]>([]);
  engagement = $state<Record<string, WeekEngagement> | null>(null);

  /** Reads the figures for `reading` of `opened`; `current` says which reading is on screen when they arrive. */
  read(reading: unknown, opened: OpenedCourse | null, current: () => unknown) {
    if (reading === null || opened === null) return;
    const still = () => current() === reading;
    void opened.authoring.weekStates().then((found) => still() && (this.weekStates = found));
    void (opened.publishing?.weeksChanged() ?? Promise.resolve([])).then((found) => still() && (this.weeksChanged = found));
    void opened.authoring.engagement().then((found) => still() && (this.engagement = found));
  }
}
