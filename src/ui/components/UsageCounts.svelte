<script lang="ts">
  import type { UsagePort } from "../../application/ports/usage.ts";

  interface Props {
    usage: UsagePort;
  }
  let { usage }: Props = $props();

  let counting = $state(false);
  let lines = $state<{ words: string; count: number }[]>([]);
  let copied = $state("");
  const read = async () => {
    counting = await usage.counting();
    lines = await usage.counts();
  };
  $effect(() => {
    void read();
  });

  async function turn(on: boolean) {
    copied = "";
    await usage.setCounting(on);
    await read();
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(await usage.report());
      copied = "Copied. Paste them into an email or an issue if you'd like to share them.";
    } catch {
      copied = "Studio couldn't reach the clipboard. Try again.";
    }
  }
</script>

<fieldset>
  <legend>Usage counts</legend>
  <label class="check">
    <input type="checkbox" checked={counting} onchange={(event) => void turn(event.currentTarget.checked)} />
    Count how often I use Studio's main actions
  </label>
  <p class="help">Only numbers, kept on this computer: no file names, course names or anything you wrote. Studio never sends them. Turning this off clears them.</p>
  {#if counting}
    <dl>
      {#each lines as line (line.words)}
        <dt>{line.words}</dt>
        <dd>{line.count}</dd>
      {/each}
    </dl>
    <div class="row"><button class="quiet" onclick={copy}>Copy the counts</button></div>
    {#if copied}<p class="help" role="status">{copied}</p>{/if}
  {/if}
</fieldset>

<style>
  fieldset {
    margin: 0;
    padding: var(--space-5);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
    display: grid;
    gap: var(--space-3);
  }
  legend {
    float: left;
    width: 100%;
    padding: 0;
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  p {
    margin: 0;
  }
  .help {
    font-size: var(--font-label);
    color: var(--ui-muted);
  }
  .check {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    min-height: 44px;
  }
  input[type="checkbox"] {
    width: 1.25em;
    height: 1.25em;
  }
  dl {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-2) var(--space-4);
    margin: 0;
  }
  dt {
    color: var(--ui-ink);
  }
  dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
    text-align: end;
  }
  .row {
    display: flex;
    gap: var(--space-3);
  }
  .quiet {
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
    cursor: pointer;
  }
</style>
