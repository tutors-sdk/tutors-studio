<script lang="ts">
  import { tick } from "svelte";
  import type { CompanionAnswer } from "../../application/companion/companion.ts";
  import type { CompanionDestination, Moment, Pose } from "../../application/companion/moments.ts";
  import PaperNote from "./PaperNote.svelte";

  interface Props {
    moment: Moment | null;
    hidden: boolean;
    /** Who answers: the assistant's name, or null for Studio's guide. */
    assistantName: string | null;
    ask: (question: string) => Promise<CompanionAnswer>;
    /** Whether a destination exists on this screen: with no course open, only Settings does. */
    canGo: (place: CompanionDestination) => boolean;
    onGo: (place: CompanionDestination) => void;
    onDismiss: () => void;
    onHide: (hidden: boolean) => void;
  }
  let { moment, hidden, assistantName, ask, canGo, onGo, onDismiss, onHide }: Props = $props();

  const starters = ["How do I add my slides?", "How do I publish this?", "Will this change my course?"];

  let open = $state(false);
  let question = $state("");
  let asking = $state(false);
  let exchanges = $state<{ question: string; answer: CompanionAnswer }[]>([]);
  let input = $state<HTMLInputElement>();
  let opener = $state<HTMLButtonElement>();
  let log = $state<HTMLElement>();

  const pose = $derived<Pose>(asking ? "thinking" : open ? "idle" : (moment?.pose ?? "idle"));
  const speaking = $derived(!open && moment !== null);

  async function toggle() {
    open = !open;
    if (open) {
      onDismiss();
      await tick();
      input?.focus();
    }
  }
  function close() {
    open = false;
    opener?.focus();
  }
  async function submit(text: string) {
    const asked = text.trim();
    if (asked === "" || asking) return;
    question = "";
    asking = true;
    const answer = await ask(asked).catch((): CompanionAnswer => ({ text: "Something went wrong answering that. Try asking again.", action: null, by: "guide" }));
    exchanges = [...exchanges, { question: asked, answer }];
    asking = false;
    await tick();
    log?.scrollTo({ top: log.scrollHeight });
    input?.focus();
  }
  function go(place: CompanionDestination) {
    open = false;
    onGo(place);
  }
  function keydown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    if (open) close();
    else if (moment) onDismiss();
  }
</script>

<svelte:window onkeydown={keydown} />

