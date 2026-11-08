<script lang="ts">
  let { rulesVersion, assistantName }: { rulesVersion: string; assistantName: string } = $props();
</script>

<footer class="status">
  <span>Course rules {rulesVersion}</span>
  <span>Assistant: {assistantName}</span>
</footer>

<style>
  .status {
    grid-column: 1 / -1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 var(--space-4);
    border-top: 1px solid var(--ui-border);
    background: var(--ui-surface);
    color: var(--ui-muted);
    font-size: var(--font-caption);
  }
</style>
