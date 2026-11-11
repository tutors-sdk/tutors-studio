<script lang="ts">
  import type { EditorView } from "@codemirror/view";
  import type { AttachResult, OpenedPage, PagePlan } from "../../application/ports/authoring.ts";
  import type { Attachment } from "../../domain/attachments.ts";
  import type { DroppedFile } from "../../domain/material.ts";
  import type { Plan } from "../../domain/plan.ts";

  interface Props {
    opened: OpenedPage;
    render: (markdown: string) => string;
    onPlan: (markdown: string, attachments: readonly Attachment[]) => Promise<PagePlan>;
    onAccept: (plan: Plan) => void;
    onClose: () => void;
    /** Notes and lab steps: a file attached to the page, saved in its archives/ folder and linked at the cursor (ADR 0040). */
    onAttach?: (file: DroppedFile, pending: readonly Attachment[]) => Promise<AttachResult>;
  }
  let { opened, render, onPlan, onAccept, onClose, onAttach }: Props = $props();

  let attachments = $state<Attachment[]>([]);
  let chooser = $state<HTMLInputElement>();

  async function attachFiles(files: FileList | null | undefined) {
    if (!onAttach || !files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const result = await onAttach({ path: file.name, bytes: new Uint8Array(await file.arrayBuffer()) }, attachments);
      if (!result.ok) {
        problem = result.message;
        continue;
      }
      attachments = [...attachments, result.attachment];
      format(`[${result.attachment.label}](${result.attachment.address})`);
    }
  }

  let host = $state<HTMLElement>();
  let view: EditorView | undefined;
  let source = $state("");
  let preview = $state("");
  let plan = $state<Plan | null>(null);
  let problem = $state("");
  const dirty = $derived(source !== opened.markdown);

  $effect(() => {
    source = opened.markdown;
    preview = render(opened.markdown);
  });
  // A short pause, so a long page isn't redrawn on every key.
  let timer: ReturnType<typeof setTimeout>;
  function changed(text: string) {
    source = text;
    plan = null;
    problem = "";
    clearTimeout(timer);
    timer = setTimeout(() => (preview = render(text)), 150);
  }

  async function save() {
    const result = await onPlan(view?.state.doc.toString() ?? source, attachments);
    if (result.ok) plan = result.plan;
    else problem = result.message;
  }

  $effect(() => {
    if (!host) return;
    let cancelled = false;
    void (async () => {
      const [{ EditorState }, cmView, commands, language, { markdown }, { tags }] = await Promise.all([
        import("@codemirror/state"),
        import("@codemirror/view"),
        import("@codemirror/commands"),
        import("@codemirror/language"),
        import("@codemirror/lang-markdown"),
        import("@lezer/highlight"),
      ]);
      if (cancelled || !host) return;
      const highlight = language.HighlightStyle.define([
        { tag: tags.heading, fontWeight: "600", color: "var(--ui-ink)" },
        { tag: tags.strong, fontWeight: "600" },
        { tag: tags.emphasis, fontStyle: "var(--studio-emphasis-style)" },
        { tag: [tags.link, tags.url], color: "var(--ui-info)" },
        { tag: [tags.monospace, tags.processingInstruction, tags.meta, tags.contentSeparator], color: "var(--ui-muted)" },
      ]);
      view = new cmView.EditorView({
        parent: host,
        state: EditorState.create({
          doc: opened.markdown,
          extensions: [
            cmView.lineNumbers(),
            cmView.drawSelection(),
            cmView.EditorView.lineWrapping,
            commands.history(),
            cmView.keymap.of([{ key: "Mod-s", preventDefault: true, run: () => (void save(), true) }, ...commands.defaultKeymap, ...commands.historyKeymap]),
            markdown(),
            language.syntaxHighlighting(highlight),
            cmView.EditorView.contentAttributes.of({ "aria-label": `Markdown of ${opened.path}` }),
            cmView.EditorView.updateListener.of((update) => {
              if (update.docChanged) changed(update.state.doc.toString());
            }),
          ],
        }),
      });
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      view?.destroy();
    };
  });

  /** Wraps the selection, or starts each selected line, with markdown; focus returns to the text. */
  function format(before: string, after = "", linePrefix = false) {
    if (!view) return;
    const selection = view.state.selection.main;
    if (linePrefix) {
      const line = view.state.doc.lineAt(selection.from);
      view.dispatch({ changes: { from: line.from, insert: before } });
    } else {
      const text = view.state.sliceDoc(selection.from, selection.to);
      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: `${before}${text}${after}` },
        selection: { anchor: selection.from + before.length, head: selection.from + before.length + text.length },
      });
    }
    view.focus();
  }

  const tools: [string, () => void][] = [
    ["Heading", () => format("## ", "", true)],
    ["Bold", () => format("**", "**")],
    ["Italic", () => format("_", "_")],
    ["Link", () => format("[", "](https://)")],
    ["List", () => format("- ", "", true)],
    ["Code", () => format("`", "`")],
  ];
</script>

