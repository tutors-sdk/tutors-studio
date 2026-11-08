<script lang="ts">
  import type { HandOffPort, HandOffStatus } from "../../application/ports/hand-off.ts";
  import type { GitOutcome } from "../../application/ports/publish.ts";
  import type { Finding } from "../../domain/finding.ts";
  import type { FileOp, Plan } from "../../domain/plan.ts";

  interface Props {
    /** Every finding, errors first, as the course map last checked them. */
    findings: Finding[];
    /** Null in the browser preview, where Studio can't run git. */
    handOff: HandOffPort | null;
    onPlanFixAll: () => Promise<Plan | null>;
    /** Applies a plan the lecturer accepted, then checks the course again. */
    onApply: (plan: Plan) => Promise<void>;
    onSelect: (path: string) => void;
    onPublish: () => void;
    onClose: () => void;
    /** Whether the chosen remote assistant may read this course, asked here every time (ADR 0006); absent when none is chosen. */
    readPermission?: { name: string; allowed: boolean; set: (allowed: boolean) => void };
  }
  let { findings, handOff, onPlanFixAll, onApply, onSelect, onPublish, onClose, readPermission }: Props = $props();

  const errors = $derived(findings.filter((finding) => finding.severity === "error").length);
  const safe = $derived(findings.filter((finding) => finding.fix !== undefined).length);
  let pending = $state<Plan | null>(null);
  let status = $state<HandOffStatus | null>(null);
  let message = $state("");
  let busy = $state(false);
  let outcome = $state<GitOutcome | null>(null);

  // Read git's view again whenever the course map is checked again (after a plan is applied, say).
  $effect(() => {
    void findings;
    if (handOff) handOff.status().then((found) => (status = found));
  });

  const describe = (op: FileOp) => (op.op === "move" ? `Rename ${op.from} to ${op.to}` : `Write ${op.path}`);
  const ready = $derived(status !== null && status.git.isRepository && errors === 0 && status.ignoresBuild);
  // Teal marks the one next action: fix what is safe first, then hand the course off.
  const next = $derived(pending !== null ? "" : safe > 0 ? "fix" : ready ? "push" : "");

  async function fixAll() {
    pending = await onPlanFixAll();
  }
  async function ignoreBuild() {
    if (handOff) pending = await handOff.planIgnoreBuild();
  }
  async function accept() {
    if (pending === null) return;
    const plan = pending;
    pending = null;
    await onApply(plan);
  }
  async function push() {
    if (!handOff) return;
    busy = true;
    outcome = null;
    outcome = await handOff.commitAndPush(message);
    busy = false;
    if (outcome.ok) message = "";
    status = await handOff.status();
  }
</script>

