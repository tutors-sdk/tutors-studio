<script lang="ts">
  import type { MapNode } from "../../domain/course-map.ts";
  import type { Finding } from "../../domain/finding.ts";
  import type { Plan } from "../../domain/plan.ts";
  import type { Preview } from "../../application/ports/authoring.ts";
  import Previews from "./Previews.svelte";

  interface Props {
    node: MapNode;
    pending: Plan | null;
    onFix: (finding: Finding) => void;
    onAccept: () => void;
    onCancel: () => void;
    /** The folder's decks and diagrams, drawn as the reader draws them. */
    previews?: Preview[];
  }
  let { node, pending, onFix, onAccept, onCancel, previews = [] }: Props = $props();
</script>

<section aria-labelledby="node-title">
  <p class="eyebrow">{node.excluded ? "Won't be published" : (node.label ?? "Folder")}</p>
  <h2 id="node-title">{node.path === "" ? "Course home" : node.name}</h2>

  {#if node.excluded && !node.unpublished}
    <p>This folder is inside one Tutors leaves out, so it won't appear in your course either. Fix the folder above it.</p>
  {:else if node.findings.length === 0}
    <p class="ok">Nothing to fix here.</p>
  {:else}
    <ul class="findings">
      {#each node.findings as finding (finding.rule + finding.path + finding.message)}
        <li class={finding.severity}>
          <p>{finding.message}</p>
          {#if finding.suggestedName}
            <button class="primary" onclick={() => onFix(finding)}>Rename to {finding.suggestedName}</button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  <Previews {previews} />

  {#if pending}
    <div class="plan" role="dialog" aria-modal="false" aria-labelledby="plan-title">
      <h3 id="plan-title">Before anything changes</h3>
      <p>{pending.summary}. Studio will move the folder and everything in it; nothing else is touched.</p>
      <div class="actions">
        <button class="primary" onclick={onAccept}>Make this change</button>
        <button class="quiet" onclick={onCancel}>Cancel</button>
      </div>
    </div>
  {/if}
</section>

<style>
  section {
    max-width: var(--reading-width);
  }
  .eyebrow {
    margin: 0;
    color: var(--ui-muted);
    font-size: var(--font-caption);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  h2 {
    margin: var(--space-1) 0 var(--space-6);
    font-size: var(--font-heading);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
  }
  .ok {
    color: var(--ui-success);
  }
  .findings {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: var(--space-3);
  }
  .findings li {
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-left: 4px solid var(--ui-info);
    border-radius: var(--radius-card);
    padding: var(--space-4);
  }
  .findings li.error {
    border-left-color: var(--ui-danger);
  }
  .findings li.warn {
    border-left-color: var(--ui-warning);
  }
  .findings p {
    margin: 0;
  }
  .findings .primary {
    margin-top: var(--space-3);
  }
  .plan {
    margin-top: var(--space-6);
    padding: var(--space-5);
    border: 1px solid var(--ui-brand);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
  }
  h3 {
    margin: 0 0 var(--space-2);
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  .actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-4);
  }
  .primary,
  .quiet {
    font: inherit;
    font-size: var(--font-control);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
    cursor: pointer;
  }
  .primary {
    border: none;
    background: var(--ui-brand);
    color: var(--ui-on-brand);
  }
  .primary:hover {
    background: var(--ui-brand-hover);
  }
  .quiet {
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
  }
</style>
