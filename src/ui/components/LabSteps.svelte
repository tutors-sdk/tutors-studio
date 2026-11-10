<script lang="ts">
  import { PICTURE_TYPES } from "../../domain/course-details.ts";
  import type { LabChange, LabStep } from "../../domain/lab-steps.ts";

  interface Props {
    steps: LabStep[];
    /** Asks for the plan; nothing changes until it is accepted. */
    onChange: (change: LabChange) => void;
    /** Advanced mode: show each step's file name. */
    showFileNames?: boolean;
    /** The chosen assistant's name, when it can draft steps from the lecturer's notes; absent when none is chosen. */
    drafter?: string;
    /** True while the assistant drafts. */
    drafting?: boolean;
    /** Asks for the plan that adds the drafted steps (STU-0136). */
    onDraft?: (notes: string) => void;
  }
  let { steps, onChange, showFileNames = false, drafter, drafting = false, onDraft }: Props = $props();
  let notes = $state("");
  function draft(event: SubmitEvent) {
    event.preventDefault();
    onDraft?.(notes);
  }

  let renaming = $state<string | null>(null);
  let newTitle = $state("");
  let adding = $state("");
  let pictureFor = $state<string | null>(null);
  let input = $state<HTMLInputElement | null>(null);

  function startRename(step: LabStep) {
    renaming = step.file;
    newTitle = step.title;
  }
  function rename(event: SubmitEvent, step: LabStep) {
    event.preventDefault();
    onChange({ do: "retitle", file: step.file, title: newTitle });
    renaming = null;
  }
  function add(event: SubmitEvent) {
    event.preventDefault();
    onChange({ do: "add", title: adding });
    adding = "";
  }
  function choosePicture(step: LabStep) {
    pictureFor = step.file;
    input?.click();
  }
  async function chosen(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (file && pictureFor) onChange({ do: "picture", file: pictureFor, picture: { path: file.name, bytes: new Uint8Array(await file.arrayBuffer()) } });
    if (input) input.value = "";
    pictureFor = null;
  }
</script>

<section class="lab" aria-labelledby="lab-steps-title">
  <h3 id="lab-steps-title">Steps</h3>
  {#if steps.length === 0}
    <p class="hint">This lab has no steps yet. Add the first below.</p>
  {:else}
    <ol>
      {#each steps as step, i (step.file)}
        <li>
          {#if renaming === step.file}
            <form class="rename" onsubmit={(event) => rename(event, step)}>
              <label>
                <span class="visually-hidden">New title for {step.title}</span>
                <input bind:value={newTitle} required />
              </label>
              <button class="quiet" type="submit">Rename</button>
              <button class="quiet" type="button" onclick={() => (renaming = null)}>Cancel</button>
            </form>
          {:else}
            <span class="title"
              >{step.title}{#if showFileNames}<span class="file"> · {step.file}</span>{/if}</span
            >
            <span class="actions">
              <button class="quiet" disabled={i === 0} onclick={() => onChange({ do: "move", file: step.file, by: -1 })} aria-label={`Move ${step.title} earlier`}>Earlier</button>
              <button class="quiet" disabled={i === steps.length - 1} onclick={() => onChange({ do: "move", file: step.file, by: 1 })} aria-label={`Move ${step.title} later`}
                >Later</button
              >
              <button class="quiet" onclick={() => startRename(step)} aria-label={`Rename ${step.title}`}>Rename</button>
              <button class="quiet" onclick={() => choosePicture(step)} aria-label={`Add a picture to ${step.title}`}>Add a picture</button>
              <button class="quiet" onclick={() => onChange({ do: "remove", file: step.file })} aria-label={`Remove ${step.title}`}>Remove</button>
            </span>
          {/if}
        </li>
      {/each}
    </ol>
  {/if}
  <input bind:this={input} type="file" accept={PICTURE_TYPES.map((type) => `.${type}`).join(",")} onchange={chosen} hidden />
  <form class="add" onsubmit={add}>
    <label>
      New step
      <input bind:value={adding} placeholder="What students do next" />
    </label>
    <button class="quiet" type="submit" disabled={adding.trim() === ""}>Add the step</button>
  </form>
  {#if drafter && onDraft}
    <details class="draft">
      <summary>Draft steps from my notes</summary>
      <form onsubmit={draft}>
        <label>
          Your notes, as text or markdown. Only these are sent to {drafter}.
          <textarea bind:value={notes} rows="6" placeholder="What students build, the tools they need, and the order they do it in"></textarea>
        </label>
        {#if drafting}
          <p class="hint" role="status">Asking {drafter}…</p>
        {:else}
          <button class="quiet" type="submit" disabled={notes.trim() === ""}>Ask {drafter} to draft the steps</button>
        {/if}
      </form>
    </details>
  {/if}
</section>

<style>
  .lab {
    margin-top: var(--space-6);
    padding: var(--space-5);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
    display: grid;
    gap: var(--space-3);
  }
  h3 {
    margin: 0;
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  ol {
    margin: 0;
    padding-left: var(--space-5);
    display: grid;
    gap: var(--space-2);
  }
  li > .title,
  li > .actions {
    display: inline-flex;
  }
  .title {
    margin-right: var(--space-3);
    overflow-wrap: anywhere;
  }
  .file,
  .hint {
    color: var(--ui-muted);
    font-size: var(--font-label);
  }
  .hint {
    margin: 0;
  }
  .actions,
  .rename,
  .add {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
  }
  .add {
    align-items: end;
  }
  label {
    display: grid;
    gap: var(--space-1);
    font-size: var(--font-label);
    color: var(--ui-muted);
  }
  .draft form {
    display: grid;
    gap: var(--space-2);
    margin-top: var(--space-2);
    justify-items: start;
  }
  .draft label {
    width: 100%;
  }
  summary {
    cursor: pointer;
    font-size: var(--font-label);
    min-height: 44px;
    display: flex;
    align-items: center;
  }
  input,
  textarea {
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--ui-control-border);
    border-radius: var(--radius-control);
    background: var(--ui-surface);
    color: var(--ui-ink);
  }
  .quiet {
    font: inherit;
    font-size: var(--font-label);
    min-height: 44px;
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--ui-control-border);
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--ui-ink);
    cursor: pointer;
  }
  .quiet:disabled {
    cursor: default;
    color: var(--ui-disabled-ink);
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
</style>
