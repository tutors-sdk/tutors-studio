import type { ArrangePlan, AuthoringPort, CourseView, HistoryEntry } from "../application/ports/authoring.ts";
import type { ArrangeAction } from "../domain/arrange.ts";
import { flatten, type MapNode } from "../domain/course-map.ts";
import type { Finding } from "../domain/finding.ts";
import type { Plan } from "../domain/plan.ts";

const find = (node: MapNode, path: string): MapNode | null =>
  node.path === path ? node : (node.children.map((child) => find(child, path)).find((found) => found !== null) ?? null);
const parentOf = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");
const CONTAINERS = ["topic", "unit", "side"];

/**
 * One open course on screen: what it reads as, what the lecturer has selected, and the plan waiting to be
 * accepted. Every change goes through `apply` with a plan the lecturer accepted (ADR 0004), then the course
 * is read again. Kept out of App.svelte so the orchestration can be tested without a window.
 */
export class CourseSession {
  view = $state<CourseView | null>(null);
  selected = $state("");
  /** A finding's fix, waiting to be accepted. */
  pending = $state<Plan | null>(null);
  /** An arrangement's or the course details' plan, waiting to be accepted, and where to look once it applies (STU-0095 to STU-0108). */
  arranging = $state<{ plan: Plan; notes: string[]; select: string } | null>(null);
  /** The last outcome, in a sentence: "Done: ..." or why nothing changed. */
  notice = $state("");
  /** Pages saved since the course was opened, so the lecturer sees their writing is on the computer. */
  savedNow = $state<string[]>([]);

  readonly selectedNode = $derived(this.view === null ? null : find(this.view.map, this.selected));
  readonly parentNode = $derived(this.view === null || this.selected === "" ? null : find(this.view.map, parentOf(this.selected)));
  readonly errors = $derived(this.view?.findings.filter((finding) => finding.severity === "error").length ?? 0);
  /** Every apply refreshes the view, so reading it here lists each change as soon as it is made (STU-0092). */
  get history(): HistoryEntry[] {
    return this.view === null ? [] : this.authoring.history();
  }
  /** The folders an item could move to, by the name the lecturer knows them by: the course, its units and its weeks. */
  readonly places = $derived(
    this.view === null
      ? []
      : [
          { path: "", title: "The top of the course" },
          ...flatten(this.view.map)
            .filter((node) => !node.excluded && CONTAINERS.includes(node.kind ?? ""))
            .map((node) => ({ path: node.path, title: node.title ?? node.name })),
        ],
  );
  /** Where a folder Tutors leaves out sits: in a week it can become a lecture, lab or reading; in the course or a unit, a week. */
  readonly visibleScope = $derived.by((): "week" | "course" | null => {
    const holder = this.parentNode;
    if (!holder || holder.excluded) return null;
    return holder.kind === "topic" ? "week" : ["course", "unit", "side"].includes(holder.kind ?? "") ? "course" : null;
  });

  constructor(
    readonly authoring: AuthoringPort,
    /** Heard after a change applies, and when an applied change says where to look next. */
    private readonly hooks: { applied?: () => void; select?: (path: string) => void } = {},
  ) {}

  find(path: string): MapNode | null {
    return this.view === null ? null : find(this.view.map, path);
  }

  async refresh(): Promise<CourseView> {
    this.view = await this.authoring.refresh();
    return this.view;
  }

  /** Applies an accepted plan, says how it went, and reads the course again. */
  async apply(plan: Plan, failed = "changed"): Promise<boolean> {
    const result = await this.authoring.apply(plan);
    this.notice = result.ok ? `Done: ${plan.summary}.` : `Nothing changed: ${result.blockedBy} couldn't be ${failed} (${result.reason}).`;
    await this.refresh();
    return result.ok;
  }

  proposeFix(finding: Finding) {
    this.pending = this.authoring.planFix(finding);
  }

  /** Applies the finding's fix the lecturer accepted; a renamed folder stays selected under its new name. */
  async accept() {
    const plan = this.pending;
    if (plan === null) return;
    this.pending = null;
    const ok = await this.apply(plan, "moved");
    if (ok && plan.ops[0]?.op === "move") this.selected = plan.ops[0].to;
    if (ok) this.hooks.applied?.();
  }

  /** Shows a plan to change the course's shape or details, or the sentence for why there is none. */
  async propose(planning: Promise<ArrangePlan>) {
    this.pending = null;
    const planned = await planning;
    this.arranging = planned.ok ? { plan: planned.plan, notes: planned.notes, select: planned.select } : null;
    this.notice = planned.ok ? "" : planned.message;
  }

  arrange(action: ArrangeAction) {
    return this.propose(this.authoring.planArrange(action));
  }

  async acceptArrange() {
    if (this.arranging === null) return;
    const { plan, select } = this.arranging;
    this.arranging = null;
    if (!(await this.apply(plan))) return;
    this.hooks.select?.(select);
    this.hooks.applied?.();
  }

  /** Material, a new item or a folder made visible; a folder made visible moves under its new name, so stay on it. */
  async acceptMaterial(plan: Plan) {
    const ok = await this.apply(plan, "written");
    const last = plan.ops[plan.ops.length - 1];
    if (ok && last?.op === "move" && last.from === this.selected) this.selected = last.to;
  }

  /** A saved quiz: the quiz's folder is selected. */
  async acceptQuiz(plan: Plan) {
    const ok = await this.apply(plan, "written");
    const written = plan.ops[0];
    if (ok && written?.op === "write") this.selected = written.path.slice(0, written.path.lastIndexOf("/"));
  }

  /** A written page: marked "Saved just now". */
  async acceptPage(plan: Plan) {
    const ok = await this.apply(plan, "written");
    if (ok) this.savedNow = [...this.savedNow, ...plan.ops.flatMap((op) => (op.op === "write" ? [op.path] : []))];
    if (ok) this.hooks.applied?.();
  }
}
