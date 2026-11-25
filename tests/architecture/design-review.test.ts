import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Every screen a lecturer reaches (docs/design-review/README.md), each with a recorded Impeccable critique (P3). */
const screens = [
  "src/ui/components/StartScreen.svelte",
  "src/ui/components/NewCourse.svelte",
  "src/ui/components/LoadCourse.svelte",
  "src/ui/components/Library.svelte",
  "src/ui/App.svelte",
  "src/ui/components/NodeDetail.svelte",
  "src/ui/components/PageEditor.svelte",
  "src/ui/components/QuizDesigner.svelte",
  "src/ui/components/History.svelte",
  "src/ui/components/Check.svelte",
  "src/ui/components/Publish.svelte",
  "src/ui/components/Settings.svelte",
  "src/ui/components/TermView.svelte",
];
const slug = (path: string) => path.toLowerCase().replace(/[^a-z0-9]+/g, "-");

describe("the design review (docs/design-review/README.md)", () => {
  const recorded = readdirSync("docs/design-review");
  it.each(screens)("%s has a recorded critique", (screen) => {
    expect(recorded.some((file) => file === `${slug(screen)}.md`)).toBe(true);
  });
});
