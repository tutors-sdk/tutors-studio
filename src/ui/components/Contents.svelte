<script lang="ts">
  import { publishedFirst, type MapNode } from "../../domain/course-map.ts";

  let { map, selected, showFileNames, onSelect }: { map: MapNode; selected: string; showFileNames: boolean; onSelect: (path: string) => void } = $props();

  const CONTAINERS = ["topic", "unit", "side"];
  const isEntry = (node: MapNode) => node.unpublished || CONTAINERS.includes(node.kind ?? "");
  const entriesIn = (node: MapNode, depth: number): { node: MapNode; depth: number }[] =>
    publishedFirst(node.children.filter(isEntry)).flatMap((child) => [
      { node: child, depth },
      ...(child.kind === "unit" || child.kind === "side" ? entriesIn(child, depth + 1) : []),
    ]);
  const entries = $derived(entriesIn(map, 0));

  const needsFixing = (node: MapNode): boolean => node.status === "error" || node.children.some(needsFixing);
  const isOpen = (path: string) => selected === path || selected.startsWith(`${path}/`);
</script>

<nav aria-label="Weeks in this course">
  <ul>
    <li>
      <button class="entry" aria-current={selected === "" ? "page" : undefined} onclick={() => onSelect("")}><span class="title">Course home</span></button>
    </li>
    {#each entries as { node, depth } (node.path)}
      <li>
        <button
          class="entry"
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
