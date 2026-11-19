import type { CommandLineAdded, CommandLinePort } from "../../../application/ports/command-line.ts";

/** The command line in memory, answering as told: tests. */
export function memoryCommandLine(answer: CommandLineAdded): CommandLinePort & { added: number } {
  const port = {
    added: 0,
    async add() {
      port.added++;
      return answer;
    },
  };
  return port;
}
