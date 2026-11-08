/** One request Studio sent to Claude's Messages API, as Claude received it. */
export interface ClaudeRequest {
  url: string;
  headers: Record<string, string>;
  body: {
    model: string;
    system?: { text: string }[];
    messages: { role: string; content: string }[];
    output_config?: { effort?: string };
    fallbacks?: unknown;
  };
}

/**
 * Claude's Messages API in memory, for the assistant tests: it answers with fixed text, or with the
 * error status it is told to, and records every request so a test can see exactly what left Studio.
 */
export class FakeClaude {
  readonly requests: ClaudeRequest[] = [];
  constructor(
    private readonly answer = "Students won't see Week 3. Rename the folder to topic-week-3 and it will appear.",
    private readonly options: { status?: number; key?: string; stopReason?: string } = {},
  ) {}

  fetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    this.requests.push({ url: String(input), headers, body: JSON.parse(String(init.body)) as ClaudeRequest["body"] });
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "request-id": "req_fake" } });
    if (this.options.status) return json(this.options.status, { type: "error", error: { type: "error", message: `status ${this.options.status}` } });
    const key = headers["x-api-key"] ?? headers.authorization?.replace(/^Bearer /, "");
    if (key !== (this.options.key ?? "sk-ant-good")) return json(401, { type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } });
    const refused = this.options.stopReason === "refusal";
    return json(200, {
      id: "msg_fake",
      type: "message",
      role: "assistant",
      model: JSON.parse(String(init.body)).model,
      content: refused ? [] : [{ type: "text", text: this.answer }],
      stop_reason: this.options.stopReason ?? "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 120, output_tokens: 40 },
    });
  };

  /** Everything Studio sent Claude in one request, as one string, to check what left the computer. */
  sent(index = 0): string {
    return JSON.stringify(this.requests[index]?.body ?? {});
  }
}
