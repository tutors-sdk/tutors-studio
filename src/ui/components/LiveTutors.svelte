<script lang="ts">
  import type { LiveTutorsPort } from "../../application/ports/live-tutors.ts";

  interface Props {
    live: LiveTutorsPort;
    /** The course's link in Tutors while it is live, kept by the app so it outlives this screen. */
    link: string | null;
    /** Why the last rebuild failed while live, if it did. */
    problem: string | null;
    /** A folder the lecturer picks; null when they cancelled. */
    choose: (title: string) => Promise<string | null>;
    openLink: (url: string) => void;
    /** Heard when the course goes live (its link) or stops (null). */
    onLive: (link: string | null) => void;
  }
  let { live, link, problem, choose, openLink, onLive }: Props = $props();

  let folder = $state<string | null | undefined>(undefined);
  let busy = $state(false);
  let steps = $state<string[]>([]);
  let failure = $state<{ reason: string; detail: string } | null>(null);

  $effect(() => {
    void live.folder().then((found) => (folder = found));
  });

  async function chooseFolder() {
    const picked = await choose("Choose your copy of Tutors (the folder you cloned tutors-mono-repo into)");
    if (picked === null) return;
    const chosen = await live.choose(picked);
    failure = chosen.ok ? null : chosen;
    if (chosen.ok) folder = picked;
  }

  async function start() {
    busy = true;
    steps = [];
    failure = null;
    const started = await live.start((step) => (steps = [...steps, step]));
    busy = false;
    if (started.ok) onLive(started.link);
    else failure = started;
  }

  async function stop() {
    await live.stop();
    steps = [];
    onLive(null);
  }
</script>

<div class="card">
  <h3>{link === null ? "See it in Tutors on this computer" : "Live in Tutors on this computer"}</h3>
  {#if link === null}
    <p class="help">
      Studio builds the course and shows it in Tutors, run from your own copy of Tutors, in a window beside Studio. Every change you make shows there a moment later, on the page
      you're looking at. Nothing leaves this computer, and students see nothing until you publish.
    </p>
  {:else}
    <p class="help">Every change you make rebuilds the course, and the Tutors window reloads on the page it shows.</p>
    {#if problem !== null}<p class="blocked" role="alert">{problem}</p>{/if}
  {/if}
  {#if folder !== undefined}
    <p class="help">
      {folder === null
        ? "Studio needs your copy of Tutors: the folder you cloned tutors-sdk/tutors-mono-repo into, with pnpm install run in it."
        : `Your copy of Tutors: ${folder}`}
    </p>
  {/if}
  <div class="actions">
    {#if link !== null}
      {@const opened = link}
      <button class="quiet" onclick={stop}>Stop</button>
      <button class="link" onclick={() => openLink(opened)}>Open it in your browser</button>
    {:else if folder === null}
      <button class="quiet" onclick={chooseFolder}>Choose your copy of Tutors…</button>
    {:else if folder !== undefined}
      <button class="quiet" disabled={busy} onclick={start}>{busy ? "Starting…" : "Show it in Tutors"}</button>
      <button class="link" disabled={busy} onclick={chooseFolder}>Use another copy</button>
    {/if}
  </div>
  {#if steps.length > 0 && link === null}
    <ol class="steps" aria-live="polite">
      {#each steps as step, i (i)}<li>{step}{i === steps.length - 1 && busy ? "…" : ""}</li>{/each}
    </ol>
  {/if}
  {#if failure !== null}
    <div class="failure" role="alert">
      <p>{failure.reason}</p>
      {#if failure.detail}<details>
          <summary>Technical details</summary>
          <pre>{failure.detail}</pre>
        </details>{/if}
    </div>
  {/if}
</div>

<style>
  .card {
    background: transparent;
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    padding: var(--space-5);
    display: grid;
    gap: var(--space-3);
  }
  h3 {
    margin: 0 0 var(--space-2);
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
  .blocked {
    font-size: var(--font-label);
    color: var(--ui-danger);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
  }
  .steps {
    margin: 0;
    padding-left: var(--space-5);
    color: var(--ui-muted);
    font-size: var(--font-label);
  }
  .failure {
    padding: var(--space-4);
    border-radius: var(--radius-card);
    background: var(--ui-raised);
    border-left: 4px solid var(--ui-danger);
    display: grid;
    gap: var(--space-2);
  }
  pre {
    margin: 0;
    font-size: var(--font-caption);
    white-space: pre-wrap;
    overflow-x: auto;
  }
  .quiet,
  .link {
    font: inherit;
    font-size: var(--font-control);
    cursor: pointer;
  }
  .quiet {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
  }
  .link {
    padding: 0;
    border: none;
    background: none;
    color: var(--ui-brand);
    text-decoration: underline;
  }
  button:disabled {
    cursor: default;
    color: var(--ui-disabled-ink);
  }
</style>
