<script lang="ts">
  import type { LoadAnswers, LoadPlan, LoadProblem } from "../../application/use-cases/load-course.ts";

  interface Props {
    /** The folder's own name, which the course name starts from. */
    folderName: string;
    /** What the answers would make: the plan's weeks, items and tray, or what to change. Pure; nothing is written. */
    preview: (answers: LoadAnswers) => { ok: true; load: LoadPlan } | { ok: false; problems: LoadProblem[] };
    /** Makes the course; resolves to a reason when nothing was made, null when it was (or the lecturer cancelled). */
    onCreate: (answers: LoadAnswers) => Promise<string | null>;
    onCancel: () => void;
  }
  let { folderName, preview, onCreate, onCancel }: Props = $props();

  const tidy = (name: string) => name.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  // The name starts from the folder's, and is the lecturer's from then on.
  // svelte-ignore state_referenced_locally
  let name = $state(tidy(folderName));
  let lecturer = $state("");
  let start = $state("");
  let creating = $state(false);
  let failure = $state("");

  const answers = (): LoadAnswers => ({ name, lecturer, start: start === "" ? null : start });
  const result = $derived(preview(answers()));
  const problemFor = (field: LoadProblem["field"]) => (result.ok ? undefined : result.problems.find((p) => p.field === field)?.message);
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

  async function create(event: SubmitEvent) {
    event.preventDefault();
    if (!result.ok) return;
    creating = true;
    failure = (await onCreate(answers())) ?? "";
    creating = false;
  }
</script>

<main class="start">
  <form class="panel" onsubmit={create} novalidate aria-labelledby="load-title">
    <p class="eyebrow">Load a course</p>
    <h1 id="load-title">Make a course from "{folderName}"</h1>

    {#if result.ok}
      <p class="found" role="status">
        Studio found {plural(result.load.items, "item")} across {plural(result.load.weeks, "week")}. Each goes in its week as a talk, note, lab, download or link, the way Tutors
        shows it. Your folder is only read; the course is made as a new folder.
      </p>
    {:else if problemFor("material")}
      <p class="problem" role="alert">{problemFor("material")}</p>
    {/if}

    <label for="load-name">Course name</label>
    <input id="load-name" bind:value={name} aria-invalid={problemFor("name") !== undefined} aria-describedby={problemFor("name") ? "load-name-problem" : undefined} />
    {#if problemFor("name")}<p class="problem" id="load-name-problem">{problemFor("name")}</p>{/if}
    <label for="load-lecturer">Lecturer <span class="optional">(optional)</span></label>
    <input id="load-lecturer" bind:value={lecturer} placeholder="Your name, as students see it" />
    <label for="load-start">Teaching starts <span class="optional">(optional, for the calendar)</span></label>
    <input
      id="load-start"
      type="date"
      bind:value={start}
      aria-invalid={problemFor("start") !== undefined}
      aria-describedby={problemFor("start") ? "load-start-problem" : undefined}
    />
    {#if problemFor("start")}<p class="problem" id="load-start-problem">{problemFor("start")}</p>{/if}

    {#if result.ok && result.load.tray.length > 0}
      <details>
        <summary>{plural(result.load.tray.length, "file")} Studio will leave out</summary>
        <ul class="tray">
          {#each result.load.tray as file (file.path)}<li><strong>{file.path}</strong> {file.message}</li>{/each}
        </ul>
        <p class="hint">They stay in your folder. Drop them on a week once the course is made.</p>
      </details>
    {/if}

    {#if failure}<p class="problem" role="alert">{failure}</p>{/if}

    <div class="actions">
      <button type="button" class="secondary" onclick={onCancel}>Cancel</button>
      <button type="submit" class="primary" disabled={!result.ok || creating}>{creating ? "Creating…" : "Create the course"}</button>
    </div>
  </form>
</main>

<style>
  .start {
    display: grid;
    place-items: center;
    padding: var(--space-8);
    overflow-y: auto;
  }
  .panel {
    width: min(100%, 40rem);
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-panel);
    padding: var(--space-8);
    display: grid;
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
    margin: 0 0 var(--space-3);
    font-size: var(--font-title);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
    overflow-wrap: anywhere;
  }
  p {
    margin: 0;
  }
  .found {
    margin-bottom: var(--space-3);
  }
  label {
    margin-top: var(--space-3);
    font-size: var(--font-label);
    font-weight: var(--weight-medium);
  }
  .optional {
    color: var(--ui-muted);
    font-weight: normal;
  }
  input {
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--ui-control-border);
    border-radius: var(--radius-control);
    background: var(--ui-surface);
    color: var(--ui-ink);
  }
  .problem {
    font-size: var(--font-label);
    color: var(--ui-danger);
  }
  details {
    margin-top: var(--space-4);
  }
  summary {
    cursor: pointer;
    font-size: var(--font-label);
    min-height: 44px;
    display: flex;
    align-items: center;
  }
  .tray {
    margin: var(--space-2) 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: var(--space-2);
    font-size: var(--font-label);
    overflow-wrap: anywhere;
  }
  .hint {
    font-size: var(--font-label);
    color: var(--ui-muted);
  }
  .actions {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    margin-top: var(--space-6);
  }
  .primary,
  .secondary {
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    padding: var(--space-2) var(--space-5);
    border-radius: var(--radius-control);
    cursor: pointer;
  }
  .primary {
    border: none;
    background: var(--ui-brand);
    color: var(--ui-on-brand);
  }
  .primary:hover:not(:disabled) {
    background: var(--ui-brand-hover);
  }
  .primary:disabled {
    background: var(--ui-raised);
    color: var(--ui-disabled-ink);
    cursor: default;
  }
  .secondary {
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
  }
</style>
