<script lang="ts">
  import { UNSAVED_WORDS } from "../../domain/plain-writing.ts";

  /** Asked before an editor closes with words not yet saved (STU-0216): nothing is thrown away unasked. */
  interface Props {
    onSave: () => void;
    onDiscard: () => void;
    onKeep: () => void;
  }
  let { onSave, onDiscard, onKeep }: Props = $props();
</script>

<div class="leave" role="alertdialog" aria-labelledby="leave-words">
  <p id="leave-words">{UNSAVED_WORDS}</p>
  <div class="actions">
    <button class="primary" onclick={onSave}>Save first</button>
    <button class="quiet" onclick={onDiscard}>Close without saving</button>
    <button class="quiet" onclick={onKeep}>Keep writing</button>
  </div>
</div>

<style>
  .leave {
    padding: var(--space-4);
    border: 1px solid var(--ui-warning);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
  }
  p {
    margin: 0 0 var(--space-3);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  button {
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
    cursor: pointer;
  }
  .quiet {
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
  }
  .primary {
    border: none;
    background: var(--ui-brand);
    color: var(--ui-on-brand);
  }
  .primary:hover {
    background: var(--ui-brand-hover);
  }
</style>
