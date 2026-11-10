<script lang="ts">
  import type { StudioUpdates, UpdateCheck } from "../../application/use-cases/updates.ts";

  interface Props {
    updates: StudioUpdates;
    openLink: (url: string) => void;
  }
  let { updates, openLink }: Props = $props();

  let version = $state("");
  let found = $state<UpdateCheck | null>(null);
  let busy = $state<"" | "checking" | "installing">("");
  let progress = $state(0);
  let problem = $state("");
  $effect(() => {
    void updates.version().then((running) => (version = running));
  });

  async function check() {
    busy = "checking";
    problem = "";
    found = await updates.check();
    busy = "";
  }
  async function install() {
    busy = "installing";
    const result = await updates.accept((fraction) => (progress = fraction));
    // On success Studio restarts, so only a failure is ever shown.
    if (!result.ok) problem = `The new version wasn't installed: ${result.reason}. Studio is as it was.`;
    busy = "";
  }
</script>

<fieldset>
  <legend>Updates</legend>
  <p class="help">This is Studio {version}. Checking downloads nothing; a newer version is installed only when you say so.</p>
  {#if found}
    <p role="status">{found.words}</p>
    {#if found.link}
      {@const link = found.link}
      <button class="link" onclick={() => openLink(link)}>Open the download page</button>
    {/if}
  {/if}
  {#if busy === "installing"}<p role="status">Downloading… {Math.round(progress * 100)}%</p>{/if}
  {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
  <div class="actions">
    {#if found?.offer.kind === "newer"}
      <button class="primary" disabled={busy !== ""} onclick={install}>Install {found.offer.version} and restart</button>
    {:else}
      <button class="quiet" disabled={busy !== ""} onclick={check}>{busy === "checking" ? "Checking…" : "Check for a newer version"}</button>
    {/if}
  </div>
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
  .problem {
    color: var(--ui-danger);
  }
  .actions {
    display: flex;
    gap: var(--space-3);
  }
  .primary,
  .quiet,
  .link {
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    cursor: pointer;
  }
  .primary,
  .quiet {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
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
  .quiet:disabled,
  .primary:disabled {
    cursor: default;
    opacity: 0.6;
  }
  .link {
    justify-self: start;
    padding: 0;
    border: none;
    background: none;
    color: var(--ui-brand);
    text-decoration: underline;
  }
</style>
