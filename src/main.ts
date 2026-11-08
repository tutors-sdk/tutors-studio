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
import { noAssistant } from "./adapters/assistant/none/none-assistant.ts";
import { MemoryFileSystem } from "./adapters/fs/memory/memory-fs.ts";
import { courseRules } from "./adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "./adapters/telemetry/local/local-telemetry.ts";
import { sampleCourse } from "./adapters/fs/memory/sample-course.ts";

const telemetry = new LocalTelemetry();
const authoringOver = (fs: FileSystemPort): AuthoringPort => createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry, newId: () => crypto.randomUUID() });

async function openCourse(): Promise<{ name: string; authoring: AuthoringPort } | null> {
  if (!("__TAURI_INTERNALS__" in window)) return { name: "Sample course", authoring: authoringOver(new MemoryFileSystem(sampleCourse)) };
  const { open } = await import("@tauri-apps/plugin-dialog");
  const { TauriFileSystem, openCourseRoot } = await import("./adapters/fs/tauri/tauri-fs.ts");
  const folder = await open({ directory: true, title: "Choose your course folder" });
  if (typeof folder !== "string") return null;
  await openCourseRoot(folder);
  return { name: folder.split(/[\\/]/).filter(Boolean).pop() ?? folder, authoring: authoringOver(new TauriFileSystem()) };
}

mount(App, { target: document.getElementById("app")!, props: { openCourse, rulesVersion: courseRules.version, assistantName: "none" } });
