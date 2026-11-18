import { spawn } from "node:child_process";
import type { ProcessPort, ProcessResult, Tool } from "../../../application/ports/process.ts";

/**
 * Runs a publishing tool with Node, for the headless CLI. A tool that isn't installed gives code null. The
 * Tutors tools program is the one `TUTORS_TOOLS` names (`pnpm bundle tools` compiles it), else none.
 */
export const nodeProcess: ProcessPort = {
  run(tool: Tool, args: string[], options: { cwd?: string } = {}): Promise<ProcessResult> {
    return new Promise((resolve) => {
      const program = tool === "tutors-tools" ? process.env.TUTORS_TOOLS : tool;
      if (!program) return resolve({ code: null, stdout: "", stderr: "TUTORS_TOOLS names no Tutors tools program" });
      const child = spawn(program, args, { cwd: options.cwd, stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
      child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
      child.on("error", (error) => resolve({ code: null, stdout, stderr: stderr + error.message }));
      child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    });
  },
};