{#if hidden}
  <button class="bring-back" onclick={() => onHide(false)}>
    <span class="mini"><PaperNote /></span>
    Show helper
  </button>
{:else}
  <aside class="companion" aria-label="Studio helper">
    {#if open}
      <div class="panel" role="group" aria-labelledby="helper-title">
        <div class="panel-head">
          <h2 id="helper-title">What can I help with?</h2>
          <button class="plain" onclick={close}>Close</button>
        </div>
        <div class="log" bind:this={log} aria-live="polite">
          {#if exchanges.length === 0 && !asking}
            <div class="starters">
              {#each starters as starter (starter)}
                <button class="starter" onclick={() => submit(starter)}>{starter}</button>
              {/each}
            </div>
          {/if}
          {#each exchanges as exchange, index (index)}
            <p class="asked">{exchange.question}</p>
            <div class="answer">
              <p>{exchange.answer.text}</p>
              {#if exchange.answer.problem}<p class="problem">{exchange.answer.problem}</p>{/if}
              {#if exchange.answer.action && canGo(exchange.answer.action.goes)}
                <button class="quiet" onclick={() => go(exchange.answer.action!.goes)}>{exchange.answer.action.label}</button>
              {/if}
            </div>
          {/each}
          {#if asking}<p class="waiting" role="status">Thinking…</p>{/if}
        </div>
        <form
          onsubmit={(event) => {
            event.preventDefault();
            void submit(question);
          }}
        >
          <label class="sr" for="helper-question">Your question</label>
          <input id="helper-question" bind:this={input} bind:value={question} placeholder="Ask a question" autocomplete="off" />
          <button class="quiet" disabled={question.trim() === "" || asking}>Ask</button>
        </form>
        <div class="panel-foot">
          <span>{assistantName === null ? "Answers from Studio's guide" : `Answers from ${assistantName}`}</span>
          <button class="plain" onclick={() => onHide(true)}>Hide helper</button>
        </div>
      </div>
    {:else if moment}
      <div class="bubble" role="status">
        <p>{moment.text}</p>
        <div class="bubble-actions">
          {#if moment.action && canGo(moment.action.goes)}
            <button class="quiet" onclick={() => go(moment!.action!.goes)}>{moment.action.label}</button>
          {/if}
          <button class="plain" onclick={onDismiss}>Not now</button>
          <button class="plain" onclick={() => onHide(true)}>Hide helper</button>
        </div>
      </div>
    {/if}
    {#key speaking}
      <button class="note" class:speaking bind:this={opener} aria-expanded={open} aria-label={open ? "Close helper" : "Ask the helper a question"} onclick={toggle}>
        <PaperNote {pose} />
      </button>
    {/key}
  </aside>
{/if}

<style>
  .companion {
    position: fixed;
    right: var(--space-5);
    bottom: var(--studio-companion-bottom, var(--space-4));
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-3);
    max-width: min(26rem, calc(100vw - var(--space-8)));
    pointer-events: none;
  }
  .companion > * {
    pointer-events: auto;
  }
  .note {
    width: var(--studio-note-size);
    height: var(--studio-note-size);
    padding: var(--space-1);
    border: none;
    border-radius: var(--radius-card);
    background: transparent;
    cursor: pointer;
    transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .note:hover {
    transform: translateY(-3px) rotate(-3deg);
  }
  .note.speaking {
    animation: arrive 320ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes arrive {
    from {
      transform: translateY(10px) rotate(6deg);
    }
  }
  .bubble,
  .panel {
    background: var(--ui-surface);
    color: var(--ui-ink);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-panel);
    box-shadow: var(--studio-overlay-shadow);
  }
  .bubble {
    position: relative;
    box-sizing: border-box;
    width: 14rem;
    padding: var(--space-4);
    animation: rise 180ms ease-out;
  }
  .bubble::after {
    content: "";
    position: absolute;
    right: var(--space-8);
    bottom: -7px;
    width: 12px;
    height: 12px;
    background: var(--ui-surface);
    border-right: 1px solid var(--ui-border);
    border-bottom: 1px solid var(--ui-border);
    transform: rotate(45deg);
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  p {
    margin: 0;
  }
  .bubble-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1) var(--space-3);
    margin-top: var(--space-2);
  }
  .panel {
    display: flex;
    flex-direction: column;
    width: min(26rem, calc(100vw - var(--space-8)));
    max-height: min(32rem, calc(100vh - var(--studio-note-size) - var(--space-12)));
    padding: var(--space-4);
    gap: var(--space-3);
  }
  .panel-head,
  .panel-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
  }
  h2 {
    margin: 0;
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
  }
  .panel-foot span {
    color: var(--ui-muted);
    font-size: var(--font-caption);
  }
  .log {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .starters {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .starter {
    font: inherit;
    font-size: var(--font-label);
    text-align: left;
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--ui-ink);
    cursor: pointer;
  }
  .starter:hover,
  .quiet:hover:not(:disabled),
  .plain:hover {
    background: var(--ui-selected);
  }
  .asked {
    align-self: flex-end;
    max-width: 85%;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-card);
    background: var(--ui-selected);
  }
  .answer {
    display: grid;
    gap: var(--space-2);
    justify-items: start;
  }
  .problem,
  .waiting {
    color: var(--ui-muted);
    font-size: var(--font-label);
  }
  form {
    display: flex;
    gap: var(--space-2);
  }
  input {
    flex: 1;
    min-width: 0;
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--ui-control-border);
    border-radius: var(--radius-control);
    background: var(--ui-surface);
    color: var(--ui-ink);
  }
  input::placeholder {
    color: var(--ui-muted);
  }
  .quiet,
  .plain {
    font: inherit;
    font-size: var(--font-label);
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-control);
    color: var(--ui-ink);
    cursor: pointer;
  }
  .quiet {
    border: 1px solid var(--ui-control-border);
    background: transparent;
  }
  .quiet:disabled {
    color: var(--ui-disabled-ink);
    cursor: default;
  }
  .plain {
    border: none;
    background: none;
    color: var(--ui-muted);
  }
  .bring-back {
    position: fixed;
    right: var(--space-5);
    bottom: var(--studio-companion-bottom, var(--space-4));
    z-index: 20;
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font: inherit;
    font-size: var(--font-label);
    min-height: 44px;
    padding: var(--space-1) var(--space-3) var(--space-1) var(--space-2);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-control);
    background: var(--ui-surface);
    color: var(--ui-ink);
    cursor: pointer;
  }
  .mini {
    width: 28px;
    height: 28px;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
