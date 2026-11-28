<script lang="ts">
  import { untrack } from "svelte";
  import type { GuideStep } from "../../domain/guided.ts";
  import type { CourseSession } from "../course-session.svelte.ts";
  import { placeOf } from "../guide-session.svelte.ts";
  import Guide from "./Guide.svelte";

  interface Props {
    /** The open course; its guide lasts as long as it is open (ADR 0071). */
    session: CourseSession;
    /** True on the course home, where the guide is offered while it isn't running. */
    home: boolean;
    /** Shows a place on the course map. */
    onShow: (path: string) => void;
    onCheck: () => void;
  }
  let { session, home, onShow, onCheck }: Props = $props();
  const guide = $derived(session.guide);
  /** Shows a guide step's place on the course map: its week, its item, or the course home for the check. */
  // Only while the guide is on screen: a step read back after the lecturer opened Check or publishing must
  // not close what they opened.
  let shown = true;
  $effect(() => () => (shown = false));
  const follow = (step: GuideStep | null) => shown && step && onShow(placeOf(step));

  // A course made in guided mode starts it as it opens (STU-0348); after that, each change read back in is a
  // chance to move on, when the step the guide is on is now done (STU-0350).
  $effect(() => {
    void session.view;
    const current = guide;
    const pending = current.startPending;
    untrack(() => {
      if (pending) {
        current.startPending = false;
        void current.start().then(follow);
      } else if (current.active) void current.refresh().then(follow);
    });
  });
</script>

{#if guide.step}
  {@const step = guide.step}
  <Guide
    {step}
    progress={guide.progress}
    toDo={guide.toDo}
    first={guide.at === 0}
    onTitle={(title) => step.do === "name-week" && session.arrange({ action: "retitle", item: step.week.path, title })}
    onSkip={() => follow(guide.skip())}
    onBack={() => follow(guide.back())}
    onGoTo={(to) => follow(guide.goTo(to))}
    {onCheck}
    onLeave={() => guide.leave()}
  />
{:else if home}
  <p class="offer">
    New to Studio? <button class="link" onclick={() => void guide.start().then(follow)}>Guide me through the course, week by week</button>
  </p>
{/if}

<style>
  .offer {
    max-width: var(--reading-width);
    margin: 0 0 var(--space-6);
    color: var(--ui-muted);
  }
  .link {
    font: inherit;
    min-height: 44px;
    padding: 0;
    border: none;
    background: none;
    color: var(--ui-brand);
    text-decoration: underline;
    cursor: pointer;
  }
</style>
