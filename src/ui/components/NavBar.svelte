<script lang="ts">
  /** Back and Home on every screen (STU-0325); Alt+Left goes back, Alt+Home goes home, as in a browser. */
  interface Props {
    canBack: boolean;
    onBack: () => void;
    onHome: () => void;
    /** Opens the library over whatever is open, so its courses can be added to the open course (ADR 0070); absent where there is none. */
    onLibrary?: () => void;
  }
  let { canBack, onBack, onHome, onLibrary }: Props = $props();

  function keys(event: KeyboardEvent) {
    if (!event.altKey || !canBack) return;
    if (event.key === "ArrowLeft") onBack();
    else if (event.key === "Home") onHome();
    else return;
    event.preventDefault();
  }
</script>

<svelte:window onkeydown={keys} />

<nav class="nav" aria-label="Studio">
  <button onclick={onBack} disabled={!canBack} title="Back (Alt+Left)"><span aria-hidden="true">←</span> Back</button>
  <button onclick={onHome} disabled={!canBack} aria-current={canBack ? undefined : "page"} title="Home: the start screen (Alt+Home)">
    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"
      ><path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h5v-6h3v6h5V9.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" /></svg
    >
    Home
  </button>
  {#if onLibrary}<button class="library" onclick={onLibrary}>Your library</button>{/if}
</nav>

<style>
  .nav {
    grid-column: 1 / -1;
    display: flex;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border-bottom: 1px solid var(--ui-border);
    background: var(--ui-surface);
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 36px;
    padding: var(--space-1) var(--space-3);
    font: inherit;
    font-size: var(--font-label);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--ui-ink);
    cursor: pointer;
  }
  button:hover:not(:disabled) {
    background: var(--ui-raised);
  }
  .library {
    margin-left: auto;
  }
  button:disabled {
    cursor: default;
    color: var(--ui-muted);
  }
</style>
