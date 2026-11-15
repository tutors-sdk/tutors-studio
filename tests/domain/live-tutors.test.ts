import { describe, expect, it } from "vitest";
import { liveStatusLine, tookFor } from "../../src/domain/live-tutors.ts";

describe("the live course's status line", () => {
  it("says updating, up to date with when and how long, or that the last change didn't build", () => {
    expect(liveStatusLine({ state: "updating" })).toBe("Live in Tutors: updating…");
    expect(liveStatusLine({ state: "ready", at: "10:02", ms: null })).toBe("Live in Tutors: up to date at 10:02");
    expect(liveStatusLine({ state: "ready", at: "10:02", ms: 340 })).toBe("Live in Tutors: up to date at 10:02, rebuilt in 0.3 seconds");
    expect(liveStatusLine({ state: "failed" })).toBe("Live in Tutors: the last change didn't build");
    expect(tookFor(13_919)).toBe("in 14 seconds");
  });
});
