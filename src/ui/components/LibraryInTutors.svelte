<script lang="ts">
  import { libraryShownLine, libraryTutorsLine, showable, type LibraryTutorsProgress } from "../../domain/library-tutors.ts";
  import type { LibraryCourse } from "../../domain/library.ts";
  import type { LibraryShown } from "../../application/use-cases/library-tutors.ts";
  import type { LibraryScreen } from "../app-props.ts";

  interface Props {
    show: NonNullable<LibraryScreen["tutors"]>;
    /** The library's courses as listed now; only the ready ones on this computer are built. */
    courses: readonly LibraryCourse[];
  }
  let { show, courses }: Props = $props();

  const count = $derived(courses.filter(showable).length);
  let working = $state(false);
  let progress = $state<LibraryTutorsProgress | null>(null);
  let outcome = $state<LibraryShown | null>(null);
  let stopping = false;

  async function start() {
    working = true;
    stopping = false;
    outcome = null;
    progress = null;
    try {
      outcome = await show(courses, { progress: (next) => (progress = next), stopped: () => stopping });
    } catch (error) {
      outcome = { ok: false, reason: "Studio couldn't show your library in Tutors.", detail: error instanceof Error ? error.message : String(error) };
    } finally {
      working = false;
      progress = null;
    }
  }
</script>

<section class="in-tutors" aria-label="Your library in Tutors">
  <div class="row">
    <p class="hint">
      See the {count === 1 ? "ready course" : `${count} ready courses`} in Tutors on this computer, on its home page beside the courses you've read there. Studio builds each from a copy
      of its own.
    </p>
    {#if working}
      <button class="quiet" onclick={() => (stopping = true)}>Stop building</button>
    {:else}
      <button class="quiet" disabled={count === 0} onclick={start}>Show your library in Tutors</button>
    {/if}
  </div>
  {#if working}
    <p class="status" role="status" aria-live="polite">{progress === null ? "Getting ready…" : `${libraryTutorsLine(progress)}…`}</p>
  {:else if outcome && outcome.ok}
    <p class="status" role="status">{libraryShownLine(outcome.shown, outcome.unbuilt.length, outcome.stopped)}</p>
    {#if outcome.unbuilt.length > 0}
      <ul class="unbuilt" aria-label="Courses that didn't build">
        {#each outcome.unbuilt as course (course.title)}
          <li>
            <span class="name">{course.title}</span>
            <pre>{course.reason}</pre>
          </li>
        {/each}
      </ul>
    {/if}
  {:else if outcome}
    <p class="status" role="alert">{outcome.reason}</p>
    {#if outcome.detail}<pre>{outcome.detail}</pre>{/if}
  {/if}
</section>

<style>
  .in-tutors {
    margin: var(--space-4) 0;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-control);
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }
  p {
    margin: 0;
    color: var(--ui-muted);
  }
  .hint {
    font-size: var(--font-label);
  }
  .status {
    margin-top: var(--space-3);
    color: var(--ui-ink);
  }
  ul {
    list-style: none;
    margin: var(--space-2) 0 0;
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  .name {
    font-weight: var(--weight-medium);
  }
  pre {
    margin: var(--space-1) 0 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: var(--font-caption);
    color: var(--ui-muted);
  }
  button {
    min-height: 44px;
    flex-shrink: 0;
    padding: var(--space-2) var(--space-3);
    font: inherit;
    font-size: var(--font-label);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--ui-ink);
    cursor: pointer;
  }
  button:hover:not(:disabled) {
    background: var(--ui-raised);
  }
  button:disabled {
    cursor: default;
    color: var(--ui-muted);
  }
</style>
