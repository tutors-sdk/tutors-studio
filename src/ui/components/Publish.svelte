<script lang="ts">
  import { untrack } from "svelte";
  import type { PublishingPort } from "../../application/ports/publishing.ts";
  import { isNetlifySiteName, netlifySiteFor } from "../../domain/publish.ts";

  interface Props {
    /** Null in the browser preview, where Studio can't run the generator or a container. */
    publishing: PublishingPort | null;
    courseName: string;
    errors: number;
    openLink: (url: string) => void;
    onClose: () => void;
  }
  let { publishing, courseName, errors, openLink, onClose }: Props = $props();

  type Outcome = { ok: true; lines: string[]; link: string } | { ok: false; reason: string; detail: string };
  let busy = $state<"" | "preview" | "publish">("");
  let steps = $state<string[]>([]);
  let outcome = $state<Outcome | null>(null);
  let host = $state<{ name: string; signedIn: boolean } | null>(null);
  let token = $state("");
  // A suggestion the lecturer then edits; the panel is rebuilt for each course it opens on.
  let site = $state(untrack(() => netlifySiteFor(courseName)));
  let siteOk = $derived(isNetlifySiteName(site));

  $effect(() => {
    if (publishing) publishing.host().then((found) => (host = found));
  });

  const progress = (step: string) => (steps = [...steps, step]);
  const begin = (what: "preview" | "publish") => {
    busy = what;
    steps = [];
    outcome = null;
  };

  async function previewHere() {
    if (!publishing) return;
    begin("preview");
    const result = await publishing.previewHere(progress);
    outcome = result.ok ? { ok: true, lines: ["Your course is open in the Tutors reader on this computer."], link: result.url } : result;
    busy = "";
    if (result.ok) openLink(result.url);
  }

  async function signIn() {
    if (!publishing || token.trim() === "") return;
    await publishing.signIn(token.trim());
    token = "";
    host = await publishing.host();
  }

  async function publish() {
    if (!publishing || !siteOk) return;
    begin("publish");
    const result = await publishing.publish(site, progress);
    outcome = result.ok
      ? {
          ok: true,
          lines: [`Published to ${host?.name ?? "Netlify"}: ${result.siteUrl} (${result.uploaded} file${result.uploaded === 1 ? "" : "s"} sent).`, "Students read it at"],
          link: result.readerUrl,
        }
      : result;
    busy = "";
  }
</script>

