import { liveSteps, tutorsFolderProblem } from "../../domain/live-tutors.ts";
import type { CourseBuildPort } from "../ports/course-build.ts";
import type { LocalTutorsPort } from "../ports/local-tutors.ts";
import type { Failure } from "../ports/publishing.ts";
import type { LiveTutorsPort, LiveUpdate } from "../ports/live-tutors.ts";

export interface LiveTutorsDeps {
  build: CourseBuildPort;
  tutors: LocalTutorsPort;
  /** The lecturer's copy of Tutors, kept in Studio's settings; null until they choose one. */
  folder: { get(): Promise<string | null>; set(folder: string): Promise<void> };
}

const noFolder: Failure = { ok: false, reason: "Choose your copy of Tutors first: the folder you cloned tutors-sdk/tutors-mono-repo into.", detail: "" };

export function createLiveTutors(deps: LiveTutorsDeps): LiveTutorsPort {
  let link: string | null = null;
  /** The rebuild running now, and whether another change arrived while it ran. */
  let running: Promise<LiveUpdate> | null = null;
  let again = false;

  const check = async (folder: string): Promise<{ ok: true } | Failure> => {
    const problem = tutorsFolderProblem(await deps.tutors.facts(folder));
    return problem === null ? { ok: true } : { ok: false, reason: problem, detail: "" };
  };

  const rebuild = async (): Promise<LiveUpdate> => {
    const built = await deps.build.build();
    if (!built.ok) return { ok: false, reason: `Tutors still shows the last build. ${built.reason}`, detail: built.detail };
    await deps.tutors.refresh();
    return { ok: true };
  };

  return {
    folder: () => deps.folder.get(),
    async choose(folder) {
      const checked = await check(folder);
      if (checked.ok) await deps.folder.set(folder);
      return checked;
    },
    async start(progress = () => {}) {
      const folder = await deps.folder.get();
      if (folder === null) return noFolder;
      const checked = await check(folder);
      if (!checked.ok) return checked;
      progress(liveSteps.build);
      const built = await deps.build.build();
      if (!built.ok) return built;
      const started = await deps.tutors.start(folder, progress);
      if (!started.ok) return started;
      progress(liveSteps.open);
      await deps.tutors.show(started.link);
      link = started.link;
      return { ok: true, link: started.link };
    },
    changed() {
      if (link === null) return Promise.resolve({ ok: true });
      if (running !== null) {
        again = true;
        return running;
      }
      const run = async (): Promise<LiveUpdate> => {
        let result = await rebuild();
        while (again && link !== null) {
          again = false;
          result = await rebuild();
        }
        return result;
      };
      running = run().finally(() => (running = null));
      return running;
    },
    async stop() {
      link = null;
      again = false;
      await deps.tutors.stop();
    },
    get live() {
      return link !== null;
    },
    get link() {
      return link;
    },
  };
}
