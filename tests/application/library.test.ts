import { describe, expect, it } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { memoryLibrary } from "../../src/adapters/library/memory/memory-library.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { createLibrary, libraryCourseFiles, searchLibrary, withLibraryFolder, withoutLibraryFolder } from "../../src/application/use-cases/library.ts";
import { defaultSettings, type Settings, type SettingsPort } from "../../src/application/ports/settings.ts";

const course = (prefix: string, title: string) => ({
  [`${prefix}course.md`]: `# ${title}\n`,
  [`${prefix}topic-01/topic.md`]: "# Week 1\n",
  [`${prefix}topic-01/note-01/note.md`]: "# Reading\n",
});

const settings = (): SettingsPort => {
  const values: Settings = structuredClone(defaultSettings);
  return { get: async (key) => values[key], set: async (key, value) => void (values[key] = value) };
};

describe("searching the library", () => {
  it("finds a course at the top of a library folder and below it, and doesn't look inside a course", async () => {
    const library = memoryLibrary({
      "/lib": new MemoryFileSystem({ ...course("", "Top"), ...course("topic-01/old/", "Inside") }),
      "/more": new MemoryFileSystem({ ...course("a/b/", "Deep"), "node_modules/x/course.md": "# Hidden\n", ".git/course.md": "# Hidden\n" }),
    });
    const found = await searchLibrary({ library, rules: courseRules }, ["/lib", "/more"]);
    expect(found.courses.map((c) => [c.library, c.path, c.title])).toEqual([
      ["/more", "a/b", "Deep"],
      ["/lib", "", "Top"],
    ]);
  });

  it("goes no deeper than six folders", async () => {
    const library = memoryLibrary({ "/lib": new MemoryFileSystem({ ...course("1/2/3/4/5/6/", "Six"), ...course("1/2/3/4/5/6/7/", "Seven") }) });
    expect((await searchLibrary({ library, rules: courseRules }, ["/lib"])).courses.map((c) => c.title)).toEqual(["Six"]);
  });

  it("names a folder it can't read and keeps searching the others", async () => {
    const library = memoryLibrary({ "/lib": new MemoryFileSystem(course("", "Top")) });
    const found = await searchLibrary({ library, rules: courseRules }, ["/gone", "/lib"]);
    expect(found.unread).toEqual([{ library: "/gone", message: "/gone: not a folder" }]);
    expect(found.courses).toHaveLength(1);
  });

  it("reads a course through a view that refuses every write", async () => {
    const files = libraryCourseFiles(memoryLibrary({ "/lib": new MemoryFileSystem(course("web/", "Web")) }), "/lib", "web");
    expect(await files.exists("course.md")).toBe(true);
    expect(await files.exists("topic-01/nothing.md")).toBe(false);
    expect(await files.exists("nowhere/nothing.md")).toBe(false);
    await expect(files.write("x.md", new Uint8Array())).rejects.toThrow("Studio only reads your library folders.");
    await expect(files.move("course.md", "c.md")).rejects.toThrow();
    await expect(files.remove("course.md")).rejects.toThrow();
    expect(typeof files.watch(() => {})).toBe("function");
  });

  it("keeps the folders the lecturer added, each once, in Settings", async () => {
    expect(withLibraryFolder(["/a"], "/a")).toEqual(["/a"]);
    expect(withoutLibraryFolder(["/a", "/b"], "/a")).toEqual(["/b"]);
    const shelf = createLibrary({ library: memoryLibrary({ "/lib": new MemoryFileSystem(course("", "Top")) }), rules: courseRules, settings: settings() });
    expect(await shelf.add("/lib")).toEqual(["/lib"]);
    expect((await shelf.search()).courses).toHaveLength(1);
    expect(await shelf.remove("/lib")).toEqual([]);
    expect(await shelf.folders()).toEqual([]);
  });
});
