<script lang="ts">
  import { defaultShape, describeShape, MAX_PER_WEEK, MAX_WEEKS, type AnswerField, type AnswerProblem, type CourseAnswers } from "../../domain/new-course.ts";
  import { courseTemplates, REVIEW_FROM, sectionsFor, TEMPLATE_LENGTHS, type TemplateId } from "../../domain/templates.ts";
  import { exampleCourses, exampleItemCount } from "../../domain/example-courses.ts";

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
    { title: "Start from a reference course, a template, or your own week?", fields: ["template", "weeks"] },
    { title: "How does a teaching week break down?", fields: ["weeks", "shape"] },
  ];
  /** The choice that leads to the week questions instead of a template. */
  const OWN = "own";
  /** The choice of a reference course, picked from the list (ADR 0041). */
  const REFERENCE = "reference";

  let step = $state(0);
  let name = $state("");
  let lecturer = $state("");
  let weeks = $state(12);
  let lectures = $state(defaultShape.lectures);
  let labs = $state(defaultShape.labs);
  let readings = $state(defaultShape.readings);
  let project = $state(false);
  let start = $state<TemplateId | typeof OWN | typeof REFERENCE>(REFERENCE);
  let example = $state(exampleCourses[0].id);
  const picked = $derived(exampleCourses.find((candidate) => candidate.id === example) ?? exampleCourses[0]);
  let length = $state<number>(12);
  let shown = $state<AnswerProblem[]>([]);
  let creating = $state(false);
  let failure = $state("");

  /** On the template question, a picked template is the answer; past it, the lecturer is shaping their own week. */
  const answers = (): CourseAnswers =>
    step === 1 && start === REFERENCE
      ? { name, lecturer, weeks: picked.weeks.length, shape: defaultShape, project: false, example }
      : step === 1 && start !== OWN
        ? { name, lecturer, weeks: length, shape: defaultShape, project: false, template: start as TemplateId }
        : { name, lecturer, weeks, shape: { lectures, labs, readings }, project };
  /** The last question: the template question when a template is picked, otherwise the week questions. */
  const last = () => (step === 1 && start !== OWN) || step === questions.length - 1;
  const lengthNote = (n: number) => {
    const sections = sectionsFor(n).length;
    return `${sections === 1 ? "One section" : `${sections} sections`}${n >= REVIEW_FROM ? `, week ${n} a review with a quiz` : ""}`;
  };
  const problemFor = (field: AnswerField) => shown.find((p) => p.field === field)?.message;

  /** Moves on only when this question's answers are complete; otherwise names what to change. */
  async function next(event: SubmitEvent) {
    event.preventDefault();
    shown = check(answers()).filter((p) => questions[step].fields.includes(p.field));
    if (shown.length > 0) return;
    if (!last()) {
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
    <p class="eyebrow">New course · {step + 1} of {start === OWN ? questions.length : questions.length - 1}</p>
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
    {:else if step === 1}
      <fieldset class="templates">
        <legend class="sr-only">How to start</legend>
        <label class="choice">
          <input type="radio" name="start" value={REFERENCE} bind:group={start} />
          <span class="choice-text">
            <span class="choice-name">A reference course</span>
            <span class="choice-week">A whole course shaped like a real Tutors course, week for week, ready for your material.</span>
          </span>
        </label>
        {#each courseTemplates as template (template.id)}
          <label class="choice">
            <input type="radio" name="start" value={template.id} bind:group={start} />
            <span class="choice-text">
              <span class="choice-name">{template.name}</span>
              <span class="choice-week">Each week: {template.week[0].toLowerCase()}{template.week.slice(1)}</span>
            </span>
          </label>
        {/each}
        <label class="choice">
          <input type="radio" name="start" value={OWN} bind:group={start} />
          <span class="choice-text">
            <span class="choice-name">Shape my own week</span>
            <span class="choice-week">Say how many lectures, labs and readings a week holds, for any number of weeks.</span>
          </span>
        </label>
      </fieldset>
      {#if start === REFERENCE}
        <label for="example">Reference course</label>
        <select id="example" bind:value={example} aria-describedby="example-hint">
          {#each exampleCourses as course (course.id)}<option value={course.id}>{course.name}</option>{/each}
        </select>
        <p class="hint" id="example-hint">
          {picked.summary}
          {picked.weeks.length} weeks, {exampleItemCount(picked)} items, shaped on {picked.modelledOn}. Every page starts empty for your material.
        </p>
        {#if problemFor("template")}<p class="problem">{problemFor("template")}</p>{/if}
      {:else if start !== OWN}
        <fieldset class="lengths" aria-describedby={problemFor("weeks") ? "length-problem" : "length-hint"}>
          <legend>How many teaching weeks?</legend>
          <div class="length-options">
            {#each TEMPLATE_LENGTHS as n (n)}
              <label class="length"><input type="radio" name="length" value={n} bind:group={length} /> {n}</label>
            {/each}
          </div>
          <p class="hint" id="length-hint">{lengthNote(length)}. You can add, remove or rename anything later.</p>
        </fieldset>
        {#if problemFor("weeks")}<p class="problem" id="length-problem">{problemFor("weeks")}</p>{/if}
        {#if problemFor("template")}<p class="problem">{problemFor("template")}</p>{/if}
      {/if}
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
      <button type="submit" class="primary" disabled={creating}>{!last() ? "Continue" : creating ? "Creating…" : "Create course"}</button>
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
  fieldset.templates,
  fieldset.lengths {
    margin: 0;
    padding: 0;
    border: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  fieldset.lengths {
    margin-top: var(--space-4);
  }
  .lengths legend {
    padding: 0;
    margin-bottom: var(--space-1);
    font-size: var(--font-label);
    font-weight: var(--weight-medium);
  }
  .choice {
    display: flex;
    gap: var(--space-3);
    align-items: flex-start;
    margin: 0;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-control);
    cursor: pointer;
    font-weight: var(--weight-regular);
  }
  .choice:has(input:checked) {
    border-color: var(--ui-ink);
  }
  .choice input {
    margin-top: var(--space-1);
  }
  .choice-text {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .choice-name {
    font-weight: var(--weight-medium);
  }
  .choice-week {
    font-size: var(--font-label);
  }
  .length-options {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .length {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    margin: 0;
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--ui-control-border);
    border-radius: var(--radius-control);
    cursor: pointer;
    font-weight: var(--weight-regular);
  }
  .length:has(input:checked) {
    border-color: var(--ui-ink);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
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
  input:not([type="checkbox"], [type="radio"]),
  select {
    font: inherit;
    min-height: 44px;
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
