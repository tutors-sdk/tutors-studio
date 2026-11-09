<script lang="ts">
  import type { Editor } from "@tiptap/core";
  import type { OpenedPage, PagePlan } from "../../application/ports/authoring.ts";
  import type { Plan } from "../../domain/plan.ts";

  interface Props {
    opened: OpenedPage;
    /** What students see as this page's name. */
    title: string;
    onPlan: (markdown: string) => Promise<PagePlan>;
    onAccept: (plan: Plan) => void;
    onClose: () => void;
    /** Advanced mode: open the same page in the markdown editor. */
    onSource?: () => void;
  }
  let { opened, title, onPlan, onAccept, onClose, onSource }: Props = $props();

  let host = $state<HTMLElement>();
  let editor = $state<Editor>();
  // Bumped on every change, so the toolbar's pressed states follow the cursor.
  let tick = $state(0);
  let changed = $state(false);
  let plan = $state<Plan | null>(null);
  let problem = $state("");
  let asking = $state<"link" | "picture" | null>(null);
  let address = $state("");
  let description = $state("");

  $effect(() => {
    if (!host || opened.plainProblem !== null) return;
    let cancelled = false;
    let made: Editor | undefined;
    void import("../plain-writing.ts").then(({ plainEditor }) => {
      if (cancelled || !host) return;
      // The editor reads the page back once, so "changed" means the lecturer changed something, not the formatting.
      const start = plainEditor(opened.markdown).getMarkdown();
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
    { label: "Code block", pressed: () => active("codeBlock"), act: () => run((c) => c.toggleCodeBlock()) },
    { label: "Link", pressed: () => active("link"), act: () => ask("link") },
    { label: "Picture", pressed: () => false, act: () => ask("picture") },
  ];

  function ask(what: "link" | "picture") {
    asking = asking === what ? null : what;
    address = what === "link" ? ((editor?.getAttributes("link").href as string | undefined) ?? "") : "";
    description = "";
  }
  function insert(event: SubmitEvent) {
    event.preventDefault();
    const where = address.trim();
    if (asking === "link") run((c) => (where === "" ? c.extendMarkRange("link").unsetLink() : c.extendMarkRange("link").setLink({ href: where })));
    else if (asking === "picture" && where !== "") run((c) => c.setImage({ src: where, alt: description.trim() }));
    asking = null;
  }

  async function save() {
    if (!editor) return;
    const result = await onPlan(editor.getMarkdown());
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
        <p>Studio will save your changes to this page. Nothing else is touched.</p>
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
    </div>
    {#if asking}
      <form class="ask" onsubmit={insert}>
        <label>
          {asking === "link" ? "Web address" : "Picture's address"}
          <input bind:value={address} inputmode="url" placeholder={asking === "link" ? "https://" : "img/diagram.png"} />
        </label>
        {#if asking === "picture"}
          <label>
            What it shows, for students who can't see it
            <input bind:value={description} />
          </label>
        {/if}
        <div class="actions">
          <button class="quiet" type="submit">{asking === "link" ? (address.trim() === "" ? "Remove the link" : "Link it") : "Add the picture"}</button>
          <button class="quiet" type="button" onclick={() => (asking = null)}>Cancel</button>
        </div>
      </form>
    {/if}
    <div class="page" bind:this={host}></div>
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
</style>
