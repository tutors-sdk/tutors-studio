<script lang="ts">
  import type { CardPicture } from "../../domain/course-details.ts";
  import type { DroppedFile } from "../../domain/material.ts";
  import { PICTURE_TYPES } from "../../domain/course-details.ts";

  interface Props {
    /** What the card shows now; named, never drawn (STU-0108). */
    picture: CardPicture | null;
    /** "week", "lab", "course" ... for "The usual icon for a week". */
    kindWord: string;
    onChoose: (file: DroppedFile) => void;
  }
  let { picture, kindWord, onChoose }: Props = $props();
  let input = $state<HTMLInputElement | null>(null);

  async function chosen(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (file) onChoose({ path: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
    if (input) input.value = "";
  }
  const shown = $derived(
    picture === null ? "" : picture.kind === "picture" ? picture.name : picture.kind === "icon" ? "An icon chosen in its settings" : `The usual icon for a ${kindWord}`,
  );
</script>

<div class="picture">
  <p><span class="label">Card picture</span> {shown}</p>
  <input bind:this={input} type="file" accept={PICTURE_TYPES.map((type) => `.${type}`).join(",")} onchange={chosen} hidden />
  <button class="quiet" onclick={() => input?.click()}>Choose a picture</button>
</div>

<style>
  .picture {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
    justify-content: space-between;
  }
  p {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .label {
    display: block;
    font-size: var(--font-label);
    color: var(--ui-muted);
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
</style>
