<script lang="ts">
  import type { ShareProblem } from "../../application/use-cases/share.ts";
  import { labelFor } from "../../domain/course-map.ts";
  import { lastPart, type LibraryCourse } from "../../domain/library.ts";
  import { SUGGESTED_LICENCES } from "../../domain/registry.ts";
  import type { LibraryScreen } from "../app-props.ts";

  interface Props {
    /** The ready course to share from. */
    course: LibraryCourse;
    share: LibraryScreen["share"];
    /** After sharing: the registry's folder, so the library can list what is in it. */
    onShared: (registry: string) => void;
    onClose: () => void;
  }
  let { course, share, onShared, onClose }: Props = $props();

  /** "" shares the whole course; otherwise one item's path. */
  let what = $state("");
  let registry = $state<string | null>(null);
  let publisher = $state("");
  let licence = $state("");
  let problems = $state<ShareProblem[]>([]);
  let plan = $state<{ summary: string; notes: string[] } | null>(null);
  let outcome = $state("");
  let failure = $state("");
  let busy = $state(false);

  const id = $derived(`share-${course.path.replaceAll(/[^a-z0-9]/gi, "-") || "course"}`);
  const request = () => ({ course, item: what === "" ? null : what, registry: registry ?? "", publisher, licence });
  const problemFor = (field: ShareProblem["field"]) => problems.find((problem) => problem.field === field)?.message ?? "";

  async function chooseRegistry() {
    const chosen = await share.choose();
    if (chosen !== null) registry = chosen;
  }
  async function seePlan(event: SubmitEvent) {
    event.preventDefault();
    failure = "";
    if (registry === null) {
      problems = [{ field: "registry", message: "Choose the registry folder to share into." }];
      return;
    }
    const planned = await share.preview(request());
    if (planned.ok) {
      problems = [];
      plan = { summary: planned.summary, notes: planned.notes };
    } else {
      problems = planned.problems;
      plan = null;
    }
  }
  async function accept() {
    busy = true;
    try {
      const done = await share.apply(request());
      if ("reason" in done) failure = done.reason;
      else {
        outcome = `Shared as ${done.shared}.`;
        plan = null;
        onShared(registry ?? "");
      }
    } finally {
      busy = false;
    }
  }
</script>

<section class="share" aria-labelledby={`${id}-title`}>
  <h3 id={`${id}-title`}>Share from {course.title}</h3>
  {#if outcome}
    <p class="outcome" role="status">{outcome}</p>
    <button class="quiet" onclick={onClose}>Done</button>
  {:else if plan}
    <div role="dialog" aria-modal="false" aria-labelledby={`${id}-plan`}>
      <h4 id={`${id}-plan`}>Before anything changes</h4>
      <p class="summary">{plan.summary}.</p>
      {#each plan.notes as note (note)}<p>{note}</p>{/each}
      {#if failure}<p class="problem" role="alert">{failure}</p>{/if}
      <div class="actions">
        <button class="primary" disabled={busy} onclick={accept}>Share</button>
        <button class="quiet" onclick={() => (plan = null)}>Change something</button>
      </div>
    </div>
  {:else}
    <form onsubmit={seePlan}>
      <label>
        What to share
        <select bind:value={what}>
          <option value="">The whole course</option>
          {#each course.items as item (item.path)}<option value={item.path}>{labelFor(item.kind)}: {item.title}</option>{/each}
        </select>
      </label>
      {#if problemFor("item") || problemFor("course")}<p class="problem">{problemFor("item") || problemFor("course")}</p>{/if}
      <div class="registry">
        <span>Registry folder: {registry === null ? "none chosen" : lastPart(registry)}</span>
        <button type="button" class="quiet" onclick={chooseRegistry}>{registry === null ? "Choose a folder" : "Choose another"}</button>
      </div>
      {#if problemFor("registry")}<p class="problem">{problemFor("registry")}</p>{/if}
      <label>
        Publisher
        <input bind:value={publisher} aria-describedby={`${id}-publisher-problem`} />
      </label>
      {#if problemFor("publisher")}<p id={`${id}-publisher-problem`} class="problem">{problemFor("publisher")}</p>{/if}
      <label>
        Licence
        <input bind:value={licence} list={`${id}-licences`} aria-describedby={`${id}-licence-problem ${id}-licence-hint`} />
      </label>
      <datalist id={`${id}-licences`}
        >{#each SUGGESTED_LICENCES as suggested (suggested)}<option value={suggested}></option>{/each}</datalist
      >
      {#if problemFor("licence")}<p id={`${id}-licence-problem`} class="problem">{problemFor("licence")}</p>{/if}
      <p id={`${id}-licence-hint`} class="hint">Studio shares nothing without a licence, so colleagues know how they may use it. CC-BY-4.0 lets anyone reuse it with credit.</p>
      <div class="actions">
        <button class="primary" type="submit">See the plan</button>
        <button type="button" class="quiet" onclick={onClose}>Cancel</button>
      </div>
    </form>
  {/if}
</section>

<style>
  .share {
    grid-column: 1 / -1;
    margin-top: var(--space-2);
    padding-top: var(--space-3);
    border-top: 1px solid var(--ui-border);
  }
  h3,
  h4 {
    margin: 0 0 var(--space-2);
    font-size: var(--font-body);
    font-weight: var(--weight-semibold);
  }
  form {
    display: grid;
    gap: var(--space-3);
  }
  label {
    display: grid;
    gap: var(--space-1);
    font-size: var(--font-label);
    color: var(--ui-ink);
  }
  input,
  select {
    font: inherit;
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--ui-control-border);
    border-radius: var(--radius-control);
    background: var(--ui-surface);
    color: var(--ui-ink);
  }
  .registry {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    font-size: var(--font-label);
    color: var(--ui-ink);
    overflow-wrap: anywhere;
  }
  p {
    margin: 0 0 var(--space-2);
    color: var(--ui-muted);
  }
  .summary,
  .outcome {
    color: var(--ui-ink);
    font-weight: var(--weight-medium);
  }
  .hint {
    font-size: var(--font-caption);
  }
  .problem {
    color: var(--ui-danger);
    font-size: var(--font-label);
  }
  .actions {
    display: flex;
    gap: var(--space-3);
  }
  button {
    min-height: 44px;
    font: inherit;
    cursor: pointer;
  }
  .primary {
    font-size: var(--font-control);
    font-weight: var(--weight-medium);
    padding: var(--space-3) var(--space-5);
    border: none;
    border-radius: var(--radius-control);
    background: var(--ui-brand);
    color: var(--ui-on-brand);
  }
  .primary:hover {
    background: var(--ui-brand-hover);
  }
  .primary:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .quiet {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-label);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--ui-ink);
  }
  .quiet:hover {
    background: var(--ui-raised);
  }
</style>
