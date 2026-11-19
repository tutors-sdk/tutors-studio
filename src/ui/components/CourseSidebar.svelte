<script lang="ts">
  import Contents from "./Contents.svelte";
  import MyFiles from "./MyFiles.svelte";
  import type { MapNode } from "../../domain/course-map.ts";
  import type { ArrangeAction } from "../../domain/arrange.ts";
  import type { DroppedFile } from "../../domain/material.ts";
  import type { MyFiles as MyFilesPort, OwnEntry } from "../../application/use-cases/my-files.ts";

  /** The open course's contents column: its title and state, the weeks, My files, Check and publish, and the quiet links. */
  interface Props {
    title: string;
    errors: number;
    map: MapNode;
    selected: string;
    selectedNode: MapNode | null;
    showFileNames: boolean;
    onSelect: (path: string) => void;
    onArrange: (action: ArrangeAction) => void;
    onFiles: (week: string, files: DroppedFile[]) => void;
    /** Plans an entry from the lecturer's own folder dropped on a week (feature 5). */
    onOwn?: (week: string, entry: OwnEntry) => void;
    /** The lecturer's own folder beside the course, and asking for it; absent where Studio can't read outside the course. */
    own?: { myFiles: MyFilesPort; choose: () => Promise<string | null>; onAdd: (week: string, entry: OwnEntry) => void };
    checkOpen: boolean;
    publishingOpen: boolean;
    historyOpen: boolean;
    onCheck: () => void;
    onHistory: () => void;
    onSettings: () => void;
    onClose: () => void;
    /** The line at the foot while the course is live in Tutors on this computer (ADR 0042). */
    live: { line: string; updating: boolean; onOpen: () => void; onStop: () => void } | null;
  }
  let {
    title,
    errors,
    map,
    selected,
    selectedNode,
    showFileNames,
    onSelect,
    onArrange,
    onFiles,
    onOwn,
    own,
    checkOpen,
    publishingOpen,
    historyOpen,
    onCheck,
    onHistory,
    onSettings,
    onClose,
    live,
  }: Props = $props();
</script>

<aside class="sidebar" aria-label="Contents">
  <header>
    <h1>{title}</h1>
    <p class="summary" class:has-errors={errors > 0} role="status">
      {errors === 0 ? "Everything checks out." : `${errors} ${errors === 1 ? "thing" : "things"} to fix before publishing`}
    </p>
  </header>
  <div class="contents">
    <Contents {map} {selected} {showFileNames} {onSelect} {onArrange} {onOwn} {onFiles} />
  </div>
  {#if own}
    {@const week = selectedNode?.kind === "topic" ? { path: selectedNode.path, title: selectedNode.title ?? selectedNode.name } : null}
    <MyFiles myFiles={own.myFiles} choose={own.choose} {week} onAdd={own.onAdd} />
  {/if}
  <div class="sidebar-foot">
    <button class={errors === 0 && !checkOpen && !publishingOpen ? "next" : "secondary"} aria-pressed={checkOpen} onclick={onCheck}>Check and publish</button>
    {#if live !== null}
      <p class="live">
        <span role="status" class:updating={live.updating}>{live.line}</span> ·
        <button class="link" onclick={live.onOpen}>Open</button> ·
        <button class="link" onclick={live.onStop}>Stop</button>
      </p>
    {/if}
    <div class="quiet-links">
      <button class="link" aria-pressed={historyOpen} onclick={onHistory}>Changes</button>
      <button class="link" onclick={onSettings}>Settings</button>
      <button class="link" onclick={onClose}>Your courses</button>
    </div>
  </div>
</aside>

<style>
  .sidebar {
    background: var(--ui-surface);
    border-right: 1px solid var(--ui-border);
    padding: var(--space-4);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .contents {
    flex: 1;
    min-height: 0;
    /* A long course scrolls inside the contents, so it never runs under the actions below it. */
    overflow-y: auto;
  }
  h1 {
    margin: var(--space-1) 0;
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
  }
  .summary {
    margin: 0;
    font-size: var(--font-label);
    color: var(--ui-success);
  }
  .summary.has-errors {
    color: var(--ui-danger);
  }
  /* One column when the window is narrow, or when large text would leave the contents taking most of it (WCAG 1.4.10). */
  @media (max-width: 860px) {
    .sidebar {
      border-right: none;
      border-bottom: 1px solid var(--ui-border);
    }
  }
  @media (max-width: 1400px) {
    :global(:root[data-text-size="175"]) .sidebar,
    :global(:root[data-text-size="200"]) .sidebar {
      border-right: none;
      border-bottom: 1px solid var(--ui-border);
    }
  }
  .sidebar-foot {
    display: grid;
    gap: var(--space-2);
  }
  .live {
    margin: 0;
    font-size: var(--font-label);
    color: var(--ui-muted);
  }
  .live .updating {
    color: var(--ui-ink);
    font-weight: var(--weight-semibold);
  }
  .quiet-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0 var(--space-4);
  }
  .link {
    font: inherit;
    font-size: var(--font-label);
    min-height: 44px;
    padding: 0;
    border: none;
    background: none;
    color: var(--ui-muted);
    cursor: pointer;
  }
  .link:hover {
    color: var(--ui-ink);
    text-decoration: underline;
  }
  .next {
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
    border: none;
    background: var(--ui-brand);
    color: var(--ui-on-brand);
    cursor: pointer;
  }
  .next:hover {
    background: var(--ui-brand-hover);
  }
  .secondary {
    min-height: 44px;
    font: inherit;
    font-size: var(--font-control);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
    cursor: pointer;
  }
</style>
