/**
 * The composition root: the only place an adapter is named (ADR 0002). Inside Tauri the course is on
 * disk behind Studio's Rust commands; in a plain browser (`pnpm dev`) a small sample course in memory
 * stands in, so the UI can be worked on without a desktop build.
 */
import { mount } from "svelte";
import "./ui/paper-tokens.css";
import "./ui/studio-base.css";
import App from "./ui/App.svelte";
import type { AuthoringPort } from "./application/ports/authoring.ts";
import type { FileSystemPort } from "./application/ports/file-system.ts";
import { createAuthoring } from "./application/use-cases/authoring.ts";
import { createNewCourse } from "./application/use-cases/new-course.ts";
import { noEngagement } from "./adapters/engagement/none/none-engagement.ts";
import { createRollOver, type RollOverAnswers } from "./application/use-cases/term.ts";
import { checkAnswers, SAMPLE_COURSE, type CourseAnswers } from "./domain/new-course.ts";
import { courseNameOf } from "./domain/recent-courses.ts";
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
import { createLiveTutors } from "./application/use-cases/live-tutors.ts";
import { createAgentDesk, type AgentDesk } from "./application/use-cases/agent-desk.ts";
import type { LiveTutorsPort } from "./application/ports/live-tutors.ts";
import type { HandOffPort } from "./application/ports/hand-off.ts";
import { createHandOff } from "./application/use-cases/hand-off.ts";
import { createMyFiles } from "./application/use-cases/my-files.ts";
import { createLibrary, routedLibrary } from "./application/use-cases/library.ts";
import { createComposedCourse, planComposedCourse } from "./application/use-cases/compose-course.ts";
import { planShare, routedRegistry, share } from "./application/use-cases/share.ts";
import { createDrive } from "./application/use-cases/drive.ts";
import { googleDrive } from "./adapters/registry/google-drive/google-drive.ts";
import type { LibraryScreen } from "./ui/app-props.ts";
import { memoryRegistry } from "./adapters/registry/memory/memory-registry.ts";
import { memoryLibrary } from "./adapters/library/memory/memory-library.ts";
import { MemorySettings } from "./adapters/settings/memory/memory-settings.ts";
import { createRecentCourses } from "./application/use-cases/recent-courses.ts";
import { createUpdates } from "./application/use-cases/updates.ts";
import { noUpdates } from "./adapters/updates/none/no-updates.ts";
import type { LastPublish } from "./domain/changes.ts";
import { createAccounts } from "./application/use-cases/accounts.ts";
import { countingTelemetry, createUsage } from "./application/use-cases/usage.ts";

const inTauriWindow = "__TAURI_INTERNALS__" in window;
// Secrets: the OS keychain in the app (ADR 0016), this session only in the browser preview.
const secrets: SecretsPort = inTauriWindow ? (await import("./adapters/secrets/tauri/tauri-secrets.ts")).tauriSecrets : new MemorySecrets();
// Ollama through Tauri's HTTP client in the app, which only it may reach (ADR 0028); the window's own fetch in the browser preview.
const localFetch: typeof fetch = inTauriWindow ? (await import("@tauri-apps/plugin-http")).fetch : (...args) => fetch(...args);
const settings = new LocalStorageSettings();
const updates = createUpdates(inTauriWindow ? (await import("./adapters/updates/tauri/tauri-updates.ts")).tauriUpdates() : noUpdates("preview"), {
  lastCheck: { get: () => settings.get("lastUpdateCheck"), set: (at) => settings.set("lastUpdateCheck", at) },
  channel: { get: () => settings.get("updateChannel"), set: (channel) => settings.set("updateChannel", channel) },
  keepUpToDate: { get: () => settings.get("keepUpToDate"), set: (on) => settings.set("keepUpToDate", on) },
});
// With Keep Studio up to date on, an update downloaded in the background installs as Studio closes (ADR 0046).
if (inTauriWindow) {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  void getCurrentWindow().onCloseRequested(() => updates.closing());
}
// Events stay on this computer; the ones the lecturer opted to count are counted, as numbers only (ADR 0037).
const usage = createUsage({ settings, version: () => updates.version() });
const telemetry = countingTelemetry(new LocalTelemetry(), usage);
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
    // Reading Tutors' time data waits on read access upstream (ADR 0050); until then, no figures.
    engagement: noEngagement,
  });

