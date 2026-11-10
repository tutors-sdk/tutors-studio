<script lang="ts">
  import type { MyFiles, OwnEntry } from "../../application/use-cases/my-files.ts";
  import { OWN } from "../dragging.ts";

  interface Props {
    myFiles: MyFiles;
    /** Asks the lecturer for their folder; null when they cancelled. */
    choose: () => Promise<string | null>;
    /** The week open on the course map, to add to by a button as well as by dragging. */
    week: { path: string; title: string } | null;
    onAdd: (week: string, entry: OwnEntry) => void;
  }
  let { myFiles, choose, week, onAdd }: Props = $props();

  let folder = $state<string | null>(null);
  let dir = $state("");
  let entries = $state<OwnEntry[]>([]);
  let problem = $state("");

  async function show(path: string) {
    try {
      entries = await myFiles.listing(path);
      dir = path;
      problem = "";
    } catch (error) {
      problem = `Studio couldn't read that folder: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  async function pick() {
    const chosen = await choose();
    if (chosen === null) return;
    try {
      folder = await myFiles.open(chosen);
      await show("");
    } catch (error) {
      problem = `Studio couldn't open that folder: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  const up = () => show(dir.includes("/") ? dir.slice(0, dir.lastIndexOf("/")) : "");
  function dragStart(event: DragEvent, entry: OwnEntry) {
    event.dataTransfer?.setData(OWN, JSON.stringify(entry));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
  }
</script>

<section class="mine" aria-labelledby="my-files-title">
  <h2 id="my-files-title">My files</h2>
  {#if folder === null}
    <p class="hint">Keep your own slides, notes and labs beside the course, and drag them onto a week.</p>
    <button class="quiet" onclick={pick}>Choose your folder…</button>
  {:else}
    <p class="where">
      {folder}{dir === "" ? "" : ` / ${dir}`}
      {#if dir !== ""}<button class="link" onclick={up}>Up</button>{/if}
      <button class="link" onclick={pick}>Another folder</button>
    </p>
    {#if entries.length === 0}<p class="hint">Nothing here yet.</p>{/if}
    <ul>
      {#each entries as entry (entry.path)}
        <li draggable="true" ondragstart={(event) => dragStart(event, entry)}>
          {#if entry.kind === "dir"}
            <button class="entry" onclick={() => show(entry.path)} aria-label={`Open the folder ${entry.name}`}>{entry.name}/</button>
          {:else}
            <span class="entry">{entry.name}</span>
          {/if}
          {#if week}<button class="link add" onclick={() => onAdd(week.path, entry)} aria-label={`Add ${entry.name} to ${week.title}`}>Add</button>{/if}
        </li>
      {/each}
    </ul>
    <p class="hint">Drag a file or folder onto a week. Studio copies it in and never changes your folder.</p>
  {/if}
  {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
</section>

<style>
  .mine {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border-top: 1px solid var(--ui-border);
  }
  h2 {
    margin: 0;
    font-size: var(--font-label);
    font-weight: var(--weight-semibold);
    color: var(--ui-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  p {
    margin: 0;
  }
  .hint,
  .where {
    font-size: var(--font-caption);
    color: var(--ui-muted);
    overflow-wrap: anywhere;
  }
  .problem {
    font-size: var(--font-caption);
    color: var(--ui-danger);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 16rem;
    overflow-y: auto;
  }
  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
    min-height: 32px;
    cursor: grab;
  }
  .entry {
    font: inherit;
    font-size: var(--font-label);
    overflow-wrap: anywhere;
    text-align: left;
    padding: 0;
    border: none;
    background: none;
    color: var(--ui-ink);
  }
  button.entry {
    cursor: pointer;
    text-decoration: underline;
  }
  .quiet {
    font: inherit;
    font-size: var(--font-label);
    min-height: 44px;
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--ui-control-border);
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--ui-ink);
    cursor: pointer;
    justify-self: start;
  }
  .link {
    font: inherit;
    font-size: var(--font-caption);
    padding: 0 var(--space-1);
    border: none;
    background: none;
    color: var(--ui-brand);
    text-decoration: underline;
    cursor: pointer;
  }
</style>
