import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { AgentAccessPort } from "../../../application/ports/agent-access.ts";
import { courseKey } from "../../../domain/agent.ts";

/** Studio's own folder for this computer's settings, where the app keeps them too (the Tauri identifier). */
export function studioConfigFolder(env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): string {
  if (env.STUDIO_CONFIG_DIR) return env.STUDIO_CONFIG_DIR;
  const base =
    platform === "win32"
      ? (env.APPDATA ?? join(homedir(), "AppData", "Roaming"))
      : platform === "darwin"
        ? join(homedir(), "Library", "Application Support")
        : (env.XDG_CONFIG_HOME ?? join(homedir(), ".config"));
  return join(base, "dev.tutors.studio");
}

/**
 * The courses an assistant on this computer may work on, as `agent-courses.json` in Studio's config folder
 * (ADR 0051): `{ "courses": ["<course folder>", ...] }`, each spelled by courseKey. The app's Rust side
 * (src-tauri/src/agent.rs) reads and writes the same file.
 */
export function nodeAgentAccess(folder = studioConfigFolder()): AgentAccessPort {
  const file = join(folder, "agent-courses.json");
  const key = (course: string) => courseKey(resolve(course), process.platform === "win32");
  const read = async (): Promise<string[]> => {
    try {
      const parsed = JSON.parse(await readFile(file, "utf8")) as { courses?: unknown };
      return Array.isArray(parsed.courses) ? parsed.courses.filter((course): course is string => typeof course === "string") : [];
    } catch {
      return [];
    }
  };
  return {
    allowed: async (course) => (await read()).includes(key(course)),
    async set(course, on) {
      const courses = (await read()).filter((known) => known !== key(course));
      if (on) courses.push(key(course));
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, `${JSON.stringify({ courses }, null, 2)}\n`);
    },
  };
}
