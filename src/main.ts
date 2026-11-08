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
import { createCompanion, type CompanionPort } from "./application/companion/companion.ts";
import { MemoryFileSystem } from "./adapters/fs/memory/memory-fs.ts";
import { courseRules } from "./adapters/rules/course-rules/course-rules-adapter.ts";
import { mermaidDiagrams } from "./adapters/diagrams/mermaid/mermaid-diagrams.ts";
import { marpSlides } from "./adapters/slides/marp/marp-slides.ts";
import { markdownItPages } from "./adapters/markdown/markdown-it/markdown-it-pages.ts";
import { LocalTelemetry } from "./adapters/telemetry/local/local-telemetry.ts";
import { sampleCourse } from "./adapters/fs/memory/sample-course.ts";
import { MemorySecrets } from "./adapters/secrets/memory/memory-secrets.ts";
import { LocalStorageSettings } from "./adapters/settings/local-storage/local-storage-settings.ts";
import type { SecretsPort } from "./application/ports/secrets.ts";
import { createPreferences } from "./application/use-cases/preferences.ts";
import { appearanceAttributes } from "./domain/appearance.ts";
import type { PublishingPort } from "./application/ports/publishing.ts";
import { createPublishing } from "./application/use-cases/publishing.ts";
import type { HandOffPort } from "./application/ports/hand-off.ts";
import { createHandOff } from "./application/use-cases/hand-off.ts";

const telemetry = new LocalTelemetry();
const inTauriWindow = "__TAURI_INTERNALS__" in window;
// Secrets: the OS keychain in the app (ADR 0016), this session only in the browser preview.
const secrets: SecretsPort = inTauriWindow ? (await import("./adapters/secrets/tauri/tauri-secrets.ts")).tauriSecrets : new MemorySecrets();
const preferences = createPreferences({ settings: new LocalStorageSettings(), secrets });
// Apply the lecturer's appearance before the first paint, so the window never flashes the default.
const initialAppearance = await preferences.appearance();
for (const [name, value] of Object.entries(appearanceAttributes(initialAppearance))) document.documentElement.setAttribute(name, value);
/** Authoring over a course; `course` names it for the assistant's read permission (ADR 0006). */
const assistantFor = (course: string) => chosenAssistant({ preferences, course, providers: { anthropic: anthropicAssistant } });
const companionFor = (course: string): CompanionPort => createCompanion({ assistant: assistantFor(course) });
const authoringOver = (fs: FileSystemPort, course: string): AuthoringPort =>
  createAuthoring({
    fs,
    rules: courseRules,
    assistant: assistantFor(course),
    telemetry,
    newId: () => crypto.randomUUID(),
    diagrams: mermaidDiagrams,
    slides: marpSlides,
    markdown: markdownItPages,
  });

const inTauri = "__TAURI_INTERNALS__" in window;
type OpenedCourse = { name: string; key: string; companion: CompanionPort; authoring: AuthoringPort; publishing: PublishingPort | null; handOff: HandOffPort | null };

/** Publishing for a course folder on disk: the generator and containers through Studio's Rust `run_tool`, the Netlify token in the keychain (ADR 0019). */
async function publishingFor(fs: FileSystemPort, courseRoot: string): Promise<PublishingPort> {
  const [{ tauriProcess }, { tutorsGenBuild }, { containerReader }, { netlifyHosting }] = await Promise.all([
    import("./adapters/process/tauri/tauri-process.ts"),
    import("./adapters/build/tutors-gen/tutors-gen-build.ts"),
    import("./adapters/reader/container/container-reader.ts"),
    import("./adapters/hosting/netlify/netlify-hosting.ts"),
  ]);
  return createPublishing({
    fs,
    rules: courseRules,
    build: tutorsGenBuild(tauriProcess, courseRoot),
    reader: containerReader(tauriProcess, { courseRoot, environment: () => preferences.readerEnvironment() }),
    hosting: netlifyHosting({ secrets }),
    telemetry,
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

async function openCourse(): Promise<OpenedCourse | null> {
  if (!inTauri)
    return {
      name: "Sample course",
      key: "sample-course",
      companion: companionFor("sample-course"),
      authoring: authoringOver(new MemoryFileSystem(sampleCourse), "sample-course"),
      publishing: null,
      handOff: null,
    };
  const { open } = await import("@tauri-apps/plugin-dialog");
  const { TauriFileSystem, openCourseRoot } = await import("./adapters/fs/tauri/tauri-fs.ts");
  const folder = await open({ directory: true, title: "Choose your course folder" });
  if (typeof folder !== "string") return null;
  await openCourseRoot(folder);
  const fs = new TauriFileSystem();
  return {
    name: folder.split(/[\\/]/).filter(Boolean).pop() ?? folder,
    key: folder,
    companion: companionFor(folder),
    authoring: authoringOver(fs, folder),
    publishing: await publishingFor(fs, folder),
    handOff: await handOffFor(fs, folder),
  };
}

const patterns = courseRules.patterns();

/** Creates the course in a folder the lecturer picks (in a plain browser, in memory) and opens it. */
async function createCourse(answers: CourseAnswers): Promise<OpenedCourse | { reason: string } | null> {
  let makeFolder: (name: string) => Promise<FileSystemPort> = () => Promise.resolve(new MemoryFileSystem({}));
  let root: string | null = null;
  if (inTauri) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { tauriCourseFolder } = await import("./adapters/fs/tauri/tauri-fs.ts");
    const parent = await open({ directory: true, title: "Choose where to put the course folder" });
    if (typeof parent !== "string") return null;
    const make = tauriCourseFolder(parent);
    makeFolder = (name) => {
      root = `${parent}/${name}`;
      return make(name);
    };
  }
  const created = await createNewCourse({ rules: courseRules, newId: () => crypto.randomUUID(), makeFolder }, answers);
  if (!created.ok) return { reason: created.reason };
  return {
    name: answers.name.trim(),
    key: root ?? `new:${answers.name.trim()}`,
    companion: companionFor(root ?? `new:${answers.name.trim()}`),
    authoring: authoringOver(created.fs, root ?? `new:${answers.name.trim()}`),
    publishing: root === null ? null : await publishingFor(created.fs, root),
    handOff: root === null ? null : await handOffFor(created.fs, root),
  };
}

const newCourse = {
  patterns,
  check: (answers: CourseAnswers) =>
    checkAnswers(
      answers,
      patterns.map((card) => card.id),
    ),
  create: createCourse,
};

mount(App, {
  target: document.getElementById("app")!,
  props: {
    openCourse,
    newCourse,
    openLink: (url: string) => void openLink(url),
    preferences,
    initialAppearance,
    rulesVersion: courseRules.version,
    guide: createCompanion({ assistant: noAssistant }),
  },
});
