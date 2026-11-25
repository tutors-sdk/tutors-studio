<script lang="ts">
  import { lastPart, type Library, type LibraryCourse, type LibraryItem } from "../../domain/library.ts";
  import { pickable, type ComposePick } from "../../domain/compose.ts";
  import { labelFor } from "../../domain/course-map.ts";
  import type { LibraryScreen, OpenedCourse } from "../app-props.ts";
  import Compose from "./Compose.svelte";
  import Share from "./Share.svelte";

  interface Props {
    library: LibraryScreen;
    /** Asks the lecturer for a folder on this computer; null when they cancelled. Absent in the browser preview. */
    choose?: (title: string) => Promise<string | null>;
    /** Opens a course in Studio: one in the library by its folder, to fix it or work on it, or one just composed. */
    onOpen: (course: string | OpenedCourse) => void;
    onClose: () => void;
  }
  let { library: screen, choose, onOpen, onClose }: Props = $props();
  const shelf = $derived(screen.shelf);

  let folders = $state<string[]>([]);
  let library = $state<Library | null>(null);
  /** The ready course whose weeks and items are shown, by its folder. */
  let shown = $state<string | null>(null);
  let picks = $state<ComposePick[]>([]);
  /** The ready course being shared from, by its folder. */
  let sharing = $state<string | null>(null);
  let searching = $state(false);

  async function search() {
    searching = true;
    try {
      library = await shelf.search();
    } finally {
      searching = false;
    }
  }
  async function load() {
    folders = await shelf.folders();
    await search();
  }
  async function add() {
    const chosen = (await choose?.("Choose a folder where you keep Tutors courses")) ?? null;
    if (chosen === null) return;
    folders = await shelf.add(chosen);
    await search();
  }
  async function remove(folder: string) {
    folders = await shelf.remove(folder);
    await search();
  }
  $effect(() => void load());

  const ready = $derived(library?.courses.filter((course) => course.group === "ready") ?? []);
  const fixing = $derived(library?.courses.filter((course) => course.group === "needs-fixing") ?? []);
  const where = (course: LibraryCourse) =>
    course.entry
      ? `${course.entry.publisher}/${course.entry.name} in ${lastPart(course.entry.registry === "" ? course.library : course.entry.registry)}`
      : course.path === ""
        ? lastPart(course.library)
        : `${lastPart(course.library)}/${course.path}`;
  const folderOf = (course: LibraryCourse) => (course.path === "" ? course.library : `${course.library}/${course.path}`);
  const count = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
  const picked = (course: LibraryCourse, item: LibraryItem) =>
    picks.some((pick) => pick.course.library === course.library && pick.course.path === course.path && pick.item.path === item.path);
  /** A whole week goes in the next week of the new course; an item goes in week 1 until the lecturer moves it. */
  function pick(course: LibraryCourse, item: LibraryItem) {
    const weeks = picks.filter((other) => other.item.kind === "topic").map((other) => other.week);
    const week = item.kind === "topic" ? Math.max(0, ...weeks) + 1 : 1;
    picks = [...picks, { course: { library: course.library, path: course.path, title: course.title }, item, week }];
  }
  /** After a share: the registry joins the library, so what was shared can be picked from. */
  async function shared(registry: string) {
    folders = await shelf.add(registry);
    library = await shelf.search();
  }
  async function create(...args: Parameters<LibraryScreen["create"]>) {
    const made = await screen.create(...args);
    if (made !== null && !("reason" in made)) onOpen(made);
    return made;
  }
</script>

