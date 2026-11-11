<script lang="ts">
  import type { Editor } from "@tiptap/core";
  import type { AttachResult, OpenedPage, PagePlan } from "../../application/ports/authoring.ts";
  import type { Attachment } from "../../domain/attachments.ts";
  import type { DroppedFile } from "../../domain/material.ts";
  import type { Plan } from "../../domain/plan.ts";
  import { CODE_LANGUAGES, DIAGRAM_STARTER, MATHS_STARTER, codeLanguage } from "../../domain/markdown-blocks.ts";

  interface Props {
    opened: OpenedPage;
    /** What students see as this page's name. */
    title: string;
    onPlan: (markdown: string, attachments: readonly Attachment[]) => Promise<PagePlan>;
    onAccept: (plan: Plan) => void;
    onClose: () => void;
    /** Advanced mode: open the same page in the markdown editor. */
    onSource?: () => void;
    /** Notes and lab steps: a file attached to the page, saved in its downloads and linked where the cursor is (ADR 0040). */
    onAttach?: (file: DroppedFile, pending: readonly Attachment[]) => Promise<AttachResult>;
  }
  let { opened, title, onPlan, onAccept, onClose, onSource, onAttach }: Props = $props();

  let attachments = $state<Attachment[]>([]);
  let chooser = $state<HTMLInputElement>();

  /** Attaches each chosen or dropped file and puts a link to it in the text, one after another. */
  async function attachFiles(files: FileList | null | undefined) {
    if (!onAttach || !files || files.length === 0 || !editor) return;
    for (const file of Array.from(files)) {
      const result = await onAttach({ path: file.name, bytes: new Uint8Array(await file.arrayBuffer()) }, attachments);
      if (!result.ok) {
        problem = result.message;
        continue;
      }
      const attached = result.attachment;
      attachments = [...attachments, attached];
      run((c) =>
        c.insertContent([
          { type: "text", text: attached.label, marks: [{ type: "link", attrs: { href: attached.address } }] },
          { type: "text", text: " " },
        ]),
      );
    }
  }
  function dropped(event: DragEvent) {
    if (!onAttach || !event.dataTransfer?.files.length) return;
    event.preventDefault();
    event.stopPropagation();
    void attachFiles(event.dataTransfer.files);
  }

  let host = $state<HTMLElement>();
  let editor = $state<Editor>();
  // Bumped on every change, so the toolbar's pressed states follow the cursor.
  let tick = $state(0);
  let changed = $state(false);
  let plan = $state<Plan | null>(null);
  let problem = $state("");
  let asking = $state<"link" | "picture" | "code" | null>(null);
  let address = $state("");
  let description = $state("");

  $effect(() => {
    if (!host || opened.plainProblem !== null) return;
    let cancelled = false;
    let made: Editor | undefined;
    void import("../plain-writing.ts").then(({ plainEditor, throughPlainWriting }) => {
      if (cancelled || !host) return;
      // The editor reads the page back once, so "changed" means the lecturer changed something, not the formatting.
      const start = throughPlainWriting(opened.markdown);
      made = plainEditor(opened.markdown, host, (markdown) => {
        changed = markdown !== start;
        plan = null;
        problem = "";
      });
      made.on("transaction", () => tick++);
      made.view.dom.setAttribute("aria-label", `${title}, as students will read it`);
      editor = made;
    });
    return () => {
      cancelled = true;
      made?.destroy();
    };
  });

  const active = (name: string, attributes?: Record<string, unknown>) => (void tick, editor?.isActive(name, attributes) ?? false);
  const run = (command: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => {
    if (editor) command(editor.chain().focus()).run();
  };

  const tools: { label: string; pressed: () => boolean; act: () => void }[] = [
    { label: "Heading", pressed: () => active("heading", { level: 2 }), act: () => run((c) => c.toggleHeading({ level: 2 })) },
    { label: "Bold", pressed: () => active("bold"), act: () => run((c) => c.toggleBold()) },
    { label: "Italic", pressed: () => active("italic"), act: () => run((c) => c.toggleItalic()) },
    { label: "Bullets", pressed: () => active("bulletList"), act: () => run((c) => c.toggleBulletList()) },
    { label: "Numbered", pressed: () => active("orderedList"), act: () => run((c) => c.toggleOrderedList()) },
    { label: "Quote", pressed: () => active("blockquote"), act: () => run((c) => c.toggleBlockquote()) },
    { label: "Code", pressed: () => active("code"), act: () => run((c) => c.toggleCode()) },
    { label: "Code block", pressed: () => active("codeBlock"), act: () => (active("codeBlock") ? run((c) => c.toggleCodeBlock()) : ask("code")) },
    {
      label: "Table",
      pressed: () => active("table"),
      act: () => run((c) => c.insertTable({ rows: 3, cols: 2, withHeaderRow: true })),
    },
    {
      label: "Maths",
      pressed: () => active("mathBlock"),
      act: () => run((c) => c.insertContent({ type: "mathBlock", content: [{ type: "text", text: MATHS_STARTER }] })),
    },
    {
      label: "Diagram",
      pressed: () => active("codeBlock", { language: "mermaid" }),
      act: () => run((c) => c.insertContent({ type: "codeBlock", attrs: { language: "mermaid" }, content: [{ type: "text", text: DIAGRAM_STARTER }] })),
    },
    { label: "Link", pressed: () => active("link"), act: () => ask("link") },
    { label: "Picture", pressed: () => false, act: () => ask("picture") },
  ];

  function ask(what: "link" | "picture" | "code") {
    asking = asking === what ? null : what;
    address = what === "link" ? ((editor?.getAttributes("link").href as string | undefined) ?? "") : "";
    description = "";
  }
  function insert(event: SubmitEvent) {
    event.preventDefault();
    const where = address.trim();
    if (asking === "link") run((c) => (where === "" ? c.extendMarkRange("link").unsetLink() : c.extendMarkRange("link").setLink({ href: where })));
    else if (asking === "picture" && where !== "") run((c) => c.setImage({ src: where, alt: description.trim() }));
    else if (asking === "code") run((c) => c.setCodeBlock({ language: codeLanguage(address) }));
    asking = null;
  }

  async function save() {
    if (!editor) return;
    const { pageOf } = await import("../plain-writing.ts");
    const result = await onPlan(pageOf(editor), attachments);
    if (result.ok) plan = result.plan;
    else problem = result.message;
  }
</script>

<section class="editor" aria-labelledby="writing-title">
  <header>
    <div>
      <h2 id="writing-title">{title}</h2>
      <p class="hint">Write the way you would in a word processor. Studio keeps it as the page Tutors shows.</p>
    </div>
    <div class="actions">
      {#if opened.plainProblem === null}<span class="status" class:unsaved={changed} role="status">{changed ? "Unsaved changes" : "Saved on your computer"}</span>{/if}
      {#if opened.plainProblem === null}<button class={plan ? "quiet" : "primary"} disabled={!changed || plan !== null} onclick={save}>Save</button>{/if}
      {#if onSource}<button class="quiet" onclick={onSource}>Edit the markdown</button>{/if}
      <button class="quiet" onclick={onClose}>Close</button>
    </div>
  </header>

  {#if opened.plainProblem !== null}
    <p class="problem" role="alert">{opened.plainProblem}</p>
  {:else}
    {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
    {#if plan}
      {@const accepted = plan}
      <div class="plan" role="group" aria-labelledby="writing-plan">
        <h3 id="writing-plan">Before anything changes</h3>
        <p>
          Studio will save your changes to this page{#if accepted.ops.length > 1}, and the {accepted.ops.length === 2 ? "file" : `${accepted.ops.length - 1} files`} it links to, in this
            page's downloads{/if}. Nothing else is touched.
        </p>
        <div class="actions">
          <button class="primary" onclick={() => onAccept(accepted)}>Save the page</button>
          <button class="quiet" onclick={() => (plan = null)}>Keep writing</button>
        </div>
      </div>
    {/if}

    <div class="toolbar" role="toolbar" aria-label="Formatting">
      {#each tools as tool (tool.label)}
        <button class="tool" aria-pressed={tool.pressed()} onclick={tool.act}>{tool.label}</button>
      {/each}
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
    {#if asking}
      <form class="ask" onsubmit={insert}>
        <label>
          {asking === "link" ? "Web address" : asking === "code" ? "Language, like python or javascript" : "Picture's address"}
          {#if asking === "code"}
            <input bind:value={address} list="code-languages" />
            <datalist id="code-languages"
              >{#each CODE_LANGUAGES as language (language)}<option value={language}></option>{/each}</datalist
            >
          {:else}
            <input bind:value={address} inputmode="url" placeholder={asking === "link" ? "https://" : "img/diagram.png"} />
          {/if}
        </label>
        {#if asking === "picture"}
          <label>
            What it shows, for students who can't see it
            <input bind:value={description} />
          </label>
        {/if}
        <div class="actions">
          <button class="quiet" type="submit"
            >{asking === "link" ? (address.trim() === "" ? "Remove the link" : "Link it") : asking === "code" ? "Add the code block" : "Add the picture"}</button
          >
          <button class="quiet" type="button" onclick={() => (asking = null)}>Cancel</button>
        </div>
      </form>
    {/if}
    <!-- A file dropped in the page is a download in the text; dropped on the week, it is its own card. -->
    <div
      class="page"
      role="presentation"
      bind:this={host}
      ondragovercapture={(event) => onAttach && event.dataTransfer?.types.includes("Files") && event.preventDefault()}
      ondropcapture={dropped}
    ></div>
  {/if}
</section>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    height: 100%;
    min-height: 0;
    max-width: var(--reading-width);
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
  .status {
    align-self: center;
    font-size: var(--font-label);
    color: var(--ui-muted);
  }
  .status.unsaved {
    color: var(--ui-warning);
  }
  .hint {
    color: var(--ui-muted);
    font-size: var(--font-label);
  }
  .actions {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
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
  .chooser {
    display: none;
  }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .ask {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
  }
  label {
    display: grid;
    gap: var(--space-1);
    font-size: var(--font-label);
    color: var(--ui-muted);
    flex: 1 1 14rem;
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
  .tool[aria-pressed="true"] {
    background: var(--ui-selected);
    font-weight: var(--weight-semibold);
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
  .page {
    flex: 1;
    min-height: 16rem;
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
    overflow: auto;
  }
  .page :global(.ProseMirror) {
    min-height: 100%;
    padding: var(--space-5) var(--space-6);
    font-size: var(--font-body);
    line-height: var(--leading-ui);
    color: var(--ui-ink);
    overflow-wrap: anywhere;
    outline: none;
  }
  .page :global(.ProseMirror-focused) {
    outline: var(--studio-focus-width) solid var(--ui-focus);
    outline-offset: -3px;
    border-radius: var(--radius-card);
  }
  .page :global(h1),
  .page :global(h2),
  .page :global(h3) {
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
  }
  .page :global(h1) {
    margin: 0 0 var(--space-4);
    font-size: var(--font-heading);
  }
  .page :global(h2) {
    margin: var(--space-6) 0 var(--space-3);
    font-size: var(--font-section);
  }
  .page :global(a) {
    color: var(--ui-brand);
  }
  .page :global(code) {
    font-family: var(--studio-editor-font);
    font-size: 0.9em;
    padding: 0 var(--space-1);
    border-radius: var(--radius-small);
    background: var(--ui-raised);
  }
  .page :global(pre) {
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-control);
    background: var(--ui-raised);
    overflow-x: auto;
  }
  .page :global(pre code) {
    padding: 0;
    background: none;
  }
  .page :global(blockquote) {
    margin: var(--space-3) 0;
    padding-left: var(--space-4);
    border-left: 3px solid var(--ui-border);
    color: var(--ui-muted);
  }
  .page :global(img) {
    max-width: 100%;
  }
  /* Maths and diagrams are text here; the reader draws them (feature 11). */
  .page :global(pre.maths) {
    font-family: var(--studio-editor-font);
  }
  .page :global(pre.maths)::before,
  .page :global(pre:has(code.language-mermaid))::before {
    display: block;
    margin-bottom: var(--space-1);
    font-family: var(--studio-font-stack);
    font-size: var(--font-caption);
    color: var(--ui-muted);
  }
  .page :global(pre.maths)::before {
    content: "Maths, drawn by the reader";
  }
  .page :global(pre:has(code.language-mermaid))::before {
    content: "Diagram, drawn by the reader";
  }
  .page :global(table) {
    border-collapse: collapse;
    margin: var(--space-3) 0;
  }
  .page :global(th),
  .page :global(td) {
    border: 1px solid var(--ui-border);
    padding: var(--space-1) var(--space-2);
    min-width: 4rem;
    vertical-align: top;
  }
  .page :global(th) {
    background: var(--ui-raised);
    font-weight: var(--weight-semibold);
  }
</style>
