<script lang="ts">
  import type { MapNode } from "../../domain/course-map.ts";
  import Self from "./TreeRow.svelte";

  let { node, depth, selected, onSelect }: { node: MapNode; depth: number; selected: string; onSelect: (path: string) => void } = $props();
  const display = $derived(node.path === "" ? "Course home" : node.name);
</script>

<li role="treeitem" aria-selected={selected === node.path} aria-expanded={node.children.length > 0 ? true : undefined}>
  <button
    class="row"
    class:selected={selected === node.path}
    class:excluded={node.excluded && !node.unpublished}
    style:padding-left="calc({depth} * var(--studio-tree-indent) + var(--space-2))"
    onclick={() => onSelect(node.path)}
  >
    <span class="name">{display}</span>
    {#if node.unpublished}
      <span class="badge danger">Won't be published</span>
    {:else if node.label && node.path !== ""}
      <span class="badge">{node.label}</span>
    {/if}
    {#if node.status === "error" && !node.unpublished}<span class="dot" aria-label="needs fixing"></span>{/if}
  </button>
  {#if node.children.length > 0}
    <ul role="group">
      {#each node.children as child (child.path)}
        <Self node={child} depth={depth + 1} {selected} {onSelect} />
      {/each}
    </ul>
  {/if}
</li>

<style>
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    min-height: var(--studio-tree-row);
    border: none;
    border-radius: var(--radius-small);
    background: transparent;
    color: var(--ui-ink);
    font: inherit;
    font-size: var(--font-label);
    text-align: left;
    cursor: pointer;
  }
  .row.excluded .name {
    color: var(--ui-muted);
    text-decoration: line-through;
  }
  .row:hover {
    background: var(--ui-raised);
  }
  .row.selected {
    background: var(--ui-selected);
    box-shadow: inset 0 -2px 0 var(--ui-brand);
  }
  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .badge {
    font-size: var(--font-caption);
    color: var(--ui-muted);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-badge);
    padding: 0 var(--space-2);
    white-space: nowrap;
  }
  .badge.danger {
    color: var(--ui-danger);
    border-color: var(--ui-danger);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--ui-danger);
    margin-right: var(--space-2);
  }
</style>
