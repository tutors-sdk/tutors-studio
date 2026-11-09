<script lang="ts">
  import { defaultShape, describeShape, MAX_PER_WEEK, MAX_WEEKS, type AnswerField, type AnswerProblem, type CourseAnswers } from "../../domain/new-course.ts";

  interface Props {
    /** The answers' problems, from the domain's checkAnswers; the same check the create step runs. */
    check: (answers: CourseAnswers) => AnswerProblem[];
    /** Creates the course; resolves to a reason when nothing was created. */
    onCreate: (answers: CourseAnswers) => Promise<string | null>;
    onCancel: () => void;
  }
  let { check, onCreate, onCancel }: Props = $props();

  const questions: { title: string; fields: AnswerField[] }[] = [
    { title: "What is the course called, and who teaches it?", fields: ["name"] },
    { title: "How does a teaching week break down?", fields: ["weeks", "shape"] },
  ];

  let step = $state(0);
  let name = $state("");
  let lecturer = $state("");
  let weeks = $state(12);
  let lectures = $state(defaultShape.lectures);
  let labs = $state(defaultShape.labs);
  let readings = $state(defaultShape.readings);
  let project = $state(false);
  let shown = $state<AnswerProblem[]>([]);
  let creating = $state(false);
  let failure = $state("");

  const answers = (): CourseAnswers => ({ name, lecturer, weeks, shape: { lectures, labs, readings }, project });
  const problemFor = (field: AnswerField) => shown.find((p) => p.field === field)?.message;

  /** Moves on only when this question's answers are complete; otherwise names what to change. */
  async function next(event: SubmitEvent) {
    event.preventDefault();
    shown = check(answers()).filter((p) => questions[step].fields.includes(p.field));
    if (shown.length > 0) return;
    if (step < questions.length - 1) {
      step++;
      return;
    }
    creating = true;
    failure = (await onCreate(answers())) ?? "";
    creating = false;
  }
</script>

<main class="start">
  <form class="panel" onsubmit={next} novalidate aria-labelledby="question">
    <p class="eyebrow">New course · {step + 1} of {questions.length}</p>
    <h1 id="question">{questions[step].title}</h1>

    {#if step === 0}
      <label for="name">Course name</label>
      <input
        id="name"
        bind:value={name}
        placeholder="Web Development"
        aria-invalid={problemFor("name") !== undefined}
        aria-describedby={problemFor("name") ? "name-problem" : undefined}
      />
      {#if problemFor("name")}<p class="problem" id="name-problem">{problemFor("name")}</p>{/if}
      <label for="lecturer">Lecturer <span class="optional">(optional)</span></label>
      <input id="lecturer" bind:value={lecturer} placeholder="Your name, as students see it" />
    {:else}
      <label for="weeks">How many teaching weeks?</label>
      <input
        id="weeks"
        class="short"
        type="number"
        min="1"
        max={MAX_WEEKS}
        bind:value={weeks}
        aria-invalid={problemFor("weeks") !== undefined}
        aria-describedby={problemFor("weeks") ? "weeks-problem" : undefined}
      />
      {#if problemFor("weeks")}<p class="problem" id="weeks-problem">{problemFor("weeks")}</p>{/if}
      <fieldset class="counts" aria-describedby={problemFor("shape") ? "shape-problem" : "shape-hint"}>
        <legend>In a typical week, how many…</legend>
        <label for="lectures">Lectures, with slides</label>
        <input id="lectures" type="number" min="0" max={MAX_PER_WEEK} bind:value={lectures} aria-invalid={problemFor("shape") !== undefined} />
        <label for="labs">Labs or practicals, done step by step</label>
        <input id="labs" type="number" min="0" max={MAX_PER_WEEK} bind:value={labs} aria-invalid={problemFor("shape") !== undefined} />
        <label for="readings">Readings or notes</label>
        <input id="readings" type="number" min="0" max={MAX_PER_WEEK} bind:value={readings} aria-invalid={problemFor("shape") !== undefined} />
      </fieldset>
      {#if problemFor("shape")}<p class="problem" id="shape-problem">{problemFor("shape")}</p>{/if}
      <label class="check"><input type="checkbox" bind:checked={project} /> Students build a project across the weeks</label>
      <p class="hint" id="shape-hint">
        Each of the {weeks || 0} weeks starts with {describeShape({ lectures: lectures || 0, labs: labs || 0, readings: readings || 0 })}, ready for your material.
        {project ? "A project specification and starter code sit beside the weeks." : "A module handbook and an introduction sit beside the weeks."} You can add or remove things in any
        week later.
      </p>
    {/if}

    {#if failure}<p class="problem" role="alert">{failure}</p>{/if}

    <div class="actions">
      <button type="button" class="secondary" onclick={() => (step === 0 ? onCancel() : step--)}>{step === 0 ? "Cancel" : "Back"}</button>
      <button type="submit" class="primary" disabled={creating}>{step < questions.length - 1 ? "Continue" : creating ? "Creating…" : "Create course"}</button>
    </div>
  </form>
</main>

<style>
  .counts {
    display: grid;
    grid-template-columns: 1fr 6rem;
    gap: var(--space-3) var(--space-4);
    align-items: center;
  }
  .counts label {
    margin: 0;
  }
  .short {
    width: 6rem;
  }
  fieldset.counts {
    margin: var(--space-4) 0 0;
    padding: 0;
    border: none;
  }
  .counts legend {
    grid-column: 1 / -1;
    padding: 0;
    margin-bottom: var(--space-1);
    font-size: var(--font-label);
    font-weight: var(--weight-medium);
  }
  .start {
    display: grid;
    place-items: center;
    padding: var(--space-8);
    overflow-y: auto;
  }
  .panel {
    width: min(100%, 760px);
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-panel);
    padding: var(--space-10);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .eyebrow {
    margin: 0;
    color: var(--ui-muted);
    font-size: var(--font-caption);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  h1 {
    margin: 0 0 var(--space-4);
    font-size: var(--font-heading);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
  }
  label {
    margin-top: var(--space-3);
    font-size: var(--font-label);
    font-weight: var(--weight-medium);
  }
  .optional,
  .hint {
    color: var(--ui-muted);
    font-weight: var(--weight-regular);
  }
  .hint {
    margin: var(--space-4) 0 0;
    font-size: var(--font-label);
  }
  input:not([type="checkbox"]) {
    font: inherit;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--ui-control-border);
    border-radius: var(--radius-control);
    background: var(--ui-canvas);
    color: var(--ui-ink);
    max-width: 420px;
  }
  input[aria-invalid="true"] {
    border-color: var(--ui-danger);
  }
  .check {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    font-weight: var(--weight-regular);
  }
  .problem {
    margin: 0;
    color: var(--ui-danger);
    font-size: var(--font-label);
  }
  .actions {
    display: flex;
    justify-content: space-between;
    margin-top: var(--space-8);
  }
  .primary,
  .secondary {
    font: inherit;
    font-size: var(--font-control);
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-control);
    cursor: pointer;
  }
  .primary {
    font-weight: var(--weight-medium);
    border: none;
    background: var(--ui-brand);
    color: var(--ui-on-brand);
  }
  .primary:hover {
    background: var(--ui-brand-hover);
  }
  .primary:disabled {
    background: var(--ui-disabled-ink);
    cursor: progress;
  }
  .secondary {
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
  }
</style>
