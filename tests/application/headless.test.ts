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

it("fix renames every folder with a suggested name on disk, then checks clean", async () => {
  const root = onDisk({ "course.md": "# C\n", "Week 3/topic.md": "# W\n", "Week 4/topic.md": "# W4\n" });
  const { code, lines, telemetry } = await run(root, "fix");
  expect(lines.slice(0, 2)).toEqual(["Fixed: Rename Week 3 to topic-week-3", "Fixed: Rename Week 4 to topic-week-4"]);
  // What is left is warnings (no netlify.toml, unnumbered and empty topics), which don't block publishing.
  expect(lines.slice(2, -1).every((line) => /^(warn |info )/.test(line))).toBe(true);
  expect(lines.at(-1)).toBe("Everything checks out.");
  expect(code).toBe(0);
  expect(existsSync(join(root, "topic-week-3/topic.md"))).toBe(true);
  expect(telemetry.events.map((e) => e.name)).toEqual(["course.validated", "plan.applied", "plan.applied", "course.validated"]);
});

it("fix reports a rename it could not make and leaves the problem listed", async () => {
  const root = onDisk({ "course.md": "# C\n", "Week 3/topic.md": "# W\n", "topic-week-3/topic.md": "# already here\n" });
  const { code, lines } = await run(root, "fix");
  expect(lines[0]).toMatch(/^Couldn't rename week 3 to topic-week-3: Week 3 \(.*already exists\)$/);
  expect(lines.at(-1)).toBe("1 problem to fix before publishing.");
  expect(code).toBe(1);
});

it("a finding with no suggested fix gets no plan, and errors are counted in the plural", async () => {
  const root = onDisk({ "topic-1/talk-1/talk.md": "# T\n" });
  const { code, lines } = await run(root, "fix");
  expect(lines.some((l) => l.startsWith("Fixed"))).toBe(false);
  expect(lines.some((l) => l.includes("(course folder)"))).toBe(true);
  expect(lines.at(-1)).toBe("3 problems to fix before publishing.");
  expect(code).toBe(1);
});

it("an unknown command is refused with exit code 2", async () => {
  const { code, lines } = await run(onDisk({ "course.md": "# C\n" }), "publish");
  expect(code).toBe(2);
  expect(lines).toEqual(['Unknown command "publish". Use check or fix.']);
});
