<script lang="ts">
  import type { PageEntry } from "../../application/ports/authoring.ts";

  /** The pages in a folder, each written in plain language (ADR 0026) or, in Advanced mode, as markdown. */
  interface Props {
    /** The folder's name as the lecturer reads it, for the list's title. */
    heading: string;
    pages: PageEntry[];
    /** Pages saved in this sitting, marked "Saved just now". */
    savedNow: string[];
    showFileNames: boolean;
    onWrite?: (path: string) => void;
    onEdit?: (path: string) => void;
  }
  let { heading, pages, savedNow, showFileNames, onWrite, onEdit }: Props = $props();

  /** A page's name as a lecturer reads it: "01.First-page.md" is "First page". */
  const pageName = (path: string) =>
    path
      .slice(path.lastIndexOf("/") + 1)
      .replace(/\.md$/, "")
      .replace(/^\d+\./, "")
      .replace(/[-_]+/g, " ")
      .trim() || "Page";
  /** "Week 1 lab's pages"; a name ending in s takes the apostrophe alone: "Readings' pages". */
  const pagesTitle = $derived(`${heading}${/s$/i.test(heading) ? "'" : "'s"} ${pages.length === 1 ? "page" : "pages"}`);
  const pageState = (page: PageEntry) => (savedNow.includes(page.path) ? "Saved just now" : page.written ? "Written" : "Not written yet");
</script>

<h3 class="items-title">{pagesTitle}</h3>
<ul class="pages">
  {#each pages as page (page.path)}
    <li>
      <span class="page-name">
        {showFileNames ? page.path.slice(page.path.lastIndexOf("/") + 1) : pageName(page.path)}
        <span class="page-state" class:unwritten={!page.written && !savedNow.includes(page.path)}>{pageState(page)}</span>
      </span>
      <span class="page-actions">
        {#if onWrite}<button class="quiet" onclick={() => onWrite(page.path)}>Write</button>{/if}
        {#if onEdit}<button class="quiet" onclick={() => onEdit(page.path)}>Edit the markdown</button>{/if}
      </span>
    </li>
  {/each}
</ul>

<style>
  .items-title {
    margin: var(--space-8) 0 var(--space-3);
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  .pages {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  .pages li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
  }
  .page-name {
    overflow-wrap: anywhere;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-2);
  }
  .page-state {
    font-size: var(--font-caption);
    padding: 0 var(--space-2);
    border-radius: var(--radius-badge);
    border: 1px solid var(--ui-success);
    color: var(--ui-success);
  }
  .page-state.unwritten {
    border-color: var(--ui-border);
    color: var(--ui-muted);
  }
  .page-actions {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .quiet {
    font: inherit;
    font-size: var(--font-control);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
    cursor: pointer;
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
  }
</style>
