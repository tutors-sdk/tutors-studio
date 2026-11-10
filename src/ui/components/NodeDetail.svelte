<script lang="ts">
  import { lecturerFindings } from "../../domain/finding.ts";
  import { labelFor, publishedFirst, weekFlag, type MapNode, type WeekState } from "../../domain/course-map.ts";
  import type { Finding } from "../../domain/finding.ts";
  import type { Plan } from "../../domain/plan.ts";
  import type { Explanation, PageEntry } from "../../application/ports/authoring.ts";
  import DropZone from "./DropZone.svelte";
  import AddItem from "./AddItem.svelte";
  import MakeVisible from "./MakeVisible.svelte";
  import type { ItemPlan, MaterialPlan } from "../../application/ports/authoring.ts";
  import type { DroppedFile } from "../../domain/material.ts";
  import { stepAction, type ArrangeAction, type DropPlace } from "../../domain/arrange.ts";
  import { DRAGGED, dropOver, endDrag, startDrag } from "../dragging.ts";
  import Arrange from "./Arrange.svelte";
  import CardPictureRow from "./CardPicture.svelte";
  import CourseDetailsForm from "./CourseDetails.svelte";
  import type { CardPicture, CourseDetails } from "../../domain/course-details.ts";
  import type { ArrangePlan } from "../../application/ports/authoring.ts";
  import LabStepsPanel from "./LabSteps.svelte";
  import type { LabChange, LabStep } from "../../domain/lab-steps.ts";

  interface Props {
    node: MapNode;
    pending: Plan | null;
    onFix: (finding: Finding) => void;
    onAccept: () => void;
    onCancel: () => void;
    /** Opens the quiz designer: on a new quiz in this folder, or on this quiz folder's quiz. */
    onQuiz?: (folder: string) => void;
    /** Plans dropped material for this folder (a topic, or the course); without it there is no drop zone. */
    onMaterial?: (folder: string, files: DroppedFile[]) => Promise<MaterialPlan>;
    onAcceptMaterial?: (plan: Plan) => void;
    /** Plans a new item named in the lecturer's words (a lab in a week, a week in the course); without it there is no form. */
    onItem?: (folder: string, word: string, title: string, address: string) => Promise<ItemPlan>;
    /** For a folder Tutors leaves out: where it sits ("week" or "course"), and how to plan making it visible by its plain name. */
    visible?: { scope: "week" | "course"; plan: (folder: string, word: string) => Promise<ItemPlan> };
    /** The chosen assistant's name ("Claude"), and how to ask it to explain a finding; absent when none is chosen. */
    assistant?: { name: string; explain: (finding: Finding) => Promise<Explanation> };
    /** Advanced mode's extras: file names, and editing a page's markdown. */
    showFileNames?: boolean;
    onEdit?: (path: string) => void;
    /** The pages in this folder, and how to write one in plain language (ADR 0026). */
    pages?: PageEntry[];
    /** Pages saved in this sitting, marked "Saved just now". */
    savedNow?: string[];
    onWrite?: (path: string) => void;
    /** The week this item sits in, to go back to. */
    parent?: { path: string; title: string } | null;
    onSelect?: (path: string) => void;
    /** Files from My files to plan as dropped here, and putting a file left in the tray in a week (feature 5). */
    incoming?: DroppedFile[] | null;
    onPlace?: (week: string, file: DroppedFile) => void;
    /** Each week's state, for the course home (feature 9). */
    weekStates?: Record<string, WeekState>;
    /** The weeks changed since the course was last published, marked so on the course home (STU-0139). */
    weeksChanged?: string[];
    /** Reordering, moving, renaming, hiding and removing (STU-0095 to STU-0103): each asks for a plan, shown here before anything changes. */
    arrange?: {
      root: MapNode;
      places: { path: string; title: string }[];
      proposal: { summary: string; notes: string[] } | null;
      onArrange: (action: ArrangeAction) => void;
      onAccept: () => void;
      onCancel: () => void;
      /** Shows any other plan in the same box: course details and card pictures (STU-0104 to STU-0108). */
      onPropose: (planned: Promise<ArrangePlan>) => void | Promise<void>;
      details: () => Promise<CourseDetails>;
      planDetails: (wanted: { title: string; credits: string; start: string | null }) => Promise<ArrangePlan>;
      cardPicture: (folder: string) => Promise<CardPicture>;
      planPicture: (folder: string, file: DroppedFile) => Promise<ArrangePlan>;
      /** The lab builder (feature 10): a lab's steps, and the plan for a change to them. */
      labSteps?: (lab: string) => Promise<LabStep[]>;
      planLabStep?: (lab: string, change: LabChange) => Promise<ArrangePlan>;
      /** The assistant that proposes (feature 13): a lab drafted from notes, a week's titles and order, each as a plan. */
      planLabDraft?: (lab: string, notes: string) => Promise<ArrangePlan>;
      planWeekSuggestion?: (week: string) => Promise<ArrangePlan>;
    };
  }
  let {
    node,
    pending,
    onFix,
    onAccept,
    onCancel,
    onQuiz,
    onMaterial,
    onAcceptMaterial,
    onItem,
    visible,
    assistant,
    showFileNames = false,
    pages = [],
    savedNow = [],
    onEdit,
    onWrite,
    parent = null,
    onSelect,
    incoming = null,
    onPlace,
    weekStates = {},
    weeksChanged = [],
    arrange,
  }: Props = $props();
  const resourceTints = ["topic", "talk", "lab", "video", "web", "notebook", "quiz"];
  const tintOf = (kind: string | null) => (resourceTints.includes(kind ?? "") ? `var(--ui-resource-${kind})` : "var(--ui-raised)");
  const needsFixing = (item: MapNode): boolean => item.status === "error" || item.children.some(needsFixing);
  const itemsLabel = $derived(node.path === "" ? "Your weeks" : node.excluded ? "In here, but students won't see it yet" : "What students will see");

  // Explanations by finding, for this folder only; asking again replaces the answer.
  let explained = $state<Record<string, Explanation | "asking">>({});
  const keyOf = (finding: Finding) => finding.rule + finding.path + finding.message;
  $effect(() => {
    void node.path;
    explained = {};
  });
  async function explain(finding: Finding) {
    if (!assistant) return;
    explained = { ...explained, [keyOf(finding)]: "asking" };
    const answer = await assistant.explain(finding);
    explained = { ...explained, [keyOf(finding)]: answer };
  }
  /** What to call a folder; inside an unpublished week there's no title, and its raw name is for Advanced mode. */
  const nameOf = (item: MapNode) => item.title ?? (showFileNames || !item.excluded || item.unpublished ? item.name : (labelFor(item.kind) ?? "Untitled"));
  /** A page's name as a lecturer reads it: "01.First-page.md" is "First page". */
  const pageName = (path: string) =>
    path
      .slice(path.lastIndexOf("/") + 1)
      .replace(/\.md$/, "")
      .replace(/^\d+\./, "")
      .replace(/[-_]+/g, " ")
      .trim() || "Page";
  const heading = $derived(node.path === "" ? (node.title ?? "Course home") : nameOf(node));
  /** "Week 1 lab's pages"; a name ending in s takes the apostrophe alone: "Readings' pages". */
  const pagesTitle = $derived(`${heading}${/s$/i.test(heading) ? "'" : "'s"} ${pages.length === 1 ? "page" : "pages"}`);
  const pageState = (page: PageEntry) => (savedNow.includes(page.path) ? "Saved just now" : page.written ? "Written" : "Not written yet");
  const shownFindings = $derived(showFileNames ? node.findings : lecturerFindings(node.findings));
  const mustFix = $derived(node.findings.filter((finding) => finding.severity === "error").length);
  const takesMaterial = $derived(!node.excluded && (node.kind === "topic" || node.path === ""));
  const addsTo = $derived(node.excluded ? null : node.kind === "topic" ? "week" : node.path === "" || node.kind === "unit" || node.kind === "side" ? "course" : null);
  const arrangeable = (item: MapNode) => arrange !== undefined && item.kind !== null && item.path !== "" && !item.excluded;
  /** The row a drag is over, and where on it the drop would land (STU-0144, STU-0145). */
  let dropTarget = $state<{ path: string; place: DropPlace } | null>(null);
  let planned: ArrangeAction | null = null;
  function dragOver(event: DragEvent, item: MapNode) {
    if (!arrange || !arrangeable(item) || !event.dataTransfer?.types.includes(DRAGGED)) return;
    const over = dropOver(event, arrange.root, item);
    planned = over?.action ?? null;
    dropTarget = over === null ? null : { path: item.path, place: over.place };
    if (over !== null) event.preventDefault();
  }
  function drop(event: DragEvent) {
    const action = planned;
    dropTarget = null;
    planned = null;
    if (!arrange || action === null) return;
    event.preventDefault();
    arrange.onArrange(action);
  }
  // A plan asked for further down the page (a picture, the details) is brought into view.
  let planBox = $state<HTMLElement | null>(null);
  $effect(() => {
    if (arrange?.proposal && planBox) planBox.scrollIntoView({ block: "nearest" });
  });
  // The card picture and course details, read again whenever the course is (a new map is a new reading).
  let picture = $state<CardPicture | null>(null);
  let details = $state<CourseDetails | null>(null);
  let labSteps = $state<LabStep[] | null>(null);
  $effect(() => {
    const path = node.path;
    const reading = arrange;
    void reading?.root;
    picture = null;
    labSteps = null;
    if (!reading || node.excluded) return;
    if (node.kind === "lab" && reading.labSteps)
      void reading.labSteps(path).then((found) => {
        if (node.path === path) labSteps = found;
      });
    void reading.cardPicture(path).then((found) => {
      if (node.path === path) picture = found;
    });
    if (path === "") void reading.details().then((found) => (details = found));
  });
  const kindWord = (item: MapNode) => (item.path === "" ? "course" : item.kind === "topic" ? "week" : (labelFor(item.kind) ?? "item").toLowerCase());
  const choosePicture = (file: DroppedFile) => arrange?.onPropose(arrange.planPicture(node.path, file));
  const step = (item: MapNode, by: -1 | 1) => (arrange ? stepAction(arrange.root, item.path, by) : null);
  // Asking the assistant for a plan can take a while; say so until its plan, or why there is none, is shown.
  let asking = $state(false);
  async function askFor(planned: Promise<ArrangePlan>) {
    if (!arrange) return;
    asking = true;
    try {
      await arrange.onPropose(planned);
    } finally {
      asking = false;
    }
  }
  const holdsQuizzes = $derived(!node.excluded && ["topic", "unit", "side"].includes(node.kind ?? ""));
