<script lang="ts">
  import type { CourseDetails } from "../../domain/course-details.ts";

  interface Props {
    details: CourseDetails;
    /** Asks for the plan; nothing changes until it is accepted. */
    onSave: (wanted: { title: string; credits: string; start: string | null }) => void;
  }
  let { details, onSave }: Props = $props();

  let title = $state("");
  let credits = $state("");
  let start = $state("");
  $effect(() => {
    title = details.title;
    credits = details.credits;
    start = details.start ?? "";
  });
  const changed = $derived(title.trim() !== details.title.trim() || credits.trim() !== details.credits || (start !== "" && start !== details.start));

  function save(event: SubmitEvent) {
    event.preventDefault();
    if (changed) onSave({ title, credits, start: start === "" ? null : start });
  }
</script>

<form class="details" aria-labelledby="details-title" onsubmit={save}>
  <h3 id="details-title">Course details</h3>
  <label>
    Title
    <input bind:value={title} required />
  </label>
  <label>
    Who it's by
    <input bind:value={credits} placeholder="Shown under the title" />
  </label>
  <label>
    Teaching starts
    <input type="date" bind:value={start} />
    <span class="hint"
      >{details.start === null
        ? `Optional. Studio adds a calendar dating each of the ${details.weeks === 1 ? "week" : `${details.weeks} weeks`} from this day.`
        : "The calendar dates each week from this day."}</span
    >
  </label>
  <div class="actions"><button class="quiet" type="submit" disabled={!changed}>Save details</button></div>
</form>

<style>
  .details {
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
  label {
    display: grid;
    gap: var(--space-1);
    font-size: var(--font-label);
    color: var(--ui-muted);
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
  .hint {
    font-size: var(--font-caption);
  }
  .actions {
    display: flex;
  }
  .quiet {
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
    cursor: pointer;
  }
  .quiet:disabled {
    cursor: default;
    opacity: 0.6;
  }
</style>
