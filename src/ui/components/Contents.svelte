<script lang="ts">
  import { publishedFirst, type MapNode } from "../../domain/course-map.ts";
  import { dropAction, type ArrangeAction } from "../../domain/arrange.ts";
  import { DRAGGED, draggedPath } from "../dragging.ts";

  interface Props {
    map: MapNode;
    selected: string;
    showFileNames: boolean;
    onSelect: (path: string) => void;
    /** Plans what a drop asks for: an item dropped on a week moves there; a week dropped on a week takes its place (STU-0102). */
    onArrange?: (action: ArrangeAction) => void;
  }
  let { map, selected, showFileNames, onSelect, onArrange }: Props = $props();

  const CONTAINERS = ["topic", "unit", "side"];
  const isEntry = (node: MapNode) => node.unpublished || CONTAINERS.includes(node.kind ?? "");
  const entriesIn = (node: MapNode, depth: number): { node: MapNode; depth: number }[] =>
    publishedFirst(node.children.filter(isEntry)).flatMap((child) => [
      { node: child, depth },
      ...(child.kind === "unit" || child.kind === "side" ? entriesIn(child, depth + 1) : []),
    ]);
  const entries = $derived(entriesIn(map, 0));

  const needsFixing = (node: MapNode): boolean => node.status === "error" || node.children.some(needsFixing);
  let dropTarget = $state<string | null>(null);
  const takesDrops = (node: MapNode) => onArrange !== undefined && !node.excluded && node.kind !== null;
  function dragOver(event: DragEvent, node: MapNode) {
    if (!takesDrops(node) || !event.dataTransfer?.types.includes(DRAGGED)) return;
    event.preventDefault();
    dropTarget = node.path;
  }
  function drop(event: DragEvent, node: MapNode) {
    dropTarget = null;
    const dragged = draggedPath(event);
    if (!onArrange || dragged === null) return;
    event.preventDefault();
    const action = dropAction(map, dragged, node.path);
    if (action) onArrange(action);
  }
  function dragStart(event: DragEvent, node: MapNode) {
    event.dataTransfer?.setData(DRAGGED, node.path);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  }
  const isOpen = (path: string) => selected === path || selected.startsWith(`${path}/`);
</script>

<nav aria-label="Weeks in this course">
  <ul>
    <li>
      <button class="entry" aria-current={selected === "" ? "page" : undefined} onclick={() => onSelect("")}><span class="title">Course home</span></button>
    </li>
    {#each entries as { node, depth } (node.path)}
      <li class:target={dropTarget === node.path} ondragover={(event) => dragOver(event, node)} ondragleave={() => (dropTarget = null)} ondrop={(event) => drop(event, node)}>
        <button
          class="entry"
          draggable={takesDrops(node)}
          ondragstart={(event) => dragStart(event, node)}
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
