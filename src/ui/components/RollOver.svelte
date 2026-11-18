<script lang="ts">
  interface Props {
    /** This course's name, for the suggested name of next year's. */
    courseName: string;
    /**
     * Makes next year's course in a folder the lecturer picks and opens it (STU-0199). Answers why not, or
     * null when it was made or the lecturer cancelled the folder choice.
     */
    onRollOver: (answers: { name: string; start: string | null }) => Promise<string | null>;
  }
  let { courseName, onRollOver }: Props = $props();

  const nextYear = (name: string) => {
    const year = /(\d{4})(?!.*\d{4})/.exec(name);
    return year ? name.replace(new RegExp(`${year[1]}(?!.*\\d{4})`), String(Number(year[1]) + 1)) : `${name} next year`;
  };
  let name = $state("");
  let start = $state("");
  let problem = $state<string | null>(null);
  let making = $state(false);
  $effect(() => {
    name = nextYear(courseName);
  });

  async function make(event: SubmitEvent) {
    event.preventDefault();
    making = true;
    problem = null;
    try {
      problem = await onRollOver({ name, start: start === "" ? null : start });
    } finally {
      making = false;
    }
  }
</script>

<details class="roll-over">
  <summary>Start next year from this one</summary>
  <form onsubmit={make}>
    <p class="hint">Studio makes a new course folder with the same weeks, content and outcomes, and no release dates. This course stays as it is.</p>
    <label>
      Next year's name
      <input bind:value={name} required />
    </label>
    <label>
      Teaching starts
      <input type="date" bind:value={start} />
      <span class="hint">Optional. The calendar starts on that week's Monday.</span>
    </label>
    {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
    <div class="actions"><button class="quiet" type="submit" disabled={making || name.trim() === ""}>{making ? "Making it…" : "Make next year's course"}</button></div>
  </form>
</details>

<style>
  .roll-over {
    margin: var(--space-6) 0 0;
    padding: var(--space-4) var(--space-5);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
  }
  summary {
    cursor: pointer;
    font-weight: var(--weight-semibold);
    min-height: 44px;
    display: flex;
    align-items: center;
  }
  form {
    display: grid;
    gap: var(--space-3);
    margin-top: var(--space-3);
  }
  label {
    display: grid;
    gap: var(--space-1);
    font-weight: var(--weight-semibold);
  }
  input {
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--ui-control-border);
    border-radius: var(--radius-control);
    background: var(--ui-surface);
    color: var(--ui-ink);
  }
  .hint {
    margin: 0;
    font-weight: var(--weight-regular);
    font-size: var(--font-label);
    color: var(--ui-muted);
  }
  .problem {
    margin: 0;
    color: var(--ui-danger);
  }
  .actions {
    display: flex;
  }
  .quiet {
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
    cursor: pointer;
  }
  .quiet:disabled {
    cursor: default;
    opacity: 0.6;
  }
</style>
