<script lang="ts">
  import type { ItemPlan } from "../../application/ports/authoring.ts";
  import { visibleKinds } from "../../domain/plain-names.ts";
  import type { Plan } from "../../domain/plan.ts";

  interface Props {
    /** Where the folder sits: in a week it can be a lecture, lab or reading; in the course or a unit, a week. */
    scope: "week" | "course";
    name: string;
    onPlan: (word: string) => Promise<ItemPlan>;
    onAccept: (plan: Plan) => void;
    /** Advanced mode: show the files Studio moves and adds. */
    showFileNames?: boolean;
  }
  let { scope, name, onPlan, onAccept, showFileNames = false }: Props = $props();

  const words = $derived(visibleKinds(scope));
  let word = $state<string | undefined>(undefined);
  let proposal = $state<ItemPlan | null>(null);
  const chosen = $derived(words.find((plain) => plain.word === word) ?? words[0]);

  async function propose(event: SubmitEvent) {
    event.preventDefault();
    proposal = await onPlan(chosen.word);
  }
  function accept() {
    if (proposal?.ok) onAccept(proposal.plan);
    proposal = null;
  }
  const changes = (plan: Plan) => plan.ops.map((op) => (op.op === "write" ? `Add ${op.path}` : `Move ${op.from} to ${op.to}`));
  const added = (plan: Plan) => plan.ops.filter((op) => op.op === "write").length;
  const numbered = (plan: Plan) => plan.ops.length - added(plan) - 1;
</script>

{#if proposal?.ok}
  <div class="plan" role="dialog" aria-modal="false" aria-labelledby="visible-title">
    <h3 id="visible-title">Before anything changes</h3>
    <p>
      Studio will make "{name}" a {chosen.word.toLowerCase()} students see. Everything in it stays{#if numbered(proposal.plan) > 0}, and its {numbered(proposal.plan) === 1
          ? "page becomes step 1"
          : `${numbered(proposal.plan)} pages become steps, in name order`}{/if}{#if added(proposal.plan) > 0}; Studio adds {added(proposal.plan) === 1 ? "the page" : "the pages"} a
        {chosen.word.toLowerCase()} needs{/if}.
    </p>
    {#if showFileNames}
      <ul class="files">
        {#each changes(proposal.plan) as change (change)}<li><code>{change}</code></li>{/each}
      </ul>
    {/if}
    <div class="actions">
      <button class="primary" onclick={accept}>Make it visible</button>
      <button class="quiet" onclick={() => (proposal = null)}>Cancel</button>
    </div>
  </div>
{:else}
  <form class="visible" onsubmit={propose} aria-labelledby="visible-heading">
    <h3 id="visible-heading">Let students see this</h3>
    <p>Tutors leaves this folder out because its name doesn't say what it is. Say what it is, and Studio names it so Tutors shows it.</p>
    <div class="fields">
      {#if words.length > 1}
        <label>
          It's a
          <select bind:value={word} onchange={() => (proposal = null)}>
            {#each words as plain (plain.word)}<option value={plain.word}>{plain.word}</option>{/each}
          </select>
        </label>
      {/if}
    </div>
    {#if proposal && !proposal.ok}<p class="problem" role="alert">{proposal.message}</p>{/if}
    <div class="actions">
      <button class="quiet" type="submit">Make it a {chosen.word.toLowerCase()}</button>
      {#if showFileNames}<span class="hint">Tutors reads it as a {chosen.kind}- folder.</span>{/if}
    </div>
  </form>
{/if}

<style>
  .visible,
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
    flex: 0 1 14rem;
  }
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
