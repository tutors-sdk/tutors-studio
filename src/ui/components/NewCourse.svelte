<script lang="ts">
  import { describeShape, MAX_PER_WEEK, type AnswerField, type AnswerProblem, type CourseAnswers, type PatternCard } from "../../domain/new-course.ts";

  interface Props {
    patterns: PatternCard[];
    /** The answers' problems, from the domain's checkAnswers; the same check the create step runs. */
    check: (answers: CourseAnswers) => AnswerProblem[];
    /** Creates the course; resolves to a reason when nothing was created. */
    onCreate: (answers: CourseAnswers) => Promise<string | null>;
    onCancel: () => void;
  }
  let { patterns, check, onCreate, onCancel }: Props = $props();

  const questions: { title: string; fields: AnswerField[] }[] = [
    { title: "What is the course called, and who teaches it?", fields: ["name"] },
    { title: "When does it run?", fields: ["start", "weeks", "readingWeek"] },
    { title: "How do you teach it?", fields: ["pattern"] },
    { title: "What does a teaching week hold?", fields: ["shape"] },
  ];

  let step = $state(0);
  let name = $state("");
  let lecturer = $state("");
  let start = $state("");
  let weeks = $state(12);
  let hasReadingWeek = $state(false);
  let readingWeek = $state(6);
  let pattern = $state("lecture-lab");
  let lectures = $state(1);
  let labs = $state(1);
  let readings = $state(0);
  let shown = $state<AnswerProblem[]>([]);
  let creating = $state(false);
  let failure = $state("");

  const answers = (): CourseAnswers => ({
    name,
    lecturer,
    start,
    weeks,
    readingWeek: hasReadingWeek ? readingWeek : null,
    pattern,
    shape: step < 3 ? null : { lectures, labs, readings },
  });
  const problemFor = (field: AnswerField) => shown.find((p) => p.field === field)?.message;

  /** Moves on only when this question's answers are complete; otherwise names what to change. */
  async function next(event: SubmitEvent) {
    event.preventDefault();
    shown = check(answers()).filter((p) => questions[step].fields.includes(p.field));
    if (shown.length > 0) return;
    if (step < questions.length - 1) {
      // The week starts as the chosen pattern's week; the lecturer changes the counts from there.
      if (step === 2) {
        const chosen = patterns.find((card) => card.id === pattern);
        if (chosen) ({ lectures, labs, readings } = chosen.shape);
      }
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
    {:else if step === 1}
      <label for="start">Teaching starts</label>
      <input id="start" type="date" bind:value={start} aria-invalid={problemFor("start") !== undefined} aria-describedby={problemFor("start") ? "start-problem" : undefined} />
      {#if problemFor("start")}<p class="problem" id="start-problem">{problemFor("start")}</p>{/if}
      <label for="weeks">Teaching weeks</label>
      <input
        id="weeks"
        type="number"
        min="1"
        max="52"
        bind:value={weeks}
        aria-invalid={problemFor("weeks") !== undefined}
        aria-describedby={problemFor("weeks") ? "weeks-problem" : undefined}
      />
      {#if problemFor("weeks")}<p class="problem" id="weeks-problem">{problemFor("weeks")}</p>{/if}
      <label class="check"><input type="checkbox" bind:checked={hasReadingWeek} /> There's a reading week</label>
      {#if hasReadingWeek}
        <label for="reading-week">It comes after week</label>
        <input
          id="reading-week"
          type="number"
          min="1"
          bind:value={readingWeek}
          aria-invalid={problemFor("readingWeek") !== undefined}
          aria-describedby={problemFor("readingWeek") ? "readingWeek-problem" : undefined}
        />
        {#if problemFor("readingWeek")}<p class="problem" id="readingWeek-problem">{problemFor("readingWeek")}</p>{/if}
      {/if}
      <p class="hint">Each teaching week becomes one topic, numbered and dated. The reading week is skipped.</p>
    {:else if step === 2}
      <div class="cards" role="radiogroup" aria-labelledby="question">
        {#each patterns as card (card.id)}
          <button type="button" class="card" role="radio" aria-checked={pattern === card.id} onclick={() => (pattern = card.id)}>
            <span class="card-name">{card.name}</span>
            <span class="card-text">{card.description}</span>
            <span class="map" aria-label="Each week's topic holds">
              <span class="map-row topic">Week 1</span>
              {#each card.week as item (item.title)}<span class="map-row item"><span class="badge">{item.label}</span> {item.title.replace("{n}", "1")}</span>{/each}
              <span class="map-row topic">Side unit</span>
              {#each card.side as item (item.title)}<span class="map-row item"><span class="badge">{item.label}</span> {item.title}</span>{/each}
            </span>
            <span class="card-when">{card.pickedWhen}</span>
          </button>
        {/each}
      </div>
      {#if problemFor("pattern")}<p class="problem">{problemFor("pattern")}</p>{/if}
    {:else}
      <div class="counts">
        <label for="lectures">Lectures</label>
        <input id="lectures" type="number" min="0" max={MAX_PER_WEEK} bind:value={lectures} aria-describedby={problemFor("shape") ? "shape-problem" : undefined} />
        <label for="labs">Labs or practicals</label>
        <input id="labs" type="number" min="0" max={MAX_PER_WEEK} bind:value={labs} aria-describedby={problemFor("shape") ? "shape-problem" : undefined} />
        <label for="readings">Readings or notes</label>
        <input id="readings" type="number" min="0" max={MAX_PER_WEEK} bind:value={readings} aria-describedby={problemFor("shape") ? "shape-problem" : undefined} />
      </div>
      {#if problemFor("shape")}<p class="problem" id="shape-problem">{problemFor("shape")}</p>{/if}
      <p class="hint">
        Each of the {weeks} weeks starts with {describeShape({ lectures: lectures || 0, labs: labs || 0, readings: readings || 0 })}, ready for your material. You can add or remove
        things in any week later.
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
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-4);
  }
  .card {
    font: inherit;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-5);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    background: var(--ui-canvas);
    color: var(--ui-ink);
    cursor: pointer;
  }
  .card[aria-checked="true"] {
    border-color: var(--ui-brand);
    box-shadow: inset 0 0 0 1px var(--ui-brand);
    background: var(--ui-selected);
  }
  .card-name {
    font-weight: var(--weight-semibold);
  }
  .card-text,
  .card-when {
    color: var(--ui-muted);
    font-size: var(--font-label);
  }
  .map {
    display: flex;
    flex-direction: column;
    padding: var(--space-3);
    border-radius: var(--radius-control);
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    font-size: var(--font-label);
  }
  .map-row {
    min-height: calc(var(--studio-tree-row) * 0.8);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .map-row.item {
    padding-left: var(--studio-tree-indent);
  }
  .map-row.topic {
    font-weight: var(--weight-medium);
  }
  .badge {
    font-size: var(--font-caption);
    padding: 0 var(--space-2);
    border-radius: var(--radius-badge);
    border: 1px solid var(--ui-border);
    color: var(--ui-muted);
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
