import { liveSteps, NO_READER, tutorsFolderProblem } from "../../domain/live-tutors.ts";
import type { CourseBuildPort } from "../ports/course-build.ts";
import type { LocalTutorsPort } from "../ports/local-tutors.ts";
import type { Failure } from "../ports/publishing.ts";
import type { LiveTutorsPort, LiveUpdate } from "../ports/live-tutors.ts";

export interface LiveTutorsDeps {
  build: CourseBuildPort;
  /** Tutors run from the lecturer's own copy (Advanced, ADR 0042). */
  tutors: LocalTutorsPort;
  /** The Tutors reader inside Studio, used when the lecturer has chosen no copy of their own (ADR 0045). */
  inside?: LocalTutorsPort;
  /** The lecturer's copy of Tutors, kept in Studio's settings; null until they choose one. */
  folder: { get(): Promise<string | null>; set(folder: string | null): Promise<void> };
  /** Whether the lecturer may use their own copy of Tutors: Advanced mode in the app (STU-0309); always, by default. */
  ownAllowed?: () => Promise<boolean>;
  /** Milliseconds, to say how long a rebuild took; Date.now by default. */
  now?: () => number;
}

const noFolder: Failure = { ok: false, reason: "Choose your copy of Tutors first: the folder you cloned tutors-sdk/tutors-mono-repo into.", detail: "" };

export function createLiveTutors(deps: LiveTutorsDeps): LiveTutorsPort {
  let link: string | null = null;
  /** The Tutors the course is live in: the one inside Studio, or the lecturer's own copy. */
  let active: LocalTutorsPort = deps.inside ?? deps.tutors;
  /** The rebuild running now, and whether another change arrived while it ran. */
  let running: Promise<LiveUpdate> | null = null;
  let again = false;

  const check = async (folder: string): Promise<{ ok: true } | Failure> => {
    const problem = tutorsFolderProblem(await deps.tutors.facts(folder));
    return problem === null ? { ok: true } : { ok: false, reason: problem, detail: "" };
  };

  const ownAllowed = deps.ownAllowed ?? (async () => true);
  /**
   * The Tutors to use and the lecturer's own folder for it: their copy where they chose one and may use it, else
   * the one inside Studio (STU-0309); or why there is none.
   */
  const which = async (): Promise<{ tutors: LocalTutorsPort; folder: string | null } | Failure> => {
    const allowed = await ownAllowed();
    const folder = allowed ? await deps.folder.get() : null;
    if (folder !== null) {
      const checked = await check(folder);
      return checked.ok ? { tutors: deps.tutors, folder } : checked;
    }
    if (deps.inside !== undefined) return { tutors: deps.inside, folder: null };
    return allowed ? noFolder : { ok: false, reason: NO_READER, detail: "" };
  };

  const now = deps.now ?? Date.now;
  const rebuild = async (): Promise<LiveUpdate> => {
    const began = now();
    const built = await deps.build.build();
    if (!built.ok) return { ok: false, reason: `Tutors still shows the last build. ${built.reason}`, detail: built.detail };
    if (again) return { ok: true, ms: now() - began };
    await active.refresh();
    return { ok: true, ms: now() - began };
  };

  return {
    folder: () => deps.folder.get(),
    async choose(folder) {
      const checked = await check(folder);
      if (checked.ok) await deps.folder.set(folder);
      return checked;
    },
    async forget() {
      await deps.folder.set(null);
    },
    get inside() {
      return deps.inside !== undefined;
    },
    ownAllowed,
    async home(progress = () => {}) {
      const chosen = await which();
      if ("ok" in chosen) return chosen;
      const { tutors, folder } = chosen;
      if (tutors.home === undefined) return { ok: false, reason: "This Tutors can only show a course.", detail: "" };
      const opened = await tutors.home(folder ?? "", progress);
      if (!opened.ok) return opened;
<<<<<<< HEAD
      // Stop stops this Tutors too, whether a course is live in it or not.
      active = tutors;
=======
>>>>>>> origin/claude/project-thread-ybei6e
      progress(liveSteps.open);
      await tutors.show(opened.link);
      return opened;
    },
    async start(progress = () => {}) {
      const chosen = await which();
      if ("ok" in chosen) return chosen;
      const { tutors, folder } = chosen;
      progress(liveSteps.build);
      const built = await deps.build.build();
      if (!built.ok) return built;
      const started = await tutors.start(folder ?? "", progress);
      if (!started.ok) return started;
      active = tutors;
      progress(liveSteps.open);
      await tutors.show(started.link);
      link = started.link;
      return { ok: true, link: started.link };
    },
    changed() {
      if (link === null) return Promise.resolve({ ok: true, ms: 0 });
      if (running !== null) {
        again = true;
        return running;
      }
      const run = async (): Promise<LiveUpdate> => {
        await active.note("updating");
        let result = await rebuild();
        while (again && link !== null) {
          again = false;
          result = await rebuild();
        }
        if (!result.ok && link !== null) await active.note("failed");
        return result;
      };
      running = run().finally(() => (running = null));
      return running;
    },
    async stop() {
      link = null;
      again = false;
      await active.stop();
    },
    get live() {
      return link !== null;
    },
    get link() {
      return link;
    },
  };
}
