<script lang="ts">
  import type { UploadAsk } from "../../domain/guided.ts";
  import type { DroppedFile } from "../../domain/material.ts";
  import { droppedFiles, fromFiles } from "../dropped-files.ts";

  interface Props {
    /** What this item takes, by its kind (STU-0341). */
    ask: UploadAsk;
    /** Plans the upload; the plan is shown before anything changes (ADR 0004). */
    onUpload: (files: DroppedFile[]) => void;
    /** True when this is the next thing to do on the screen: the button is teal. */
    next?: boolean;
  }
  let { ask, onUpload, next = false }: Props = $props();
  let input = $state<HTMLInputElement | null>(null);
  let over = $state(false);

  async function chosen(event: Event) {
    const element = event.currentTarget as HTMLInputElement;
    const files = await fromFiles([...(element.files ?? [])]);
    element.value = "";
    if (files.length > 0) onUpload(files);
  }
  async function drop(event: DragEvent) {
    event.preventDefault();
    over = false;
    if (event.dataTransfer) {
      const files = await droppedFiles(event.dataTransfer);
      if (files.length > 0) onUpload(files);
    }
  }
</script>

<div
  class="upload"
  class:over
  role="group"
  aria-label={ask.button}
  ondragover={(event) => {
    event.preventDefault();
    over = true;
  }}
  ondragleave={() => (over = false)}
  ondrop={drop}
>
  <input bind:this={input} type="file" accept={ask.accept || undefined} multiple={ask.many} onchange={chosen} hidden />
  <button class={next ? "primary" : "quiet"} onclick={() => input?.click()}>{ask.button}</button>
  <p class="hint">{ask.hint} You can also drop {ask.many ? "files" : "the file"} here.</p>
</div>

<style>
  .upload {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
    margin: 0 0 var(--space-6);
    padding: var(--space-4);
    border: 1px dashed var(--ui-control-border);
    border-radius: var(--radius-control);
  }
  .upload.over {
    border-color: var(--ui-ink);
    background: var(--ui-raised);
  }
  .hint {
    margin: 0;
    color: var(--ui-muted);
    font-size: var(--font-label);
  }
  button {
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    padding: var(--space-2) var(--space-5);
    border-radius: var(--radius-control);
    cursor: pointer;
  }
  .primary {
    font-weight: var(--weight-medium);
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
