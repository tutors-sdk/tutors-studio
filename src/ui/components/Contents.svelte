<script lang="ts">
  import { publishedFirst, type MapNode } from "../../domain/course-map.ts";
  import { weekFor, type ArrangeAction, type DropPlace } from "../../domain/arrange.ts";
  import type { DroppedFile } from "../../domain/material.ts";
  import { DRAGGED, OWN, carriesFiles, dropOver, endDrag, ownEntry, startDrag } from "../dragging.ts";
  import { droppedFiles } from "../dropped-files.ts";

  interface Props {
    map: MapNode;
    selected: string;
    showFileNames: boolean;
    onSelect: (path: string) => void;
    /** Plans what a drop asks for: inside a week that can hold the item, else just above or below a row (STU-0144, STU-0145). */
    onArrange?: (action: ArrangeAction) => void;
    /** Something dragged from My files onto a week (feature 5). */
    onOwn?: (week: string, entry: { name: string; path: string; kind: "file" | "dir" }) => void;
    /** Files from the computer dropped on a week, or on a row inside one (STU-0146). */
    onFiles?: (week: string, files: DroppedFile[]) => void;
  }
  let { map, selected, showFileNames, onSelect, onArrange, onOwn, onFiles }: Props = $props();

  const CONTAINERS = ["topic", "unit", "side"];
  const isEntry = (node: MapNode) => node.unpublished || CONTAINERS.includes(node.kind ?? "");
  const entriesIn = (node: MapNode, depth: number): { node: MapNode; depth: number }[] =>
    publishedFirst(node.children.filter(isEntry)).flatMap((child) => [
      { node: child, depth },
      ...(child.kind === "unit" || child.kind === "side" ? entriesIn(child, depth + 1) : []),
    ]);
  const entries = $derived(entriesIn(map, 0));

  const needsFixing = (node: MapNode): boolean => node.status === "error" || node.children.some(needsFixing);
  /** The row a drag is over, and where on it the drop would land. */
  let dropTarget = $state<{ path: string; place: DropPlace } | null>(null);
  let planned: ArrangeAction | null = null;
  const takesDrops = (node: MapNode) => onArrange !== undefined && !node.excluded && node.kind !== null;
  function dragOver(event: DragEvent, node: MapNode) {
    const week = node.excluded ? null : weekFor(map, node.path);
    const own = onOwn !== undefined && node.kind === "topic" && !node.excluded && event.dataTransfer?.types.includes(OWN);
    if (own || (onFiles !== undefined && week !== null && carriesFiles(event))) {
      event.preventDefault();
      dropTarget = { path: own ? node.path : week!, place: "into" };
      return;
    }
    const over = takesDrops(node) && event.dataTransfer?.types.includes(DRAGGED) ? dropOver(event, map, node) : null;
    planned = over?.action ?? null;
    dropTarget = over === null ? null : { path: node.path, place: over.place };
    if (over !== null) event.preventDefault();
  }
  async function drop(event: DragEvent, node: MapNode) {
    const action = planned;
    dropTarget = null;
    planned = null;
    const own = ownEntry(event);
    if (own && onOwn && node.kind === "topic") {
      event.preventDefault();
      onOwn(node.path, own);
      return;
    }
    const week = weekFor(map, node.path);
    if (onFiles && week !== null && carriesFiles(event) && event.dataTransfer) {
      event.preventDefault();
      onFiles(week, await droppedFiles(event.dataTransfer));
      return;
    }
    if (!onArrange || action === null) return;
    event.preventDefault();
    onArrange(action);
  }
  const isOpen = (path: string) => selected === path || selected.startsWith(`${path}/`);
</script>

<nav aria-label="Weeks in this course">
  <ul>
    <li>
      <button class="entry" aria-current={selected === "" ? "page" : undefined} onclick={() => onSelect("")}><span class="title">Course home</span></button>
    </li>
    {#each entries as { node, depth } (node.path)}
      <li
        class:target={dropTarget?.path === node.path && dropTarget.place === "into"}
        class:before={dropTarget?.path === node.path && dropTarget.place === "before"}
        class:after={dropTarget?.path === node.path && dropTarget.place === "after"}
        ondragover={(event) => dragOver(event, node)}
        ondragleave={() => (dropTarget = null)}
        ondrop={(event) => void drop(event, node)}
      >
        <button
          class="entry"
          draggable={takesDrops(node)}
          ondragstart={(event) => startDrag(event, node.path)}
          ondragend={endDrag}
          style:padding-left="calc({depth} * var(--studio-tree-indent) + var(--space-3))"
          aria-current={isOpen(node.path) ? "page" : undefined}
          onclick={() => onSelect(node.path)}
        >
          <span class="title">{node.title ?? node.name}</span>
          {#if showFileNames && node.title}<span class="file">{node.name}</span>{/if}
          {#if node.unpublished}
            <span class="state danger">Won't be published</span>
          {:else if needsFixing(node)}
            <span class="state danger">Needs sorting out</span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>
</nav>

<style>
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 2px;
  }
  .entry {
    display: grid;
    gap: 2px;
    width: 100%;
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
    border: none;
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--ui-ink);
    font: inherit;
    font-size: var(--font-control);
    text-align: left;
    cursor: pointer;
    align-content: center;
  }
  li {
    border-radius: var(--radius-control);
  }
  li.target {
    outline: 2px dashed var(--ui-brand);
    outline-offset: -2px;
  }
  /* A line where the dragged item would go: between rows, never inside one. */
  li.before {
    box-shadow: inset 0 2px 0 var(--ui-brand);
  }
  li.after {
    box-shadow: inset 0 -2px 0 var(--ui-brand);
  }
  .entry:hover {
    background: var(--ui-raised);
  }
  .entry[aria-current="page"] {
    background: var(--ui-selected);
    box-shadow: inset 0 -2px 0 var(--ui-brand);
    font-weight: var(--weight-medium);
  }
  .title {
    overflow-wrap: anywhere;
  }
  .file,
  .state {
    font-size: var(--font-caption);
    font-weight: var(--weight-regular);
    color: var(--ui-muted);
    overflow-wrap: anywhere;
  }
  .state.danger {
    color: var(--ui-danger);
  }
</style>
