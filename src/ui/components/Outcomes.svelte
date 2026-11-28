<script lang="ts">
  import { BLOOM_LEVELS, cellWords, OUTCOME_START, type Coverage, type Outcome, type OutcomeDraft } from "../../domain/outcomes.ts";

  interface Props {
    outcomes: Outcome[];
    /** The coverage map, or null for a course with no outcomes (STU-0192). */
    coverage: Coverage | null;
    /** Asks for the plan that writes them; nothing changes until it is accepted (STU-0187). */
    onSave: (drafts: OutcomeDraft[]) => void;
    /** With an assistant chosen: outcomes suggested from the module description, as a plan (STU-0194). */
    suggest?: { name: string; asking: boolean; onSuggest: (description: string) => void };
  }
  let { outcomes, coverage, onSave, suggest }: Props = $props();
  let description = $state("");

  let drafts = $state<OutcomeDraft[]>([]);
  $effect(() => {
    drafts = outcomes.map((outcome) => ({ ...outcome }));
  });
  const changed = $derived(
    drafts.length !== outcomes.length ||
      drafts.some((draft, index) => draft.text.trim() !== outcomes[index].text || draft.level !== outcomes[index].level || draft.id !== outcomes[index].id),
  );

  function save(event: SubmitEvent) {
    event.preventDefault();
    if (changed) onSave(drafts.filter((draft) => draft.text.trim() !== "" || draft.id !== undefined));
  }
</script>

<form class="outcomes" aria-labelledby="outcomes-title" onsubmit={save}>
  <h3 id="outcomes-title">What students can do</h3>
  <p class="hint">
    The course's learning outcomes, each with how deeply students should know it. Tag a lecture, lab or quiz with the ones it serves, and the map below shows where each is taught,
    practised and assessed.
  </p>
  {#if drafts.length > 0}
    <ol class="list">
      {#each drafts as draft, index (index)}
        <li>
          <span class="id">{draft.id ?? "New"}</span>
          <label class="text">
            <span class="visually-hidden">Outcome {index + 1}</span>
            <input bind:value={draft.text} placeholder={`${OUTCOME_START} explain how a web page is built`} />
          </label>
          <label class="level">
            <span class="visually-hidden">Level for outcome {index + 1}</span>
            <select bind:value={draft.level}>
              {#each BLOOM_LEVELS as level (level)}<option value={level}>{level}</option>{/each}
            </select>
          </label>
          <button type="button" class="quiet" aria-label={`Remove outcome ${index + 1}`} onclick={() => drafts.splice(index, 1)}>Remove</button>
        </li>
      {/each}
    </ol>
  {/if}
  <div class="actions">
    <button type="button" class="quiet" onclick={() => drafts.push({ text: `${OUTCOME_START} `, level: "Understand" })}>Add an outcome</button>
    <button class="quiet" type="submit" disabled={!changed}>Save outcomes</button>
  </div>

  {#if suggest}
    <details class="suggest">
      <summary>Suggest outcomes from my module description</summary>
      <label>
        Your module description
        <textarea bind:value={description} rows="5" placeholder="Paste the description from your module catalogue"></textarea>
      </label>
      {#if suggest.asking}
        <p class="hint" role="status">Asking {suggest.name}…</p>
      {:else}
        <div class="actions">
          <button type="button" class="quiet" disabled={description.trim() === ""} onclick={() => suggest.onSuggest(description)}>Ask your AI agent to suggest outcomes</button>
        </div>
      {/if}
    </details>
  {/if}

  {#if coverage}
    <h4>Where the course serves each</h4>
    <div class="map" role="region" aria-label="Coverage map">
      <table>
        <thead>
          <tr>
            <th scope="col">Outcome</th>
            {#each coverage.weeks as week (week.path)}
              <th scope="col"
                >{week.title}{#if week.flag}<span class="flag">{week.flag}</span>{/if}</th
              >
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each coverage.rows as row (row.outcome.id)}
            <tr>
              <th scope="row">
                {row.outcome.text} <span class="level-word">({row.outcome.level})</span>
                {#each row.flags as flag (flag)}<span class="flag">{flag}</span>{/each}
              </th>
              {#each row.cells as cell, index (index)}<td>{cellWords(cell)}</td>{/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#each coverage.unknown as unknown (unknown.id)}
      <p class="flag">{unknown.id} is named by {unknown.items.join(", ")} but is not one of the course's outcomes.</p>
    {/each}
  {/if}
</form>

<style>
  .outcomes {
    margin-top: var(--space-6);
    padding: var(--space-5);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
    display: grid;
    gap: var(--space-3);
  }
  h3,
  h4 {
    margin: 0;
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  h4 {
    font-size: var(--font-body);
  }
  .hint {
    margin: 0;
    font-size: var(--font-label);
    color: var(--ui-muted);
  }
  .list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: var(--space-2);
  }
  .list li {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    gap: var(--space-2);
    align-items: center;
  }
  .id,
  .level-word {
    font-size: var(--font-label);
    color: var(--ui-muted);
  }
  textarea {
    font: inherit;
    font-size: var(--font-control);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--ui-control-border);
    border-radius: var(--radius-control);
    background: var(--ui-surface);
    color: var(--ui-ink);
  }
  .suggest label {
    display: grid;
    gap: var(--space-1);
    margin-top: var(--space-2);
    font-size: var(--font-label);
    color: var(--ui-muted);
  }
  .suggest summary {
    cursor: pointer;
    min-height: 44px;
    display: flex;
    align-items: center;
  }
  input,
  select {
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--ui-control-border);
    border-radius: var(--radius-control);
    background: var(--ui-surface);
    color: var(--ui-ink);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
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
  .map {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    font-size: var(--font-label);
  }
  th,
  td {
    padding: var(--space-2);
    border: 1px solid var(--ui-border);
    text-align: left;
    vertical-align: top;
  }
  thead th {
    font-weight: var(--weight-semibold);
  }
  tbody th {
    font-weight: normal;
    min-width: 16rem;
  }
  .flag {
    display: block;
    font-size: var(--font-caption);
    color: var(--ui-warning);
  }
  p.flag {
    margin: 0;
    font-size: var(--font-label);
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
