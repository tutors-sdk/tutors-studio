<script lang="ts">
  import type { Preview } from "../../application/ports/authoring.ts";

  interface Props {
    previews: Preview[];
  }
  let { previews }: Props = $props();

  const nameOf = (file: string) => file.slice(file.lastIndexOf("/") + 1);

  /**
   * One slide as its own sandboxed document: Marp's theme CSS and the slide, with no scripts allowed, so
   * a deck shows exactly what the reader's sanitised slide shows and can run nothing.
   */
  const slideDocument = (css: string, slide: string) =>
    `<!doctype html><html><head><meta charset="utf-8"><style>${css}html,body{margin:0;background:transparent}div.marpit>svg{display:block;width:100%;height:auto}</style></head><body><div class="marpit">${slide}</div></body></html>`;
</script>

{#each previews as preview (preview.file + preview.kind)}
  <section class="preview" aria-label={preview.kind === "slides" ? `Slides of ${nameOf(preview.file)}` : `Diagrams in ${nameOf(preview.file)}`}>
    {#if preview.kind === "slides"}
      <h3>Slides: {nameOf(preview.file)}</h3>
      <ol class="slides">
        {#each preview.slides as slide, index (index)}
          <li>
            <iframe title={`Slide ${index + 1} of ${nameOf(preview.file)}`} sandbox="" srcdoc={slideDocument(preview.css, slide)}></iframe>
          </li>
        {/each}
      </ol>
    {:else}
      <h3>Diagrams: {nameOf(preview.file)}</h3>
      {#each preview.diagrams as diagram (diagram.line)}
        <figure class="diagram">
          {#if diagram.svg !== null}
            <!-- Mermaid's own SVG, rendered with securityLevel "strict" as the reader renders it. -->
            {@html diagram.svg}
          {:else}
            <p class="missing">Not drawn. The finding above says why.</p>
          {/if}
          <figcaption>From line {diagram.line}</figcaption>
        </figure>
      {/each}
    {/if}
  </section>
{/each}

<style>
  .preview {
    margin-top: var(--space-6);
  }
  h3 {
    margin: 0 0 var(--space-3);
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  .slides {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: var(--space-3);
  }
  iframe {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
  }
  .diagram {
    margin: 0 0 var(--space-4);
    padding: var(--space-4);
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    overflow-x: auto;
  }
  .diagram :global(svg) {
    max-width: 100%;
    height: auto;
  }
  figcaption,
  .missing {
    margin: var(--space-2) 0 0;
    color: var(--ui-muted);
    font-size: var(--font-caption);
  }
</style>
