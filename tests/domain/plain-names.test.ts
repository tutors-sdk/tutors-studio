import { describe, expect, it } from "vitest";
import { deckStarter, videoIdFrom, visibleKinds } from "../../src/domain/plain-names.ts";
describe("a video link's id", () => {
  it("takes the id from a YouTube address, keeps other https videos, and refuses anything else", () => {
    expect(videoIdFrom("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(videoIdFrom("https://youtu.be/dQw4w9WgXcQ?t=3")).toBe("dQw4w9WgXcQ");
    expect(videoIdFrom("https://www.youtube.com/shorts/abcdef12")).toBe("abcdef12");
    expect(videoIdFrom("https://vimeo.com/123456")).toBe("https://vimeo.com/123456");
    expect(videoIdFrom("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(videoIdFrom("not a video")).toBe("");
  });
});

describe("deckStarter", () => {
  it("starts a Marp deck with the title on its first slide", () => {
    const deck = deckStarter("Flexbox");
    expect(deck.startsWith("---\nmarp: true\n")).toBe(true);
    expect(deck).toContain("\n---\n\n# Flexbox\n\n---\n\n## What we'll cover");
    expect(deck.endsWith("\n")).toBe(true);
  });
  it("isn't offered when making a folder students can't see into something", () => {
    expect(visibleKinds("week").some((plain) => plain.deck)).toBe(false);
  });
});
