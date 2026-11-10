import { mkdirSync, mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { expect, it } from "vitest";
import { runHeadless } from "../../src/adapters/cli/headless/headless.ts";
import { NodeFileSystem } from "../../src/adapters/fs/node/node-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";

const onDisk = (files: Record<string, string>) => {
  const root = mkdtempSync(join(tmpdir(), "studio-headless-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
};

const run = async (root: string, command: string) => {
  const telemetry = new LocalTelemetry();
  let n = 0;
  const authoring = createAuthoring({ fs: new NodeFileSystem(root), rules: courseRules, assistant: noAssistant, telemetry, newId: () => `plan-${++n}` });
  const lines: string[] = [];
  const code = await runHeadless(authoring, command, (line) => lines.push(line));
  return { code, lines, telemetry };
};

it("fix applies every safe fix as one plan on disk, then checks clean", async () => {
  const root = onDisk({ "course.md": "# C\n", "topic-01/topic.md": "# W\n", "topic-01/talk-01 Intro/talk.md": "# T\n", "topic-01/talk-01 Intro/slides.pdf": "%PDF" });
  const { code, lines, telemetry } = await run(root, "fix");
  // The talk folder's rename and the missing netlify.toml.
  expect(lines[0]).toBe("Fixed: Make the 2 safe fixes the course map suggests");
  expect(lines.at(-1)).toBe("Everything checks out.");
  expect(code).toBe(0);
  expect(existsSync(join(root, "topic-01/talk-01-intro/slides.pdf"))).toBe(true);
  expect(telemetry.events.map((e) => e.name)).toEqual(["plan.applied", "course.validated"]);
});

it("fix leaves a folder with no kind for the lecturer to say what it is (STU-0071)", async () => {
  const root = onDisk({ "course.md": "# C\n", "Week 3/topic.md": "# W\n" });
  const { lines, code } = await run(root, "fix");
  expect(lines[0]).toBe("Fixed: Make the 1 safe fix the course map suggests");
  expect(existsSync(join(root, "Week 3/topic.md"))).toBe(true);
  expect(lines.at(-1)).toBe("1 problem to fix before publishing.");
  expect(code).toBe(1);
});

it("fix reports a plan it could not apply, changes nothing, and leaves the problem listed", async () => {
  const root = onDisk({ "course.md": "# C\n", "topic-01/topic.md": "# W\n", "topic-01/talk-01 Intro/talk.md": "# T\n", "topic-01/talk-01-intro/talk.md": "# already here\n" });
  const { code, lines } = await run(root, "fix");
  expect(lines[0]).toMatch(/^Couldn't make the 2 safe fixes the course map suggests: topic-01\/talk-01 Intro \(.*already exists\)$/);
  expect(existsSync(join(root, "netlify.toml"))).toBe(false);
  expect(lines.some((line) => line.includes("talk-01 Intro"))).toBe(true);
  expect(code).toBe(1);
});

it("findings with no safe rename stay listed, and errors are counted in the plural", async () => {
  const root = onDisk({ "topic-1/talk-1/talk.md": "# T\n" });
  const { code, lines } = await run(root, "fix");
  // Only the netlify.toml template is safe here; the missing course.md and the folder names need the lecturer.
  expect(lines[0]).toBe("Fixed: Make the 1 safe fix the course map suggests");
  expect(lines.some((l) => l.includes("(course folder)"))).toBe(true);
  expect(lines.at(-1)).toBe("3 problems to fix before publishing.");
  expect(code).toBe(1);
});

it("an unknown command is refused with exit code 2", async () => {
  const { code, lines } = await run(onDisk({ "course.md": "# C\n" }), "publish");
  expect(code).toBe(2);
  expect(lines).toEqual(['Unknown command "publish". Use check, fix, quiz, add-quiz, save-quiz, history or undo.']);
});
