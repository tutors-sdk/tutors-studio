import { describe, expect, it } from "vitest";
import type { BuildOutcome, CourseBuildPort } from "../../src/application/ports/course-build.ts";
import type { LocalTutorsPort } from "../../src/application/ports/local-tutors.ts";
import { createLiveTutors } from "../../src/application/use-cases/live-tutors.ts";
import { tutorsFolderProblem } from "../../src/domain/live-tutors.ts";

const copy = { packageName: "tutors-mono-repo", reader: true, installed: true };

function setUp(outcomes: BuildOutcome[] = [], hold = false) {
  const calls: string[] = [];
  let release: (() => void) | null = null;
  const build: CourseBuildPort = {
    async build() {
      calls.push("build");
      if (hold && calls.filter((c) => c === "build").length === 2) await new Promise<void>((done) => (release = done));
      return outcomes.shift() ?? { ok: true, folder: "json", generator: "tutors" };
    },
    buildWebsite: async () => ({ ok: false, reason: "", detail: "" }),
    validate: async () => null,
    validates: false,
  };
  const tutors: LocalTutorsPort = {
    facts: async (folder) => (folder === "/tutors" ? copy : { packageName: "notes", reader: false, installed: false }),
    start: async () => ({ ok: true, link: "http://localhost:5173/course/127.0.0.1:8190", startedReader: true }),
    show: async (link) => void calls.push(`show ${link}`),
    refresh: async () => void calls.push("refresh"),
    stop: async () => void calls.push("stop"),
  };
  let folder: string | null = null;
  const live = createLiveTutors({ build, tutors, folder: { get: async () => folder, set: async (f) => void (folder = f) } });
  return { live, calls, release: () => release?.() };
}

describe("the course live in Tutors", () => {
  it("asks for a copy of Tutors before anything starts, and remembers only one that can run the reader", async () => {
    const { live, calls } = setUp();
    expect(await live.start()).toMatchObject({ ok: false, reason: expect.stringContaining("Choose your copy of Tutors first") });
    expect(await live.choose("/notes")).toMatchObject({ ok: false });
    expect(await live.folder()).toBeNull();
    expect(await live.choose("/tutors")).toEqual({ ok: true });
    expect(await live.folder()).toBe("/tutors");
    expect(calls).toEqual([]);
  });

  it("builds before it serves and shows, and a change while off does nothing", async () => {
    const { live, calls } = setUp();
    expect(await live.changed()).toEqual({ ok: true });
    await live.choose("/tutors");
    expect(await live.start()).toEqual({ ok: true, link: "http://localhost:5173/course/127.0.0.1:8190" });
    expect(calls).toEqual(["build", "show http://localhost:5173/course/127.0.0.1:8190"]);
    expect(live.live).toBe(true);
    await live.stop();
    expect(live.live).toBe(false);
  });

  it("rebuilds once more for any number of changes heard during a rebuild", async () => {
    const { live, calls, release } = setUp([], true);
    await live.choose("/tutors");
    await live.start();
    const first = live.changed();
    await new Promise((done) => setTimeout(done, 0));
    const during = [live.changed(), live.changed(), live.changed()];
    release();
    await Promise.all([first, ...during]);
    expect(calls.filter((c) => c === "build")).toHaveLength(3);
    expect(calls.filter((c) => c === "refresh")).toHaveLength(2);
  });

  it("keeps the last build in Tutors when a rebuild fails, and says why", async () => {
    const { live, calls } = setUp([
      { ok: true, folder: "json", generator: "tutors" },
      { ok: false, reason: "The generator stopped.", detail: "line 3" },
    ]);
    await live.choose("/tutors");
    await live.start();
    expect(await live.changed()).toEqual({ ok: false, reason: "Tutors still shows the last build. The generator stopped.", detail: "line 3" });
    expect(calls).not.toContain("refresh");
    expect(live.live).toBe(true);
  });

  it("names what to do with a folder that can't run the reader", () => {
    expect(tutorsFolderProblem(copy)).toBeNull();
    expect(tutorsFolderProblem({ ...copy, installed: false })).toContain("run pnpm install");
    expect(tutorsFolderProblem({ ...copy, packageName: "my-notes" })).toContain("isn't a copy of Tutors");
    expect(tutorsFolderProblem({ ...copy, reader: false })).toContain("isn't a copy of Tutors");
  });
});
