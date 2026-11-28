<script lang="ts">
  import { ADVANCED_SHOWN } from "../../domain/workspace.ts";

  /** Shown only in Advanced mode, so its first line says that mode is on, on every screen (STU-0308). */
  let { rulesVersion, assistantName, onSettings }: { rulesVersion: string; assistantName: string; onSettings?: () => void } = $props();
</script>

<footer class="status">
  <span class="advanced">
    <strong>{ADVANCED_SHOWN}</strong>
    {#if onSettings}<button class="link" onclick={onSettings}>Turn it off in Settings</button>{/if}
  </span>
  <span>Course rules {rulesVersion}</span>
  <span>Assistant: {assistantName}</span>
</footer>

<style>
  .status {
    grid-column: 1 / -1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-4);
    padding: 0 var(--space-4);
    border-top: 1px solid var(--ui-border);
    background: var(--ui-surface);
    color: var(--ui-muted);
    font-size: var(--font-caption);
  }
  .advanced {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .advanced strong {
    color: var(--ui-ink);
    font-weight: var(--weight-semibold);
  }
  .link {
    padding: 0;
    font: inherit;
    border: none;
    background: none;
    color: var(--ui-muted);
    text-decoration: underline;
    cursor: pointer;
  }
</style>