<section class="publish" aria-labelledby="publish-title">
  <p class="eyebrow">Publish</p>
  <h2 id="publish-title">See it as students will, then share it</h2>

  {#if publishing === null}
    <p class="note">Previewing and publishing build the course with the Tutors generator, so they work in the desktop app, not this browser preview.</p>
  {:else}
    <div class="card">
      <h3>On this computer</h3>
      <p>Builds the course and opens it in the Tutors reader here. Nothing leaves this computer. Needs Docker Desktop or Podman Desktop.</p>
      <div class="actions">
        <button class="primary" disabled={busy !== ""} onclick={previewHere}>{busy === "preview" ? "Building…" : "Preview on this computer"}</button>
        <button class="quiet" disabled={busy !== ""} onclick={() => publishing?.stopPreview()}>Stop the preview</button>
      </div>
    </div>

    <div class="card">
      <h3>On {host?.name ?? "Netlify"}</h3>
      {#if host !== null && !host.signedIn}
        <p>
          Studio publishes with a Netlify personal access token, kept in this computer's keychain. Make one in Netlify under User settings, Applications, Personal access tokens,
          and paste it here.
        </p>
        <div class="row">
          <label for="netlify-token">Access token</label>
          <input id="netlify-token" type="password" autocomplete="off" bind:value={token} />
          <button class="quiet" disabled={token.trim() === ""} onclick={signIn}>Sign in</button>
        </div>
      {:else}
        <div class="row">
          <label for="netlify-site">Site name</label>
          <input id="netlify-site" bind:value={site} aria-describedby="site-help" aria-invalid={!siteOk} />
        </div>
        <p id="site-help" class="help">
          {siteOk ? `Students will read it at tutors.dev/course/${site}.` : "Use lower-case letters, digits and single hyphens, like web-dev-2026."}
        </p>
        {#if errors > 0}
          <p class="blocked">Fix the {errors} {errors === 1 ? "problem" : "problems"} the course map shows before publishing, so students see the whole course.</p>
        {/if}
        <div class="actions">
          <button class="quiet" disabled={busy !== "" || !siteOk || errors > 0} onclick={publish}>{busy === "publish" ? "Publishing…" : "Publish to Netlify"}</button>
        </div>
      {/if}
    </div>

    {#if steps.length > 0}
      <ol class="steps" aria-live="polite">
        {#each steps as step, i (i)}<li>{step}{i === steps.length - 1 && busy !== "" ? "…" : ""}</li>{/each}
      </ol>
    {/if}
    {#if outcome?.ok}
      <div class="result" role="status">
        {#each outcome.lines as line (line)}<p>{line}</p>{/each}
        <button class="link" onclick={() => outcome?.ok && openLink(outcome.link)}>{outcome.link}</button>
      </div>
    {:else if outcome}
      <div class="failure" role="alert">
        <p>{outcome.reason}</p>
        {#if outcome.detail}<pre>{outcome.detail}</pre>{/if}
      </div>
    {/if}
  {/if}
  <button class="quiet close" onclick={onClose}>Back to the course</button>
</section>

<style>
  .publish {
    display: grid;
    gap: var(--space-4);
    max-width: 44rem;
  }
  .eyebrow {
    margin: 0;
    color: var(--ui-muted);
    font-size: var(--font-caption);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  h2 {
    margin: 0;
    font-size: var(--font-title);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
  }
  h3 {
    margin: 0 0 var(--space-2);
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  p {
    margin: 0;
  }
  .card {
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    padding: var(--space-5);
    display: grid;
    gap: var(--space-3);
  }
  .row {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    flex-wrap: wrap;
  }
  label {
    font-size: var(--font-label);
    color: var(--ui-muted);
  }
  input {
    font: inherit;
    font-size: var(--font-control);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--ui-control-border);
    border-radius: var(--radius-control);
    background: var(--ui-surface);
    color: var(--ui-ink);
    min-width: 16rem;
  }
  input[aria-invalid="true"] {
    border-color: var(--ui-danger);
  }
  .help,
  .note {
    font-size: var(--font-label);
    color: var(--ui-muted);
  }
  .blocked {
    font-size: var(--font-label);
    color: var(--ui-danger);
  }
  .actions {
    display: flex;
    gap: var(--space-3);
  }
  .steps {
    margin: 0;
    padding-left: var(--space-5);
    color: var(--ui-muted);
    font-size: var(--font-label);
  }
  .result,
  .failure {
    padding: var(--space-4);
    border-radius: var(--radius-card);
    background: var(--ui-raised);
    display: grid;
    gap: var(--space-2);
  }
  .failure {
    border-left: 4px solid var(--ui-danger);
  }
  pre {
    margin: 0;
    font-size: var(--font-caption);
    white-space: pre-wrap;
    overflow-x: auto;
  }
  .primary,
  .quiet,
  .link {
    font: inherit;
    font-size: var(--font-control);
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
  .primary:hover:not(:disabled) {
    background: var(--ui-brand-hover);
  }
  .quiet {
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
  }
  button:disabled {
    cursor: default;
    color: var(--ui-disabled-ink);
  }
  .primary:disabled {
    background: var(--ui-raised);
  }
  .link {
    justify-self: start;
    padding: 0;
    border: none;
    background: none;
    color: var(--ui-brand);
    text-decoration: underline;
  }
  .close {
    justify-self: start;
  }
</style>
