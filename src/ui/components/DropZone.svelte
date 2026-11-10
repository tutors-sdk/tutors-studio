<script lang="ts">
  import { untrack } from "svelte";
  import type { MaterialPlan } from "../../application/ports/authoring.ts";
  import type { DroppedFile } from "../../domain/material.ts";
  import type { Plan } from "../../domain/plan.ts";
  import { droppedFiles, fromFiles } from "../dropped-files.ts";

  interface Props {
    /** "topic" places everything in this topic; "course" places each file in the topic for its week. */
    scope: "topic" | "course";
    where: string;
    onPlan: (files: DroppedFile[]) => Promise<MaterialPlan>;
    onAccept: (plan: Plan) => void;
    /** Files brought from elsewhere (My files) to plan as if dropped here. */
    incoming?: DroppedFile[] | null;
    /** On the course: the weeks a file left in the tray can be put in, and putting it there (feature 5). */
    weeks?: { path: string; title: string }[];
    onPlace?: (week: string, file: DroppedFile) => void;
  }
  let { scope, where, onPlan, onAccept, incoming = null, weeks = [], onPlace }: Props = $props();
  /** Files dropped on a week go straight in, with "Put it back" to undo (ADR 0038); a drop on the course still shows its plan. */
  const straightIn = $derived(scope === "topic");
  /** What went straight in, shown beside anything left in the tray. */
  let added = $state<MaterialPlan["placed"]>([]);
  let lastFiles = $state.raw<DroppedFile[]>([]);
  $effect(() => {
    const files = incoming;
    if (files && files.length > 0) untrack(() => void propose(files));
  });

  let over = $state(false);
  let working = $state(false);
  let proposal = $state<MaterialPlan | null>(null);
  let picker: HTMLInputElement | undefined = $state();

  async function propose(files: DroppedFile[]) {
    if (files.length === 0) return;
    lastFiles = files;
    working = true;
    added = [];
    const planned = await onPlan(files);
    working = false;
    if (straightIn && planned.plan) {
      onAccept(planned.plan);
      added = planned.placed;
      // Only what couldn't be placed is left to show.
      proposal = planned.tray.length > 0 ? { ...planned, plan: null, placed: [] } : null;
      return;
    }
    proposal = planned;
  }

  async function drop(event: DragEvent) {
    event.preventDefault();
    over = false;
    if (event.dataTransfer) await propose(await droppedFiles(event.dataTransfer));
  }

  async function chose(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    await propose(await fromFiles([...(input.files ?? [])]));
    input.value = "";
  }

  function accept() {
    if (proposal?.plan) onAccept(proposal.plan);
    proposal = null;
  }
</script>

{#if proposal}
  <div class="plan" role="dialog" aria-modal="false" aria-labelledby="material-title">
    <h3 id="material-title">{proposal.plan ? "Before anything changes" : "Some files need a place"}</h3>
    {#if added.length > 0}
      <p>Added {added.length === 1 ? `"${added[0].title}"` : `${added.length} items`} to {where}.</p>
    {/if}
    {#if proposal.placed.length > 0}
      <p>
        Studio will add {proposal.placed.length === 1 ? "this" : `these ${proposal.placed.length}`} to {scope === "topic" ? where : "the course"}. Nothing already there is touched.
      </p>
      <ul class="placed">
        {#each proposal.placed as item (item.folder)}
          <li><span class="badge">{item.label}</span> {item.title} <span class="folder">{item.folder}</span></li>
        {/each}
      </ul>
    {:else if added.length === 0}
      <p>Studio can't place any of these files.</p>
    {/if}
    {#if proposal.tray.length > 0}
      <h4>Left in the tray</h4>
      <ul class="tray">
        {#each proposal.tray as file (file.path)}
          {@const bytes = lastFiles.find((candidate) => candidate.path === file.path)}
          <li>
            <strong>{file.path}</strong>
            {file.message}
            {#if onPlace && bytes && weeks.length > 0}
              <label class="place">
                Put it in
                <select
                  onchange={(event) => {
                    const week = (event.currentTarget as HTMLSelectElement).value;
                    if (week !== "") {
                      proposal = null;
                      onPlace(week, bytes);
                    }
                  }}
                >
                  <option value="">Choose a week</option>
                  {#each weeks as week (week.path)}<option value={week.path}>{week.title}</option>{/each}
                </select>
              </label>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
    <div class="actions">
      {#if proposal.plan}<button class="primary" onclick={accept}>Add {proposal.placed.length === 1 ? "it" : "them"}</button>{/if}
      <button class="quiet" onclick={() => (proposal = null)}>{proposal.plan ? "Cancel" : "Close"}</button>
    </div>
  </div>
{:else}
  <div
    class="zone"
    class:over
    role="region"
    aria-label={scope === "topic" ? `Add material to ${where}` : "Add your material to the course"}
    ondragenter={(event) => {
      event.preventDefault();
      over = true;
    }}
    ondragover={(event) => event.preventDefault()}
    ondragleave={() => (over = false)}
    ondrop={drop}
  >
    <p>
      {#if working}Reading the files…
      {:else if scope === "topic"}Drop slides, notes, labs or links here to add them to {where}.
      {:else}Drop your existing material here. Studio sorts it into weeks using the week number in each name.{/if}
    </p>
    <button class="quiet" onclick={() => picker?.click()}>Choose material</button>
    <input bind:this={picker} type="file" multiple hidden onchange={chose} />
  </div>
{/if}

<style>
  .place {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    margin-left: var(--space-2);
    font-size: var(--font-label);
    color: var(--ui-muted);
  }
  .place select {
    font: inherit;
    min-height: 32px;
  }
  .zone {
    margin-top: var(--space-6);
    padding: var(--space-5);
    border: 1px dashed var(--ui-control-border);
    border-radius: var(--radius-card);
    display: flex;
    gap: var(--space-4);
    align-items: center;
    justify-content: space-between;
    color: var(--ui-muted);
  }
  .zone.over {
    border-color: var(--ui-brand);
    background: var(--ui-raised);
  }
  .zone p {
    margin: 0;
  }
  .plan {
    margin-top: var(--space-6);
    padding: var(--space-5);
    border: 1px solid var(--ui-brand);
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
    font-size: var(--font-label);
    font-weight: var(--weight-semibold);
  }
  p {
    margin: 0;
  }
  ul {
    margin: var(--space-3) 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: var(--space-2);
  }
  .tray li {
    font-size: var(--font-label);
  }
  .badge {
    font-size: var(--font-caption);
    color: var(--ui-muted);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-control);
    padding: 0 var(--space-1);
  }
  .folder {
    color: var(--ui-muted);
    font-size: var(--font-caption);
  }
  .actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-4);
  }
  .primary,
  .quiet {
    font: inherit;
    font-size: var(--font-control);
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
    flex-shrink: 0;
  }
</style>
