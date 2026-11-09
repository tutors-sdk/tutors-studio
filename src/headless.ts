import { existsSync, readFileSync } from "node:fs";
import { readerEnvironment } from "./domain/environment.ts";
import { resolve } from "node:path";
import { createPublishing } from "./application/use-cases/publishing.ts";
import { tutorsGenBuild } from "./adapters/build/tutors-gen/tutors-gen-build.ts";
import { netlifyHosting } from "./adapters/hosting/netlify/netlify-hosting.ts";
import { nodeProcess } from "./adapters/process/node/node-process.ts";
import { containerReader } from "./adapters/reader/container/container-reader.ts";
import { EnvSecrets } from "./adapters/secrets/env/env-secrets.ts";
import { createAuthoring } from "./application/use-cases/authoring.ts";
import { noAssistant } from "./adapters/assistant/none/none-assistant.ts";
import { NodeFileSystem, nodeCourseFolder } from "./adapters/fs/node/node-fs.ts";
import { courseRules } from "./adapters/rules/course-rules/course-rules-adapter.ts";
import { mermaidDiagrams } from "./adapters/diagrams/mermaid/mermaid-diagrams.ts";
import { marpSlides } from "./adapters/slides/marp/marp-slides.ts";
import { LocalTelemetry } from "./adapters/telemetry/local/local-telemetry.ts";
import { runHandOff, runHeadless, runHeadlessLoad, runHeadlessNew, runPublishing } from "./adapters/cli/headless/headless.ts";
import { gitPublish } from "./adapters/publish/git/git-publish.ts";
import { createHandOff } from "./application/use-cases/hand-off.ts";

/**
 * `pnpm headless <course folder> [check|fix|preview <folder>|quiz <folder>|add-quiz <topic> <form.json>|save-quiz <folder> <form.json>|preview-here|publish <site>|push "<message>"|ignore-build]` `pnpm headless new <parent> --name ...` and `pnpm headless load <folder> <parent> --name ...`: Studio
 * without a window. Same use cases as the app, over node:fs, so any journey can be replayed from a
 * terminal or CI.
 */
// The Tutors .env in the folder Studio runs from, as the mono-repo's apps read theirs; real environment variables win.
if (existsSync(".env")) process.loadEnvFile(".env");
const args = process.argv.slice(2);
let n = 0;
const newId = () => `plan-${++n}`;
const print = (line: string) => process.stdout.write(`${line}\n`);
if (args[0] === "new") {
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
    diagrams: mermaidDiagrams,
    slides: marpSlides,
  });
  if (command === "preview-here" || command === "publish") {
    const publishing = createPublishing({
      fs,
      rules: courseRules,
      build: tutorsGenBuild(nodeProcess, root),
      reader: containerReader(nodeProcess, {
        courseRoot: root,
        environment: async () => readerEnvironment(Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined))),
      }),
      hosting: netlifyHosting({ secrets: new EnvSecrets(process.env) }),
      telemetry: new LocalTelemetry(),
    });
    process.exitCode = await runPublishing(publishing, command, print, target);
  } else if (command === "push" || command === "ignore-build") {
    const handOff = createHandOff({ fs, rules: courseRules, git: gitPublish(nodeProcess, root), telemetry: new LocalTelemetry(), newId });
    process.exitCode = await runHandOff(handOff, authoring, command, print, target);
  } else {
    const form = formFile === undefined ? undefined : JSON.parse(readFileSync(formFile, "utf8"));
    process.exitCode = await runHeadless(authoring, command, print, target, form);
  }
}