const inTauri = "__TAURI_INTERNALS__" in window;
/** Netlify, signed in from Settings through the browser when this build carries a client id, else with a pasted token (STU-0115). */
const hosting = inTauri
  ? (await import("./adapters/hosting/netlify/netlify-hosting.ts")).netlifyHosting({ secrets, clientId: import.meta.env.VITE_NETLIFY_CLIENT_ID || undefined })
  : null;
/** Each course's files and items at its last publish, by its folder (feature 8). */
const lastPublishFor = (courseRoot: string) => ({
  get: async () => (await settings.get("lastPublished"))[courseRoot] ?? null,
  set: async (last: LastPublish) => settings.set("lastPublished", { ...(await settings.get("lastPublished")), [courseRoot]: last }),
});
/** The site each course was last published as, by its folder (STU-0113). */
const sitesFor = (courseRoot: string) => ({
  get: async () => (await settings.get("publishedSites"))[courseRoot] ?? null,
  set: async (site: string) => settings.set("publishedSites", { ...(await settings.get("publishedSites")), [courseRoot]: site }),
});
type OpenedCourse = {
  name: string;
  key: string;
  companion: CompanionPort;
  authoring: AuthoringPort;
  publishing: PublishingPort | null;
  handOff: HandOffPort | null;
  live: LiveTutorsPort | null;
  rollOver?: (answers: RollOverAnswers) => Promise<OpenedCourse | { reason: string } | null>;
  agent?: AgentDesk;
};

/** Next year's course from this one (STU-0199): made whole in a folder the lecturer picks, then opened. */
const rollOverFrom =
  (source: FileSystemPort) =>
  async (answers: RollOverAnswers): Promise<OpenedCourse | { reason: string } | null> => {
    const place = await coursePlace();
    if (place === null) return null;
    const made = await createRollOver({ rules: courseRules, newId: () => crypto.randomUUID(), makeFolder: place.makeFolder }, source, answers);
    if (!made.ok) return { reason: made.reason };
    return openedNew(answers.name.replace(/\s+/g, " ").trim(), made.fs, place.root());
  };

/** The course live in Tutors on this computer (ADR 0042): the generator through `run_tool`, the reader and its window through Studio's live commands. */
/** An assistant on this computer, for a course folder on disk: the lecturer's switch and the plans waiting for them (ADRs 0051, 0052). */
async function agentFor(courseRoot: string): Promise<AgentDesk> {
  const [{ tauriAgentAccess }, { tauriAgentPlans }] = await Promise.all([
    import("./adapters/agent-access/tauri/tauri-agent-access.ts"),
    import("./adapters/agent-plans/tauri/tauri-agent-plans.ts"),
  ]);
  return createAgentDesk(courseRoot, tauriAgentAccess, tauriAgentPlans);
}

async function liveFor(courseRoot: string): Promise<LiveTutorsPort> {
  const [{ tauriProcess }, { tutorsGenBuild }, { tauriLocalTutors }, { tauriInsideTutors, carriesReader }] = await Promise.all([
    import("./adapters/process/tauri/tauri-process.ts"),
    import("./adapters/build/tutors-gen/tutors-gen-build.ts"),
    import("./adapters/local-tutors/tauri/tauri-local-tutors.ts"),
    import("./adapters/local-tutors/tauri/tauri-inside-tutors.ts"),
  ]);
  return createLiveTutors({
    build: tutorsGenBuild(tauriProcess, courseRoot),
    tutors: tauriLocalTutors,
    // The Tutors inside Studio is the default wherever the installer carries it (ADR 0045); elsewhere, the lecturer's own copy.
    inside: (await carriesReader()) ? tauriInsideTutors : undefined,
    folder: { get: () => settings.get("tutorsFolder"), set: (folder) => settings.set("tutorsFolder", folder) },
  });
}

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
    lastPublish: lastPublishFor(courseRoot),
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

/**
 * A folder the lecturer picks in the system's chooser, or null when they cancel. The desktop journeys answer
 * it through `studioChoosesFolder` on the window (ADR 0047): WebDriver can't reach the system's chooser, and
 * Tauri's invoke can't be replaced from a page.
 */
