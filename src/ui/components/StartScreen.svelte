<script lang="ts">
  let { onOpen, onNew, onSettings }: { onOpen: () => void; onNew: () => void; onSettings?: () => void } = $props();
</script>

<main class="start">
  <div class="panel">
    <h1>Tutors Studio</h1>
    <p>See your course the way Tutors will publish it, and fix what's missing before your students notice.</p>
    <div class="actions">
      <button class="primary" onclick={onNew}>Start a new course</button>
      <button class="secondary" onclick={onOpen}>Open a course folder</button>
    </div>
    <p class="hint">A new course takes three questions: its name, when it runs, and how you teach it.</p>
    {#if onSettings}<button class="link" onclick={onSettings}>Settings: appearance, dyslexia mode, text size</button>{/if}
  </div>
</main>

<style>
  .link {
    margin-top: var(--space-4);
    padding: var(--space-2) 0;
    font: inherit;
    font-size: var(--font-label);
    border: none;
    background: none;
    color: var(--ui-brand);
    text-decoration: underline;
    cursor: pointer;
    min-height: 44px;
  }
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
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }
  .secondary {
    font: inherit;
    font-size: var(--font-control);
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-control);
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
    cursor: pointer;
  }
</style>
