import { spawn } from "node:child_process";
import type { ProcessPort, ProcessResult, Tool } from "../../../application/ports/process.ts";

/** Runs a publishing tool with Node, for the headless CLI. A tool that isn't installed gives code null. */
export const nodeProcess: ProcessPort = {
  run(tool: Tool, args: string[], options: { cwd?: string } = {}): Promise<ProcessResult> {
    return new Promise((resolve) => {
      const child = spawn(tool, args, { cwd: options.cwd, stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
      child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
      child.on("error", (error) => resolve({ code: null, stdout, stderr: stderr + error.message }));
      child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    });
  },
};