<section class="editor" aria-labelledby="editor-title">
  <header>
    <div>
      <h2 id="editor-title">Edit page</h2>
      <p class="path">{opened.path}</p>
    </div>
    <div class="actions">
      <button class={plan ? "quiet" : "primary"} disabled={!dirty || plan !== null} onclick={save}>Save</button>
      <button class="quiet" onclick={onClose}>Close</button>
    </div>
  </header>

  {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
  {#if plan}
    {@const accepted = plan}
    <div class="plan" role="group" aria-labelledby="save-plan">
      <h3 id="save-plan">Before anything changes</h3>
      <p>{accepted.summary}. Nothing else is touched.</p>
      <div class="actions">
        <button class="primary" onclick={() => onAccept(accepted)}>Make this change</button>
        <button class="quiet" onclick={() => (plan = null)}>Keep editing</button>
      </div>
    </div>
  {/if}

  <div class="toolbar" role="toolbar" aria-label="Formatting">
    {#each tools as [label, run] (label)}<button class="tool" onclick={run}>{label}</button>{/each}
    {#if onAttach}
      <button class="tool" onclick={() => chooser?.click()}>Attach a file</button>
      <input
        class="chooser"
        type="file"
        multiple
        bind:this={chooser}
        aria-label="Attach a file"
        onchange={(event) => {
          const input = event.currentTarget;
          void attachFiles(input.files).then(() => (input.value = ""));
        }}
      />
    {/if}
  </div>
  <div class="panes">
    <div class="source" bind:this={host}></div>
    <div class="preview" aria-label="Preview">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- markdown-it runs with html: false (ADR 0025) -->
      {@html preview}
    </div>
  </div>
</section>

<style>
  .chooser {
    display: none;
  }
  .editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    height: 100%;
    min-height: 0;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-4);
    flex-wrap: wrap;
  }
  h2 {
    margin: 0;
    font-size: var(--font-heading);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
  }
  h3 {
    margin: 0 0 var(--space-2);
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  p {
    margin: 0;
  }
  .path {
    color: var(--ui-muted);
    font-size: var(--font-label);
    font-family: var(--studio-editor-font);
    overflow-wrap: anywhere;
  }
  .actions {
    display: flex;
    gap: var(--space-2);
  }
  .plan .actions {
    margin-top: var(--space-3);
  }
  .plan {
    padding: var(--space-4);
    border: 1px solid var(--ui-brand);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
  }
  .problem {
    color: var(--ui-danger);
  }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .tool,
  .quiet,
  .primary {
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
    cursor: pointer;
  }
  .tool {
    font-size: var(--font-label);
    padding: var(--space-2) var(--space-3);
    border: none;
    background: transparent;
    color: var(--ui-ink);
  }
  .tool:hover,
  .quiet:hover {
    background: var(--ui-selected);
  }
  .quiet {
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
  }
  .primary {
    border: none;
    background: var(--ui-brand);
    color: var(--ui-on-brand);
  }
  .primary:hover:not(:disabled) {
    background: var(--ui-brand-hover);
  }
  .primary:disabled {
    background: var(--ui-raised);
    color: var(--ui-disabled-ink);
    cursor: default;
  }
  .panes {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(24rem, 100%), 1fr));
    gap: var(--space-3);
  }
  .source,
  .preview {
    min-height: 16rem;
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
    overflow: auto;
  }
  .preview {
    padding: var(--space-5) var(--space-6);
    font-size: var(--font-body);
    overflow-wrap: anywhere;
  }
  .source :global(.cm-editor) {
    height: 100%;
    background: transparent;
    color: var(--ui-ink);
    font-size: var(--font-body);
  }
  .source :global(.cm-editor.cm-focused) {
    outline: var(--studio-focus-width) solid var(--ui-focus);
    outline-offset: -3px;
    border-radius: var(--radius-card);
  }
  .source :global(.cm-scroller) {
    font-family: var(--studio-editor-font);
    line-height: var(--leading-ui);
  }
  .source :global(.cm-content) {
    font-weight: var(--weight-regular);
  }
  .source :global(.cm-gutters) {
    background: transparent;
    color: var(--ui-muted);
    border-right: 1px solid var(--ui-border);
  }
  .source :global(.cm-cursor) {
    border-left-color: var(--ui-ink);
  }
  .source :global(.cm-selectionBackground),
  .source :global(.cm-focused .cm-selectionBackground) {
    background: var(--studio-drop-fill);
  }
  .preview :global(h1),
  .preview :global(h2),
  .preview :global(h3) {
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
  }
  .preview :global(h1) {
    margin: 0 0 var(--space-4);
    font-size: var(--font-heading);
  }
  .preview :global(h2) {
    margin: var(--space-6) 0 var(--space-3);
    font-size: var(--font-section);
  }
  .preview :global(a) {
    color: var(--ui-brand);
  }
  .preview :global(code) {
    font-family: var(--studio-editor-font);
    font-size: 0.9em;
    padding: 0 var(--space-1);
    border-radius: var(--radius-small);
    background: var(--ui-raised);
  }
  .preview :global(pre) {
    padding: var(--space-3);
    border-radius: var(--radius-control);
    background: var(--ui-raised);
    overflow-x: auto;
  }
  .preview :global(pre code) {
    padding: 0;
    background: none;
  }
</style>
