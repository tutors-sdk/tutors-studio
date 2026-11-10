/**
 * The composition root: the only place an adapter is named (ADR 0002). Inside Tauri the course is on
 * disk behind Studio's Rust commands; in a plain browser (`pnpm dev`) a small sample course in memory
 * stands in, so the UI can be worked on without a desktop build.
 */
import { mount } from "svelte";
import "./ui/paper-tokens.css";
import App from "./ui/App.svelte";
import type { AuthoringPort } from "./application/ports/authoring.ts";
import type { FileSystemPort } from "./application/ports/file-system.ts";
import { createAuthoring } from "./application/use-cases/authoring.ts";
import { createNewCourse } from "./application/use-cases/new-course.ts";
import { checkAnswers, type CourseAnswers } from "./domain/new-course.ts";
import { anthropicAssistant } from "./adapters/assistant/anthropic/anthropic-assistant.ts";
import { chosenAssistant } from "./application/use-cases/assistant.ts";
import { noAssistant } from "./adapters/assistant/none/none-assistant.ts";
import { ollamaAssistant, ollamaModels } from "./adapters/assistant/ollama/ollama-assistant.ts";
import { createCompanion, type CompanionPort } from "./application/companion/companion.ts";
import { MemoryFileSystem } from "./adapters/fs/memory/memory-fs.ts";
import { courseRules } from "./adapters/rules/course-rules/course-rules-adapter.ts";
import { markdownItPages } from "./adapters/markdown/markdown-it/markdown-it-pages.ts";
import { LocalTelemetry } from "./adapters/telemetry/local/local-telemetry.ts";
import { sampleCourse, sampleMaterial } from "./adapters/fs/memory/sample-course.ts";
import { createLoadedCourse, planLoadedCourse, readLoadedFolder, type LoadAnswers } from "./application/use-cases/load-course.ts";
import type { DroppedFile } from "./domain/material.ts";
import { MemorySecrets } from "./adapters/secrets/memory/memory-secrets.ts";
import { LocalStorageSettings } from "./adapters/settings/local-storage/local-storage-settings.ts";
import type { SecretsPort } from "./application/ports/secrets.ts";
import { createPreferences } from "./application/use-cases/preferences.ts";
import { appearanceAttributes } from "./domain/appearance.ts";
import type { PublishingPort } from "./application/ports/publishing.ts";
import { createPublishing } from "./application/use-cases/publishing.ts";
import type { HandOffPort } from "./application/ports/hand-off.ts";
import { createHandOff } from "./application/use-cases/hand-off.ts";
import { createMyFiles } from "./application/use-cases/my-files.ts";
import { createUpdates } from "./application/use-cases/updates.ts";
import { noUpdates } from "./adapters/updates/none/no-updates.ts";
import { createAccounts } from "./application/use-cases/accounts.ts";

const telemetry = new LocalTelemetry();
const inTauriWindow = "__TAURI_INTERNALS__" in window;
// Secrets: the OS keychain in the app (ADR 0016), this session only in the browser preview.
const secrets: SecretsPort = inTauriWindow ? (await import("./adapters/secrets/tauri/tauri-secrets.ts")).tauriSecrets : new MemorySecrets();
// Ollama through Tauri's HTTP client in the app, which only it may reach (ADR 0028); the window's own fetch in the browser preview.
const localFetch: typeof fetch = inTauriWindow ? (await import("@tauri-apps/plugin-http")).fetch : (...args) => fetch(...args);
const settings = new LocalStorageSettings();
const preferences = createPreferences({ settings, secrets, localModels: ollamaModels({ fetch: localFetch }) });
// Apply the lecturer's appearance before the first paint, so the window never flashes the default.
const initialAppearance = await preferences.appearance();
for (const [name, value] of Object.entries(appearanceAttributes(initialAppearance))) document.documentElement.setAttribute(name, value);
/** Authoring over a course; `course` names it for the assistant's read permission (ADR 0006). */
const assistantFor = (course: string) =>
  chosenAssistant({ preferences, course, providers: { anthropic: anthropicAssistant, ollama: (options) => ollamaAssistant({ ...options, fetch: localFetch }) } });
