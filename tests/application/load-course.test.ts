import { describe, expect, it } from "vitest";
import { unpackExports } from "../../src/application/use-cases/load-course.ts";
import type { CourseRulesPort } from "../../src/application/ports/course-rules.ts";

const bytes = (text: string) => new TextEncoder().encode(text);
const rules = {
  unpackExport(name: string, content: Uint8Array) {
    if (!name.endsWith(".mbz")) return null;
    if (new TextDecoder().decode(content) === "broken") return { ok: false as const, message: "This tar file is damaged." };
    return { ok: true as const, files: [{ path: "Week 01 Intro/Lecture 1.pdf", bytes: bytes("%PDF") }] };
  },
} as unknown as CourseRulesPort;

describe("unpackExports (STU-0222, STU-0223)", () => {
  it("leaves material that isn't an export as it is, in order", () => {
    const files = [
      { path: "a.pdf", bytes: bytes("a") },
      { path: "b/c.md", bytes: bytes("c") },
    ];
    expect(unpackExports(rules, files)).toEqual({ ok: true, files });
  });

  it("puts an export's material beside where the export was, in its place", () => {
    const result = unpackExports(rules, [
      { path: "first.pdf", bytes: bytes("1") },
      { path: "old/term.mbz", bytes: bytes("ok") },
      { path: "top.mbz", bytes: bytes("ok") },
    ]);
    expect(result.ok && result.files.map((file) => file.path)).toEqual(["first.pdf", "old/Week 01 Intro/Lecture 1.pdf", "Week 01 Intro/Lecture 1.pdf"]);
  });

  it("names the export it can't read, says why, and that nothing was made", () => {
    expect(unpackExports(rules, [{ path: "old/term.mbz", bytes: bytes("broken") }])).toEqual({
      ok: false,
      message: "Studio couldn't read old/term.mbz: This tar file is damaged. Nothing was created.",
    });
  });
});
