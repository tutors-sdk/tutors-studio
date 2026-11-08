<script lang="ts">
  import type { AuthoringPort, CourseView } from "../application/ports/authoring.ts";
  import type { Finding } from "../domain/finding.ts";
  import type { Plan } from "../domain/plan.ts";
  import type { MapNode } from "../domain/course-map.ts";
  import type { AnswerProblem, CourseAnswers, PatternCard } from "../domain/new-course.ts";
  import StartScreen from "./components/StartScreen.svelte";
  import NewCourse from "./components/NewCourse.svelte";
  import CourseMap from "./components/CourseMap.svelte";
  import NodeDetail from "./components/NodeDetail.svelte";
  import StatusBar from "./components/StatusBar.svelte";

  interface Props {
    /** Opens a course folder and returns its authoring port, or null if the lecturer cancelled. */
    openCourse: () => Promise<{ name: string; authoring: AuthoringPort } | null>;
    /** Guided creation: the patterns offered, the answers' check, and the step that creates the course. */
    newCourse: {
      patterns: PatternCard[];
      check: (answers: CourseAnswers) => AnswerProblem[];
      /** Creates the course and opens it, or resolves to the reason nothing was created; null when the lecturer cancelled. */
      create: (answers: CourseAnswers) => Promise<{ name: string; authoring: AuthoringPort } | { reason: string } | null>;
    };
    rulesVersion: string;
    assistantName: string;
  }
  let { openCourse, newCourse, rulesVersion, assistantName }: Props = $props();

  let starting = $state(false);

  let course = $state<{ name: string; authoring: AuthoringPort } | null>(null);
  let view = $state<CourseView | null>(null);
  let selected = $state<string>("");
  let pending = $state<Plan | null>(null);
  let notice = $state<string>("");

  const find = (node: MapNode, path: string): MapNode | null => (node.path === path ? node : (node.children.map((c) => find(c, path)).find((n) => n !== null) ?? null));
  let selectedNode = $derived(view === null ? null : find(view.map, selected));
  let errors = $derived(view?.findings.filter((f) => f.severity === "error").length ?? 0);

  async function open() {
    const opened = await openCourse();
    if (opened === null) return;
    course = opened;
    notice = "";
    selected = "";
    view = await opened.authoring.refresh();
  }

  async function create(answers: CourseAnswers): Promise<string | null> {
    const made = await newCourse.create(answers);
    if (made === null) return null;
    if ("reason" in made) return made.reason;
    starting = false;
    course = made;
    selected = "";
    view = await made.authoring.refresh();
    notice = `Created ${made.name}. Each week's topic is ready for its material.`;
    return null;
  }

  function proposeFix(finding: Finding) {
    pending = course?.authoring.planFix(finding) ?? null;
  }

  async function accept() {
    if (course === null || pending === null) return;
    const plan = pending;
    pending = null;
    const result = await course.authoring.apply(plan);
    notice = result.ok ? `Done: ${plan.summary}.` : `Nothing changed: ${result.blockedBy} couldn't be moved (${result.reason}).`;
    view = await course.authoring.refresh();
    if (result.ok && plan.ops[0]?.op === "move") selected = plan.ops[0].to;
  }
</script>

<div class="shell">
  {#if starting}
    <NewCourse patterns={newCourse.patterns} check={newCourse.check} onCreate={create} onCancel={() => (starting = false)} />
  {:else if course === null || view === null}
    <StartScreen onOpen={open} onNew={() => (starting = true)} />
  {:else}
    <aside class="sidebar" aria-label="Course map">
      <header>
        <p class="eyebrow">Course</p>
        <h1>{course.name}</h1>
        <p class="summary" class:has-errors={errors > 0} role="status">
          {errors === 0 ? "Everything checks out." : `${errors} ${errors === 1 ? "thing" : "things"} to fix before publishing`}
        </p>
      </header>
      <CourseMap map={view.map} {selected} onSelect={(path) => (selected = path)} />
      <button class="secondary" onclick={open}>Open another course</button>
    </aside>
    <main class="detail">
      {#if notice}<p class="notice" role="status">{notice}</p>{/if}
      {#if selectedNode}
        <NodeDetail node={selectedNode} {pending} onFix={proposeFix} onAccept={accept} onCancel={() => (pending = null)} />
      {/if}
    </main>
  {/if}
  <StatusBar {rulesVersion} {assistantName} />
</div>

<style>
  :global(body) {
    margin: 0;
    background: var(--ui-canvas);
    color: var(--ui-ink);
    font-family: var(--studio-font-stack);
    font-size: var(--font-body);
    line-height: var(--leading-ui);
  }
  :global(:focus-visible) {
    outline: 2px solid var(--ui-focus);
    outline-offset: 2px;
  }
  .shell {
    display: grid;
    grid-template-columns: var(--studio-sidebar-width) 1fr;
    grid-template-rows: 1fr var(--studio-status-bar);
    height: 100vh;
  }
  .shell > :global(.start) {
    grid-column: 1 / -1;
  }
  .sidebar {
    background: var(--ui-surface);
    border-right: 1px solid var(--ui-border);
    padding: var(--space-4);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .eyebrow {
    margin: 0;
    color: var(--ui-muted);
    font-size: var(--font-caption);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  h1 {
    margin: var(--space-1) 0;
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
  }
  .summary {
    margin: 0;
    font-size: var(--font-label);
    color: var(--ui-success);
  }
  .summary.has-errors {
    color: var(--ui-danger);
  }
  .detail {
    padding: var(--space-8);
    overflow-y: auto;
  }
  .notice {
    margin: 0 0 var(--space-4);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-control);
    background: var(--ui-raised);
  }
  .secondary {
    margin-top: auto;
    align-self: flex-start;
    font: inherit;
    font-size: var(--font-control);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
    cursor: pointer;
  }
</style>
