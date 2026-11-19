import type { RecentCourse } from "../application/use-cases/recent-courses.ts";
import type { AppProps } from "./app-props.ts";

/**
 * The start screen's recent courses (feature 9): forgetting one, putting it back, and what the screen says
 * about either (STU-0148, STU-0149). Kept out of App.svelte.
 */
export class RecentList {
  courses = $state<RecentCourse[]>([]);
  notice = $state("");
  /** The course the lecturer forgot last, so "Put it back" can return it to its place. */
  forgotten = $state<{ path: string; at: number } | null>(null);
  readonly #recent: AppProps["recent"];

  constructor(recent: AppProps["recent"]) {
    this.#recent = recent;
  }

  async refresh() {
    if (this.#recent) this.courses = await this.#recent.list();
  }

  async forget(path: string) {
    if (!this.#recent) return;
    const at = this.courses.findIndex((listed) => listed.path === path);
    const name = this.courses[at]?.name ?? path;
    await this.#recent.forget(path);
    await this.refresh();
    this.forgotten = { path, at };
    this.notice = `Studio has forgotten ${name}. Its folder and files are where they were.`;
  }

  async putBack() {
    if (!this.#recent || this.forgotten === null) return;
    await this.#recent.restore(this.forgotten.path, this.forgotten.at);
    await this.refresh();
    this.forgotten = null;
    this.notice = "";
  }

  /** A course on the list whose folder has gone: it is off the list now. */
  async missing(name: string) {
    this.notice = `Studio couldn't find ${name} where it was, so it is off the list. Load it again from where it is now.`;
    await this.refresh();
  }
}
