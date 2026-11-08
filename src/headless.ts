import { createAuthoring } from "./application/use-cases/authoring.ts";
import { noAssistant } from "./adapters/assistant/none/none-assistant.ts";
import { NodeFileSystem } from "./adapters/fs/node/node-fs.ts";
import { courseRules } from "./adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "./adapters/telemetry/local/local-telemetry.ts";
import { runHeadless } from "./adapters/cli/headless/headless.ts";

/**
 * `pnpm headless <course folder> [check|fix]`: Studio without a window. Same AuthoringPort as the app,
 * over node:fs, so any journey can be replayed from a terminal or CI.
 */
const [folder = ".", command = "check"] = process.argv.slice(2);
let n = 0;
const authoring = createAuthoring({ fs: new NodeFileSystem(folder), rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => `plan-${++n}` });
process.exitCode = await runHeadless(authoring, command, (line) => process.stdout.write(`${line}\n`));
