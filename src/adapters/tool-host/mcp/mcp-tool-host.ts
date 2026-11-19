import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, type CallToolResult, type Tool } from "@modelcontextprotocol/sdk/types.js";
import type { AgentAccessPort } from "../../../application/ports/agent-access.ts";
import type { ArrangePlan, AuthoringPort } from "../../../application/ports/authoring.ts";
import type { ToolHostPort } from "../../../application/ports/tool-host.ts";
import type { ArrangeAction } from "../../../domain/arrange.ts";
import type { MapNode } from "../../../domain/course-map.ts";
import type { BloomLevel, OutcomeDraft } from "../../../domain/outcomes.ts";
import type { Plan } from "../../../domain/plan.ts";

export interface McpToolHostOptions {
  /** The course folder this server works on, as the access list names it. */
  course: string;
  /** Whether the lecturer lets an assistant on this computer work on the course; asked on every call (STU-0204). */
  access: AgentAccessPort;
  /** Studio's version, for the server's name in an agent's tool list. */
  version: string;
}

type Args = Record<string, unknown>;

/** The tool host, with its tools and calls reachable without a transport, and its server for any transport. */
export type McpToolHost = ToolHostPort & { tools(): Tool[]; call(name: string, args?: Args): Promise<CallToolResult>; server(): Server };
type Handler = (authoring: AuthoringPort, args: Args) => Promise<unknown>;

const object = (properties: Record<string, object> = {}, required: string[] = []): Tool["inputSchema"] => ({ type: "object", properties, required, additionalProperties: false });
const text = { type: "string" };
const date = { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "YYYY-MM-DD, or null" };

/** The course map as an agent reads it: each folder's path, kind, title and status, no file contents. */
const mapOf = (node: MapNode): unknown => ({
  path: node.path,
  kind: node.kind,
  title: node.title,
  status: node.status,
  ...(node.excluded ? { published: false } : {}),
  ...(node.children.length > 0 ? { children: node.children.map(mapOf) } : {}),
});

const opsOf = (plan: Plan) => plan.ops.map((op) => (op.op === "write" ? { write: op.path } : { move: op.from, to: op.to }));

/**
 * The authoring use cases as MCP tools (ADR 0007, ADR 0051). Reading tools read; `propose_*` tools make a
 * plan and keep it; `plan_apply` is the only tool that writes, and only a plan this server made and hasn't
 * applied (STU-0202, STU-0203). Every call is refused while the lecturer hasn't let an assistant on this
 * computer work on the course (STU-0204). Tool names use `_`, which every agent's tool names allow.
 */
