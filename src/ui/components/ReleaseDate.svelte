<script lang="ts">
  import { readableDate } from "../../domain/term.ts";

  interface Props {
    /** "week" or "unit", in the lecturer's words. */
    kindWord: string;
    /** The day it is released now, if it has one. */
    release: string | null;
    /** Asks for the plan that keeps it hidden until a day, or takes the day away (STU-0197). */
    onSave: (date: string | null) => void;
  }
  let { kindWord, release, onSave }: Props = $props();

  let date = $state("");
  $effect(() => {
    date = release ?? "";
  });
</script>

<form
  class="release"
  onsubmit={(event) => {
    event.preventDefault();
    if (date !== "") onSave(date);
  }}
>
  <label>
    Students see this {kindWord} from
    <input type="date" bind:value={date} />
    <span class="hint"
      >{release === null ? `Optional. Studio hides the ${kindWord} until this day, then offers to publish it on the course home.` : `Hidden until ${readableDate(release)}.`}</span
    >
  </label>
  <div class="actions">
    <button class="quiet" type="submit" disabled={date === "" || date === release}>Keep it hidden until then</button>
    {#if release !== null}<button class="quiet" type="button" onclick={() => onSave(null)}>Take the date away</button>{/if}
  </div>
</form>

<style>
  .release {
    margin: var(--space-6) 0 0;
    padding: var(--space-5);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
    display: grid;
    gap: var(--space-3);
  }
  label {
    display: grid;
    gap: var(--space-1);
    font-weight: var(--weight-semibold);
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
    justify-self: start;
  }
  .hint {
    font-weight: var(--weight-regular);
    font-size: var(--font-label);
    color: var(--ui-muted);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
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
