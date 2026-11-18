import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import type { Server } from "node:http";
import { join, resolve } from "node:path";
import type { LiveStart, LocalTutorsPort } from "../../../application/ports/local-tutors.ts";
import {
  ANON_MODE,
  COURSE_PORT,
  lastLinesOf,
  liveLinkFor,
  liveSteps,
  READER_APP,
  READER_ORIGIN,
  readerOriginIn,
  tutorsNotes,
  type TutorsFolderFacts,
} from "../../../domain/live-tutors.ts";
import { BUILD_FOLDER } from "../../../domain/publish.ts";
import { closeServer, serveFolder } from "./serve-folder.ts";

/** Whether the server answering at `origin` is the Tutors reader. */
async function readerAt(origin: string): Promise<boolean> {
  try {
    const response = await fetch(`${origin}/healthz`, { signal: AbortSignal.timeout(3000) });
    return (await response.text()).includes(READER_APP);
  } catch {
    return false;
  }
}

/**
 * Tutors on this computer for the headless CLI (ADR 0042): Node's http serves the course's json/ on
 * 127.0.0.1, with the CORS header Netlify sets and no caching, so a reload reads the latest build; `pnpm dev`
 * in the lecturer's copy of Tutors runs the reader in anonymous mode. `refresh` can't reach a browser, so it
 * says to reload the page.
 */
export function nodeLocalTutors(courseRoot: string, say: (line: string) => void = () => {}, options: { readerOrigin?: string; waitMs?: number } = {}): LocalTutorsPort {
  const built = resolve(courseRoot, BUILD_FOLDER);
  let server: Server | null = null;
  let reader: ChildProcess | null = null;

  const serve = async (): Promise<number> => {
    const served = await serveFolder(built, COURSE_PORT, { cors: true });
    server = served.server;
    return served.port;
  };

  /** Starts `pnpm dev` in the Tutors folder and waits for the address it says it answers on. */
  const startReader = (folder: string): Promise<{ origin: string } | { failed: string }> =>
    new Promise((done) => {
      let output = "";
      const child = spawn("pnpm", ["dev"], {
        cwd: folder,
        env: { ...process.env, ...ANON_MODE },
        shell: process.platform === "win32",
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"],
      });
      reader = child;
      // However this process ends, the reader it started (in a process group of its own) ends with it.
      process.once("exit", stopReader);
      const timer = setTimeout(
        () => done({ failed: `Tutors didn't answer within ${Math.round((options.waitMs ?? 300_000) / 1000)} seconds.\n${lastLinesOf(output)}` }),
        options.waitMs ?? 300_000,
      );
      const hear = (chunk: Buffer) => {
        output += chunk.toString();
        for (const line of chunk.toString().split("\n")) {
          const origin = readerOriginIn(line);
          if (origin !== null) {
            clearTimeout(timer);
            done({ origin });
          }
        }
      };
      child.stdout?.on("data", hear);
      child.stderr?.on("data", hear);
      child.on("error", (error) => {
        clearTimeout(timer);
        reader = null;
        done({ failed: error.message });
      });
      child.on("exit", (code) => {
        clearTimeout(timer);
        reader = null;
        done({ failed: `pnpm dev stopped (exit ${code}).\n${lastLinesOf(output)}` });
      });
    });

  function stopReader() {
    const child = reader;
    reader = null;
    if (child?.pid === undefined) return;
    try {
      if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      else process.kill(-child.pid, "SIGTERM");
    } catch {
      // Already gone.
    }
  }

  return {
    async facts(folder): Promise<TutorsFolderFacts> {
      let packageName: string | null = null;
      try {
        packageName = (JSON.parse(readFileSync(join(folder, "package.json"), "utf8")) as { name?: unknown }).name as string;
        if (typeof packageName !== "string") packageName = null;
      } catch {
        packageName = null;
      }
      return { packageName, reader: existsSync(join(folder, "apps", "reader")), installed: existsSync(join(folder, "node_modules")) };
    },
    async start(folder, progress = () => {}): Promise<LiveStart> {
      progress(liveSteps.serve);
      let port: number;
      try {
        port = server === null ? await serve() : ((server as Server).address() as { port: number }).port;
      } catch (error) {
        return { ok: false, reason: "Studio couldn't serve the course on this computer.", detail: (error as Error).message };
      }
      const usual = options.readerOrigin ?? READER_ORIGIN;
      if (reader === null && (await readerAt(usual))) {
        progress(liveSteps.reuse);
        return { ok: true, link: liveLinkFor(usual, port), startedReader: false };
      }
      progress(liveSteps.reader);
      const started = await startReader(folder);
      if ("failed" in started) {
        stopReader();
        return {
          ok: false,
          reason: "Tutors didn't start from your copy. In a terminal in that folder, run pnpm dev and check it opens; then try again, and Studio uses it.",
          detail: started.failed,
        };
      }
      return { ok: true, link: liveLinkFor(started.origin, port), startedReader: true };
    },
    async show(link) {
      say(`Open ${link}`);
    },
    async note(note) {
      say(`… ${tutorsNotes[note]}`);
    },
    async refresh() {
      say("Rebuilt: reload the page in Tutors to see it.");
    },
    async stop() {
      stopReader();
      const running = server;
      server = null;
      await closeServer(running);
    },
  };
}
