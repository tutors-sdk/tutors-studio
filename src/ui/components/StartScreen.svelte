<script lang="ts">
  let { onOpen }: { onOpen: () => void } = $props();
</script>

<main class="start">
  <div class="panel">
    <h1>Tutors Studio</h1>
    <p>See your course the way Tutors will publish it, and fix what's missing before your students notice.</p>
    <button class="primary" onclick={onOpen}>Open a course folder</button>
    <p class="hint">Starting a new course from three questions arrives in the next release.</p>
  </div>
</main>

<style>
  .start {
    display: grid;
    place-items: center;
    padding: var(--space-8);
  }
  .panel {
    max-width: 480px;
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-panel);
    padding: var(--space-10);
  }
  h1 {
    margin: 0 0 var(--space-3);
    font-size: var(--font-heading);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
  }
  p {
    margin: 0 0 var(--space-6);
    color: var(--ui-muted);
  }
  .hint {
    margin: var(--space-6) 0 0;
    font-size: var(--font-label);
  }
  .primary {
    font: inherit;
    font-size: var(--font-control);
    font-weight: var(--weight-medium);
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-control);
    border: none;
    background: var(--ui-brand);
    color: var(--ui-on-brand);
    cursor: pointer;
  }
  .primary:hover {
    background: var(--ui-brand-hover);
  }
  .primary:active {
    background: var(--ui-brand-pressed);
  }
</style>
