<script lang="ts">
  import type { ComposeProblem } from "../../application/use-cases/compose-course.ts";
  import { weeksNeeded, type ComposePick } from "../../domain/compose.ts";
  import { labelFor } from "../../domain/course-map.ts";
  import type { LibraryScreen } from "../app-props.ts";

  interface Props {
    /** What the lecturer picked so far, in the order picked; each week can be changed here. */
    picks: ComposePick[];
    preview: LibraryScreen["preview"];
    onCreate: LibraryScreen["create"];
    onRemove: (index: number) => void;
  }
  let { picks = $bindable(), preview, onCreate, onRemove }: Props = $props();

  let name = $state("");
  let lecturer = $state("");
  let weeks = $state(1);
  let problems = $state<ComposeProblem[]>([]);
  let plan = $state<{ summary: string; notes: string[] } | null>(null);
  let failure = $state("");
  let busy = $state(false);

  // The course grows to hold the latest week a pick goes in.
  $effect(() => {
    const needed = weeksNeeded(picks);
    if (weeks < needed) weeks = needed;
  });
  const answers = () => ({ name, lecturer, weeks: Number(weeks) });
  const problemFor = (field: ComposeProblem["field"]) => problems.find((problem) => problem.field === field)?.message ?? "";

  async function seePlan(event: SubmitEvent) {
    event.preventDefault();
    failure = "";
    const planned = await preview(answers(), picks);
    if (planned.ok) {
      problems = [];
      plan = { summary: planned.summary, notes: planned.notes };
    } else {
      problems = planned.problems;
      plan = null;
    }
  }
  async function create() {
    busy = true;
    try {
      const made = await onCreate(answers(), picks);
      if (made !== null && "reason" in made) failure = made.reason;
    } finally {
      busy = false;
    }
  }
</script>

<section class="compose" aria-labelledby="compose-title">
  <h2 id="compose-title">Your new course</h2>
  {#if plan}
    <div class="plan" role="dialog" aria-modal="false" aria-labelledby="compose-plan-title">
      <h3 id="compose-plan-title">Before anything changes</h3>
      <p class="summary">{plan.summary}.</p>
      {#each plan.notes as note (note)}<p>{note}</p>{/each}
      {#if failure}<p class="problem" role="alert">{failure}</p>{/if}
      <div class="actions">
        <button class="primary" disabled={busy} onclick={create}>Create course</button>
        <button class="quiet" onclick={() => (plan = null)}>Change something</button>
      </div>
    </div>
  {:else}
    <form onsubmit={seePlan}>
      <label>
        Course name
        <input bind:value={name} aria-describedby="compose-name-problem" />
      </label>
      {#if problemFor("name")}<p id="compose-name-problem" class="problem">{problemFor("name")}</p>{/if}
      <label>
        Lecturer <span class="optional">(optional)</span>
        <input bind:value={lecturer} />
      </label>
      <label>
        Teaching weeks
        <input type="number" min="1" max="52" bind:value={weeks} aria-describedby="compose-weeks-problem" />
      </label>
      {#if problemFor("weeks")}<p id="compose-weeks-problem" class="problem">{problemFor("weeks")}</p>{/if}
      <ul class="picks" aria-label="What you picked">
        {#each picks as pick, index (index)}
          <li>
            <span class="name">{labelFor(pick.item.kind)}: {pick.item.title}</span>
            <span class="from">from {pick.course.title}</span>
            <label class="week">
              Goes in
              <select bind:value={pick.week}>
                <option value={0}>The module's own unit</option>
                {#each Array.from({ length: Math.max(weeks, 1) }, (_, n) => n + 1) as week (week)}<option value={week}>Week {week}</option>{/each}
              </select>
            </label>
            <button type="button" class="quiet" aria-label={`Take ${pick.item.title} out`} onclick={() => onRemove(index)}>Take out</button>
          </li>
        {/each}
      </ul>
      {#if problemFor("picks")}<p class="problem">{problemFor("picks")}</p>{/if}
      <p class="hint">Studio copies what you pick into the new course. The original stays as it is, and the two change separately.</p>
      <button class="primary" type="submit">See the plan</button>
    </form>
  {/if}
</section>

<style>
  .compose {
    margin-top: var(--space-6);
    padding-top: var(--space-6);
    border-top: 1px solid var(--ui-border);
  }
  h2 {
    margin: 0 0 var(--space-3);
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  h3 {
    margin: 0 0 var(--space-2);
    font-size: var(--font-body);
    font-weight: var(--weight-semibold);
  }
  form {
    display: grid;
    gap: var(--space-3);
  }
  label {
    display: grid;
    gap: var(--space-1);
    font-size: var(--font-label);
    color: var(--ui-ink);
  }
  .optional,
  .from,
  .hint {
    color: var(--ui-muted);
  }
  input,
  select {
    font: inherit;
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--ui-control-border);
    border-radius: var(--radius-control);
    background: var(--ui-surface);
    color: var(--ui-ink);
  }
  .picks {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  .picks li {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-1) var(--space-3);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-control);
  }
  .picks button {
    grid-column: 2;
    grid-row: 1 / span 3;
    align-self: center;
  }
  .name {
    font-weight: var(--weight-medium);
  }
  .from,
  .hint {
    font-size: var(--font-caption);
  }
  p {
    margin: 0 0 var(--space-2);
  }
  .problem {
    color: var(--ui-danger);
    font-size: var(--font-label);
  }
  .plan {
    padding: var(--space-4);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-control);
    background: var(--ui-raised);
  }
  .summary {
    font-weight: var(--weight-medium);
  }
  .actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-3);
  }
  button {
    min-height: 44px;
    font: inherit;
    cursor: pointer;
  }
  .primary {
    justify-self: start;
    font-size: var(--font-control);
    font-weight: var(--weight-medium);
    padding: var(--space-3) var(--space-5);
    border: none;
    border-radius: var(--radius-control);
    background: var(--ui-brand);
    color: var(--ui-on-brand);
  }
  .primary:hover {
    background: var(--ui-brand-hover);
  }
  .primary:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .quiet {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-label);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--ui-ink);
  }
  .quiet:hover {
    background: var(--ui-raised);
  }
</style>
