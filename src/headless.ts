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
import { noEngagement } from "./adapters/engagement/none/none-engagement.ts";
import { nodeAgentAccess, studioConfigFolder } from "./adapters/agent-access/node/node-agent-access.ts";
import { nodeAgentPlans } from "./adapters/agent-plans/node/node-agent-plans.ts";
import { mcpToolHost } from "./adapters/tool-host/mcp/mcp-tool-host.ts";
import { NodeFileSystem, nodeCourseFolder } from "./adapters/fs/node/node-fs.ts";
import { courseRules } from "./adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "./adapters/telemetry/local/local-telemetry.ts";
import {
  runHandOff,
  runHeadless,
  runHeadlessLoad,
  runHeadlessNew,
  runRollOver,
  runLive,
  runTemplates,
  runCompose,
  runBorrow,
  runShare,
  runLibrary,
  runPicture,
  runPublishing,
} from "./adapters/cli/headless/headless.ts";
import { nodeLocalTutors } from "./adapters/local-tutors/node/node-local-tutors.ts";
import { nodeInsideTutors } from "./adapters/local-tutors/node/node-inside-tutors.ts";
import { createLiveTutors } from "./application/use-cases/live-tutors.ts";
import { BUILD_FOLDER } from "./domain/publish.ts";
import { nodeLibrary } from "./adapters/library/node/node-library.ts";
import { MemorySecrets } from "./adapters/secrets/memory/memory-secrets.ts";
import { nodeRegistry } from "./adapters/registry/node/node-registry.ts";
import { DRIVE_TOKEN, googleDrive } from "./adapters/registry/google-drive/google-drive.ts";
import { routedLibrary } from "./application/use-cases/library.ts";
import { routedRegistry } from "./application/use-cases/share.ts";
import { gitPublish } from "./adapters/publish/git/git-publish.ts";
import { createHandOff } from "./application/use-cases/hand-off.ts";

/**
 * `pnpm headless <course folder> [check|fix|save|quiz <folder>|add-quiz <topic> <form.json>|save-quiz <folder> <form.json>|save-website <parent>|publish <site>|live <tutors folder>|changes|push "<message>"|ignore-build|term|release <week> <date>|show-due <week>|engagement|mcp|allow-assistant on|off|details "title=...|credits=...|start=..."|outcomes ["Level: Students can ...|..."]|tag <item> LO1,LO2|picture <folder> <file>]` `pnpm headless templates`, `pnpm headless library <folder> ... [--items]`, `pnpm headless compose <parent> --name ... --from <library> --pick <course>:<item>@<week> ...`, `pnpm headless share <library> --course <course> [--item <item>] --to <registry> --publisher ... --licence ...`, `pnpm headless new <parent> --name ... [--template <id>]` and `pnpm headless load <folder> <parent> --name ...`: Studio
 * without a window. Same use cases as the app, over node:fs, so any journey can be replayed from a
 * terminal or CI.
 */
// A .env in the folder Studio runs from (NETLIFY_AUTH_TOKEN, say); real environment variables win.
if (existsSync(".env")) process.loadEnvFile(".env");
const args = process.argv.slice(2);
let n = 0;
const newId = () => `plan-${++n}`;
const print = (line: string) => process.stdout.write(`${line}\n`);
// Library folders and registries on Google Drive (ADR 0064) are named "gdrive:<folder id>", signed in with an
// access token in GOOGLE_DRIVE_TOKEN.
const google = googleDrive({ secrets: new MemorySecrets({ [DRIVE_TOKEN]: process.env.GOOGLE_DRIVE_TOKEN ?? "" }) });
const library = routedLibrary(nodeLibrary, google.library);
const registry = routedRegistry(nodeRegistry, google.registry);
if (args[0] === "compose") {
  const today = () => new Date().toISOString().slice(0, 10);
  process.exitCode = await runCompose({ library, rules: courseRules, newId, today, makeFolder: nodeCourseFolder }, args.slice(1), print);
} else if (args[0] === "borrow") {
  const today = () => new Date().toISOString().slice(0, 10);
  process.exitCode = await runBorrow({ library, rules: courseRules, newId, today, course: (folder) => new NodeFileSystem(folder) }, args.slice(1), print);
} else if (args[0] === "share") {
  const today = () => new Date().toISOString().slice(0, 10);
  process.exitCode = await runShare({ library, registry, rules: courseRules, newId, today }, args.slice(1), print);
} else if (args[0] === "library") {
  process.exitCode = await runLibrary({ library, rules: courseRules }, args.slice(1), print);
} else if (args[0] === "templates") {
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
    engagement: noEngagement,
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
      // The Tutors reader's static files, as Studio carries them (ADR 0045): `pnpm bundle reader` builds them.
      inside: nodeInsideTutors(root, process.env.TUTORS_READER ?? null, print),
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
  } else if (command === "roll-over") {
    process.exitCode = await runRollOver((parent) => ({ rules: courseRules, newId, makeFolder: nodeCourseFolder(parent) }), fs, args.slice(2), print);
  } else if (command === "mcp") {
    // The course's tools for an agent over stdio (ADR 0051): stdout is the protocol, so nothing else prints.
    const host = mcpToolHost({ course: root, access: nodeAgentAccess(), plans: nodeAgentPlans(studioConfigFolder()), version: process.env.npm_package_version ?? "0.0.0" });
    host.register(authoring);
    await host.serve("stdio");
  } else if (command === "allow-assistant") {
    // `allow-assistant on|off`: the lecturer's own switch for this course on this computer (STU-0204).
    if (target !== "on" && target !== "off") {
      print("Usage: headless <course folder> allow-assistant on|off");
      process.exitCode = 1;
    } else {
      await nodeAgentAccess().set(root, target === "on");
      print(
        target === "on"
          ? `An assistant on this computer may now work on ${basename(root)}, through plans you can see.`
          : `No assistant on this computer may work on ${basename(root)}.`,
      );
    }
  } else if (command === "picture") {
    process.exitCode = await runPicture(authoring, target, { path: basename(formFile ?? ""), bytes: new Uint8Array(readFileSync(formFile ?? "")) }, print);
  } else {
    const form = formFile === undefined ? undefined : JSON.parse(readFileSync(formFile, "utf8"));
    // `tag <item> LO1,LO3` and `release <week> YYYY-MM-DD` take two words; every other command one.
    const twoWords = command === "tag" || command === "release";
    const given = twoWords ? args.slice(2).join(" ") : target;
    process.exitCode = await runHeadless(authoring, command, print, given, twoWords ? undefined : form);
  }
}
