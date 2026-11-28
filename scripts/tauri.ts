// `pnpm tauri ...`: the Tauri command line, with one check first. Before `pnpm tauri dev`, it makes sure the
// Tutors reader inside Studio is built at the commit tutors-bundle.json pins (STU-0313, ADR 0067), and offers
// to build it when it isn't: without it, Studio run from source can show a course only in a copy of Tutors of
// your own. Everything else goes straight to Tauri.
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { readerState } from "./bundle.ts";

/** What `pnpm tauri dev` says about the reader, or null when it is ready. Pure. */
export function readerNotice(state: "missing" | "stale" | "ready"): string | null {
  if (state === "ready") return null;
  return state === "missing"
    ? "The Tutors reader inside Studio isn't built, so this Studio can show a course only in a copy of Tutors of your own (Advanced mode)."
    : "The Tutors reader inside Studio was built from another Tutors commit than tutors-bundle.json pins.";
}

const BUILD = "pnpm bundle reader";

/** Asks before building; answers no when nobody can answer (CI, a pipe). */
async function ask(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await prompt.question(question)).trim().toLowerCase();
  prompt.close();
  return answer === "" || answer === "y" || answer === "yes";
}

const run = (command: string, args: string[]) => spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" }).status ?? 1;

if (process.argv[1]?.endsWith("tauri.ts")) {
  const args = process.argv.slice(2);
  if (args[0] === "dev") {
    const notice = readerNotice(readerState());
    if (notice !== null) {
      console.log(notice);
      if (await ask(`Build it now with ${BUILD}? It fetches Tutors at the pinned commit and takes a few minutes the first time. [Y/n] `)) {
        if (run("pnpm", ["bundle", "reader"]) !== 0) console.log(`${BUILD} didn't finish; Studio starts without the reader inside it.`);
      } else console.log(`Starting without it. Run ${BUILD} when you want it.`);
    }
  }
  process.exit(run("tauri", args));
}