async function chooseFolder(title: string): Promise<string | null> {
  const answer = (globalThis as { studioChoosesFolder?: () => string | null }).studioChoosesFolder;
  if (answer !== undefined) return answer();
  const { open } = await import("@tauri-apps/plugin-dialog");
  const folder = await open({ directory: true, title });
  return typeof folder === "string" ? folder : null;
}

/** A folder the lecturer picks on this computer, and a saved file shown in its folder (the app only). */
const folders = inTauri
  ? {
      choose: chooseFolder,
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
const recents = createRecentCourses(settings);

async function openCourse(path?: string): Promise<OpenedCourse | { material: ReturnType<typeof materialFolder> } | { missing: string } | null> {
  if (!inTauri) {
    if (new URLSearchParams(location.search).has("material")) {
      const loaded = await readLoadedFolder(new MemoryFileSystem(sampleMaterial));
      return loaded.kind === "material" ? { material: materialFolder("web-dev-2026", loaded.files) } : null;
    }
    const sample = new MemoryFileSystem(sampleCourse);
    return {
      name: "Sample course",
      key: "sample-course",
      companion: companionFor("sample-course"),
      authoring: authoringOver(sample, "sample-course"),
      publishing: null,
      handOff: null,
      live: null,
      rollOver: rollOverFrom(sample),
    };
  }
  const { TauriFileSystem, openCourseRoot } = await import("./adapters/fs/tauri/tauri-fs.ts");
  const folder = path ?? (await chooseFolder("Choose a course, or a folder of your material or a course export"));
  if (typeof folder !== "string") return null;
  try {
    await openCourseRoot(folder);
  } catch (error) {
    // A recent course whose folder was moved or deleted: dropped from the list, and the lecturer is told.
    if (path === undefined) throw error;
    await recents.forget(path);
    return { missing: courseNameOf(path) };
  }
  const fs = new TauriFileSystem();
  const loaded = await readLoadedFolder(fs);
  if (loaded.kind === "material") return { material: materialFolder(folder.split(/[\\/]/).filter(Boolean).pop() ?? folder, loaded.files) };
  await recents.remember(folder);
  return {
    name: folder.split(/[\\/]/).filter(Boolean).pop() ?? folder,
    key: folder,
    companion: companionFor(folder),
    authoring: authoringOver(fs, folder),
    publishing: await publishingFor(fs, folder),
    handOff: await handOffFor(fs, folder),
    live: await liveFor(folder),
    rollOver: rollOverFrom(fs),
    agent: await agentFor(folder),
  };
}

/**
 * Where a new course goes: a folder the lecturer picks (in a plain browser, memory), with the step that
 * makes the course's own folder inside it. Null when the lecturer cancelled.
 */
async function coursePlace(): Promise<{ makeFolder: (name: string) => Promise<FileSystemPort>; root: () => string | null } | null> {
  if (!inTauri) return { makeFolder: () => Promise.resolve(new MemoryFileSystem({})), root: () => null };
  const { tauriCourseFolder } = await import("./adapters/fs/tauri/tauri-fs.ts");
  const parent = await chooseFolder("Choose where to put the course folder");
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
  if (root !== null) await recents.remember(root);
  return {
    name,
    key,
    companion: companionFor(key),
    authoring: authoringOver(fs, key),
    publishing: root === null ? null : await publishingFor(fs, root),
    handOff: root === null ? null : await handOffFor(fs, root),
    live: root === null ? null : await liveFor(root),
    rollOver: rollOverFrom(fs),
    ...(root === null ? {} : { agent: await agentFor(root) }),
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

/** The preview's library: the sample course, which has problems to fix, beside a reference course made fresh. */
function previewLibrary(): Record<string, string> {
  const files: Record<string, string> = {};
  for (const [path, content] of Object.entries(sampleCourse)) files[`sample-course/${path}`] = content;
  const made = courseRules.newCourseFiles({ ...SAMPLE_COURSE, name: "Web Development II" });
  for (const file of made) files[`web-development-2/${file.path}`] = file.content;
  return files;
}

// The library (ADR 0061): folders Studio searches for courses, read through the Rust side; in a plain browser,
// one folder in memory holding the sample course.
// Google Drive folders (ADR 0064) go through the Drive API; Studio's Google client id comes from the release build.
const previewShared = new MemoryFileSystem({});
const drive = googleDrive({
  secrets,
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || undefined,
  clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || undefined,
  loopback: inTauri ? (await import("./adapters/registry/tauri/tauri-loopback.ts")).tauriLoopback : undefined,
});
const libraryPort = routedLibrary(
  inTauri ? (await import("./adapters/library/tauri/tauri-library.ts")).tauriLibrary : memoryLibrary({ Teaching: new MemoryFileSystem(previewLibrary()), Shared: previewShared }),
  drive.library,
);
const registryPort = routedRegistry(
  inTauri ? (await import("./adapters/registry/tauri/tauri-registry.ts")).tauriRegistry : memoryRegistry({ Shared: previewShared }),
  drive.registry,
);
const composeDeps = { library: libraryPort, rules: courseRules, newId: () => crypto.randomUUID(), today: () => new Date().toISOString().slice(0, 10) };
const shareDeps = { ...composeDeps, registry: registryPort };
const library: LibraryScreen = {
  shelf: createLibrary({ library: libraryPort, rules: courseRules, settings: inTauri ? settings : new MemorySettings({ libraryFolders: ["Teaching"] }) }),
  async preview(answers, picks) {
    const planned = await planComposedCourse(composeDeps, answers, picks);
    return planned.ok ? { ok: true, summary: planned.compose.plan.summary, notes: planned.compose.notes } : planned;
  },
  // Composing a course (ADR 0062): always a copy, made in a folder the lecturer picks, then opened.
  async create(answers, picks) {
    const place = await coursePlace();
    if (place === null) return null;
    const made = await createComposedCourse({ ...composeDeps, makeFolder: place.makeFolder }, answers, picks);
    if (!made.ok) return { reason: made.reason };
    return openedNew(answers.name.trim(), made.fs, place.root());
  },
  drive: createDrive({ account: drive.account, open: (url) => void openLink(url) }),
  // Sharing into a folder registry (ADR 0063): in a plain browser, a registry in memory called Shared.
  share: {
    choose: async () => (inTauri ? ((await chooseFolder("Choose a registry folder, or an empty folder to start one")) as string | null) : "Shared"),
    async preview(request) {
      const planned = await planShare(shareDeps, request);
      return planned.ok ? { ok: true, summary: planned.share.plan.summary, notes: planned.share.notes } : planned;
    },
    async apply(request) {
      const shared = await share(shareDeps, request);
      return shared.ok ? { shared: `${shared.share.publisher}/${shared.share.name} version ${shared.share.version}` } : { reason: shared.reason };
    },
  },
};

// Studio reopens the course the lecturer last had open (feature 9); if it has gone, the start screen shows.
const lastCourse = inTauri ? await recents.last() : null;
const reopened = lastCourse === null ? null : await openCourse(lastCourse).catch(() => null);
const initialCourse = reopened !== null && "authoring" in reopened ? reopened : undefined;

mount(App, {
  target: document.getElementById("app")!,
  props: {
    openCourse,
    newCourse,
    library,
    recent: inTauri
      ? {
          list: () => recents.list(),
          forget: (path: string) => recents.forget(path),
          restore: (path: string, at: number) => recents.restore(path, at),
          open: (path: string) => openCourse(path),
        }
      : undefined,
    initialCourse,
    openLink: (url: string) => void openLink(url),
    folders,
    preferences,
    accounts: hosting === null ? undefined : createAccounts({ hosting, open: (url: string) => void openLink(url) }),
    initialAppearance,
    rulesVersion: courseRules.version,
    guide: createCompanion({ assistant: noAssistant }),
    // The lecturer's own folder, read only through Studio's Rust commands (ADR 0035); the app only.
    myFiles: inTauri ? createMyFiles((await import("./adapters/own-files/tauri/tauri-own-files.ts")).tauriOwnFiles) : undefined,
    updates,
    usage,
    // "Add the command line to this computer" in Settings, Advanced (ADR 0053); the app only.
    commandLine: inTauri ? (await import("./adapters/command-line/tauri/tauri-command-line.ts")).tauriCommandLine : undefined,
  },
});
