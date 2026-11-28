import type { LiveTutorsPort } from "../application/ports/live-tutors.ts";
import type { LiveStatus } from "../domain/live-tutors.ts";

/** The time now as the lecturer's clock shows it: "10:02". */
const clockTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/**
 * The open course while it is live in Tutors on this computer (ADR 0042): its link, why the last rebuild
 * failed, and the line at the foot of the contents (STU-0169, STU-0170). Kept out of App.svelte.
 */
export class LiveCourse {
  link = $state<string | null>(null);
  problem = $state<string | null>(null);
  /** Updating, up to date (when, how long), or failed. */
  status = $state<LiveStatus>({ state: "ready", at: clockTime(), ms: null });
  #timer: ReturnType<typeof setTimeout> | undefined;
  /** The step under way while View my course in Tutors starts it (STU-0312), and why it didn't, if it didn't. */
  opening = $state<string | null>(null);
  failed = $state<string | null>(null);

  /** View my course in Tutors (STU-0312): builds the course and shows it in the Tutors window, live from then on. */
  async show(live: LiveTutorsPort | null | undefined) {
    if (!live || this.opening !== null) return;
    this.failed = null;
    this.opening = "Starting";
    const started = await live.start((step) => (this.opening = step));
    this.opening = null;
    if (started.ok) this.started(started.link);
    else this.failed = started.reason;
  }

  /** Tutors answered with the course's link (null: not live): it is up to date. */
  started(link: string | null) {
    this.link = link;
    this.problem = null;
    this.status = { state: "ready", at: clockTime(), ms: null };
  }

  /** A burst of file changes (a plan writes several) rebuilds the live course once, a moment after the last. */
  rebuild(live: LiveTutorsPort | null | undefined) {
    if (this.link === null || !live) return;
    clearTimeout(this.#timer);
    // Said at once, before the pause that gathers a burst of writes, so the lecturer never waits on silence.
    this.status = { state: "updating" };
    this.#timer = setTimeout(
      () =>
        void live.changed().then((update) => {
          this.problem = update.ok ? null : update.reason;
          this.status = update.ok ? { state: "ready", at: clockTime(), ms: update.ms } : { state: "failed" };
        }),
      400,
    );
  }

  /** Stops the live course, if there is one: on leaving the course, and from the Stop beside "Live in Tutors". */
  stop(live: LiveTutorsPort | null | undefined) {
    clearTimeout(this.#timer);
    void live?.stop();
    this.link = null;
    this.problem = null;
  }
}

/** View Tutors locally on the start screen (STU-0311): Tutors' own home page in the Tutors window, the step under way and why it didn't open. */
export class TutorsHome {
  opening = $state<string | null>(null);
  failed = $state<string | null>(null);
  readonly #tutors: () => LiveTutorsPort | undefined;

  /** `tutors` reads the app's port each time, so a port given later is used. */
  constructor(tutors: () => LiveTutorsPort | undefined) {
    this.#tutors = tutors;
  }

  async view() {
    const tutors = this.#tutors();
    if (!tutors || this.opening !== null) return;
    this.failed = null;
    this.opening = "Starting";
    const opened = await tutors.home((step) => (this.opening = step));
    this.opening = null;
    if (!opened.ok) this.failed = opened.reason;
  }
}
