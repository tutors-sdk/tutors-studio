import { createAuthoring } from "./application/use-cases/authoring.ts";
import { noAssistant } from "./adapters/assistant/none/none-assistant.ts";
import { NodeFileSystem, nodeCourseFolder } from "./adapters/fs/node/node-fs.ts";
import { courseRules } from "./adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "./adapters/telemetry/local/local-telemetry.ts";
import { runHeadless, runHeadlessNew } from "./adapters/cli/headless/headless.ts";

/**
 * `pnpm headless <course folder> [check|fix]` and `pnpm headless new <parent> --name ...`: Studio
 * without a window. Same use cases as the app, over node:fs, so any journey can be replayed from a
 * terminal or CI.
 */
const args = process.argv.slice(2);
let n = 0;
const newId = () => `plan-${++n}`;
const print = (line: string) => process.stdout.write(`${line}\n`);
if (args[0] === "new") {
  process.exitCode = await runHeadlessNew((parent) => ({ rules: courseRules, newId, makeFolder: nodeCourseFolder(parent) }), args.slice(1), print);
} else {
  const [folder = ".", command = "check"] = args;
  const authoring = createAuthoring({ fs: new NodeFileSystem(folder), rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId });
  process.exitCode = await runHeadless(authoring, command, print);
}
