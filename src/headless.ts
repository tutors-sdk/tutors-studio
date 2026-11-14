import { existsSync, readFileSync, watch } from "node:fs";
import { basename, resolve } from "node:path";
import { createPublishing } from "./application/use-cases/publishing.ts";
import { tutorsGenBuild } from "./adapters/build/tutors-gen/tutors-gen-build.ts";
import { netlifyHosting } from "./adapters/hosting/netlify/netlify-hosting.ts";
import { nodeSaveCopy } from "./adapters/save-copy/node/node-save-copy.ts";
import { nodeProcess } from "./adapters/process/node/node-process.ts";
import { EnvSecrets } from "./adapters/secrets/env/env-secrets.ts";
import { createAuthoring } from "./application/use-cases/authoring.ts";
import { noAssistant } from "./adapters/assistant/none/none-assistant.ts";
import { NodeFileSystem, nodeCourseFolder } from "./adapters/fs/node/node-fs.ts";
import { courseRules } from "./adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "./adapters/telemetry/local/local-telemetry.ts";
import { runHandOff, runHeadless, runHeadlessLoad, runHeadlessNew, runLive, runTemplates, runPicture, runPublishing } from "./adapters/cli/headless/headless.ts";
import { nodeLocalTutors } from "./adapters/local-tutors/node/node-local-tutors.ts";
import { createLiveTutors } from "./application/use-cases/live-tutors.ts";
import { BUILD_FOLDER } from "./domain/publish.ts";
import { gitPublish } from "./adapters/publish/git/git-publish.ts";
import { createHandOff } from "./application/use-cases/hand-off.ts";

/**
 * `pnpm headless <course folder> [check|fix|save|quiz <folder>|add-quiz <topic> <form.json>|save-quiz <folder> <form.json>|save-website <parent>|publish <site>|live <tutors folder>|changes|push "<message>"|ignore-build|details "title=...|credits=...|start=..."|picture <folder> <file>]` `pnpm headless templates`, `pnpm headless new <parent> --name ... [--template <id>]` and `pnpm headless load <folder> <parent> --name ...`: Studio
 * without a window. Same use cases as the app, over node:fs, so any journey can be replayed from a
 * terminal or CI.
 */
// A .env in the folder Studio runs from (NETLIFY_AUTH_TOKEN, say); real environment variables win.
if (existsSync(".env")) process.loadEnvFile(".env");
const args = process.argv.slice(2);
let n = 0;
const newId = () => `plan-${++n}`;
const print = (line: string) => process.stdout.write(`${line}\n`);
if (args[0] === "templates") {
  process.exitCode = runTemplates(print);
} else if (args[0] === "new") {
  process.exitCode = await runHeadlessNew((parent) => ({ rules: courseRules, newId, makeFolder: nodeCourseFolder(parent) }), args.slice(1), print);
} else if (args[0] === "load") {
  process.exitCode = await runHeadlessLoad(
    new NodeFileSystem(args[1] ?? "."),
    (parent) => ({ rules: courseRules, newId, makeFolder: nodeCourseFolder(parent) }),
    args.slice(2),
    print,
  );
} else {
  const [folder = ".", command = "check", target = "", formFile] = args;
  const fs = new NodeFileSystem(folder);
  const root = resolve(folder);
  const authoring = createAuthoring({
    fs,
    rules: courseRules,
    assistant: noAssistant,
    telemetry: new LocalTelemetry(),
    newId,
  });
  if (["save", "publish", "save-website", "changes"].includes(command)) {
    const publishing = createPublishing({
      fs,
      rules: courseRules,
      build: tutorsGenBuild(nodeProcess, root),
      hosting: netlifyHosting({ secrets: new EnvSecrets(process.env) }),
      saveCopy: nodeSaveCopy(root),
      telemetry: new LocalTelemetry(),
      newId,
    });
    process.exitCode = await runPublishing(publishing, command, print, target, basename(root));
  } else if (command === "live") {
    let tutorsFolder: string | null = null;
    const live = createLiveTutors({
      build: tutorsGenBuild(nodeProcess, root),
      tutors: nodeLocalTutors(root, print),
      folder: { get: async () => tutorsFolder, set: async (folder) => void (tutorsFolder = folder) },
    });
    // Every change but the generator's own output and Studio's dot folders (the bin, undo) rebuilds the course.
    const changes = (onChange: () => void) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const watcher = watch(root, { recursive: true }, (_event, name) => {
        const path = String(name ?? "").replaceAll("\\", "/");
        if (path === BUILD_FOLDER || path.startsWith(`${BUILD_FOLDER}/`) || path.startsWith(".")) return;
        clearTimeout(timer);
        timer = setTimeout(onChange, 400);
      });
      return () => watcher.close();
    };
    // Ctrl+C, a closed terminal or a kill all stop the server and the reader this command started.
    const interrupted = new Promise<void>((done) => ["SIGINT", "SIGTERM", "SIGHUP"].forEach((signal) => process.once(signal, () => done())));
    process.exitCode = await runLive(live, target === "" ? "" : resolve(target), print, changes, interrupted);
  } else if (command === "push" || command === "ignore-build") {
    const handOff = createHandOff({ fs, rules: courseRules, git: gitPublish(nodeProcess, root), telemetry: new LocalTelemetry(), newId });
    process.exitCode = await runHandOff(handOff, authoring, command, print, target);
  } else if (command === "picture") {
    process.exitCode = await runPicture(authoring, target, { path: basename(formFile ?? ""), bytes: new Uint8Array(readFileSync(formFile ?? "")) }, print);
  } else {
    const form = formFile === undefined ? undefined : JSON.parse(readFileSync(formFile, "utf8"));
    process.exitCode = await runHeadless(authoring, command, print, target, form);
  }
}
