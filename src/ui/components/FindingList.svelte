<script lang="ts">
  import type { Explanation } from "../../application/ports/authoring.ts";
  import type { Finding } from "../../domain/finding.ts";

  interface Props {
    /** The findings on this folder, as the lecturer sees them: in the rules' own words. */
    findings: Finding[];
    /** True while another fix waits to be accepted: Fix this stops being the next thing to do. */
    pending: boolean;
    /** Advanced mode: a rename names the folder it gives. */
    showFileNames: boolean;
    onFix: (finding: Finding) => void;
    /** The chosen assistant's name, and how to ask it to explain a finding; absent when none is chosen. */
    assistant?: { name: string; explain: (finding: Finding) => Promise<Explanation> };
  }
  let { findings, pending, showFileNames, onFix, assistant }: Props = $props();

  // Explanations by finding, for this folder only; asking again replaces the answer.
  let explained = $state<Record<string, Explanation | "asking">>({});
  const keyOf = (finding: Finding) => finding.rule + finding.path + finding.message;
  async function explain(finding: Finding) {
    if (!assistant) return;
    explained = { ...explained, [keyOf(finding)]: "asking" };
    const answer = await assistant.explain(finding);
    explained = { ...explained, [keyOf(finding)]: answer };
  }
</script>

<ul class="findings">
  {#each findings as finding (keyOf(finding))}
    <li class={finding.severity}>
      <p>{finding.message}</p>
      {#if finding.suggestedName || finding.fix?.op === "write"}
        <button class={pending ? "quiet" : "primary"} onclick={() => onFix(finding)}
          >{showFileNames && finding.suggestedName ? `Rename to ${finding.suggestedName}` : "Fix this"}</button
        >
      {/if}
      {#if assistant}
        {@const answer = explained[keyOf(finding)]}
        {#if answer === "asking"}
          <p class="explanation" role="status">Asking {assistant.name}…</p>
        {:else if answer?.by === "assistant"}
          <p class="explanation" role="status"><span class="by">{assistant.name} explains:</span> {answer.text}</p>
        {:else if answer}
          <p class="explanation problem" role="status">{answer.problem}</p>
        {:else}
          <button class="quiet explain" onclick={() => explain(finding)}>Ask your AI agent to explain</button>
        {/if}
      {/if}
    </li>
  {/each}
</ul>

<style>
  .findings {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: var(--space-3);
  }
  .findings li {
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-left: 4px solid var(--ui-info);
    border-radius: var(--radius-card);
    padding: var(--space-4);
  }
  .findings li.error {
    border-left-color: var(--ui-danger);
  }
  .findings li.warn {
    border-left-color: var(--ui-warning);
  }
  .findings p {
    margin: 0;
  }
  .primary,
  .explain {
    margin-top: var(--space-3);
  }
  .primary + .explain {
    margin-left: var(--space-2);
  }
  .explanation {
    margin-top: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-control);
    background: var(--ui-raised);
  }
  .explanation.problem {
    color: var(--ui-muted);
  }
  .by {
    font-weight: var(--weight-medium);
  }
  .primary,
  .quiet {
    font: inherit;
    font-size: var(--font-control);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
    cursor: pointer;
  }
  .primary {
    border: none;
    background: var(--ui-brand);
    color: var(--ui-on-brand);
  }
  .primary:hover {
    background: var(--ui-brand-hover);
  }
  .quiet {
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
  }
</style>
