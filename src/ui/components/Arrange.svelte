<script lang="ts">
  import type { ArrangeAction } from "../../domain/arrange.ts";

  interface Props {
    /** The item being arranged: its path, title and kind. */
    item: { path: string; title: string; kind: string | null };
    /** The folders it could move to, by title; course-rules refuses one Tutors wouldn't show it in. */
    places: { path: string; title: string }[];
    onArrange: (action: ArrangeAction) => void;
  }
  let { item, places, onArrange }: Props = $props();

  let title = $state("");
  let into = $state<string | null>(null);
  const topLevel = $derived(!item.path.includes("/"));
  const parent = $derived(item.path.includes("/") ? item.path.slice(0, item.path.lastIndexOf("/")) : "");
  const elsewhere = $derived(places.filter((place) => place.path !== parent && place.path !== item.path && !place.path.startsWith(`${item.path}/`)));

  function retitle(event: SubmitEvent) {
    event.preventDefault();
    if (title.trim() !== "") onArrange({ action: "retitle", item: item.path, title });
  }
  function move(event: SubmitEvent) {
    event.preventDefault();
    if (into !== null) onArrange({ action: "move", item: item.path, into });
  }
</script>

<section class="arrange" aria-labelledby="arrange-title">
  <h3 id="arrange-title">Change this {item.kind === "topic" ? "week" : "item"}</h3>
  <form onsubmit={retitle}>
    <label>
      New title
      <input bind:value={title} placeholder={item.title} />
    </label>
    <button class="quiet" type="submit" disabled={title.trim() === ""}>Rename</button>
  </form>
  {#if elsewhere.length > 0}
    <form onsubmit={move}>
      <label>
        Move to
        <select bind:value={into}>
          <option value={null} disabled>Choose where</option>
          {#each elsewhere as place (place.path)}<option value={place.path}>{place.title}</option>{/each}
        </select>
      </label>
      <button class="quiet" type="submit" disabled={into === null}>Move</button>
    </form>
  {/if}
  <div class="actions">
    {#if topLevel}
      <button class="quiet" onclick={() => onArrange({ action: "hide", item: item.path, hidden: true })}>Hide from students</button>
      <button class="quiet" onclick={() => onArrange({ action: "hide", item: item.path, hidden: false })}>Show to students again</button>
    {/if}
    <button class="quiet" onclick={() => onArrange({ action: "remove", item: item.path })}>Remove to the bin</button>
  </div>
  <p class="hint">Each change shows its plan first. A removed item goes to the bin in the course folder, where students never see it, and can be put back from Changes.</p>
</section>

<style>
  .arrange {
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
  form,
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: end;
  }
  label {
    display: grid;
    gap: var(--space-1);
    font-size: var(--font-label);
    color: var(--ui-muted);
    flex: 1 1 14rem;
  }
  input,
  select {
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
    margin: 0;
    font-size: var(--font-caption);
    color: var(--ui-muted);
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
