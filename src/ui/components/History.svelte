<script lang="ts">
  import type { HistoryEntry, UndoPlan } from "../../application/ports/authoring.ts";
  import type { Plan } from "../../domain/plan.ts";

  interface Props {
    entries: HistoryEntry[];
    /** The plan that puts a change back; nothing is written until it is accepted. */
    onPlanUndo: (id: string) => Promise<UndoPlan>;
    onAccept: (plan: Plan) => Promise<void>;
    showFileNames: boolean;
    onClose: () => void;
  }
  let { entries, onPlanUndo, onAccept, showFileNames, onClose }: Props = $props();

  let proposal = $state<{ id: string; result: UndoPlan } | null>(null);
  const time = (at: string) => new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  async function propose(id: string) {
    proposal = { id, result: await onPlanUndo(id) };
  }
  async function accept(plan: Plan) {
    proposal = null;
    await onAccept(plan);
  }
  const line = (op: Plan["ops"][number]) => (op.op === "move" ? `${op.from} → ${op.to}` : op.path);
</script>

<section class="history" aria-labelledby="history-title">
  <p class="eyebrow">Changes</p>
  <h2 id="history-title">What Studio changed since you opened this course</h2>
  {#if entries.length === 0}
    <p class="empty">Nothing yet. Every change Studio makes is listed here, and each can be put back.</p>
  {:else}
    <ol>
      {#each entries as entry (entry.id)}
        <li class:undone={entry.undone}>
          <span class="when">{time(entry.at)}</span>
          <span class="what">{entry.summary}{entry.undone ? " (put back)" : ""}</span>
          {#if !entry.undone}
            <button class="quiet" onclick={() => propose(entry.id)} aria-label={`Put back: ${entry.summary}`}>Put back</button>
          {/if}
          {#if proposal?.id === entry.id}
            {#if proposal.result.ok}
              {@const plan = proposal.result.plan}
              <div class="plan" role="dialog" aria-modal="false" aria-labelledby="undo-title">
                <h3 id="undo-title">Before anything changes</h3>
                <p>{plan.summary}. Anything this change added goes to the bin in the course folder, where students never see it; nothing is deleted.</p>
                {#if showFileNames}
                  <ul class="files">
                    {#each plan.ops as op, i (i)}<li><code>{line(op)}</code></li>{/each}
                  </ul>
                {/if}
                <div class="actions">
                  <button class="primary" onclick={() => accept(plan)}>Put it back</button>
                  <button class="quiet" onclick={() => (proposal = null)}>Cancel</button>
                </div>
              </div>
            {:else}
              <p class="problem" role="status">{proposal.result.message}</p>
            {/if}
          {/if}
        </li>
      {/each}
    </ol>
  {/if}
  <div class="actions"><button class="quiet" onclick={onClose}>Close</button></div>
</section>

<style>
  .history {
    display: grid;
    gap: var(--space-4);
    max-width: 48rem;
  }
  .eyebrow {
    margin: 0;
    font-size: var(--font-label);
    color: var(--ui-muted);
  }
  h2 {
    margin: 0;
    font-size: var(--font-title);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
  }
  h3 {
    margin: 0;
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  p {
    margin: 0;
  }
  .empty {
    color: var(--ui-muted);
  }
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: var(--space-2);
  }
  li {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: var(--space-2) var(--space-4);
    align-items: center;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
  }
  li.undone .what {
    color: var(--ui-muted);
  }
  .when {
    font-size: var(--font-caption);
    color: var(--ui-muted);
    font-variant-numeric: tabular-nums;
  }
  .plan,
  .problem {
    grid-column: 1 / -1;
  }
  .plan {
    padding: var(--space-4);
    border: 1px solid var(--ui-brand);
    border-radius: var(--radius-card);
    display: grid;
    gap: var(--space-3);
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
