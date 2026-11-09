<script lang="ts">
  import { untrack } from "svelte";
  import type { PublishingPort } from "../../application/ports/publishing.ts";
  import { isNetlifySiteName, netlifySiteFor } from "../../domain/publish.ts";
  import { hostSignIn, publishingWords } from "../../domain/publishing-words.ts";

  interface Props {
    /** Null in the browser preview, where Studio can't run the generator. */
    publishing: PublishingPort | null;
    courseName: string;
    /** Advanced mode: name the tools and the host (ADR 0024). */
    advanced: boolean;
    errors: number;
    openLink: (url: string) => void;
    /** A folder the lecturer picks, and showing a saved file in its folder; absent in the browser preview. */
    folders?: { choose: (title: string) => Promise<string | null>; show: (path: string) => void };
    /** Heard after Save wrote the standard setup, so the course map shows it. */
    onSaved?: () => void;
    onClose: () => void;
  }
  let { publishing, courseName, advanced, errors, openLink, folders, onSaved, onClose }: Props = $props();

  type Outcome = { ok: true; lines: string[]; link?: string; show?: boolean } | { ok: false; reason: string; detail: string };
  let busy = $state<"" | "save" | "publish" | "website">("");
  let steps = $state<string[]>([]);
  let outcome = $state<Outcome | null>(null);
  let host = $state<{ name: string; signedIn: boolean } | null>(null);
  let token = $state("");
  // A suggestion the lecturer then edits; the panel is rebuilt for each course it opens on.
  let site = $state(untrack(() => netlifySiteFor(courseName)));
  let siteOk = $derived(isNetlifySiteName(site));
  const words = $derived(publishingWords(advanced, host?.name));
  const signing = $derived(hostSignIn(host?.name ?? "Netlify", advanced));

  $effect(() => {
    if (publishing) publishing.host().then((found) => (host = found));
  });

  const progress = (step: string) => (steps = [...steps, step]);
  const begin = (what: "save" | "publish" | "website") => {
    busy = what;
    steps = [];
    outcome = null;
  };

  async function save() {
    if (!publishing) return;
    begin("save");
    // Pressing Save, with the sentence beside it saying the setup is added, accepts that plan (ADR 0030).
    const result = await publishing.save(progress);
    outcome = result.ok
      ? {
          ok: true,
          lines: [
            "Your course is compliant and saved in its own folder: it passes the Tutors rules and has the setup Tutors expects.",
            ...(result.added.length > 0 ? [`Studio added the setup Tutors expects: ${result.added.join(" and ")}.`] : []),
            ...(result.warnings > 0 ? [`${result.warnings} suggestion${result.warnings === 1 ? "" : "s"} under Check to look at when you have time; none stops it.`] : []),
            "Put it online below whenever you are ready.",
          ],
        }
      : result;
    busy = "";
    if (result.ok && result.added.length > 0) onSaved?.();
  }

  async function saveWebsite() {
    if (!publishing || !folders) return;
    const parent = await folders.choose("Choose where to save the course's website");
    if (parent === null) return;
    begin("website");
    const result = await publishing.saveWebsite(parent, courseName, progress);
    outcome = result.ok
      ? {
          ok: true,
          lines: [`Your course is saved as a website in ${result.folder}. Open index.html in any browser, or copy the folder to any web host.`],
          link: result.page,
          show: true,
        }
      : result;
    busy = "";
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
          lines: [words.published(result.siteUrl, result.uploaded), "Students read it at"],
          link: result.readerUrl,
        }
      : result;
    busy = "";
  }
</script>

<section class="publish" aria-labelledby="publish-title">
  <p class="eyebrow">Publish</p>
  <h2 id="publish-title">Save a compliant course, then share it when you're ready</h2>

  {#if publishing === null}
    <p class="note">{words.publishDesktopOnly}</p>
  {:else}
    <div class="card">
      <h3>Save the course</h3>
      <p>
        Studio confirms the course passes the Tutors rules and adds any setup Tutors expects that is missing (netlify.toml and a .gitignore line), in the course's own folder.
        Nothing goes online.
      </p>
      {#if errors > 0}
        <p class="blocked">{words.blocked(errors)}</p>
      {/if}
      <div class="actions">
        <button class="primary" disabled={busy !== "" || errors > 0} onclick={save}>{busy === "save" ? "Saving…" : "Save the course"}</button>
      </div>
    </div>

    {#if folders}
      <div class="card">
        <h3>As a website on this computer</h3>
        <p>
          Studio saves the whole course as a folder of web pages. It opens in any browser without the internet reader, and you can keep it, share it, or put it on any web host.
        </p>
        {#if errors > 0}
          <p class="blocked">{words.blocked(errors)}</p>
        {/if}
        <div class="actions">
          <button class="quiet" disabled={busy !== "" || errors > 0} onclick={saveWebsite}>{busy === "website" ? "Saving…" : "Save as a website…"}</button>
        </div>
      </div>
    {/if}

    <div class="card">
      <h3>{advanced ? `On ${host?.name ?? "Netlify"}` : "For your students"} <span class="optional">(optional, any time)</span></h3>
      {#if host !== null && !host.signedIn}
        <p>{signing.help}</p>
        <div class="row">
          <label for="netlify-token">{signing.label}</label>
          <input id="netlify-token" type="password" autocomplete="off" bind:value={token} />
          <button class="quiet" disabled={token.trim() === ""} onclick={signIn}>Sign in</button>
        </div>
      {:else}
        <div class="row">
          <label for="netlify-site">{words.addressLabel}</label>
          <input id="netlify-site" bind:value={site} aria-describedby="site-help" aria-invalid={!siteOk} />
        </div>
        <p id="site-help" class="help">
          {siteOk ? `Students will read it at tutors.dev/course/${site}.` : "Use lower-case letters, digits and single hyphens, like web-dev-2026."}
        </p>
        {#if errors > 0}
          <p class="blocked">{words.blocked(errors)}</p>
        {/if}
        <div class="actions">
          <button class="quiet" disabled={busy !== "" || !siteOk || errors > 0} onclick={publish}>{busy === "publish" ? "Publishing…" : words.publishButton}</button>
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
        {#if outcome.link !== undefined && outcome.show}
          {@const link = outcome.link}
          <button class="link" onclick={() => folders?.show(link)}>Show it in its folder</button>
        {:else if outcome.link !== undefined}
          {@const link = outcome.link}
          <button class="link" onclick={() => openLink(link)}>{link}</button>
        {/if}
      </div>
    {:else if outcome}
      <div class="failure" role="alert">
        <p>{outcome.reason}</p>
        {#if outcome.detail}
          {#if advanced}<pre>{outcome.detail}</pre>{:else}<details>
              <summary>Technical details</summary>
              <pre>{outcome.detail}</pre>
            </details>{/if}
        {/if}
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
  .optional {
    color: var(--ui-muted);
    font-weight: var(--weight-regular);
    font-size: var(--font-label);
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
