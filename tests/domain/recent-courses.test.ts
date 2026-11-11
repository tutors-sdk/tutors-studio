import { describe, expect, it } from "vitest";
import { RECENT_LIMIT, withRecent, withRestored } from "../../src/domain/recent-courses.ts";

describe("putting a forgotten course back", () => {
  it("returns it to the place it had", () => {
    expect(withRestored(["/a", "/c"], "/b", 1)).toEqual(["/a", "/b", "/c"]);
    expect(withRestored(["/b", "/c"], "/a", 0)).toEqual(["/a", "/b", "/c"]);
  });

  it("puts it last when the list has since grown shorter, and first for a place before the start", () => {
    expect(withRestored(["/a"], "/z", 5)).toEqual(["/a", "/z"]);
    expect(withRestored(["/a"], "/z", -1)).toEqual(["/z", "/a"]);
  });

  it("keeps each course once and the list at most eight long", () => {
    expect(withRestored(["/a", "/b"], "/b", 0)).toEqual(["/b", "/a"]);
    const full = Array.from({ length: RECENT_LIMIT }, (_, n) => `/c${n}`);
    const restored = withRestored(full, "/x", 3);
    expect(restored).toHaveLength(RECENT_LIMIT);
    expect(restored[3]).toBe("/x");
  });

  it("leaves remembering a course unchanged", () => {
    expect(withRecent(["/a", "/b"], "/b")).toEqual(["/b", "/a"]);
  });
});