const companionFor = (course: string): CompanionPort => createCompanion({ assistant: assistantFor(course) });
const authoringOver = (fs: FileSystemPort, course: string): AuthoringPort =>
  createAuthoring({
    fs,
    rules: courseRules,
    assistant: assistantFor(course),
    telemetry,
    newId: () => crypto.randomUUID(),
    markdown: markdownItPages,
  });

const inTauri = "__TAURI_INTERNALS__" in window;
/** Netlify, signed in from Settings through the browser when this build carries a client id, else with a pasted token (STU-0115). */
const hosting = inTauri
  ? (await import("./adapters/hosting/netlify/netlify-hosting.ts")).netlifyHosting({ secrets, clientId: import.meta.env.VITE_NETLIFY_CLIENT_ID || undefined })
  : null;
/** The site each course was last published as, by its folder (STU-0113). */
const sitesFor = (courseRoot: string) => ({
  get: async () => (await settings.get("publishedSites"))[courseRoot] ?? null,
  set: async (site: string) => settings.set("publishedSites", { ...(await settings.get("publishedSites")), [courseRoot]: site }),
});
type OpenedCourse = { name: string; key: string; companion: CompanionPort; authoring: AuthoringPort; publishing: PublishingPort | null; handOff: HandOffPort | null };

/** Publishing for a course folder on disk: the generator and containers through Studio's Rust `run_tool`, the Netlify token in the keychain (ADR 0019). */
async function publishingFor(fs: FileSystemPort, courseRoot: string): Promise<PublishingPort> {
  const [{ tauriProcess }, { tutorsGenBuild }, { tauriSaveCopy }] = await Promise.all([
    import("./adapters/process/tauri/tauri-process.ts"),
    import("./adapters/build/tutors-gen/tutors-gen-build.ts"),
    import("./adapters/save-copy/tauri/tauri-save-copy.ts"),
  ]);
  return createPublishing({
    fs,
    rules: courseRules,
    build: tutorsGenBuild(tauriProcess, courseRoot),
    hosting: hosting!,
    saveCopy: tauriSaveCopy,
    telemetry,
    newId: () => crypto.randomUUID(),
    sites: sitesFor(courseRoot),
  });
}

/** Step 9's hand-off for a course folder on disk: the computer's git through Studio's Rust `run_tool` (ADR 0021). */
async function handOffFor(fs: FileSystemPort, courseRoot: string): Promise<HandOffPort> {
  const [{ tauriProcess }, { gitPublish }] = await Promise.all([import("./adapters/process/tauri/tauri-process.ts"), import("./adapters/publish/git/git-publish.ts")]);
  return createHandOff({ fs, rules: courseRules, git: gitPublish(tauriProcess, courseRoot), telemetry, newId: () => crypto.randomUUID() });
}

async function openLink(url: string): Promise<void> {
  if (!inTauri) {
    window.open(url, "_blank", "noopener");
    return;
  }
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}

/** A folder the lecturer picks on this computer, and a saved file shown in its folder (the app only). */
const folders = inTauri
  ? {
      async choose(title: string): Promise<string | null> {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const folder = await open({ directory: true, title });
        return typeof folder === "string" ? folder : null;
      },
      show(path: string) {
        void import("@tauri-apps/plugin-opener").then(({ revealItemInDir }) => revealItemInDir(path));
      },
    }
  : undefined;

/** A folder of material made into a course: what it would hold, and the step that makes it in a folder the lecturer picks. */
function materialFolder(folderName: string, files: DroppedFile[]) {
  return {
    folderName,
    preview: (answers: LoadAnswers) => planLoadedCourse(courseRules, answers, files, () => "preview"),
    async create(answers: LoadAnswers): Promise<OpenedCourse | { reason: string } | null> {
      const place = await coursePlace();
      if (place === null) return null;
      const created = await createLoadedCourse({ rules: courseRules, newId: () => crypto.randomUUID(), makeFolder: place.makeFolder }, answers, files);
      if (!created.ok) return { reason: created.reason };
      return openedNew(answers.name.trim(), created.fs, place.root());
    },
  };
}

/**
 * "Load a course": the lecturer points at a folder. A Tutors course opens as it is; any other folder is
 * read as their material, to make a new course from. In a plain browser, the sample course, or with
 * ?material, a sample folder of material.
 */
