<script lang="ts">
  import type { ReadyUpdate, StudioUpdates } from "../../application/use-cases/updates.ts";

  interface Props {
    updates: StudioUpdates;
  }
  let { updates }: Props = $props();

  let ready = $state<ReadyUpdate | null>(null);
  let busy = $state(false);
  let progress = $state(0);
  let problem = $state("");

  // When Studio opens: at most once a day, ask for the latest version; nothing is downloaded (STU-0179, STU-0180).
  $effect(() => {
    void updates.opening().then((found) => (ready = found));
  });

  async function updateNow() {
    busy = true;
    problem = "";
    const result = await updates.accept((fraction) => (progress = fraction));
    // On success Studio restarts, so only a failure is ever shown.
    busy = false;
    if (!result.ok) {
      problem = result.reason;
      if (result.discarded) ready = null;
    }
  }
</script>

{#if ready !== null || problem !== ""}
  <section class="ready" aria-label="A newer Studio">
    {#if ready !== null}<p role="status">{ready.words}</p>{/if}
    {#if busy}<p role="status">Downloading… {Math.round(progress * 100)}%</p>{/if}
    {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
    <div class="actions">
      {#if ready !== null}
        <button class="primary" disabled={busy} onclick={updateNow}>Update now</button>
        <button class="quiet" disabled={busy} onclick={() => (ready = null)}>Later</button>
      {:else}
        <button class="quiet" onclick={() => (problem = "")}>Close</button>
      {/if}
    </div>
  </section>
{/if}

<style>
  .ready {
    position: fixed;
    top: var(--space-4);
    right: var(--space-4);
    z-index: 10;
    max-width: 360px;
    display: grid;
    gap: var(--space-3);
    padding: var(--space-4);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
  }
  p {
    margin: 0;
  }
  .problem {
    color: var(--ui-danger);
  }
  .actions {
    display: flex;
    gap: var(--space-3);
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
  .quiet {
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
  }
  .primary:disabled,
  .quiet:disabled {
    cursor: default;
    opacity: 0.6;
  }
</style>
