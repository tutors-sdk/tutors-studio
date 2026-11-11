<script lang="ts">
  import type { RecentCourse } from "../../application/use-cases/recent-courses.ts";

  interface Props {
    onOpen: () => void;
    onNew: () => void;
    onSettings?: () => void;
    /** The courses opened lately, newest first (feature 9). */
    recent?: RecentCourse[];
    onRecent?: (path: string) => void;
    /** Takes a course off the list; its folder and files stay where they are (STU-0148). */
    onForget?: (path: string) => void;
    /** Why a recent course didn't open, or which course was just forgotten. */
    notice?: string;
    /** Puts the course just forgotten back where it was (STU-0149). */
    onPutBack?: () => void;
  }
  let { onOpen, onNew, onSettings, recent = [], onRecent, onForget, notice = "", onPutBack }: Props = $props();
</script>

<main class="start">
  <div class="panel">
    <h1>Tutors Studio</h1>
    <p>See your course the way Tutors will publish it, and fix what's missing before your students notice.</p>
    {#if notice}
      <p class="notice" role="status">
        {notice}
        {#if onPutBack}<button class="link inline" onclick={onPutBack}>Put it back</button>{/if}
      </p>
    {/if}
    {#if recent.length > 0 && onRecent}
      <h2 id="recent-title">Your courses</h2>
      <ul class="recent" aria-labelledby="recent-title">
        {#each recent as course (course.path)}
          <li>
            <button class="course" onclick={() => onRecent(course.path)}>
              <span class="name">{course.name}</span>
              <span class="path">{course.path}</span>
            </button>
            {#if onForget}
              <button class="forget" aria-label={`Forget ${course.name}`} title="Take it off this list. Its files stay where they are." onclick={() => onForget(course.path)}>
                Forget
              </button>
            {/if}
          </li>
        {/each}
      </ul>
      {#if onForget}<p class="forget-hint">Forget takes a course off this list. Its folder and files stay where they are.</p>{/if}
    {/if}
    <div class="actions">
      <button class="primary" onclick={onNew}>Start a new course</button>
      <button class="secondary" onclick={onOpen}>Load a course</button>
    </div>
    <p class="hint">
      A new course takes two questions: its name, and how many weeks it runs and what a typical week holds. To load a course, point at its folder: a Tutors course opens as it is,
      and a folder of your slides, notes and labs becomes a new course.
    </p>
    {#if onSettings}<button class="link" onclick={onSettings}>Settings</button>{/if}
  </div>
</main>

<style>
  h2 {
    margin: 0 0 var(--space-2);
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  .notice {
    color: var(--ui-ink);
  }
  .recent {
    list-style: none;
    margin: 0 0 var(--space-6);
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  .recent:has(+ .forget-hint) {
    margin-bottom: var(--space-2);
  }
  .recent li {
    display: flex;
    align-items: stretch;
    gap: var(--space-2);
  }
  .forget {
    flex: none;
    min-height: 44px;
    min-width: 44px;
    padding: var(--space-2) var(--space-3);
    font: inherit;
    font-size: var(--font-label);
    border: 1px solid transparent;
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--ui-muted);
    cursor: pointer;
  }
  .forget:hover {
    color: var(--ui-ink);
    border-color: var(--ui-border);
    background: var(--ui-raised);
  }
  p.forget-hint {
    margin: 0 0 var(--space-6);
    font-size: var(--font-caption);
  }
  .course {
    flex: 1;
    min-width: 0;
    width: 100%;
    min-height: 44px;
    display: grid;
    gap: var(--space-1);
    text-align: left;
    font: inherit;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-control);
    background: var(--ui-surface);
    color: var(--ui-ink);
    cursor: pointer;
  }
  .course:hover {
    background: var(--ui-raised);
  }
  .name {
    font-weight: var(--weight-medium);
  }
  .path {
    font-size: var(--font-caption);
    color: var(--ui-muted);
    overflow-wrap: anywhere;
  }
  .link.inline {
    margin: 0 0 0 var(--space-2);
    min-height: 0;
    padding: 0;
    color: var(--ui-ink);
  }
  .link {
    margin-top: var(--space-4);
    padding: var(--space-2) 0;
    font: inherit;
    font-size: var(--font-label);
    border: none;
    background: none;
    color: var(--ui-muted);
    text-decoration: underline;
    cursor: pointer;
    min-height: 44px;
  }
  .start {
    display: grid;
    place-items: center;
    padding: var(--space-8);
  }
  .panel {
    max-width: 480px;
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
  p {
    margin: 0 0 var(--space-6);
    color: var(--ui-muted);
  }
  .hint {
    margin: var(--space-6) 0 0;
    font-size: var(--font-label);
  }
  .primary {
    font: inherit;
    font-size: var(--font-control);
    font-weight: var(--weight-medium);
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-control);
    border: none;
    background: var(--ui-brand);
    color: var(--ui-on-brand);
    cursor: pointer;
  }
  .primary:hover {
    background: var(--ui-brand-hover);
  }
  .primary:active {
    background: var(--ui-brand-pressed);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }
  .secondary {
    font: inherit;
    font-size: var(--font-control);
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-control);
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
    cursor: pointer;
  }
</style>