export function mcpToolHost(options: McpToolHostOptions): McpToolHost {
  let authoring: AuthoringPort | null = null;
  const plans = new Map<string, Plan>();

  const proposed = (planned: ArrangePlan | Plan | null, nothing = "There is nothing to change.") => {
    if (planned === null) return { refused: nothing };
    const plan = "ops" in planned ? planned : planned.ok ? planned.plan : null;
    if (plan === null) return { refused: (planned as { message: string }).message };
    plans.set(plan.id, plan);
    return {
      plan_id: plan.id,
      summary: plan.summary,
      notes: "notes" in planned ? planned.notes : [],
      changes: opsOf(plan),
      next: "Show the lecturer the summary, then call plan_apply with this plan_id.",
    };
  };

  const table: { tool: Tool; run: Handler }[] = [
    {
      tool: {
        name: "course_map",
        description: "The course as Tutors reads it: each folder's path, kind, title and status. Reads only.",
        inputSchema: object(),
        annotations: { readOnlyHint: true },
      },
      run: async (a) => mapOf((await a.refresh()).map),
    },
    {
      tool: {
        name: "course_check",
        description: "Everything wrong with the course, in the lecturer's words, with the rule that found it. Reads only.",
        inputSchema: object(),
        annotations: { readOnlyHint: true },
      },
      run: async (a) => (await a.refresh()).findings.map(({ rule, severity, path, message }) => ({ rule, severity, path, message })),
    },
    {
      tool: {
        name: "course_details",
        description: "The course's title, credits, start date and number of weeks. Reads only.",
        inputSchema: object(),
        annotations: { readOnlyHint: true },
      },
      run: (a) => a.courseDetails(),
    },
    {
      tool: {
        name: "course_outcomes",
        description: "The learning outcomes and the map of where each is taught, practised and assessed. Reads only.",
        inputSchema: object(),
        annotations: { readOnlyHint: true },
      },
      run: async (a) => ({ outcomes: await a.outcomes(), coverage: await a.coverage() }),
    },
    {
      tool: {
        name: "course_term",
        description: "Today's teaching week, what is hidden from students and what is due out; null without a calendar. Reads only.",
        inputSchema: object(),
        annotations: { readOnlyHint: true },
      },
      run: (a) => a.term(),
    },
    {
      tool: { name: "propose_fix_all", description: "A plan making every safe fix the checker suggests. Changes nothing until plan_apply.", inputSchema: object() },
      run: async (a) => proposed(await a.planFixAll(), "There are no safe fixes to make."),
    },
    {
      tool: {
        name: "propose_arrange",
        description:
          "A plan that reorders a folder's items, moves, retitles, hides, shows or removes an item, or restores one from the bin. Removing puts it in the course's bin. Changes nothing until plan_apply.",
        inputSchema: object(
          {
            action: { type: "string", enum: ["reorder", "move", "retitle", "hide", "show", "remove", "restore"] },
            item: { ...text, description: "The item's path, for move, retitle, hide, show and remove" },
            folder: { ...text, description: "The folder to reorder" },
            order: { type: "array", items: text, description: "Every item's path in the folder, in the new order" },
            into: { ...text, description: 'The folder to move or restore into; "" is the top of the course' },
            title: text,
            name: { ...text, description: "The bin entry to restore" },
          },
          ["action"],
        ),
      },
      run: async (a, args) => {
        const s = (key: string) => String(args[key] ?? "");
        const actions: Record<string, () => ArrangeAction> = {
          reorder: () => ({ action: "reorder", folder: s("folder"), order: Array.isArray(args.order) ? args.order.map(String) : [] }),
          move: () => ({ action: "move", item: s("item"), into: s("into") }),
          retitle: () => ({ action: "retitle", item: s("item"), title: s("title") }),
          hide: () => ({ action: "hide", item: s("item"), hidden: true }),
          show: () => ({ action: "hide", item: s("item"), hidden: false }),
          remove: () => ({ action: "remove", item: s("item") }),
          restore: () => ({ action: "restore", name: s("name"), into: s("into") }),
        };
        const action = actions[s("action")];
        return action ? proposed(await a.planArrange(action())) : { refused: `"${s("action")}" isn't an arrangement Studio makes.` };
      },
    },
    {
      tool: {
        name: "propose_details",
        description: "A plan changing the course's title, credits or start date; leave one out to keep it. Changes nothing until plan_apply.",
        inputSchema: object({ title: text, credits: text, start: date }),
      },
      run: async (a, args) => {
        const now = await a.courseDetails();
        return proposed(
          await a.planDetails({
            title: typeof args.title === "string" ? args.title : now.title,
            credits: typeof args.credits === "string" ? args.credits : now.credits,
            start: "start" in args ? (args.start as string | null) : now.start,
          }),
        );
      },
    },
    {
      tool: {
        name: "propose_outcomes",
        description:
          "A plan writing the course's learning outcomes as given, in order: keep an outcome's id to keep it, leave the id out for a new one. Changes nothing until plan_apply.",
        inputSchema: object(
          {
            outcomes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: text,
                  text: { ...text, description: 'Starts "Students can"' },
                  level: { type: "string", enum: ["Remember", "Understand", "Apply", "Analyse", "Evaluate", "Create"] },
                },
                required: ["text", "level"],
              },
            },
          },
          ["outcomes"],
        ),
      },
      run: async (a, args) => {
        const drafts = (Array.isArray(args.outcomes) ? args.outcomes : []).map((draft: Record<string, unknown>) => ({
          ...(typeof draft.id === "string" ? { id: draft.id } : {}),
          text: String(draft.text ?? ""),
          level: String(draft.level ?? "") as BloomLevel,
        })) as OutcomeDraft[];
        return proposed(await a.planOutcomes(drafts));
      },
    },
    {
      tool: {
        name: "propose_tag",
        description: "A plan tagging an item with the outcome ids it serves (an empty list takes them off). Changes nothing until plan_apply.",
        inputSchema: object({ item: text, ids: { type: "array", items: text } }, ["item", "ids"]),
      },
      run: async (a, args) => proposed(await a.planTag(String(args.item ?? ""), Array.isArray(args.ids) ? args.ids.map(String) : [])),
    },
    {
      tool: {
        name: "propose_release",
        description: "A plan keeping a top-level week hidden from students until a day, or (date null) taking its date away. Changes nothing until plan_apply.",
        inputSchema: object({ week: text, date }, ["week", "date"]),
      },
      run: async (a, args) => proposed(await a.planRelease(String(args.week ?? ""), (args.date as string | null) ?? null)),
    },
    {
      tool: {
        name: "propose_show_due",
        description: "A plan showing students a week whose release date has come. Changes nothing until plan_apply.",
        inputSchema: object({ week: text }, ["week"]),
      },
      run: async (a, args) => proposed(await a.planShowDue(String(args.week ?? ""))),
    },
    {
      tool: {
        name: "plan_apply",
        description: "Applies a plan a propose_ tool made in this session, once. The only tool that changes the course. Show the lecturer the plan's summary first.",
        inputSchema: object({ plan_id: text }, ["plan_id"]),
        annotations: { destructiveHint: false },
      },
      run: async (a, args) => {
        const id = String(args.plan_id ?? "");
        const plan = plans.get(id);
        if (!plan) return { refused: "Studio has no plan with that id from this session. Propose the change again, then apply the new plan." };
        plans.delete(id);
        const applied = await a.apply(plan);
        return applied.ok ? { applied: plan.summary } : { refused: `Nothing changed: ${applied.blockedBy} (${applied.reason})` };
      },
    },
  ];

  const tools = () => table.map((entry) => entry.tool);

  async function call(name: string, args: Args = {}): Promise<CallToolResult> {
    const fail = (message: string): CallToolResult => ({ isError: true, content: [{ type: "text", text: message }] });
    if (!(await options.access.allowed(options.course)))
      return fail(
        "The lecturer hasn't let an assistant on this computer work on this course. They can turn on \"Let an assistant on this computer work on this course\" in Studio's Settings.",
      );
    const entry = table.find((candidate) => candidate.tool.name === name);
    if (!entry) return fail(`Studio has no tool called "${name}".`);
    if (authoring === null) return fail("Studio hasn't opened the course yet.");
    try {
      const answer = await entry.run(authoring, args);
      const refused = answer !== null && typeof answer === "object" && "refused" in answer;
      return { isError: refused, content: [{ type: "text", text: refused ? String((answer as { refused: unknown }).refused) : JSON.stringify(answer, null, 2) }] };
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
  }

  function server(): Server {
    const made = new Server({ name: "tutors-studio", version: options.version }, { capabilities: { tools: {} } });
    made.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: tools() }));
    made.setRequestHandler(CallToolRequestSchema, async (request) => call(request.params.name, (request.params.arguments ?? {}) as Args));
    return made;
  }

  return {
    tools,
    call,
    server,
    register(given) {
      authoring = given;
    },
    async serve(transport) {
      if (transport !== "stdio") throw new Error("Studio serves MCP over stdio so far; localhost HTTP comes with the app's side (ADR 0051).");
      await server().connect(new StdioServerTransport());
    },
  };
}
