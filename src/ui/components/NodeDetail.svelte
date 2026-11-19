<script lang="ts">
  import { lecturerFindings, type Finding } from "../../domain/finding.ts";
  import { labelFor, publishedFirst, weekFlag, type MapNode } from "../../domain/course-map.ts";
  import type { ArrangePlan, Explanation } from "../../application/ports/authoring.ts";
  import DropZone from "./DropZone.svelte";
  import AddItem from "./AddItem.svelte";
  import MakeVisible from "./MakeVisible.svelte";
  import type { DroppedFile } from "../../domain/material.ts";
  import { stepAction, type ArrangeAction, type DropPlace } from "../../domain/arrange.ts";
  import { DRAGGED, dropOver, endDrag, startDrag } from "../dragging.ts";
  import Arrange from "./Arrange.svelte";
  import CardPictureRow from "./CardPicture.svelte";
  import CourseDetailsForm from "./CourseDetails.svelte";
  import OutcomesForm from "./Outcomes.svelte";
  import ItemOutcomes from "./ItemOutcomes.svelte";
  import TermView from "./TermView.svelte";
  import ReleaseDate from "./ReleaseDate.svelte";
  import RollOver from "./RollOver.svelte";
  import { dayOf, type Term } from "../../domain/term.ts";
  import { engagementWords } from "../../domain/engagement.ts";
  import { servesAs, type Coverage, type Outcome } from "../../domain/outcomes.ts";
  import type { CardPicture, CourseDetails } from "../../domain/course-details.ts";
  import LabStepsPanel from "./LabSteps.svelte";
  import type { NodeDetailProps } from "./node-detail-props.ts";
  import PageList from "./PageList.svelte";
  import type { LabStep } from "../../domain/lab-steps.ts";

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
    engagement = null,
    arrange,
    onRollOver,
  }: NodeDetailProps = $props();
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
  const heading = $derived(node.path === "" ? (node.title ?? "Course home") : nameOf(node));
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
  let outcomeList = $state<Outcome[]>([]);
  let coverageMap = $state<Coverage | null>(null);
  let tagged = $state<string[] | null>(null);
  /** How many outcomes the course has, for the week's "which outcomes each item serves" (read on a week). */
  let outcomeCount = $state(0);
  let term = $state<Term | null>(null);
  let hidden = $state(false);
  const kindLine = $derived(`${node.excluded ? "Won't be published" : node.path === "" ? "Course" : (node.label ?? "")}${hidden ? " · Hidden from students" : ""}`);
  /** Only a week or unit at the top of the course can be hidden in Tutors, so only they take a release date. */
  const releasable = $derived(!node.excluded && node.path !== "" && !node.path.includes("/") && (node.kind === "topic" || node.kind === "unit"));
  const isItem = (kind: string | null) => kind !== null && !["course", "unit", "side", "topic"].includes(kind);
  $effect(() => {
    const path = node.path;
    const reading = arrange;
    void reading?.root;
    picture = null;
    labSteps = null;
    tagged = null;
    coverageMap = null;
    term = null;
    void (reading?.term && releasable ? reading.term.hidden() : Promise.resolve([])).then((found) => node.path === path && (hidden = found.includes(path)));
    if (reading?.term && (path === "" || releasable)) void reading.term.read().then((found) => node.path === path && (term = found));
    if (reading?.outcomes && node.kind === "topic") void reading.outcomes.list().then((found) => node.path === path && (outcomeCount = found.length));
    if (reading?.outcomes && !node.excluded && (path === "" || isItem(node.kind))) {
      const outcomes = reading.outcomes;
      void outcomes.list().then((found) => {
        if (node.path !== path) return;
        outcomeList = found;
        if (path === "") void outcomes.coverage().then((map) => node.path === path && (coverageMap = map));
        else if (found.length > 0) void outcomes.tagged(path).then((ids) => node.path === path && (tagged = ids));
      });
    }
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
    {kindLine}{#if showFileNames && node.path !== ""}<span class="folder"> · {node.name}</span>{/if}
  </p>

  {#if arrange?.term && node.path === "" && term}
    {@const reading = arrange.term}
    <TermView {term} today={dayOf(new Date())} onShowDue={(folder) => arrange.onPropose(reading.planShowDue(folder))} />
  {/if}
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
              {#if engagement?.[item.path]}<span class="engagement">{engagementWords(engagement[item.path])}</span>{/if}
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
        {#if arrange.outcomes?.suggestServes && outcomeCount > 0}
          {@const suggestServes = arrange.outcomes.suggestServes}
          <button class="quiet suggest" onclick={() => askFor(suggestServes(node.path))}>Ask {assistant.name} which outcomes each item serves</button>
        {/if}
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
      <Arrange item={{ path: node.path, title: heading, kind: node.kind }} {hidden} places={arrange.places} onArrange={arrange.onArrange}>
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

  {#if arrange?.outcomes && tagged !== null && outcomeList.length > 0}
    {@const outcomes = arrange.outcomes}
    {@const serves = servesAs(node.kind)}
    {#key node.path}
      <ItemOutcomes
        outcomes={outcomeList}
        {tagged}
        serves={serves === "taught" ? "teaches" : serves === "practised" ? "practises" : "assesses"}
        onSave={(ids) => arrange.onPropose(outcomes.tag(node.path, ids))}
      />
    {/key}
  {/if}

  {#if arrange?.term && releasable}
    {@const reading = arrange.term}
    {#key node.path}
      <ReleaseDate
        kindWord={node.kind === "topic" ? "week" : "unit"}
        release={term?.hidden.find((place) => place.path === node.path)?.release ?? null}
        onSave={(date) => arrange.onPropose(reading.planRelease(node.path, date))}
      />
    {/key}
  {/if}

  {#if arrange && node.path === "" && details}
    <CourseDetailsForm {details} onSave={(wanted) => arrange.onPropose(arrange.planDetails(wanted))} />
    {#if arrange.outcomes}
      {@const outcomes = arrange.outcomes}
      <OutcomesForm
        outcomes={outcomeList}
        coverage={coverageMap}
        onSave={(drafts) => arrange.onPropose(outcomes.plan(drafts))}
        suggest={assistant && outcomes.draft ? { name: assistant.name, asking, onSuggest: (description) => outcomes.draft && askFor(outcomes.draft(description)) } : undefined}
      />
    {/if}
    <div class="course-picture"><CardPictureRow {picture} kindWord="course" onChoose={choosePicture} /></div>
    {#if onRollOver}<RollOver courseName={details.title} {onRollOver} />{/if}
  {/if}

  {#if (onWrite || onEdit) && pages.length > 0 && !node.excluded}
    <PageList {heading} {pages} {savedNow} {showFileNames} {onWrite} {onEdit} />
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
  .items {
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
  .engagement {
    color: var(--ui-muted);
    font-size: var(--font-label);
  }
  .flag.ready {
    color: var(--ui-muted);
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