<section class="check" aria-labelledby="check-title">
  <p class="eyebrow">Check and publish</p>
  <h2 id="check-title">
    {errors === 0 ? "Ready to publish" : `${errors} ${errors === 1 ? "problem" : "problems"} to fix before publishing`}
  </h2>

  {#if safe > 0}
    <div class="actions">
      <button class={next === "fix" ? "primary" : "quiet"} onclick={fixAll}>Fix all safe ({safe})</button>
      <p class="help">Renames and the standard netlify.toml that change nothing else. You see the plan first.</p>
    </div>
  {/if}

  {#if pending}
    <div class="plan" role="dialog" aria-modal="false" aria-labelledby="plan-title">
      <h3 id="plan-title">Before anything changes</h3>
      <p>{pending.summary}:</p>
      <ul>
        {#each pending.ops as op (describe(op))}<li>{describe(op)}</li>{/each}
      </ul>
      <div class="actions">
        <button class="primary" onclick={accept}>Make {pending.ops.length === 1 ? "this change" : "these changes"}</button>
        <button class="quiet" onclick={() => (pending = null)}>Cancel</button>
      </div>
    </div>
  {/if}

  {#if findings.length === 0}
    <p class="ok">Nothing to fix. Tutors will show every folder in this course.</p>
  {:else}
    <ul class="findings">
      {#each findings as finding (finding.rule + finding.path + finding.message)}
        <li class={finding.severity}>
          <button class="where" onclick={() => onSelect(finding.path)}>{finding.path === "" ? "Course folder" : finding.path}</button>
          <p>{finding.message}</p>
        </li>
      {/each}
    </ul>
  {/if}

  {#if readPermission}
    <div class="card">
      <h3>{readPermission.name}</h3>
      <label class="allow">
        <input type="checkbox" checked={readPermission.allowed} onchange={(event) => readPermission?.set(event.currentTarget.checked)} />
        Let {readPermission.name} read this course's problems to explain them
      </label>
      <p class="help">
        When you ask, Studio sends {readPermission.name} the problem's message and the file or folder it names, nothing else. Anthropic, not this computer, runs the model, so leave this
        off for a course whose names you can't share.
      </p>
    </div>
  {/if}

  <div class="card">
    <h3>Hand off to GitHub</h3>
    {#if handOff === null}
      <p class="note">Commit and push uses this computer's git, so it works in the desktop app, not this browser preview.</p>
    {:else if status === null}
      <p class="note">Asking git about this folder…</p>
    {:else if !status.git.isRepository}
      <p>
        This course folder isn't a git repository, so there is nothing to commit. Publish it to Netlify instead, or make the folder a repository (GitHub Desktop does it in one
        step) and come back here.
      </p>
      <div class="actions"><button class="quiet" onclick={onPublish}>Preview and publish</button></div>
    {:else}
      <p>
        Branch <strong>{status.git.branch ?? "unknown"}</strong>{status.git.remote ? `, pushed to ${status.git.remote}` : ", with no remote yet"}.
        {status.git.changedFiles.length === 0
          ? "Nothing has changed since the last commit."
          : `${status.git.changedFiles.length} ${status.git.changedFiles.length === 1 ? "file has" : "files have"} changed since the last commit.`}
      </p>
      {#if status.git.changedFiles.length > 0}
        <details>
          <summary>Changed files</summary>
          <ul class="files">
            {#each status.git.changedFiles as file (file)}<li>{file}</li>{/each}
          </ul>
        </details>
      {/if}
      {#if !status.ignoresBuild}
        <p class="blocked">The course's .gitignore doesn't leave out the generated json/ folder, so it would be committed. Add it first.</p>
        <div class="actions"><button class="quiet" onclick={ignoreBuild}>Leave json/ out of git</button></div>
      {/if}
      {#if errors > 0}
        <p class="blocked">Fix the {errors} {errors === 1 ? "problem" : "problems"} the course map shows before publishing, so students see the whole course.</p>
      {/if}
      <div class="row">
        <label for="commit-message">What changed</label>
        <input id="commit-message" bind:value={message} placeholder="Week 3 slides" disabled={!ready} />
      </div>
      <div class="actions">
        <button class={next === "push" ? "primary" : "quiet"} disabled={!ready || busy} onclick={push}>{busy ? "Pushing…" : "Commit and push"}</button>
      </div>
      {#if outcome?.ok}
        <p class="result" role="status">{outcome.summary} Netlify builds it from there.</p>
      {:else if outcome}
        <div class="failure" role="alert">
          <p>{outcome.reason}</p>
          {#if outcome.detail}<pre>{outcome.detail}</pre>{/if}
        </div>
      {/if}
    {/if}
  </div>

  <button class="quiet close" onclick={onClose}>Back to the course</button>
</section>

<style>
  .check {
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
  .ok {
    color: var(--ui-success);
  }
  .findings,
  .files {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: var(--space-3);
  }
  .files {
    gap: var(--space-1);
    margin-top: var(--space-2);
    font-size: var(--font-label);
  }
  .findings li {
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-left: 4px solid var(--ui-info);
    border-radius: var(--radius-card);
    padding: var(--space-4);
    display: grid;
    gap: var(--space-2);
  }
  .findings li.error {
    border-left-color: var(--ui-danger);
  }
  .findings li.warn {
    border-left-color: var(--ui-warning);
  }
  .where {
    justify-self: start;
    font: inherit;
    font-size: var(--font-label);
    font-weight: var(--weight-medium);
    padding: 0;
    border: none;
    background: none;
    color: var(--ui-ink);
    text-decoration: underline;
    cursor: pointer;
    overflow-wrap: anywhere;
    text-align: left;
  }
  .plan,
  .card {
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    padding: var(--space-5);
    display: grid;
    gap: var(--space-3);
  }
  .plan {
    border-color: var(--ui-brand);
  }
  .plan ul {
    margin: 0;
    padding-left: var(--space-5);
    overflow-wrap: anywhere;
  }
  .row,
  .actions {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    flex-wrap: wrap;
  }
  label,
  .help,
  .note {
    font-size: var(--font-label);
    color: var(--ui-muted);
  }
  .blocked {
    font-size: var(--font-label);
    color: var(--ui-danger);
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
    flex: 1;
  }
  .allow {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    font-size: var(--font-body);
    color: var(--ui-ink);
  }
  .allow input {
    min-width: 0;
    flex: none;
    width: 1.25em;
    height: 1.25em;
  }
  summary {
    cursor: pointer;
    font-size: var(--font-label);
  }
  .result,
  .failure {
    padding: var(--space-4);
    border-radius: var(--radius-card);
    background: var(--ui-raised);
  }
  .failure {
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
  .primary,
  .quiet {
    font: inherit;
    font-size: var(--font-control);
    cursor: pointer;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
    min-height: 44px;
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
  .close {
    justify-self: start;
  }
</style>
