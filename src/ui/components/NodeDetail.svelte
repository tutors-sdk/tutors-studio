<script lang="ts">
  import { labelFor, publishedFirst, type MapNode } from "../../domain/course-map.ts";
  import type { Finding } from "../../domain/finding.ts";
  import type { Plan } from "../../domain/plan.ts";
  import type { Explanation, Preview } from "../../application/ports/authoring.ts";
  import Previews from "./Previews.svelte";
  import DropZone from "./DropZone.svelte";
  import AddItem from "./AddItem.svelte";
  import type { ItemPlan, MaterialPlan } from "../../application/ports/authoring.ts";
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
    /** Plans a new item named in the lecturer's words (a lab in a week, a week in the course); without it there is no form. */
    onItem?: (folder: string, word: string, title: string, address: string) => Promise<ItemPlan>;
    /** The chosen assistant's name ("Claude"), and how to ask it to explain a finding; absent when none is chosen. */
    assistant?: { name: string; explain: (finding: Finding) => Promise<Explanation> };
    /** Advanced mode's extras: file names, and the pages in this folder to edit. */
    showFileNames?: boolean;
    pages?: string[];
    onEdit?: (path: string) => void;
    /** The week this item sits in, to go back to. */
    parent?: { path: string; title: string } | null;
    onSelect?: (path: string) => void;
  }
  let {
    node,
    pending,
    onFix,
    onAccept,
    onCancel,
    previews = [],
    onQuiz,
    onMaterial,
    onAcceptMaterial,
    onItem,
    assistant,
    showFileNames = false,
    pages = [],
    onEdit,
    parent = null,
    onSelect,
  }: Props = $props();
  const resourceTints = ["topic", "talk", "lab", "video", "web", "notebook", "quiz"];
  const tintOf = (kind: string | null) => (resourceTints.includes(kind ?? "") ? `var(--ui-resource-${kind})` : "var(--ui-raised)");
  const needsFixing = (item: MapNode): boolean => item.status === "error" || item.children.some(needsFixing);
  const itemsLabel = $derived(node.path === "" ? "Your weeks" : node.excluded ? "In here, but students won't see it yet" : "What students will see");

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
  /** What to call a folder; inside an unpublished week there's no title, and its raw name is for Advanced mode. */
  const nameOf = (item: MapNode) => item.title ?? (showFileNames || !item.excluded || item.unpublished ? item.name : (labelFor(item.kind) ?? "Untitled"));
  const heading = $derived(node.path === "" ? (node.title ?? "Course home") : nameOf(node));
  const mustFix = $derived(node.findings.filter((finding) => finding.severity === "error").length);
  const takesMaterial = $derived(!node.excluded && (node.kind === "topic" || node.path === ""));
  const addsTo = $derived(node.excluded ? null : node.kind === "topic" ? "week" : node.path === "" || node.kind === "unit" || node.kind === "side" ? "course" : null);
  const holdsQuizzes = $derived(!node.excluded && ["topic", "unit", "side"].includes(node.kind ?? ""));
</script>

