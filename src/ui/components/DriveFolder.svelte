<script lang="ts">
  import type { DriveLink } from "../../application/use-cases/drive.ts";

  interface Props {
    drive: DriveLink;
    /** What the button says: "Add a Google Drive folder", "Use a Google Drive folder". */
    label: string;
    /** The folder the lecturer chose, as the library keeps it. */
    onFolder: (folder: string) => void;
  }
  let { drive, label, onFolder }: Props = $props();

  const id = $props.id();
  let open = $state(false);
  let signedIn = $state<boolean | null>(null);
  let link = $state("");
  let problem = $state("");
  let busy = $state(false);

  async function show() {
    open = !open;
    problem = "";
    if (open) signedIn = await drive.signedIn();
  }
  async function signIn() {
    busy = true;
    problem = "";
    try {
      const signed = await drive.signIn();
      if (!signed.ok) problem = signed.reason;
      signedIn = await drive.signedIn();
    } finally {
      busy = false;
    }
  }
  async function add(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    try {
      const found = await drive.folder(link);
      if ("reason" in found) problem = found.reason;
      else {
        problem = "";
        link = "";
        open = false;
        onFolder(found.folder);
      }
    } finally {
      busy = false;
    }
  }
</script>

<div class="drive">
  <button type="button" class="quiet" aria-expanded={open} onclick={show}>{label}</button>
  {#if open && signedIn === false}
    <div class="step">
      <p>Studio needs your Google account to open folders in Drive. It opens and changes only the folders you add here.</p>
      <button type="button" class="quiet" disabled={busy} onclick={signIn}>Sign in to Google</button>
    </div>
  {:else if open && signedIn}
    <form class="step" onsubmit={add}>
      <label>
        Folder link
        <input bind:value={link} placeholder="https://drive.google.com/drive/folders/..." aria-describedby={`${id}-problem`} />
      </label>
      <button type="submit" class="quiet" disabled={busy}>Add</button>
    </form>
  {/if}
  {#if open && problem}<p id={`${id}-problem`} class="problem" role="alert">{problem}</p>{/if}
</div>

<style>
  .drive {
    display: grid;
    gap: var(--space-2);
    justify-items: start;
  }
  .step {
    display: grid;
    gap: var(--space-2);
    width: 100%;
  }
  label {
    display: grid;
    gap: var(--space-1);
    font-size: var(--font-label);
    color: var(--ui-ink);
  }
  input {
    font: inherit;
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--ui-control-border);
    border-radius: var(--radius-control);
    background: var(--ui-surface);
    color: var(--ui-ink);
  }
  p {
    margin: 0;
    font-size: var(--font-label);
    color: var(--ui-muted);
  }
  .problem {
    color: var(--ui-danger);
  }
  button {
    min-height: 44px;
    font: inherit;
    cursor: pointer;
    justify-self: start;
  }
  .quiet {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-label);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--ui-ink);
  }
  .quiet:hover {
    background: var(--ui-raised);
  }
  .quiet:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
