import { courseNameOf, withRecent, withRestored } from "../../domain/recent-courses.ts";
import type { SettingsPort } from "../ports/settings.ts";

export interface RecentCourse {
  path: string;
  name: string;
}

/** The start screen's recent courses, kept in settings by folder (feature 9). */
export function createRecentCourses(settings: SettingsPort) {
  return {
    async list(): Promise<RecentCourse[]> {
      return (await settings.get("recentCourses")).map((path) => ({ path, name: courseNameOf(path) }));
    },
    /** Puts a course first, when it is opened or made. */
    async remember(path: string): Promise<void> {
      await settings.set("recentCourses", withRecent(await settings.get("recentCourses"), path));
    },
    /**
     * Takes a course off the list: its folder has gone, or the lecturer chose to forget it (STU-0148).
     * Only the list changes; the course's folder and files are never touched.
     */
    async forget(path: string): Promise<void> {
      await settings.set(
        "recentCourses",
        (await settings.get("recentCourses")).filter((other) => other !== path),
      );
    },
    /** Puts a course the lecturer just forgot back where it was in the list (STU-0149). */
    async restore(path: string, at: number): Promise<void> {
      await settings.set("recentCourses", withRestored(await settings.get("recentCourses"), path, at));
    },
    /** The course Studio reopens when it starts: the last one opened, or null. */
    async last(): Promise<string | null> {
      return (await settings.get("recentCourses"))[0] ?? null;
    },
  };
}

export type RecentCourses = ReturnType<typeof createRecentCourses>;
