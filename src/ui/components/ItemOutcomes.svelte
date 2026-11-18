<script lang="ts">
  import type { Outcome } from "../../domain/outcomes.ts";

  interface Props {
    /** The course's outcomes; the panel shows only when it has some. */
    outcomes: Outcome[];
    /** The ones this item names now. */
    tagged: string[];
    /** What serving one means for this kind: taught, practised or assessed. */
    serves: string;
    /** Asks for the plan that writes the one line; nothing changes until it is accepted (STU-0188). */
    onSave: (ids: string[]) => void;
  }
  let { outcomes, tagged, serves, onSave }: Props = $props();

  let chosen = $state<string[]>([]);
  $effect(() => {
    chosen = [...tagged];
  });
  const changed = $derived(chosen.length !== tagged.length || chosen.some((id) => !tagged.includes(id)));
</script>

<fieldset class="item-outcomes">
  <legend>Outcomes this {serves}</legend>
  {#each outcomes as outcome (outcome.id)}
    <label><input type="checkbox" value={outcome.id} bind:group={chosen} /> {outcome.text}</label>
  {/each}
  <div class="actions">
    <button class="quiet" disabled={!changed} onclick={() => onSave(outcomes.map((outcome) => outcome.id).filter((id) => chosen.includes(id)))}>Save outcomes</button>
  </div>
</fieldset>

<style>
  .item-outcomes {
    margin: var(--space-6) 0 0;
    padding: var(--space-5);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
    display: grid;
    gap: var(--space-2);
  }
  legend {
    padding: 0 var(--space-2);
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  label {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    min-height: 44px;
  }
  input {
    width: 20px;
    height: 20px;
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