</script>

<section aria-labelledby="node-title">
  {#if parent && onSelect}<button class="back" onclick={() => onSelect(parent.path)}>Back to {parent.title}</button>{/if}
  <h2 id="node-title">{heading}</h2>
  <p class="kind">
    {node.excluded ? "Won't be published" : node.path === "" ? "Course" : (node.label ?? "")}{#if showFileNames && node.path !== ""}<span class="folder"> · {node.name}</span>{/if}
  </p>

  {#if node.excluded && !node.unpublished}
    <p>This sits inside something that won't be published, so students won't see it either. Sort out the week it's in first.</p>
  {:else if shownFindings.length > 0}
    <h3 class="to-fix">{mustFix === 0 ? "Worth a look" : mustFix === 1 ? "1 thing to sort out" : `${mustFix} things to sort out`}</h3>
    <ul class="findings">
      {#each shownFindings as finding (finding.rule + finding.path + finding.message)}
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
              <button class="quiet explain" onclick={() => explain(finding)}>Ask {assistant.name} to explain</button>
            {/if}
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  {#if pending}
    <div class="plan" role="dialog" aria-modal="false" aria-labelledby="plan-title">
      <h3 id="plan-title">Before anything changes</h3>
      <p>
        {showFileNames
          ? `${pending.summary}. Studio will move the folder and everything in it; nothing else is touched.`
          : pending.ops[0]?.op === "write"
            ? "Studio will add the standard setup Tutors needs to publish. Nothing else is touched."
            : "Studio will rename this so Tutors can publish it. Everything inside stays as it is, and nothing else is touched."}
      </p>
      <div class="actions">
        <button class="primary" onclick={onAccept}>Make this change</button>
        <button class="quiet" onclick={onCancel}>Cancel</button>
      </div>
    </div>
  {/if}

  {#if node.children.length > 0 && onSelect}
    <h3 class="items-title">{itemsLabel}</h3>
    <ul class="items">
      {#each publishedFirst(node.children) as item (item.path)}
        {@const earlier = arrangeable(item) ? step(item, -1) : null}
        {@const later = arrangeable(item) ? step(item, 1) : null}
        <li
          class:target={dropTarget?.path === item.path && dropTarget.place === "into"}
          class:before={dropTarget?.path === item.path && dropTarget.place === "before"}
          class:after={dropTarget?.path === item.path && dropTarget.place === "after"}
          ondragover={(event) => dragOver(event, item)}
          ondragleave={() => (dropTarget = null)}
          ondrop={drop}
        >
          <button class="item" draggable={arrangeable(item)} ondragstart={(event) => startDrag(event, item.path)} ondragend={endDrag} onclick={() => onSelect(item.path)}>
            <span class="type" style:background={item.excluded ? "var(--ui-raised)" : tintOf(item.kind)}>{item.label ?? "Hidden"}</span>
            <span class="item-title">{nameOf(item)}</span>
            {#if item.kind === "topic"}
              {@const flag = weekFlag(item, weekStates[item.path], needsFixing(item), weeksChanged.includes(item.path))}
              {#if flag}<span class="flag" class:ready={flag !== "Needs sorting out" && flag !== "Won't be published"}>{flag}</span>{/if}
            {:else if item.unpublished}<span class="flag">Won't be published</span>{:else if needsFixing(item)}<span class="flag">Needs sorting out</span>{/if}
          </button>
          {#if arrange && (earlier || later)}
            <span class="steps">
              <button class="quiet step" disabled={!earlier} onclick={() => earlier && arrange.onArrange(earlier)} aria-label={`Move ${nameOf(item)} earlier`}>Earlier</button>
              <button class="quiet step" disabled={!later} onclick={() => later && arrange.onArrange(later)} aria-label={`Move ${nameOf(item)} later`}>Later</button>
            </span>
          {/if}
        </li>
      {/each}
    </ul>
    {#if arrange && node.children.some(arrangeable)}<p class="hint">
        Drag an item above or below another to put it there, or onto a week in the contents to move it into that week.
      </p>{/if}
    {#if assistant && arrange?.planWeekSuggestion && node.kind === "topic" && !node.excluded && node.children.some(arrangeable)}
      {@const planWeekSuggestion = arrange.planWeekSuggestion}
      {#if asking}
        <p class="hint" role="status">Asking {assistant.name}…</p>
      {:else}
        <button class="quiet suggest" onclick={() => askFor(planWeekSuggestion(node.path))}>Ask {assistant.name} to suggest titles and an order</button>
      {/if}
    {/if}
  {/if}

  {#if arrange?.proposal}
    <div class="plan" role="dialog" aria-modal="false" aria-labelledby="arrange-plan-title" bind:this={planBox}>
      <h3 id="arrange-plan-title">Before anything changes</h3>
      <p>{arrange.proposal.summary}. Nothing is deleted, and this can be put back from Changes.</p>
      {#each arrange.proposal.notes as note, i (i)}<p class="note">{note}</p>{/each}
      <div class="actions">
        <button class="primary" onclick={arrange.onAccept}>Make this change</button>
        <button class="quiet" onclick={arrange.onCancel}>Cancel</button>
      </div>
    </div>
  {/if}

  {#if onQuiz && node.kind === "quiz" && !node.excluded}
    <button class="quiet quiz" onclick={() => onQuiz(node.path)}>Edit this quiz</button>
  {:else if onQuiz && holdsQuizzes}
    <button class="quiet quiz" onclick={() => onQuiz(node.path)}>Add a quiz</button>
  {/if}

  {#if visible && onAcceptMaterial && node.unpublished}
    {#key node.path}
      <MakeVisible scope={visible.scope} name={nameOf(node)} onPlan={(word) => visible.plan(node.path, word)} onAccept={onAcceptMaterial} {showFileNames} />
    {/key}
  {/if}

  {#if onItem && onAcceptMaterial && addsTo}
    {#key node.path}
      <AddItem scope={addsTo} where={heading} onPlan={(word, title, address) => onItem(node.path, word, title, address)} onAccept={onAcceptMaterial} {showFileNames} />
    {/key}
  {/if}

  {#if onMaterial && onAcceptMaterial && takesMaterial}
    {#key node.path}
      <DropZone
        scope={node.path === "" ? "course" : "topic"}
        where={heading}
        onPlan={(files) => onMaterial(node.path, files)}
        onAccept={onAcceptMaterial}
        {incoming}
        weeks={arrange ? arrange.places.filter((place) => place.path !== "") : []}
        {onPlace}
      />
    {/key}
  {/if}

  {#if arrange && arrangeable(node)}
    {#key node.path}
      <Arrange item={{ path: node.path, title: heading, kind: node.kind }} places={arrange.places} onArrange={arrange.onArrange}>
        <CardPictureRow {picture} kindWord={kindWord(node)} onChoose={choosePicture} />
      </Arrange>
    {/key}
  {/if}

  {#if arrange?.planLabStep && labSteps}
    {@const planLabStep = arrange.planLabStep}
    {#key node.path}
      <LabStepsPanel
        steps={labSteps}
        {showFileNames}
        onChange={(change) => arrange.onPropose(planLabStep(node.path, change))}
        drafter={assistant && arrange.planLabDraft ? assistant.name : undefined}
        drafting={asking}
        onDraft={(notes) => arrange.planLabDraft && askFor(arrange.planLabDraft(node.path, notes))}
      />
    {/key}
  {/if}

  {#if arrange && node.path === "" && details}
    <CourseDetailsForm {details} onSave={(wanted) => arrange.onPropose(arrange.planDetails(wanted))} />
    <div class="course-picture"><CardPictureRow {picture} kindWord="course" onChoose={choosePicture} /></div>
  {/if}

  {#if (onWrite || onEdit) && pages.length > 0 && !node.excluded}
    <h3 class="items-title">{pagesTitle}</h3>
    <ul class="pages">
      {#each pages as page (page.path)}
        <li>
          <span class="page-name">
            {showFileNames ? page.path.slice(page.path.lastIndexOf("/") + 1) : pageName(page.path)}
            <span class="page-state" class:unwritten={!page.written && !savedNow.includes(page.path)}>{pageState(page)}</span>
          </span>
          <span class="page-actions">
            {#if onWrite}<button class="quiet" onclick={() => onWrite(page.path)}>Write</button>{/if}
            {#if onEdit}<button class="quiet" onclick={() => onEdit(page.path)}>Edit the markdown</button>{/if}
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  section {
    max-width: var(--reading-width);
  }
  .back {
    font: inherit;
    font-size: var(--font-label);
    min-height: 44px;
    margin-bottom: var(--space-2);
    padding: 0;
    border: none;
    background: none;
    color: var(--ui-brand);
    text-decoration: underline;
    cursor: pointer;
  }
  .kind {
    margin: 0 0 var(--space-6);
    color: var(--ui-muted);
    font-size: var(--font-label);
  }
  .to-fix,
  .items-title {
    margin: var(--space-8) 0 var(--space-3);
  }
  section > .to-fix:first-of-type {
    margin-top: 0;
  }
  .items,
  .pages {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  .item {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    min-height: 56px;
    padding: var(--space-2) var(--space-4);
    font: inherit;
    text-align: left;
    color: var(--ui-ink);
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    cursor: pointer;
  }
  .items li {
    display: flex;
    gap: var(--space-2);
    align-items: stretch;
    border-radius: var(--radius-card);
  }
  .items li.target {
    outline: 2px dashed var(--ui-brand);
    outline-offset: 2px;
  }
  /* A line where the dragged item would go: between rows, never inside one. */
  .items li.before {
    box-shadow: 0 -2px 0 var(--ui-brand);
  }
  .items li.after {
    box-shadow: 0 2px 0 var(--ui-brand);
  }
  .item[draggable="true"] {
    cursor: grab;
  }
  .steps {
    display: flex;
    gap: var(--space-1);
  }
  .step {
    min-height: 44px;
    font-size: var(--font-label);
  }
  .step:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .course-picture {
    margin-top: var(--space-3);
    padding: var(--space-4) var(--space-5);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
  }
  .suggest {
    margin-top: var(--space-3);
  }
  .hint,
  .note {
    margin: var(--space-2) 0 0;
    font-size: var(--font-caption);
    color: var(--ui-muted);
  }
  .item:hover {
    background: var(--ui-selected);
  }
  .type {
    min-width: 4.5em;
    padding: 2px var(--space-2);
    text-align: center;
    font-size: var(--font-caption);
    font-weight: var(--weight-medium);
    color: var(--ui-ink);
    border-radius: var(--radius-badge);
  }
  .item-title {
    flex: 1 1 12ch;
    overflow-wrap: anywhere;
  }
  .flag {
    color: var(--ui-danger);
    font-size: var(--font-label);
  }
  .flag.ready {
    color: var(--ui-muted);
  }
  .pages li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
  }
  .page-name {
    overflow-wrap: anywhere;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-2);
  }
  .page-state {
    font-size: var(--font-caption);
    padding: 0 var(--space-2);
    border-radius: var(--radius-badge);
    border: 1px solid var(--ui-success);
    color: var(--ui-success);
  }
  .page-state.unwritten {
    border-color: var(--ui-border);
    color: var(--ui-muted);
  }
  .page-actions {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  h2 {
    overflow-wrap: anywhere;
    margin: var(--space-1) 0 var(--space-1);
    font-size: var(--font-heading);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
  }
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
  .findings .primary,
  .findings .explain {
    margin-top: var(--space-3);
  }
  .findings .primary + .explain {
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
  .quiz {
    margin-top: var(--space-6);
  }
  .plan {
    margin-top: var(--space-6);
    padding: var(--space-5);
    border: 1px solid var(--ui-brand);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
  }
  h3 {
    margin: 0 0 var(--space-2);
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  .actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-4);
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
