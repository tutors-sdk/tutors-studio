import type { AuthoringPort } from "./authoring.ts";

/** Driving port: exposes the authoring use cases as MCP tools (ADR 0007). The first adapter ships later; plan.apply stays the only writer. */
export interface ToolHostPort {
  register(authoring: AuthoringPort): void;
  serve(transport: "stdio" | "http"): Promise<void>;
}
