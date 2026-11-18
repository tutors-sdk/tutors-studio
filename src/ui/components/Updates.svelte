<script lang="ts">
  import type { StudioUpdates, UpdateCheck } from "../../application/use-cases/updates.ts";
  import type { UpdateChannel } from "../../domain/updates.ts";

  interface Props {
    updates: StudioUpdates;
    openLink: (url: string) => void;
  }
  let { updates, openLink }: Props = $props();

  let inside = $state("");
  let found = $state<UpdateCheck | null>(null);
  let busy = $state<"" | "checking" | "installing">("");
  let progress = $state(0);
  let problem = $state("");
  let channel = $state<UpdateChannel>("stable");
  let keep = $state(false);
  $effect(() => {
    void updates.inside().then((words) => (inside = words));
    void updates.channel().then((found) => (channel = found));
    void updates.keepUpToDate().then((found) => (keep = found));
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
    if (!result.ok) {
      problem = result.reason;
      if (result.discarded) found = null;
    }
    busy = "";
  }
</script>

<fieldset>
  <legend>Updates</legend>
  <p class="help">
    {inside} Studio looks for a newer version when it opens, at most once a day, and downloads nothing; a newer version is installed only when you say so.
  </p>
  <label class="check">
    <input type="checkbox" checked={keep} onchange={(event) => void updates.setKeepUpToDate((keep = event.currentTarget.checked))} />
    Keep Studio up to date: download a newer version in the background and install it when Studio closes
  </label>
  <label class="choice">
    Versions
    <select value={channel} onchange={(event) => void updates.setChannel((channel = event.currentTarget.value as UpdateChannel))}>
      <option value="stable">Stable: tested on every computer</option>
      <option value="beta">Beta: newest, tested on Windows first</option>
    </select>
  </label>
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
  .check,
  .choice {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    font-size: var(--font-label);
  }
  .choice select {
    font: inherit;
    min-height: 44px;
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