<main class="start library">
  <div class="panel">
    <h1>Your library</h1>
    <p>Folders where you keep Tutors courses. Studio finds every course in them and checks it, and never changes a course there.</p>

    {#if folders.length > 0}
      <ul class="folders" aria-label="Library folders">
        {#each folders as folder (folder)}
          <li>
            <span class="path">{folder}</span>
            <button class="quiet" aria-label={`Take ${lastPart(folder)} out of your library`} onclick={() => remove(folder)}>Take out</button>
          </li>
        {/each}
      </ul>
    {/if}
    {#if choose}<button class={folders.length === 0 ? "primary" : "secondary"} onclick={add}>Add a folder</button>{/if}

    {#if searching}
      <p class="status" role="status">Looking for courses…</p>
    {:else if library}
      {#each library.unread as unread (unread.library)}
        <p class="status" role="status">Studio couldn't search {unread.library}: {unread.message}</p>
      {/each}
      {#if folders.length > 0 && library.courses.length === 0}
        <p class="status" role="status">There are no Tutors courses in these folders yet. A course is a folder with a course.md in it.</p>
      {/if}
      {#if ready.length > 0}
        <h2 id="ready-title">Ready to use ({ready.length})</h2>
        <ul class="courses" aria-labelledby="ready-title">
          {#each ready as course (folderOf(course))}
            <li>
              <span class="name">{course.title}</span>
              <span class="path">{where(course)}</span>
              <span class="facts"
                >{count(course.items.length, "item")}{course.entry
                  ? `, version ${course.entry.version}, ${course.entry.licence}`
                  : course.warnings > 0
                    ? `, ${count(course.warnings, "warning")}`
                    : ""}</span
              >
              <span class="buttons">
                <button
                  class="quiet"
                  aria-expanded={shown === folderOf(course)}
                  aria-label={`Pick from ${course.title}`}
                  onclick={() => (shown = shown === folderOf(course) ? null : folderOf(course))}>Pick from it</button
                >
                {#if !course.entry}
                  <button
                    class="quiet"
                    aria-expanded={sharing === folderOf(course)}
                    aria-label={`Share from ${course.title}`}
                    onclick={() => (sharing = sharing === folderOf(course) ? null : folderOf(course))}>Share</button
                  >
                  <button class="quiet" aria-label={`Open ${course.title}`} onclick={() => onOpen(folderOf(course))}>Open</button>
                {/if}
              </span>
              {#if sharing === folderOf(course)}
                <Share {course} share={screen.share} onShared={shared} onClose={() => (sharing = null)} />
              {/if}
              {#if shown === folderOf(course)}
                <ul class="items" aria-label={`Weeks and items in ${course.title}`}>
                  {#each course.items.filter(pickable) as item (item.path)}
                    <li class:week={item.kind === "topic"}>
                      <span>{labelFor(item.kind)}: {item.title}</span>
                      {#if picked(course, item)}
                        <span class="facts">Picked</span>
                      {:else}
                        <button class="quiet" aria-label={`Pick ${item.title} from ${course.title}`} onclick={() => pick(course, item)}>Pick</button>
                      {/if}
                    </li>
                  {/each}
                </ul>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
      {#if fixing.length > 0}
        <h2 id="fixing-title">Needs fixing ({fixing.length})</h2>
        <p class="hint">Studio lends nothing from these until they check out. Open one, and Check shows what to fix.</p>
        <ul class="courses" aria-labelledby="fixing-title">
          {#each fixing as course (folderOf(course))}
            <li>
              <span class="name">{course.title}</span>
              <span class="path">{where(course)}</span>
              <span class="facts">{count(course.errors, "problem")} to fix</span>
              <span class="buttons"><button class="quiet" aria-label={`Open ${course.title} to fix it`} onclick={() => onOpen(folderOf(course))}>Open</button></span>
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
    {#if picks.length > 0}
      <Compose bind:picks preview={screen.preview} onCreate={create} onRemove={(index) => (picks = picks.filter((_, at) => at !== index))} />
    {:else if ready.length > 0}
      <p class="hint">To make a new course from these, press Pick from it on a course and pick its weeks, lectures and labs.</p>
    {/if}
    <button class="link" onclick={onClose}>Back</button>
  </div>
</main>

<style>
  .library {
    display: grid;
    place-items: center;
    padding: var(--space-8);
    overflow-y: auto;
  }
  .panel {
    width: min(640px, 100%);
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-panel);
    padding: var(--space-10);
  }
  h1 {
    margin: 0 0 var(--space-3);
    font-size: var(--font-heading);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
  }
  h2 {
    margin: var(--space-6) 0 var(--space-2);
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  p {
    margin: 0 0 var(--space-4);
    color: var(--ui-muted);
  }
  .status {
    margin-top: var(--space-4);
    color: var(--ui-ink);
  }
  .hint {
    font-size: var(--font-label);
  }
  ul {
    list-style: none;
    margin: 0 0 var(--space-4);
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  .folders li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }
  .courses > li {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-1) var(--space-3);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-control);
  }
  .buttons {
    grid-row: 1 / span 3;
    grid-column: 2;
    align-self: center;
    display: flex;
    gap: var(--space-2);
  }
  .items {
    grid-column: 1 / -1;
    max-height: 320px;
    overflow-y: auto;
    margin: var(--space-2) 0 0;
    padding: var(--space-2) 0 0;
    border-top: 1px solid var(--ui-border);
  }
  .items li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding-left: var(--space-4);
  }
  .items li.week {
    padding-left: 0;
    font-weight: var(--weight-medium);
  }
  .name {
    font-weight: var(--weight-medium);
  }
  .path,
  .facts {
    font-size: var(--font-caption);
    color: var(--ui-muted);
    overflow-wrap: anywhere;
  }
  button {
    min-height: 44px;
    font: inherit;
    cursor: pointer;
  }
  .primary,
  .secondary {
    font-size: var(--font-control);
    font-weight: var(--weight-medium);
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-control);
  }
  .primary {
    border: none;
    background: var(--ui-brand);
    color: var(--ui-on-brand);
  }
  .primary:hover {
    background: var(--ui-brand-hover);
  }
  .secondary {
    border: 1px solid var(--ui-control-border);
    background: var(--ui-surface);
    color: var(--ui-ink);
  }
  .secondary:hover,
  .quiet:hover {
    background: var(--ui-raised);
  }
  .quiet {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-label);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--ui-ink);
  }
  .link {
    display: block;
    margin-top: var(--space-6);
    padding: var(--space-2) 0;
    font-size: var(--font-label);
    border: none;
    background: none;
    color: var(--ui-muted);
    text-decoration: underline;
  }
</style>
