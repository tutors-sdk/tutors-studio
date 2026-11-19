import { invoke } from "@tauri-apps/api/core";
import type { CommandLineAdded, CommandLinePort } from "../../../application/ports/command-line.ts";

/** "Add the command line to this computer", through Studio's Rust command (src-tauri/src/cli.rs, ADR 0053). */
export const tauriCommandLine: CommandLinePort = {
  add: () => invoke<CommandLineAdded>("cli_add"),
};
