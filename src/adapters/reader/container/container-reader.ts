import type { LocalReaderOutcome, LocalReaderPort } from "../../../application/ports/local-reader.ts";
import type { ProcessPort, Tool } from "../../../application/ports/process.ts";
import { LOCAL_COURSE_PORT, LOCAL_READER_PORT, localReaderLink } from "../../../domain/publish.ts";

/** The published Tutors reader image Studio runs, pinned (ADR 0019). */
export const READER_IMAGE = "quay.io/tutors-sdk/tutors-reader:17.0.0";
/** The static server for the built course: the Caddy the Tutors stack's own compose file pins. */
export const COURSE_SERVER_IMAGE = "docker.io/library/caddy:2@sha256:f2a1290d0463aad60660d4ec134943f183ee2a5f6c3eb7bf32dd984f2f020772";

export const READER_CONTAINER = "tutors-studio-reader";
export const COURSE_CONTAINER = "tutors-studio-course";

/** The course server's Caddyfile: the built folder, with the CORS header Netlify's netlify.toml sets, so the reader in the browser can fetch it. */
const CADDYFILE = `:${LOCAL_COURSE_PORT} {\n\troot * /srv\n\theader Access-Control-Allow-Origin *\n\tfile_server\n}\n`;

const lastLines = (text: string, count = 12) => text.trim().split("\n").slice(-count).join("\n");

export interface ContainerReaderOptions {
  /** The course folder on disk; the built folder is mounted from inside it. */
  courseRoot: string;
  /** How long to wait for the reader to answer, in milliseconds. */
  waitMs?: number;
  /** Checks a URL answers; injected so tests need no network. */
  answers?: (url: string) => Promise<boolean>;
  sleep?: (ms: number) => Promise<void>;
  /** The reader's environment from Settings (the Tutors .env); anonymous mode when none is given. */
  environment?: () => Promise<Record<string, string>>;
}

const answersOk = async (url: string) => {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
};

/**
 * The Tutors reader on this computer, in two containers: Caddy serving the built course on 8190, and the
 * published reader image on 3000 in anonymous mode. The reader in the browser fetches the course from
 * localhost:8190, exactly as it fetches a Netlify site.
 */
export function containerReader(process: ProcessPort, options: ContainerReaderOptions): LocalReaderPort {
  const answers = options.answers ?? answersOk;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const engine = async (): Promise<Tool | null> => {
    for (const tool of ["docker", "podman"] as const) if ((await process.run(tool, ["--version"])).code === 0) return tool;
    return null;
  };
  const remove = (tool: Tool) => process.run(tool, ["rm", "-f", READER_CONTAINER, COURSE_CONTAINER]);

  return {
    async start(builtFolder: string): Promise<LocalReaderOutcome> {
      const tool = await engine();
      if (tool === null)
        return {
          ok: false,
          reason:
            "Previewing on this computer runs the Tutors reader in a container, which needs Docker or Podman. Install Docker Desktop (or Podman Desktop), open it once, then try again.",
          detail: "",
        };
      await remove(tool);
      const course = await process.run(tool, [
        "run",
        "-d",
        "--name",
        COURSE_CONTAINER,
        "-p",
        `127.0.0.1:${LOCAL_COURSE_PORT}:${LOCAL_COURSE_PORT}`,
        "-v",
        `${options.courseRoot}/${builtFolder}:/srv:ro`,
        COURSE_SERVER_IMAGE,
        "sh",
        "-c",
        `printf '%s' '${CADDYFILE}' > /tmp/Caddyfile && exec caddy run --config /tmp/Caddyfile --adapter caddyfile`,
      ]);
      if (course.code !== 0) return { ok: false, reason: "The course server container didn't start.", detail: lastLines(course.stderr) };
      const environment = { PUBLIC_ANON_MODE: "TRUE", ...((await options.environment?.()) ?? {}) };
      const envArgs = Object.entries(environment).flatMap(([name, value]) => ["-e", `${name}=${value}`]);
      const reader = await process.run(tool, ["run", "-d", "--name", READER_CONTAINER, "-p", `127.0.0.1:${LOCAL_READER_PORT}:3000`, ...envArgs, READER_IMAGE]);
      if (reader.code !== 0) {
        await remove(tool);
        return {
          ok: false,
          reason: "The Tutors reader container didn't start. The first time, it has to download the reader, which needs the internet.",
          detail: lastLines(reader.stderr),
        };
      }
      const deadline = options.waitMs ?? 60_000;
      for (let waited = 0; ; waited += 1000) {
        if ((await answers(`http://localhost:${LOCAL_READER_PORT}/healthz/live`)) && (await answers(`http://localhost:${LOCAL_COURSE_PORT}/tutors.json`))) {
          return { ok: true, url: localReaderLink() };
        }
        if (waited >= deadline) {
          const logs = await process.run(tool, ["logs", "--tail", "20", READER_CONTAINER]);
          await remove(tool);
          return { ok: false, reason: "The Tutors reader started but didn't answer within a minute.", detail: lastLines(`${logs.stdout}\n${logs.stderr}`) };
        }
        await sleep(1000);
      }
    },
    async stop(): Promise<void> {
      const tool = await engine();
      if (tool !== null) await remove(tool);
    },
  };
}
