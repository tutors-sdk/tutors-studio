<script lang="ts">
  import { dueWords, readableDate, termWords, type Term } from "../../domain/term.ts";

  interface Props {
    term: Term;
    /** Today, for what a due week says. */
    today: string;
    /** Asks for the plan that shows a due week to students (STU-0198); nothing changes until it is accepted. */
    onShowDue: (folder: string) => void;
  }
  let { term, today, onShowDue }: Props = $props();
  const later = $derived(term.hidden.filter((place) => !term.due.some((due) => due.path === place.path)));
</script>

<section class="term" aria-labelledby="term-title">
  <h3 id="term-title">This term</h3>
  <p class="now">{termWords(term)}</p>
  {#each term.due as place, index (place.path)}
    <div class="due">
      <p>{dueWords(place.title, place.release ?? today, today)}</p>
      <button class={index === 0 ? "primary" : "quiet"} onclick={() => onShowDue(place.path)}>Show {place.title} to students</button>
    </div>
  {/each}
  {#if later.length > 0}
    <h4>Hidden from students</h4>
    <ul>
      {#each later as place (place.path)}
        <li>{place.title}{place.release === null ? "" : `, due out ${readableDate(place.release)}`}</li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .term {
    margin: var(--space-4) 0 var(--space-6);
    padding: var(--space-5);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
  }
  h3 {
    margin: 0 0 var(--space-2);
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  h4 {
    margin: var(--space-4) 0 var(--space-2);
    font-size: var(--font-body);
    font-weight: var(--weight-semibold);
  }
  .now {
    margin: 0;
  }
  .due {
    margin-top: var(--space-4);
    display: grid;
    gap: var(--space-2);
    justify-items: start;
  }
  .due p {
    margin: 0;
  }
  ul {
    margin: 0;
    padding-left: var(--space-5);
  }
  button {
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
    cursor: pointer;
  }
  .primary {
    border: none;
    background: var(--ui-brand);
    color: var(--ui-on-brand);
  }
  .primary:hover {
    background: var(--ui-brand-hover);
  }
  .quiet {
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
  }
</style>
