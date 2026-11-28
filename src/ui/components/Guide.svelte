<script lang="ts">
  import { guideWords, type GuideStep } from "../../domain/guided.ts";

  interface Props {
    step: GuideStep;
    /** Steps finished out of steps to finish. */
    progress: { done: number; of: number };
    /** At the end: the steps skipped or not done yet. */
    toDo: GuideStep[];
    /** Names the week (the plan shows before anything changes). */
    onTitle: (title: string) => void;
    onSkip: () => void;
    onBack: () => void;
    onGoTo: (step: GuideStep) => void;
    onCheck: () => void;
    onLeave: () => void;
    /** True on the first step: there is nothing to go back to. */
    first: boolean;
  }
  let { step, progress, toDo, onTitle, onSkip, onBack, onGoTo, onCheck, onLeave, first }: Props = $props();
  const words = $derived(guideWords(step));
  let title = $state("");
  $effect(() => {
    // A new step starts with an empty title.
    void step;
    title = "";
  });
  const where = $derived(step.do === "check" ? "The end" : `Week ${step.weekNumber}`);
  const what = (item: GuideStep) => (item.do === "fill" ? `Week ${item.weekNumber}: ${guideWords(item).heading}` : guideWords(item).heading);
  function named(event: SubmitEvent) {
    event.preventDefault();
    if (title.trim() !== "") onTitle(title.trim());
  }
</script>

<section class="guide" aria-labelledby="guide-heading">
  <p class="eyebrow">Guided · {where} · {progress.done} of {progress.of} done</p>
  <div class="bar" role="progressbar" aria-label="Steps done" aria-valuemin="0" aria-valuemax={progress.of} aria-valuenow={progress.done}>
    <span style:width={`${progress.of === 0 ? 100 : (100 * progress.done) / progress.of}%`}></span>
  </div>
  <h2 id="guide-heading">{words.heading}</h2>
  <p class="line">{words.line}</p>

  {#if step.do === "name-week"}
    <form class="title" onsubmit={named}>
      <label for="week-title" class="sr-only">Week {step.weekNumber} title</label>
      <input id="week-title" bind:value={title} placeholder={step.week.title} />
      <button type="submit" class="primary" disabled={title.trim() === ""}>Use this title</button>
    </form>
  {:else if step.do === "fill"}
    <p class="line">Use the upload below, or write it in Studio from the pages listed further down.</p>
  {:else}
    {#if toDo.length > 0}
      <p class="line">{toDo.length === 1 ? "One step is" : `${toDo.length} steps are`} still to do. Come back to {toDo.length === 1 ? "it" : "them"} whenever you are ready:</p>
      <ul class="to-do">
        {#each toDo as item (what(item))}
          <li><button class="link" onclick={() => onGoTo(item)}>{what(item)}</button></li>
        {/each}
      </ul>
    {/if}
    <button class="primary" onclick={onCheck}>Check the course</button>
  {/if}

  <div class="actions">
    <button class="quiet" onclick={onBack} disabled={first}>Previous step</button>
    {#if step.do !== "check"}<button class="quiet" onclick={onSkip}>Skip for now</button>{/if}
    <button class="quiet leave" onclick={onLeave}>Leave the guide</button>
  </div>
</section>

<style>
  .guide {
    max-width: var(--reading-width);
    margin: 0 0 var(--space-8);
    padding: var(--space-6);
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-panel);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .eyebrow {
    margin: 0;
    color: var(--ui-muted);
    font-size: var(--font-caption);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .bar {
    height: var(--space-1);
    background: var(--ui-raised);
    border-radius: var(--radius-control);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--ui-ink);
  }
  h2 {
    margin: var(--space-2) 0 0;
    font-size: var(--font-heading);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
  }
  .line {
    margin: 0;
  }
  .title {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-top: var(--space-2);
  }
  input {
    font: inherit;
    flex: 1 1 16rem;
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--ui-control-border);
    border-radius: var(--radius-control);
    background: var(--ui-canvas);
    color: var(--ui-ink);
  }
  .to-do {
    margin: 0;
    padding-left: var(--space-5);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-4);
  }
  .leave {
    margin-left: auto;
  }
  button {
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
    cursor: pointer;
  }
  button:disabled {
    cursor: default;
    color: var(--ui-disabled-ink);
  }
  .primary {
    align-self: flex-start;
    font-weight: var(--weight-medium);
    border: none;
    background: var(--ui-brand);
    color: var(--ui-on-brand);
  }
  .primary:hover:not(:disabled) {
    background: var(--ui-brand-hover);
  }
  .quiet {
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
  }
  .link {
    min-height: 44px;
    padding: 0;
    border: none;
    background: none;
    color: var(--ui-brand);
    text-decoration: underline;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
</style>