<section aria-labelledby="node-title">
  {#if parent && onSelect}<button class="back" onclick={() => onSelect(parent.path)}>Back to {parent.title}</button>{/if}
  <h2 id="node-title">{heading}</h2>
  <p class="kind">
    {node.excluded ? "Won't be published" : node.path === "" ? "Course" : (node.label ?? "")}{#if showFileNames && node.path !== ""}<span class="folder"> · {node.name}</span>{/if}
  </p>

  {#if node.excluded && !node.unpublished}
    <p>This sits inside something that won't be published, so students won't see it either. Sort out the week it's in first.</p>
  {:else if node.findings.length > 0}
    <h3 class="to-fix">{mustFix === 0 ? "Worth a look" : mustFix === 1 ? "1 thing to sort out" : `${mustFix} things to sort out`}</h3>
    <ul class="findings">
      {#each node.findings as finding (finding.rule + finding.path + finding.message)}
        <li class={finding.severity}>
          <p>{finding.message}</p>
          {#if finding.suggestedName || finding.fix?.op === "write"}
            <button class={pending ? "quiet" : "primary"} onclick={() => onFix(finding)}
              >{showFileNames && finding.suggestedName ? `Rename to ${finding.suggestedName}` : "Fix this"}</button
            >
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

  {#if pending}
    <div class="plan" role="dialog" aria-modal="false" aria-labelledby="plan-title">
      <h3 id="plan-title">Before anything changes</h3>
      <p>
        {showFileNames
          ? `${pending.summary}. Studio will move the folder and everything in it; nothing else is touched.`
          : pending.ops[0]?.op === "write"
            ? "Studio will add the standard setup Tutors needs to publish. Nothing else is touched."
            : "Studio will rename this so Tutors can publish it. Everything inside stays as it is, and nothing else is touched."}
      </p>
      <div class="actions">
        <button class="primary" onclick={onAccept}>Make this change</button>
        <button class="quiet" onclick={onCancel}>Cancel</button>
      </div>
    </div>
  {/if}

  {#if node.children.length > 0 && onSelect}
    <h3 class="items-title">{itemsLabel}</h3>
    <ul class="items">
      {#each publishedFirst(node.children) as item (item.path)}
        <li>
          <button class="item" onclick={() => onSelect(item.path)}>
            <span class="type" style:background={item.excluded ? "var(--ui-raised)" : tintOf(item.kind)}>{item.label ?? "Hidden"}</span>
            <span class="item-title">{nameOf(item)}</span>
            {#if item.unpublished}<span class="flag">Won't be published</span>{:else if needsFixing(item)}<span class="flag">Needs sorting out</span>{/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if onQuiz && node.kind === "quiz" && !node.excluded}
    <button class="quiet quiz" onclick={() => onQuiz(node.path)}>Edit this quiz</button>
  {:else if onQuiz && holdsQuizzes}
    <button class="quiet quiz" onclick={() => onQuiz(node.path)}>Add a quiz</button>
  {/if}

  {#if onItem && onAcceptMaterial && addsTo}
    {#key node.path}
      <AddItem scope={addsTo} where={heading} onPlan={(word, title, address) => onItem(node.path, word, title, address)} onAccept={onAcceptMaterial} {showFileNames} />
    {/key}
  {/if}

  {#if onMaterial && onAcceptMaterial && takesMaterial}
    {#key node.path}
      <DropZone scope={node.path === "" ? "course" : "topic"} where={heading} onPlan={(files) => onMaterial(node.path, files)} onAccept={onAcceptMaterial} />
    {/key}
  {/if}

  <Previews {previews} />

  {#if onEdit && pages.length > 0}
    <h3 class="items-title">Pages</h3>
    <ul class="pages">
      {#each pages as page (page)}
        <li><code>{page.slice(page.lastIndexOf("/") + 1)}</code><button class="quiet" onclick={() => onEdit(page)}>Edit</button></li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  section {
    max-width: var(--reading-width);
  }
  .back {
    font: inherit;
    font-size: var(--font-label);
    min-height: 44px;
    margin-bottom: var(--space-2);
    padding: 0;
    border: none;
    background: none;
    color: var(--ui-brand);
    text-decoration: underline;
    cursor: pointer;
  }
  .kind {
    margin: 0 0 var(--space-6);
    color: var(--ui-muted);
    font-size: var(--font-label);
  }
  .to-fix,
  .items-title {
    margin: var(--space-8) 0 var(--space-3);
  }
  section > .to-fix:first-of-type {
    margin-top: 0;
  }
  .items,
  .pages {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  .item {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    min-height: 56px;
    padding: var(--space-2) var(--space-4);
    font: inherit;
    text-align: left;
    color: var(--ui-ink);
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    cursor: pointer;
  }
  .item:hover {
    background: var(--ui-selected);
  }
  .type {
    min-width: 4.5em;
    padding: 2px var(--space-2);
    text-align: center;
    font-size: var(--font-caption);
    font-weight: var(--weight-medium);
    color: var(--ui-ink);
    border-radius: var(--radius-badge);
  }
  .item-title {
    flex: 1 1 12ch;
    overflow-wrap: anywhere;
  }
  .flag {
    color: var(--ui-danger);
    font-size: var(--font-label);
  }
  .pages li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
  }
  code {
    font-family: var(--studio-editor-font);
    font-size: var(--font-label);
    overflow-wrap: anywhere;
  }
  h2 {
    overflow-wrap: anywhere;
    margin: var(--space-1) 0 var(--space-1);
    font-size: var(--font-heading);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
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
