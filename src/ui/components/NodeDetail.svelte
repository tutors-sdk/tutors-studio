<script lang="ts">
  import type { MapNode } from "../../domain/course-map.ts";
  import type { Finding } from "../../domain/finding.ts";
  import type { Plan } from "../../domain/plan.ts";
  import type { Explanation, Preview } from "../../application/ports/authoring.ts";
  import Previews from "./Previews.svelte";
  import DropZone from "./DropZone.svelte";
  import type { MaterialPlan } from "../../application/ports/authoring.ts";
  import type { DroppedFile } from "../../domain/material.ts";

  interface Props {
    node: MapNode;
    pending: Plan | null;
    onFix: (finding: Finding) => void;
    onAccept: () => void;
    onCancel: () => void;
    /** The folder's decks and diagrams, drawn as the reader draws them. */
    previews?: Preview[];
    /** Opens the quiz designer: on a new quiz in this folder, or on this quiz folder's quiz. */
    onQuiz?: (folder: string) => void;
    /** Plans dropped material for this folder (a topic, or the course); without it there is no drop zone. */
    onMaterial?: (folder: string, files: DroppedFile[]) => Promise<MaterialPlan>;
    onAcceptMaterial?: (plan: Plan) => void;
    /** The chosen assistant's name ("Claude"), and how to ask it to explain a finding; absent when none is chosen. */
    assistant?: { name: string; explain: (finding: Finding) => Promise<Explanation> };
  }
  let { node, pending, onFix, onAccept, onCancel, previews = [], onQuiz, onMaterial, onAcceptMaterial, assistant }: Props = $props();

  // Explanations by finding, for this folder only; asking again replaces the answer.
  let explained = $state<Record<string, Explanation | "asking">>({});
  const keyOf = (finding: Finding) => finding.rule + finding.path + finding.message;
  $effect(() => {
    void node.path;
    explained = {};
  });
  async function explain(finding: Finding) {
    if (!assistant) return;
    explained = { ...explained, [keyOf(finding)]: "asking" };
    const answer = await assistant.explain(finding);
    explained = { ...explained, [keyOf(finding)]: answer };
  }
  const heading = $derived(node.path === "" ? (node.title ?? "Course home") : (node.title ?? node.name));
  const takesMaterial = $derived(!node.excluded && (node.kind === "topic" || node.path === ""));
  const holdsQuizzes = $derived(!node.excluded && ["topic", "unit", "side"].includes(node.kind ?? ""));
</script>

<section aria-labelledby="node-title">
  <p class="eyebrow">{node.excluded ? "Won't be published" : (node.label ?? "Folder")}</p>
  <h2 id="node-title">{heading}</h2>
  {#if node.path !== "" && node.title}<p class="folder">Folder {node.name}</p>{/if}

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
          {#if assistant}
            {@const answer = explained[keyOf(finding)]}
            {#if answer === "asking"}
              <p class="explanation" role="status">Asking {assistant.name}…</p>
            {:else if answer?.by === "assistant"}
              <p class="explanation" role="status"><span class="by">{assistant.name} explains:</span> {answer.text}</p>
            {:else if answer}
              <p class="explanation problem" role="status">{answer.problem}</p>
            {:else}
              <button class="quiet explain" onclick={() => explain(finding)}>Ask {assistant.name} to explain</button>
            {/if}
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  {#if onQuiz && node.kind === "quiz" && !node.excluded}
    <button class="quiet quiz" onclick={() => onQuiz(node.path)}>Edit this quiz</button>
  {:else if onQuiz && holdsQuizzes}
    <button class="quiet quiz" onclick={() => onQuiz(node.path)}>Add a quiz</button>
  {/if}

  {#if onMaterial && onAcceptMaterial && takesMaterial}
    {#key node.path}
      <DropZone scope={node.path === "" ? "course" : "topic"} where={heading} onPlan={(files) => onMaterial(node.path, files)} onAccept={onAcceptMaterial} />
    {/key}
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
  .folder {
    margin: calc(-1 * var(--space-2)) 0 var(--space-4);
    color: var(--ui-muted);
    font-size: var(--font-caption);
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
  .findings .primary,
  .findings .explain {
    margin-top: var(--space-3);
  }
  .findings .primary + .explain {
    margin-left: var(--space-2);
  }
  .explanation {
    margin-top: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-control);
    background: var(--ui-raised);
  }
  .explanation.problem {
    color: var(--ui-muted);
  }
  .by {
    font-weight: var(--weight-medium);
  }
  .quiz {
    margin-top: var(--space-6);
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
