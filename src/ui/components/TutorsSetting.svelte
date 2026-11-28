<script lang="ts">
  import type { LiveTutorsPort } from "../../application/ports/live-tutors.ts";
  import { TUTORS_RELEASE } from "../../domain/bundle.ts";
  import { tutorsInUse } from "../../domain/live-tutors.ts";

  /**
   * Settings, Advanced: which Tutors this Studio shows courses in, a developer's own copy chosen in its place
   * for features not yet released, and Tutors started, stopped or switched from here (STU-0314, STU-0315).
   */
  interface Props {
    tutors: LiveTutorsPort;
    /** A folder the lecturer picks; null when they cancelled. */
    choose: (title: string) => Promise<string | null>;
  }
  let { tutors, choose }: Props = $props();

  let folder = $state<string | null | undefined>(undefined);
  let running = $state<string | null>(null);
  let busy = $state<string | null>(null);
  let problem = $state<string | null>(null);

  $effect(() => {
    void tutors.folder().then((found) => (folder = found));
  });

  const inUse = $derived(folder === undefined ? "" : tutorsInUse(folder, tutors.inside, TUTORS_RELEASE));

  async function stop() {
    await tutors.stop();
    running = null;
  }
  async function start() {
    problem = null;
    busy = "Starting";
    const opened = await tutors.home((step) => (busy = step));
    busy = null;
    if (opened.ok) running = opened.link;
    else problem = opened.reason;
  }
  /** Switching stops the Tutors that runs now, so the next start uses the one chosen. */
  async function chooseCopy() {
    const picked = await choose("Choose your copy of Tutors (the folder you cloned tutors-mono-repo into)");
    if (picked === null) return;
    problem = null;
    busy = "Checking that folder";
    const chosen = await tutors.choose(picked);
    busy = null;
    if (!chosen.ok) return void (problem = chosen.reason);
    if (running !== null) await stop();
    folder = picked;
  }
  async function useInside() {
    if (running !== null) await stop();
    await tutors.forget();
    folder = null;
  }
</script>

<div class="tutors">
  <h3>Tutors on this computer</h3>
  <p class="help" role="status">In use: {inUse}.{running !== null ? ` Running at ${running}` : ""}</p>
  <p class="help">
    Studio shows your courses in the Tutors inside it. To try a Tutors feature before it is released, choose your own copy of Tutors: the folder you cloned
    tutors-sdk/tutors-mono-repo into, with pnpm install run in it.
  </p>
  <div class="row">
    {#if running === null}
      <button class="quiet" disabled={busy !== null || (folder === null && !tutors.inside)} onclick={start}>{busy !== null ? `${busy}…` : "Start Tutors"}</button>
    {:else}
      <button class="quiet" onclick={stop}>Stop Tutors</button>
    {/if}
    <button class="quiet" disabled={busy !== null} onclick={chooseCopy}>{folder === null ? "Choose your copy of Tutors…" : "Use another copy…"}</button>
    {#if folder !== null && tutors.inside}<button class="quiet" disabled={busy !== null} onclick={useInside}>Use the Tutors inside Studio</button>{/if}
  </div>
  {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
</div>

<style>
  .tutors {
    display: grid;
    gap: var(--space-2);
  }
  h3 {
    margin: var(--space-3) 0 0;
    font-size: var(--font-body);
    font-weight: var(--weight-semibold);
  }
  .help {
    margin: 0;
    color: var(--ui-muted);
    font-size: var(--font-label);
    overflow-wrap: anywhere;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .quiet {
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
    font: inherit;
    font-size: var(--font-label);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--ui-ink);
    cursor: pointer;
  }
  .quiet:hover {
    background: var(--ui-raised);
  }
  .problem {
    margin: 0;
    color: var(--ui-danger);
    font-size: var(--font-label);
  }
</style>
