import { invoke } from "@tauri-apps/api/core";
import type { ProcessPort, ProcessResult, Tool } from "../../../application/ports/process.ts";

/** Runs a publishing tool through Studio's Rust `run_tool` command, which runs only docker, podman and deno, in the shapes Studio uses. */
export const tauriProcess: ProcessPort = {
  /** The Rust side always runs the tool in the open course folder, so `cwd` is not sent. */
  run(tool: Tool, args: string[]): Promise<ProcessResult> {
    return invoke<ProcessResult>("run_tool", { tool, args });
  },
};
