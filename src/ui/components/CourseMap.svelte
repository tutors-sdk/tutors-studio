<script lang="ts">
  import type { MapNode } from "../../domain/course-map.ts";
  import TreeRow from "./TreeRow.svelte";

  let { map, selected, onSelect }: { map: MapNode; selected: string; onSelect: (path: string) => void } = $props();
</script>

<ul class="tree" role="tree" aria-label="Folders in this course">
  <TreeRow node={map} depth={0} {selected} {onSelect} />
</ul>

<style>
  .tree {
    list-style: none;
    margin: 0;
    padding: 0;
  }
</style>