async function openCourse(): Promise<OpenedCourse | { material: ReturnType<typeof materialFolder> } | null> {
  if (!inTauri) {
    if (new URLSearchParams(location.search).has("material")) {
      const loaded = await readLoadedFolder(new MemoryFileSystem(sampleMaterial));
      return loaded.kind === "material" ? { material: materialFolder("web-dev-2026", loaded.files) } : null;
    }
    return {
      name: "Sample course",
      key: "sample-course",
      companion: companionFor("sample-course"),
      authoring: authoringOver(new MemoryFileSystem(sampleCourse), "sample-course"),
      publishing: null,
      handOff: null,
    };
  }
  const { open } = await import("@tauri-apps/plugin-dialog");
  const { TauriFileSystem, openCourseRoot } = await import("./adapters/fs/tauri/tauri-fs.ts");
  const folder = await open({ directory: true, title: "Choose a course, or a folder of your material" });
  if (typeof folder !== "string") return null;
  await openCourseRoot(folder);
  const fs = new TauriFileSystem();
  const loaded = await readLoadedFolder(fs);
  if (loaded.kind === "material") return { material: materialFolder(folder.split(/[\\/]/).filter(Boolean).pop() ?? folder, loaded.files) };
  return {
    name: folder.split(/[\\/]/).filter(Boolean).pop() ?? folder,
    key: folder,
    companion: companionFor(folder),
    authoring: authoringOver(fs, folder),
    publishing: await publishingFor(fs, folder),
    handOff: await handOffFor(fs, folder),
  };
}

/**
 * Where a new course goes: a folder the lecturer picks (in a plain browser, memory), with the step that
 * makes the course's own folder inside it. Null when the lecturer cancelled.
 */
async function coursePlace(): Promise<{ makeFolder: (name: string) => Promise<FileSystemPort>; root: () => string | null } | null> {
  if (!inTauri) return { makeFolder: () => Promise.resolve(new MemoryFileSystem({})), root: () => null };
  const { open } = await import("@tauri-apps/plugin-dialog");
  const { tauriCourseFolder } = await import("./adapters/fs/tauri/tauri-fs.ts");
  const parent = await open({ directory: true, title: "Choose where to put the course folder" });
  if (typeof parent !== "string") return null;
  const make = tauriCourseFolder(parent);
  let root: string | null = null;
  return {
    makeFolder: (name) => {
      root = `${parent}/${name}`;
      return make(name);
    },
    root: () => root,
  };
}

/** A course just made, opened: in its folder on disk, or in memory in a plain browser. */
async function openedNew(name: string, fs: FileSystemPort, root: string | null): Promise<OpenedCourse> {
  const key = root ?? `new:${name}`;
  return {
    name,
    key,
    companion: companionFor(key),
    authoring: authoringOver(fs, key),
    publishing: root === null ? null : await publishingFor(fs, root),
    handOff: root === null ? null : await handOffFor(fs, root),
  };
}

/** Creates the course in a folder the lecturer picks (in a plain browser, in memory) and opens it. */
async function createCourse(answers: CourseAnswers): Promise<OpenedCourse | { reason: string } | null> {
  const place = await coursePlace();
  if (place === null) return null;
  const created = await createNewCourse({ rules: courseRules, newId: () => crypto.randomUUID(), makeFolder: place.makeFolder }, answers);
  if (!created.ok) return { reason: created.reason };
  return openedNew(answers.name.trim(), created.fs, place.root());
}

const newCourse = { check: checkAnswers, create: createCourse };

mount(App, {
  target: document.getElementById("app")!,
  props: {
    openCourse,
    newCourse,
    openLink: (url: string) => void openLink(url),
    folders,
    preferences,
    accounts: hosting === null ? undefined : createAccounts({ hosting, open: (url: string) => void openLink(url) }),
    initialAppearance,
    rulesVersion: courseRules.version,
    guide: createCompanion({ assistant: noAssistant }),
    // The lecturer's own folder, read only through Studio's Rust commands (ADR 0035); the app only.
    myFiles: inTauri ? createMyFiles((await import("./adapters/own-files/tauri/tauri-own-files.ts")).tauriOwnFiles) : undefined,
    updates: createUpdates(inTauriWindow ? (await import("./adapters/updates/tauri/tauri-updates.ts")).tauriUpdates() : noUpdates("preview")),
  },
});
