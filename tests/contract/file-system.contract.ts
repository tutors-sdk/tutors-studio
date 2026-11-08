import { describe, expect, it } from "vitest";
import type { FileSystemPort } from "../../src/application/ports/file-system.ts";

const bytes = (text: string) => new TextEncoder().encode(text);
const text = (data: Uint8Array) => new TextDecoder().decode(data);

/**
 * FileSystemPort's contract (ADR 0009): every adapter passes this suite before it merges. `make` returns
 * an adapter over a fresh course holding exactly the given files.
 */
export function fileSystemContract(name: string, make: (files: Record<string, string>) => Promise<FileSystemPort>) {
  describe(`FileSystemPort contract: ${name}`, () => {
    it("lists the files and folders directly inside a folder", async () => {
      const fs = await make({ "course.md": "# C", "topic-01/topic.md": "# T", "topic-01/talk-01/s.pdf": "%PDF" });
      const root = (await fs.list("")).map((e) => `${e.name}:${e.kind}`).sort();
      expect(root).toEqual(["course.md:file", "topic-01:dir"]);
      const topic = await fs.list("topic-01");
      expect(topic.find((e) => e.name === "topic.md")).toMatchObject({ kind: "file", size: 3 });
    });

    it("reads back what it writes, creating folders on the way", async () => {
      const fs = await make({ "course.md": "# C" });
      await fs.write("topic-02/talk-01/talk.md", bytes("# Talk"));
      expect(text(await fs.read("topic-02/talk-01/talk.md"))).toBe("# Talk");
      expect(await fs.exists("topic-02")).toBe(true);
    });

    it("moves a folder with everything in it", async () => {
      const fs = await make({ "Week 3/topic.md": "# W", "Week 3/talk-01/s.pdf": "%PDF" });
      await fs.move("Week 3", "topic-week-3");
      expect(await fs.exists("Week 3")).toBe(false);
      expect(text(await fs.read("topic-week-3/talk-01/s.pdf"))).toBe("%PDF");
    });

    it("never moves onto something that exists", async () => {
      const fs = await make({ "a.md": "a", "b.md": "b" });
      await expect(fs.move("a.md", "b.md")).rejects.toThrow();
      expect(text(await fs.read("b.md"))).toBe("b");
      expect(text(await fs.read("a.md"))).toBe("a");
    });

    it("removes a file, and fails to read or move what is not there", async () => {
      const fs = await make({ "a.md": "a" });
      await fs.remove("a.md");
      expect(await fs.exists("a.md")).toBe(false);
      await expect(fs.read("a.md")).rejects.toThrow();
      await expect(fs.move("a.md", "b.md")).rejects.toThrow();
    });

    it("says the root exists, and a name that only prefixes another does not", async () => {
      const fs = await make({ "topic-10/topic.md": "x" });
      expect(await fs.exists("")).toBe(true);
      expect(await fs.exists("topic-1")).toBe(false);
    });

    it("returns an unsubscribe from watch", async () => {
      const fs = await make({});
      const stop = fs.watch(() => {});
      expect(typeof stop).toBe("function");
      stop();
    });
  });
}
