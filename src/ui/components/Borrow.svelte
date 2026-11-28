<script lang="ts">
  import { borrowPlaces, type BorrowPick } from "../../domain/borrow.ts";
  import { labelFor } from "../../domain/course-map.ts";
  import type { Plan } from "../../domain/plan.ts";
  import type { LibraryInto } from "../app-props.ts";

  interface Props {
    /** What the lecturer picked so far, in the order picked; where each goes can be changed here. */
    picks: BorrowPick[];
    into: LibraryInto;
    onRemove: (index: number) => void;
    /** Heard once the plan is applied: the lecturer goes back to the course. */
    onDone: () => void;
  }
  let { picks = $bindable(), into, onRemove, onDone }: Props = $props();

  let problems = $state<string[]>([]);
  let plan = $state<{ plan: Plan; notes: string[] } | null>(null);
  let failure = $state("");
  let busy = $state(false);

  async function seePlan(event: SubmitEvent) {
    event.preventDefault();
    failure = "";
    const planned = await into.plan(picks);
    if (planned.ok) {
      problems = [];
      plan = { plan: planned.plan, notes: planned.notes };
    } else {
      problems = planned.problems;
      plan = null;
    }
  }
  async function accept() {
    if (plan === null) return;
    busy = true;
    try {
      if (await into.accept(plan.plan)) onDone();
      else failure = "Nothing was copied: the course changed while you were choosing. See the plan again.";
    } finally {
      busy = false;
    }
  }
</script>

<section class="borrow" aria-labelledby="borrow-title">
  <h2 id="borrow-title">Add to {into.name}</h2>
  {#if plan}
    <div class="plan" role="dialog" aria-modal="false" aria-labelledby="borrow-plan-title">
      <h3 id="borrow-plan-title">Before anything changes</h3>
      <p class="summary">{plan.plan.summary}.</p>
      {#each plan.notes as note (note)}<p>{note}</p>{/each}
      {#if failure}<p class="problem" role="alert">{failure}</p>{/if}
      <div class="actions">
        <button class="primary" disabled={busy} onclick={accept}>Make this change</button>
        <button class="quiet" onclick={() => (plan = null)}>Change something</button>
      </div>
    </div>
  {:else}
    <form onsubmit={seePlan}>
      <ul class="picks" aria-label="What you picked">
        {#each picks as pick, index (index)}
          <li>
            <span class="name">{labelFor(pick.item.kind)}: {pick.item.title}</span>
            <span class="from">from {pick.course.title}</span>
            <label class="week">
              Goes in
              <select bind:value={pick.into}>
                {#each borrowPlaces(into.map, pick.item.kind) as place (place.folder)}<option value={place.folder}>{place.label}</option>{/each}
              </select>
            </label>
            <button type="button" class="quiet" aria-label={`Take ${pick.item.title} out`} onclick={() => onRemove(index)}>Take out</button>
          </li>
        {/each}
      </ul>
      {#each problems as problem (problem)}<p class="problem">{problem}</p>{/each}
      <p class="hint">Studio copies what you pick into this course's folder, numbered as Tutors reads it. The original stays as it is, and the two change separately.</p>
      <button class="primary" type="submit">See the plan</button>
    </form>
  {/if}
</section>

<style>
  .borrow {
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
  .from,
  .hint {
    color: var(--ui-muted);
  }
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
