import { describe, expect, it } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { memoryLibrary } from "../../src/adapters/library/memory/memory-library.ts";
import { memoryRegistry } from "../../src/adapters/registry/memory/memory-registry.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { planComposedCourse } from "../../src/application/use-cases/compose-course.ts";
import { searchLibrary } from "../../src/application/use-cases/library.ts";
import { planShare, share } from "../../src/application/use-cases/share.ts";

const course = {
  "web/course.md": "# Web Development\n",
  "web/calendar.yaml": "title: Autumn\nweeks: []\n",
  "web/topic-01/topic.md": "# Week 1\n",
  "web/topic-01/lab-01/00.Setup.md": "# Setup\n",
  "web/topic-01/note-01/note.md": "# Reading\n",
};

function setup(registryFiles: Record<string, string> = {}) {
  const teaching = new MemoryFileSystem(course);
  const shared = new MemoryFileSystem(registryFiles);
  const library = memoryLibrary({ "/teaching": teaching, "/shared": shared });
  const deps = { library, registry: memoryRegistry({ "/shared": shared }), rules: courseRules, newId: () => "p", today: () => "2026-11-25" };
  const found = async () => (await searchLibrary(deps, ["/teaching"])).courses[0];
  return { deps, shared, found };
}

describe("sharing into a folder registry", () => {
  it("plans a share and writes nothing until it is accepted", async () => {
    const { deps, shared, found } = setup();
    const planned = await planShare(deps, { course: await found(), item: null, registry: "/shared", publisher: "Leigh", licence: "CC-BY-4.0" });
    expect(planned.ok && planned.share.plan.summary).toBe("Share Web Development to shared as leigh/web-development version 1, under CC-BY-4.0");
    expect(planned.ok && planned.share.notes).toContain("Left out, because a course keeps them to itself: calendar.yaml.");
    expect(await shared.list("")).toEqual([]);
  });

  it("refuses without a licence, from a course that needs fixing, and into a folder that is something else", async () => {
    const { deps, found } = setup();
    const ready = await found();
    const without = await planShare(deps, { course: ready, item: null, registry: "/shared", publisher: "Leigh", licence: " " });
    expect(!without.ok && without.problems.map((p) => p.field)).toEqual(["licence"]);
    const broken = await planShare(deps, { course: { ...ready, group: "needs-fixing" }, item: null, registry: "/shared", publisher: "Leigh", licence: "MIT" });
    expect(!broken.ok && broken.problems[0].message).toBe("Web Development needs fixing before it can be shared.");
    const other = await planShare(deps, { course: ready, item: null, registry: "/teaching", publisher: "Leigh", licence: "MIT" });
    expect(!other.ok && other.problems[0].field).toBe("registry");
  });

  it("shares an item, lists it in the library and copies it into a new course with its licence credited", async () => {
    const { deps, found } = setup();
    const shared = await share(deps, { course: await found(), item: "topic-01/lab-01", registry: "/shared", publisher: "Leigh", licence: "CC-BY-4.0" });
    expect(shared.ok && `${shared.share.publisher}/${shared.share.name}@${shared.share.version}`).toBe("leigh/setup@1");
    const entry = (await searchLibrary(deps, ["/shared"])).courses[0];
    expect(entry.entry).toMatchObject({ publisher: "leigh", name: "setup", version: 1, licence: "CC-BY-4.0", from: "Web Development" });
    const planned = await planComposedCourse(deps, { name: "Mixed", lecturer: "", weeks: 1 }, [{ course: entry, item: entry.items[0], week: 1 }]);
    if (!planned.ok) throw new Error(planned.problems[0].message);
    const written = new Map(planned.compose.plan.ops.flatMap((op) => (op.op === "write" ? [[op.path, new TextDecoder().decode(op.content)]] : [])));
    expect([...written.keys()].some((path) => path.endsWith("/lab-01/00.Setup.md"))).toBe(true);
    expect([...written.values()].some((text) => text.includes("Web Development (leigh/setup version 1, CC-BY-4.0)"))).toBe(true);
  });

  it("refuses to copy a stored item whose files changed after it was shared", async () => {
    const { deps, shared, found } = setup();
    await share(deps, { course: await found(), item: "topic-01/lab-01", registry: "/shared", publisher: "Leigh", licence: "MIT" });
    const [folder] = (await shared.list("items")).map((entry) => entry.name);
    await shared.write(`items/${folder}/00.Setup.md`, new TextEncoder().encode("# Changed\n"));
    const entry = (await searchLibrary(deps, ["/shared"])).courses[0];
    const planned = await planComposedCourse(deps, { name: "Mixed", lecturer: "", weeks: 1 }, [{ course: entry, item: entry.items[0], week: 1 }]);
    expect(!planned.ok && planned.problems[0].message).toMatch(/has changed since it was shared/);
  });

  it("says when nothing has changed since the last version", async () => {
    const { deps, found } = setup();
    const request = { course: await found(), item: null, registry: "/shared", publisher: "Leigh", licence: "MIT" };
    await share(deps, request);
    const again = await planShare(deps, request);
    expect(!again.ok && again.problems[0].message).toBe("Web Development is already shared as leigh/web-development version 1, and nothing has changed since.");
  });
});
