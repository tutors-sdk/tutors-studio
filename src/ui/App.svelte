<script lang="ts">
  import LoadCourse from "./components/LoadCourse.svelte";
  import type { LoadAnswers, LoadPlan, LoadProblem } from "../application/use-cases/load-course.ts";
  import { untrack } from "svelte";
  import type { AuthoringPort, OpenedPage, PageEntry, OpenedQuiz } from "../application/ports/authoring.ts";
  import type { Plan } from "../domain/plan.ts";
  import type { MapNode } from "../domain/course-map.ts";
  import type { AnswerProblem, CourseAnswers } from "../domain/new-course.ts";
  import StartScreen from "./components/StartScreen.svelte";
  import NewCourse from "./components/NewCourse.svelte";
  import Contents from "./components/Contents.svelte";
  import Companion from "./components/Companion.svelte";
  import PageEditor from "./components/PageEditor.svelte";
  import PlainEditor from "./components/PlainEditor.svelte";
  import { momentFor, type CompanionDestination, type CompanionEvent, type Moment } from "../application/companion/moments.ts";
  import type { CompanionPort } from "../application/companion/companion.ts";
  import { workspaceFeatures } from "../domain/workspace.ts";
  import { flatten, placeName } from "../domain/course-map.ts";
  import { lecturerFindings } from "../domain/finding.ts";
  import NodeDetail from "./components/NodeDetail.svelte";
  import QuizDesigner from "./components/QuizDesigner.svelte";
  import { emptyQuiz, type QuizForm } from "../domain/quiz.ts";
  import StatusBar from "./components/StatusBar.svelte";
  import Publish from "./components/Publish.svelte";
  import History from "./components/History.svelte";
  import Check from "./components/Check.svelte";
  import type { HandOffPort } from "../application/ports/hand-off.ts";
  import { claudeModels } from "../domain/assistant.ts";
  import Settings from "./components/Settings.svelte";
  import type { PreferencesPort } from "../application/ports/preferences.ts";
  import { appearanceAttributes, stepTextSize, type Appearance } from "../domain/appearance.ts";
  import type { PublishingPort } from "../application/ports/publishing.ts";
  import { CourseSession } from "./course-session.svelte.ts";
  import type { StudioUpdates } from "../application/use-cases/updates.ts";

  /** An opened course; `key` names it for the assistant's read permission (its folder, ADR 0006). */
  /** A folder of the lecturer's own material, with what a course made from it would hold and the step that makes it. */
  type MaterialFolder = {
    folderName: string;
    preview: (answers: LoadAnswers) => { ok: true; load: LoadPlan } | { ok: false; problems: LoadProblem[] };
    create: (answers: LoadAnswers) => Promise<OpenedCourse | { reason: string } | null>;
  };
  type OpenedCourse = { name: string; key: string; companion: CompanionPort; authoring: AuthoringPort; publishing: PublishingPort | null; handOff: HandOffPort | null };

  interface Props {
    /**
     * Loads a folder the lecturer points at: a Tutors course opens as it is; a folder of their own material
     * comes back to make a course from. Null when the lecturer cancelled.
     */
    openCourse: () => Promise<OpenedCourse | { material: MaterialFolder } | null>;
    /** Guided creation: the answers' check, and the step that creates the course. */
    newCourse: {
      check: (answers: CourseAnswers) => AnswerProblem[];
      /** Creates the course and opens it, or resolves to the reason nothing was created; null when the lecturer cancelled. */
      create: (answers: CourseAnswers) => Promise<OpenedCourse | { reason: string } | null>;
    };
    /** Settings: appearance and the Tutors .env, with the appearance in force when the window opened. */
    preferences: PreferencesPort;
    initialAppearance: Appearance;
    /** Opens a link in the lecturer's browser. */
    openLink: (url: string) => void;
    /** Asks the lecturer for a folder on this computer, and shows a file in its folder; absent in the browser preview. */
    folders?: { choose: (title: string) => Promise<string | null>; show: (path: string) => void };
    rulesVersion: string;
    /** Checking for a newer Studio (ADR 0033). */
    updates?: StudioUpdates;
    /** Answers questions while no course is open, from Studio's own guide. */
    guide: CompanionPort;
  }
  let { openCourse, newCourse, openLink, folders, preferences, initialAppearance, rulesVersion, guide, updates }: Props = $props();

  let advanced = $state(false);
  let companionHidden = $state(false);
  $effect(() => {
    void preferences.advanced().then((on) => (advanced = on));
    void preferences.companionHidden().then((hidden) => (companionHidden = hidden));
  });
  const features = $derived(workspaceFeatures(advanced));
  function setAdvanced(on: boolean) {
    advanced = on;
    void preferences.setAdvanced(on);
  }
  function setCompanionHidden(hidden: boolean) {
    companionHidden = hidden;
    moment = null;
    void preferences.setCompanionHidden(hidden);
  }

  // The assistant chosen in Settings, and whether it may read the open course; read again when either changes.
  let chosen = $state<{ provider: string; model: string } | null>(null);
  let allowed = $state(false);
  const readAssistant = async () => {
    const found = await preferences.assistant();
    chosen = found.provider === "none" ? null : found;
  };
  void readAssistant();
  const assistantName = $derived(chosen === null ? "none" : (claudeModels.find((model) => model.id === chosen?.model)?.label.split(",")[0] ?? "Claude"));

  let appearance = $state<Appearance>(untrack(() => initialAppearance));
  let settingsOpen = $state(false);
  $effect(() => {
    for (const [name, value] of Object.entries(appearanceAttributes(appearance))) document.documentElement.setAttribute(name, value);
  });
  function setAppearance(next: Appearance) {
    appearance = next;
    void preferences.setAppearance(next);
  }
  /** Ctrl or Cmd with +, − and 0 change the text size from anywhere, as in a browser. */
  function zoomKeys(event: KeyboardEvent) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    if (event.key === "=" || event.key === "+") setAppearance({ ...appearance, textSize: stepTextSize(appearance.textSize, 1) });
    else if (event.key === "-" || event.key === "_") setAppearance({ ...appearance, textSize: stepTextSize(appearance.textSize, -1) });
    else if (event.key === "0") setAppearance({ ...appearance, textSize: 100 });
    else return;
    event.preventDefault();
  }

  let starting = $state(false);
  let loading = $state<MaterialFolder | null>(null);

  let course = $state<OpenedCourse | null>(null);
  $effect(() => {
    const key = course?.key;
    if (key !== undefined) preferences.optedIn(key).then((found) => (allowed = found));
  });
  function setAllowed(next: boolean) {
    if (course === null) return;
    allowed = next;
    void preferences.setOptIn(course.key, next);
  }
  let publishingOpen = $state(false);
  let checkOpen = $state(false);
  /** The list of changes Studio made since the course opened, each of which can be put back (STU-0092). */
  let historyOpen = $state(false);
  /** The open course on screen, and the plans waiting on the lecturer (course-session.svelte.ts). */
  let session = $state<CourseSession | null>(null);
  const view = $derived(session?.view ?? null);
  const selected = $derived(session?.selected ?? "");
  const selectedNode = $derived(session?.selectedNode ?? null);
  const parentNode = $derived(session?.parentNode ?? null);
  const errors = $derived(session?.errors ?? 0);
  const notice = $derived(session?.notice ?? "");
  const startSession = (opened: OpenedCourse) =>
    (session = new CourseSession(opened.authoring, { applied: () => companionEvent("change-applied"), select: (path) => selectNode(path) }));
  /** The quiz being designed, and the folder it was opened from: a topic for a new quiz, else the quiz's own folder. */
  let designing = $state<{ folder: string; opened: OpenedQuiz; where: string } | null>(null);

  // The companion (ADR 0015): silent for a moment after any typing or dragging.
  let moment = $state<Moment | null>(null);
  const spoken = new Map<string, number>();
  let busyUntil = 0;
  const BUSY_MS = 2500;
  function noteTyping(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.matches("input, textarea, select, [contenteditable=true]")) busyUntil = Date.now() + BUSY_MS;
  }
  const noteDragging = () => (busyUntil = Date.now() + BUSY_MS);
  function companionEvent(event: CompanionEvent, node: MapNode | null = selectedNode) {
    const found = momentFor(
      event,
      {
        errors: view?.findings.filter((f) => f.severity === "error").length ?? 0,
        emptyWeek: node?.kind === "topic" && node.children.length === 0,
        needsPermission: chosen !== null && !allowed,
        busy: Date.now() < busyUntil,
        hidden: companionHidden,
      },
      spoken,
      Date.now(),
    );
    if (found === null) return;
    spoken.set(found.id, Date.now());
    moment = found;
  }
  function askCompanion(question: string) {
    const where = editing
      ? "The markdown editor"
      : writing
        ? "Writing a page"
        : checkOpen
          ? "Check and publish"
          : publishingOpen
            ? "Publishing"
            : settingsOpen
              ? "Settings"
              : (selectedNode?.title ?? selectedNode?.name ?? "The start screen");
    return (course?.companion ?? guide).ask(question, {
      where,
      problems: (features.fileNames ? (view?.findings ?? []) : lecturerFindings(view?.findings ?? [])).slice(0, 30).map((finding) => finding.message),
    });
  }
  function companionGo(place: CompanionDestination) {
    moment = null;
    if (place === "problem") {
      const holder = view === null ? undefined : flatten(view.map).find((node) => node.status === "error");
      settingsOpen = false;
      if (holder) selectNode(holder.path);
    } else if (place === "settings") settingsOpen = true;
    else if (course !== null) {
      settingsOpen = false;
      editing = null;
      writing = null;
      designing = null;
      checkOpen = place === "check";
      publishingOpen = place === "publish";
    }
  }

  // The markdown pages directly in the selected folder; the one written plainly, or (Advanced mode) edited as markdown.
  let pagesHere = $state<PageEntry[]>([]);
  let editing = $state<OpenedPage | null>(null);
  let writing = $state<OpenedPage | null>(null);
  $effect(() => {
    const authoring = course?.authoring;
    const path = selected;
    void view;
    pagesHere = [];
    if (authoring)
      authoring.pages(path).then(
        (found) => (selected === path ? (pagesHere = found) : undefined),
        () => undefined,
      );
  });
  async function editPage(path: string) {
    if (!course) return;
    writing = null;
    editing = await course.authoring.openPage(path);
  }
  async function writePage(path: string) {
    if (!course) return;
    editing = null;
    writing = await course.authoring.openPage(path);
  }
  async function acceptPage(plan: Plan) {
    editing = null;
    writing = null;
    await session?.acceptPage(plan);
  }
  function selectNode(path: string) {
    if (session) {
      session.selected = path;
      session.arranging = null;
    }
    designing = null;
    historyOpen = false;
    publishingOpen = false;
    checkOpen = false;
    editing = null;
    writing = null;
    if (session?.view) companionEvent("week-opened", session.find(path));
  }

  async function open() {
    const opened = await openCourse();
    if (opened === null) return;
    if ("material" in opened) {
      loading = opened.material;
      return;
    }
    show(opened);
  }

  async function show(opened: OpenedCourse) {
    loading = null;
    course = opened;
    publishingOpen = false;
    checkOpen = false;
    const opening = startSession(opened);
    companionEvent("course-opened", (await opening.refresh()).map);
  }

  async function createLoaded(answers: LoadAnswers): Promise<string | null> {
    if (loading === null) return null;
    const made = await loading.create(answers);
    if (made === null) return null;
    if ("reason" in made) return made.reason;
    await show(made);
    if (session) session.notice = `Created ${made.name} from your material. Check each week, then drop in anything Studio left out.`;
    return null;
  }

  async function create(answers: CourseAnswers): Promise<string | null> {
    const made = await newCourse.create(answers);
    if (made === null) return null;
    if ("reason" in made) return made.reason;
    starting = false;
    course = made;
    const opening = startSession(made);
    const read = await opening.refresh();
    opening.notice = `Created ${made.name}. Each week's topic is ready for its material.`;
    companionEvent("course-created", read.map);
    return null;
  }

  async function openQuiz(folder: string) {
    if (course === null || selectedNode === null) return;
    const isQuiz = selectedNode.kind === "quiz";
    const opened: OpenedQuiz = isQuiz ? await course.authoring.openQuiz(folder) : { page: null, form: emptyQuiz(), leftOut: [] };
    designing = { folder, opened, where: isQuiz ? opened.form.heading || selectedNode.name : selectedNode.name };
    if (session) session.notice = "";
  }

  function planQuiz(form: QuizForm) {
    const target = designing?.opened.page ? { page: designing.opened.page } : { newIn: designing?.folder ?? "" };
    return course!.authoring.planQuiz(target, form);
  }

  async function acceptQuiz(plan: Plan) {
    designing = null;
    await session?.acceptQuiz(plan);
  }

  function openHistory() {
    historyOpen = true;
    checkOpen = false;
    publishingOpen = false;
    editing = null;
    writing = null;
    designing = null;
  }
