import { describe, expect, it } from "vitest";
import { changeLines, changesSince, hashOf, isPublishedFile, itemsOf, publishedOn, type LastPublish } from "../../src/domain/changes.ts";
import type { CourseFolder } from "../../src/domain/course-map.ts";

const folder = (path: string, kind: string | null, title: string | null, children: CourseFolder[] = []): CourseFolder => ({
  name: path.split("/").pop() ?? "",
  path,
  kind,
  title,
  files: [],
  children,
});

const tree = (weeks: CourseFolder[]) => folder("", "course", "Web Development", weeks);
const week1 = folder("topic-01", "topic", "Week 1", [folder("topic-01/talk-1", "talk", "Intro")]);

describe("what changed since the last publish", () => {
  it("names topics as weeks and leaves out built output and Studio's own folders", () => {
    expect(itemsOf(tree([week1, folder("topic-02", "topic", "Forms"), folder("json", null, null)]))).toEqual({
      "": "The course page",
      "topic-01": "Week 1",
      "topic-01/talk-1": 'Talk "Intro"',
      "topic-02": 'Week "Forms"',
    });
    expect(isPublishedFile("json/tutors.json")).toBe(false);
    expect(isPublishedFile(".tutors-bin/x.md")).toBe(false);
    expect(isPublishedFile("netlify.toml")).toBe(false);
    expect(isPublishedFile("topic-01/topic.md")).toBe(true);
  });

  it("hashes the same bytes the same way and different bytes differently", () => {
    const bytes = (text: string) => new TextEncoder().encode(text);
    expect(hashOf(bytes("# Intro"))).toBe(hashOf(bytes("# Intro")));
    expect(hashOf(bytes("# Intro"))).not.toBe(hashOf(bytes("# Intro!")));
  });

  const before: LastPublish = {
    at: "2026-11-10T09:00:00Z",
    digest: { "course.md": "a", "topic-01/topic.md": "b", "topic-01/talk-1/talk.md": "c" },
    items: itemsOf(tree([week1])),
  };

  it("reports a new week once, not each item in it", () => {
    const now = { ...before.digest, "topic-02/topic.md": "d", "topic-02/talk-2/talk.md": "e" };
    const items = itemsOf(tree([week1, folder("topic-02", "topic", "Forms", [folder("topic-02/talk-2", "talk", "Inputs")])]));
    expect(changesSince(before, now, items)).toEqual({ added: ['Week "Forms"'], rewritten: [], removed: [] });
  });

  it("reports a rewritten talk and a changed course page", () => {
    const now = { ...before.digest, "course.md": "z", "topic-01/talk-1/talk.md": "y" };
    expect(changeLines(changesSince(before, now, before.items))).toEqual(['Changed: The course page and Talk "Intro".']);
  });

  it("reports a removed week once", () => {
    expect(changeLines(changesSince(before, { "course.md": "a" }, itemsOf(tree([]))))).toEqual(["Removed: Week 1."]);
  });

  it("says so when nothing changed, and dates a publish in words", () => {
    expect(changeLines(changesSince(before, before.digest, before.items))).toEqual(["Nothing has changed since you last published."]);
    expect(publishedOn("2026-11-10T09:00:00Z")).toBe("10 November 2026");
  });
});
