import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import axe from "axe-core";
import Check from "../../src/ui/components/Check.svelte";
import NewCourse from "../../src/ui/components/NewCourse.svelte";
import Settings from "../../src/ui/components/Settings.svelte";
import StartScreen from "../../src/ui/components/StartScreen.svelte";
import Library from "../../src/ui/components/Library.svelte";
import { waitFor } from "@testing-library/svelte";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { memoryLibrary } from "../../src/adapters/library/memory/memory-library.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { createLibrary } from "../../src/application/use-cases/library.ts";
import { memoryCommandLine } from "../../src/adapters/command-line/memory/memory-command-line.ts";
import { MemorySecrets } from "../../src/adapters/secrets/memory/memory-secrets.ts";
import { MemorySettings } from "../../src/adapters/settings/memory/memory-settings.ts";
import { createPreferences } from "../../src/application/use-cases/preferences.ts";
import { checkAnswers } from "../../src/domain/new-course.ts";

/**
 * axe over Studio's screens (WCAG 2.1 AA; design doc, "For contributors"): names, labels, roles and structure.
 * Colour contrast needs a real renderer, so it is checked from the tokens instead (tests/contract/contrast.test.ts).
 */
async function violations(): Promise<string[]> {
  const result = await axe.run(document.body, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }, rules: { "color-contrast": { enabled: false } } });
  return result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
}

describe("Studio's screens pass axe", () => {
  it("the start screen, with recent courses", async () => {
    render(StartScreen, { onOpen: vi.fn(), onNew: vi.fn(), onRecent: vi.fn(), onForget: vi.fn(), recent: [{ path: "/courses/web-dev", name: "web-dev" }] });
    expect(await violations()).toEqual([]);
  });

  it("the library, with a ready course and one to fix", async () => {
    const files = { "web/course.md": "# Web\n", "web/topic-01/topic.md": "# Week 1\n", "old/course.md": "# Old\n", "old/topic-01/talk-01/talk.md": "# T\n" };
    const shelf = createLibrary({
      library: memoryLibrary({ "/teaching": new MemoryFileSystem(files) }),
      rules: courseRules,
      settings: new MemorySettings({ libraryFolders: ["/teaching"] }),
    });
    render(Library, { shelf, choose: vi.fn(), onOpen: vi.fn(), onClose: vi.fn() });
    await waitFor(() => expect(screen.getByRole("heading", { name: "Needs fixing (1)" })).toBeTruthy());
    expect(await violations()).toEqual([]);
  });

  it("New course, at each step", async () => {
    render(NewCourse, { check: checkAnswers, onCreate: vi.fn().mockResolvedValue(null), onCancel: vi.fn() });
    expect(await violations()).toEqual([]);
    await fireEvent.input(screen.getByLabelText("Course name"), { target: { value: "Ethics" } });
    await fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await violations()).toEqual([]);
  });

  it("Check and publish, with problems, an assistant's plan and the switch", async () => {
    const plan = { id: "p", summary: "Rename a talk", ops: [{ op: "move" as const, from: "topic-01/talk 1", to: "topic-01/talk-1" }] };
    render(Check, {
      findings: [{ rule: "V001", severity: "error" as const, path: "topic-01/talk 1", message: "This folder's name has a space." }],
      advanced: true,
      placeOf: (path: string) => path,
      handOff: null,
      onPlanFixAll: vi.fn(async () => null),
      onApply: vi.fn(),
      onSelect: vi.fn(),
      onPublish: vi.fn(),
      onClose: vi.fn(),
      canPublish: true,
      readPermission: { name: "Claude", allowed: false, set: vi.fn() },
      agent: { allowed: true, set: vi.fn(), waiting: [{ id: "q", plan }], onAccept: vi.fn(), onDecline: vi.fn() },
    });
    expect(await violations()).toEqual([]);
  });

  it("Settings, with Advanced on", async () => {
    render(Settings, {
      preferences: createPreferences({ settings: new MemorySettings(), secrets: new MemorySecrets() }),
      appearance: { theme: "system", textSize: 0, reading: "default", motion: "system", contrast: "normal" } as never,
      onAppearance: vi.fn(),
      onClose: vi.fn(),
      advanced: true,
      onAdvanced: vi.fn(),
      companionHidden: false,
      onCompanionHidden: vi.fn(),
      commandLine: memoryCommandLine({ kind: "added", command: "/x", on_path: true }),
    });
    await screen.findByText("Advanced mode");
    expect(await violations()).toEqual([]);
  });
});