</script>

<svelte:window onkeydown={(event) => (zoomKeys(event), noteTyping(event))} ondragover={noteDragging} />

<div class="shell" class:with-status={features.rulesVersion}>
  {#if settingsOpen}
    <main class="detail wide">
      <Settings
        {preferences}
        {appearance}
        onAppearance={setAppearance}
        onAssistant={readAssistant}
        {advanced}
        onAdvanced={setAdvanced}
        {companionHidden}
        onCompanionHidden={setCompanionHidden}
        {updates}
        {openLink}
        onClose={() => (settingsOpen = false)}
      />
    </main>
  {:else if loading}
    <LoadCourse folderName={loading.folderName} preview={loading.preview} onCreate={createLoaded} onCancel={() => (loading = null)} />
  {:else if starting}
    <NewCourse check={newCourse.check} onCreate={create} onCancel={() => (starting = false)} />
  {:else if course === null || session === null || view === null}
    <StartScreen onOpen={open} onNew={() => (starting = true)} onSettings={() => (settingsOpen = true)} />
  {:else}
    <aside class="sidebar" aria-label="Contents">
      <header>
        <h1>{view.map.title ?? course.name}</h1>
        <p class="summary" class:has-errors={errors > 0} role="status">
          {errors === 0 ? "Everything checks out." : `${errors} ${errors === 1 ? "thing" : "things"} to fix before publishing`}
        </p>
      </header>
      <div class="contents"><Contents map={view.map} {selected} showFileNames={features.fileNames} onSelect={selectNode} onArrange={(action) => session!.arrange(action)} /></div>
      <div class="sidebar-foot">
        <button
          class={errors === 0 && !checkOpen && !publishingOpen ? "next" : "secondary"}
          aria-pressed={checkOpen}
          onclick={() => {
            checkOpen = true;
            historyOpen = false;
            publishingOpen = false;
            editing = null;
            writing = null;
          }}>Check and publish</button
        >
        <div class="quiet-links">
          <button class="link" aria-pressed={historyOpen} onclick={openHistory}>Changes</button>
          <button class="link" onclick={() => (settingsOpen = true)}>Settings</button>
          <button class="link" onclick={open}>Load another course</button>
        </div>
      </div>
    </aside>
    <main class="detail" class:editing={editing !== null || writing !== null}>
      {#if notice}
        <p class="notice" role="status">
          {notice}
          {#if notice.startsWith("Done:") && !historyOpen}<button class="link" onclick={openHistory}>Put it back</button>{/if}
        </p>
      {/if}
      {#if historyOpen}
        <History
          entries={session.history}
          onPlanUndo={(id) => course!.authoring.planUndo(id)}
          onAccept={(plan) => session!.apply(plan).then(() => undefined)}
          showFileNames={features.fileNames}
          onClose={() => (historyOpen = false)}
        />
      {:else if writing}
        {#key writing}
          <PlainEditor
            opened={writing}
            title={selectedNode?.title ?? writing.path}
            onPlan={(markdown) => course!.authoring.planPage(writing!, markdown)}
            onAccept={acceptPage}
            onClose={() => (writing = null)}
            onSource={features.markdownEditor ? () => editPage(writing!.path) : undefined}
          />
        {/key}
      {:else if editing}
        {#key editing}
          <PageEditor
            opened={editing}
            render={(markdown) => course!.authoring.renderPage(markdown)}
            onPlan={(markdown) => course!.authoring.planPage(editing!, markdown)}
            onAccept={acceptPage}
            onClose={() => (editing = null)}
          />
        {/key}
      {:else if checkOpen}
        <Check
          {advanced}
          placeOf={(path) => (features.fileNames ? (path === "" ? "Course folder" : path) : placeName(view!.map, path))}
          findings={view.findings}
          handOff={course.handOff}
          readPermission={chosen === null ? undefined : { name: "Claude", allowed, set: setAllowed }}
          onPlanFixAll={() => course!.authoring.planFixAll()}
          onApply={(plan) => session!.apply(plan)}
          onSelect={selectNode}
          onPublish={() => {
            checkOpen = false;
            publishingOpen = true;
          }}
          onClose={() => (checkOpen = false)}
        />
      {:else if publishingOpen}
        <Publish
          {advanced}
          publishing={course.publishing}
          courseName={course.name}
          {errors}
          {openLink}
          {folders}
          onSaved={() => void session?.refresh()}
          onClose={() => (publishingOpen = false)}
        />
      {:else if designing}
        {#key designing}
          <QuizDesigner opened={designing.opened} where={designing.where} onPlan={planQuiz} onAccept={acceptQuiz} onClose={() => (designing = null)} />
        {/key}
      {:else if selectedNode}
        <NodeDetail
          node={selectedNode}
          pending={session.pending}
          onFix={(finding) => session!.proposeFix(finding)}
          onAccept={() => session!.accept()}
          onCancel={() => (session!.pending = null)}
          onQuiz={openQuiz}
          onMaterial={(folder, files) => course!.authoring.planMaterial(folder, files)}
          onAcceptMaterial={(plan) => session!.acceptMaterial(plan)}
          onItem={(folder, word, title, address) => course!.authoring.planItem(folder, word, title, address)}
          visible={session.visibleScope === null ? undefined : { scope: session.visibleScope, plan: (folder, word) => course!.authoring.planVisible(folder, word) }}
          assistant={chosen === null ? undefined : { name: "Claude", explain: (finding) => course!.authoring.explain(finding) }}
          showFileNames={features.fileNames}
          pages={pagesHere}
          savedNow={session.savedNow}
          onEdit={features.markdownEditor ? editPage : undefined}
          onWrite={writePage}
          parent={selectedNode.path !== "" && parentNode && parentNode.path !== "" ? { path: parentNode.path, title: parentNode.title ?? parentNode.name } : null}
          onSelect={selectNode}
          arrange={{
            root: view.map,
            places: session.places,
            proposal: session.arranging ? { summary: session.arranging.plan.summary, notes: session.arranging.notes } : null,
            onArrange: (action) => session!.arrange(action),
            onAccept: () => session!.acceptArrange(),
            onCancel: () => (session!.arranging = null),
            onPropose: (planned) => session!.propose(planned),
            details: () => course!.authoring.courseDetails(),
            planDetails: (wanted) => course!.authoring.planDetails(wanted),
            cardPicture: (folder) => course!.authoring.cardPicture(folder),
            planPicture: (folder, file) => course!.authoring.planPicture(folder, file),
          }}
        />
      {/if}
    </main>
  {/if}
  {#if features.rulesVersion}<StatusBar {rulesVersion} {assistantName} />{/if}
  <Companion
    {moment}
    hidden={companionHidden}
    assistantName={chosen === null || !course ? null : "Claude"}
    ask={askCompanion}
    canGo={(place) => place === "settings" || course !== null}
    onGo={companionGo}
    onDismiss={() => (moment = null)}
    onHide={setCompanionHidden}
  />
</div>

<style>
  :global(body) {
    margin: 0;
    background: var(--ui-canvas);
    color: var(--ui-ink);
    font-family: var(--studio-font-stack);
    font-size: var(--font-body);
    line-height: var(--leading-ui);
    letter-spacing: var(--studio-letter-spacing);
    word-spacing: var(--studio-word-spacing);
  }
  :global(em),
  :global(i) {
    font-style: var(--studio-emphasis-style);
  }
  :global(button),
  :global(input),
  :global(select),
  :global(textarea) {
    letter-spacing: inherit;
    word-spacing: inherit;
  }
  :global(:focus-visible) {
    outline: var(--studio-focus-width) solid var(--ui-focus);
    outline-offset: 3px;
  }
  :global(::selection) {
    background: var(--studio-drop-fill);
  }
  :global(html) {
    scrollbar-color: var(--ui-control-border) transparent;
  }
  .shell {
    display: grid;
    grid-template-columns: var(--studio-sidebar-width) 1fr;
    grid-template-rows: 1fr;
    height: 100vh;
  }
  .shell.with-status {
    grid-template-rows: 1fr var(--studio-status-bar);
    --studio-companion-bottom: calc(var(--studio-status-bar) + var(--space-3));
  }
  .shell > :global(.start) {
    grid-column: 1 / -1;
  }
  .sidebar {
    background: var(--ui-surface);
    border-right: 1px solid var(--ui-border);
    padding: var(--space-4);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .contents {
    flex: 1;
    min-height: 0;
    /* A long course scrolls inside the contents, so it never runs under the actions below it. */
    overflow-y: auto;
  }
  h1 {
    margin: var(--space-1) 0;
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
  }
  .summary {
    margin: 0;
    font-size: var(--font-label);
    color: var(--ui-success);
  }
  .summary.has-errors {
    color: var(--ui-danger);
  }
  .detail {
    padding: var(--space-8) var(--space-8) calc(var(--studio-note-size) + var(--space-8));
    overflow-y: auto;
  }
  .detail.editing {
    padding: var(--space-5) var(--space-6) calc(var(--studio-note-size) + var(--space-4));
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .detail.editing > :global(.editor) {
    flex: 1;
  }
  .notice {
    margin: 0 0 var(--space-4);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-control);
    background: var(--ui-raised);
  }
  .wide {
    grid-column: 1 / -1;
  }
  /* One column when the window is narrow, or when large text would leave the contents taking most of it (WCAG 1.4.10). */
  @media (max-width: 860px) {
    .shell {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto;
      height: auto;
      min-height: 100vh;
    }
    .sidebar {
      border-right: none;
      border-bottom: 1px solid var(--ui-border);
    }
    .detail {
      padding-left: var(--space-5);
      padding-right: var(--space-5);
      overflow-y: visible;
    }
  }
  @media (max-width: 1400px) {
    :global(:root[data-text-size="175"]) .shell,
    :global(:root[data-text-size="200"]) .shell {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto;
      height: auto;
      min-height: 100vh;
    }
    :global(:root[data-text-size="175"]) .sidebar,
    :global(:root[data-text-size="200"]) .sidebar {
      border-right: none;
      border-bottom: 1px solid var(--ui-border);
    }
    :global(:root[data-text-size="175"]) .detail,
    :global(:root[data-text-size="200"]) .detail {
      padding-left: var(--space-5);
      padding-right: var(--space-5);
      overflow-y: visible;
    }
  }
  .sidebar-foot {
    display: grid;
    gap: var(--space-2);
  }
  .quiet-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0 var(--space-4);
  }
  .link {
    font: inherit;
    font-size: var(--font-label);
    min-height: 44px;
    padding: 0;
    border: none;
    background: none;
    color: var(--ui-muted);
    cursor: pointer;
  }
  .link:hover {
    color: var(--ui-ink);
    text-decoration: underline;
  }
  .next {
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
    border: none;
    background: var(--ui-brand);
    color: var(--ui-on-brand);
    cursor: pointer;
  }
  .next:hover {
    background: var(--ui-brand-hover);
  }
  .secondary {
    min-height: 44px;
    font: inherit;
    font-size: var(--font-control);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
    cursor: pointer;
  }
</style>
