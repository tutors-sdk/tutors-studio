<script lang="ts">
  import type { ItemPlan } from "../../application/ports/authoring.ts";
  import { plainKinds } from "../../domain/plain-names.ts";
  import type { Plan } from "../../domain/plan.ts";

  interface Props {
    /** "week" adds lectures, labs and the rest to this week; "course" adds a week. */
    scope: "week" | "course";
    where: string;
    onPlan: (word: string, title: string, address: string) => Promise<ItemPlan>;
    onAccept: (plan: Plan) => void;
    /** Advanced mode: show the folder and files Tutors reads. */
    showFileNames?: boolean;
  }
  let { scope, where, onPlan, onAccept, showFileNames = false }: Props = $props();

  const words = $derived(plainKinds.filter((plain) => plain.goesIn === scope));
  let word = $state<string | undefined>(undefined);
  let title = $state("");
  let address = $state("");
  let proposal = $state<ItemPlan | null>(null);
  const chosen = $derived(words.find((plain) => plain.word === word) ?? words[0]);
  const needsAddress = $derived(chosen.address !== "none");

  async function propose(event: SubmitEvent) {
    event.preventDefault();
    proposal = await onPlan(chosen.word, title, needsAddress ? address : "");
  }
  function accept() {
    if (proposal?.ok) onAccept(proposal.plan);
    proposal = null;
    title = "";
    address = "";
  }
  const files = (plan: Plan) => plan.ops.flatMap((op) => (op.op === "write" ? [op.path] : []));
</script>

{#if proposal?.ok}
  <div class="plan" role="dialog" aria-modal="false" aria-labelledby="add-title">
    <h3 id="add-title">Before anything changes</h3>
    <p>Studio will add the {chosen.word.toLowerCase()} "{title.trim()}" to {where}. Nothing already there is touched.</p>
    {#if showFileNames}
      <ul class="files">
        {#each files(proposal.plan) as file (file)}<li><code>{file}</code></li>{/each}
      </ul>
    {/if}
    <div class="actions">
      <button class="primary" onclick={accept}>Add it</button>
      <button class="quiet" onclick={() => (proposal = null)}>Cancel</button>
    </div>
  </div>
{:else}
  <form class="add" onsubmit={propose} aria-labelledby="add-heading">
    <h3 id="add-heading">{scope === "week" ? "Add to this week" : "Add a week"}</h3>
    <div class="fields">
      {#if words.length > 1}
        <label>
          What it is
          <select bind:value={word} onchange={() => (proposal = null)}>
            {#each words as plain (plain.word)}<option value={plain.word}>{plain.word}</option>{/each}
          </select>
        </label>
      {/if}
      <label>
        Title students see
        <input bind:value={title} placeholder={scope === "week" ? "CSS grid" : "Week 5: Layout"} />
      </label>
      {#if needsAddress}
        <label>
          {chosen.address === "github" ? "Address on GitHub" : chosen.address === "video" ? "The video's address" : "Web address"}
          <input
            bind:value={address}
            inputmode="url"
            placeholder={chosen.address === "github" ? "https://github.com/your-org/starter" : chosen.address === "video" ? "https://youtu.be/…" : "https://"}
          />
        </label>
      {/if}
    </div>
    {#if proposal && !proposal.ok}<p class="problem" role="alert">{proposal.message}</p>{/if}
    <div class="actions">
      <button class="quiet" type="submit">Add {scope === "week" ? `the ${chosen.word.toLowerCase()}` : "the week"}</button>
      {#if showFileNames}<span class="hint">Tutors reads it as a {chosen.kind}- folder.</span>{/if}
    </div>
  </form>
{/if}

<style>
  .add,
  .plan {
    margin-top: var(--space-6);
    padding: var(--space-5);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
    display: grid;
    gap: var(--space-3);
  }
  .plan {
    border-color: var(--ui-brand);
  }
  h3 {
    margin: 0;
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  p {
    margin: 0;
  }
  .fields {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }
  label {
    display: grid;
    gap: var(--space-1);
    font-size: var(--font-label);
    color: var(--ui-muted);
    flex: 1 1 12rem;
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
  .problem {
    font-size: var(--font-label);
    color: var(--ui-danger);
  }
  .files {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: var(--space-1);
    font-size: var(--font-caption);
    overflow-wrap: anywhere;
  }
  .hint {
    font-size: var(--font-caption);
    color: var(--ui-muted);
  }
  .actions {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    flex-wrap: wrap;
  }
  .primary,
  .quiet {
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
