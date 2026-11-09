<script lang="ts">
  import LoadCourse from "./components/LoadCourse.svelte";
  import type { LoadAnswers, LoadPlan, LoadProblem } from "../application/use-cases/load-course.ts";
  import { untrack } from "svelte";
  import type { AuthoringPort, CourseView, OpenedPage, OpenedQuiz, Preview } from "../application/ports/authoring.ts";
  import type { Finding } from "../domain/finding.ts";
  import type { Plan } from "../domain/plan.ts";
  import type { MapNode } from "../domain/course-map.ts";
  import type { AnswerProblem, CourseAnswers, PatternCard } from "../domain/new-course.ts";
  import StartScreen from "./components/StartScreen.svelte";
  import NewCourse from "./components/NewCourse.svelte";
  import Contents from "./components/Contents.svelte";
  import Companion from "./components/Companion.svelte";
  import PageEditor from "./components/PageEditor.svelte";
  import { momentFor, type CompanionDestination, type CompanionEvent, type Moment } from "../application/companion/moments.ts";
  import type { CompanionPort } from "../application/companion/companion.ts";
  import { workspaceFeatures } from "../domain/workspace.ts";
  import { flatten } from "../domain/course-map.ts";
  import NodeDetail from "./components/NodeDetail.svelte";
  import QuizDesigner from "./components/QuizDesigner.svelte";
  import { emptyQuiz, type QuizForm } from "../domain/quiz.ts";
  import StatusBar from "./components/StatusBar.svelte";
  import Publish from "./components/Publish.svelte";
  import Check from "./components/Check.svelte";
  import type { HandOffPort } from "../application/ports/hand-off.ts";
  import { claudeModels } from "../domain/assistant.ts";
  import Settings from "./components/Settings.svelte";
  import type { PreferencesPort } from "../application/ports/preferences.ts";
  import { appearanceAttributes, stepTextSize, type Appearance } from "../domain/appearance.ts";
  import type { PublishingPort } from "../application/ports/publishing.ts";

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
    /** Guided creation: the patterns offered, the answers' check, and the step that creates the course. */
    newCourse: {
      patterns: PatternCard[];
      check: (answers: CourseAnswers) => AnswerProblem[];
      /** Creates the course and opens it, or resolves to the reason nothing was created; null when the lecturer cancelled. */
      create: (answers: CourseAnswers) => Promise<OpenedCourse | { reason: string } | null>;
    };
    /** Settings: appearance and the Tutors .env, with the appearance in force when the window opened. */
    preferences: PreferencesPort;
    initialAppearance: Appearance;
    /** Opens a link in the lecturer's browser. */
    openLink: (url: string) => void;
    rulesVersion: string;
    /** Answers questions while no course is open, from Studio's own guide. */
    guide: CompanionPort;
  }
  let { openCourse, newCourse, openLink, preferences, initialAppearance, rulesVersion, guide }: Props = $props();

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
  let view = $state<CourseView | null>(null);
  let selected = $state<string>("");
  let pending = $state<Plan | null>(null);
  let notice = $state<string>("");
  let previews = $state<Preview[]>([]);
  /** The quiz being designed, and the folder it was opened from: a topic for a new quiz, else the quiz's own folder. */
  let designing = $state<{ folder: string; opened: OpenedQuiz; where: string } | null>(null);

  const find = (node: MapNode, path: string): MapNode | null => (node.path === path ? node : (node.children.map((c) => find(c, path)).find((n) => n !== null) ?? null));
  let selectedNode = $derived(view === null ? null : find(view.map, selected));
  // The selected folder's decks and diagrams; a later selection wins over a slower earlier one.
  let previewed = 0;
  $effect(() => {
    const authoring = course?.authoring;
    const path = selected;
    void view;
    const ticket = ++previewed;
    previews = [];
    if (authoring)
      authoring.previews(path).then(
        (found) => (ticket === previewed ? (previews = found) : undefined),
        () => undefined,
      );
  });
  let errors = $derived(view?.findings.filter((f) => f.severity === "error").length ?? 0);

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
      : checkOpen
        ? "Check and publish"
        : publishingOpen
          ? "Publishing"
          : settingsOpen
            ? "Settings"
            : (selectedNode?.title ?? selectedNode?.name ?? "The start screen");
    return (course?.companion ?? guide).ask(question, { where, problems: (view?.findings ?? []).slice(0, 30).map((finding) => finding.message) });
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
      designing = null;
      checkOpen = place === "check";
      publishingOpen = place === "publish";
    }
  }

  // Advanced mode: the markdown pages directly in the selected folder, and the one being edited.
  let pagesHere = $state<string[]>([]);
  let editing = $state<OpenedPage | null>(null);
  $effect(() => {
    const authoring = course?.authoring;
    const path = selected;
    void view;
    pagesHere = [];
    if (authoring && features.markdownEditor)
      authoring.pages(path).then(
        (found) => (selected === path ? (pagesHere = found) : undefined),
        () => undefined,
      );
  });
  async function editPage(path: string) {
    if (course) editing = await course.authoring.openPage(path);
  }
  async function acceptPage(plan: Plan) {
    if (course === null) return;
    editing = null;
    const result = await course.authoring.apply(plan);
    notice = result.ok ? `Done: ${plan.summary}.` : `Nothing changed: ${result.blockedBy} couldn't be written (${result.reason}).`;
    view = await course.authoring.refresh();
    if (result.ok) companionEvent("change-applied");
  }
  const parentOf = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");
  const parentNode = $derived(view === null || selected === "" ? null : find(view.map, parentOf(selected)));
  /** Where a folder Tutors leaves out sits: in a week it can become a lecture, lab or reading; in the course or a unit, a week. */
  const visibleScope = $derived.by((): "week" | "course" | null => {
    const holder = parentNode;
    if (!holder || holder.excluded) return null;
    return holder.kind === "topic" ? "week" : ["course", "unit", "side"].includes(holder.kind ?? "") ? "course" : null;
  });
  function selectNode(path: string) {
    selected = path;
    designing = null;
    publishingOpen = false;
    checkOpen = false;
    editing = null;
    if (view) companionEvent("week-opened", find(view.map, path));
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
    notice = "";
    selected = "";
    view = await opened.authoring.refresh();
    companionEvent("course-opened", view.map);
  }

  async function createLoaded(answers: LoadAnswers): Promise<string | null> {
    if (loading === null) return null;
    const made = await loading.create(answers);
    if (made === null) return null;
    if ("reason" in made) return made.reason;
    await show(made);
    notice = `Created ${made.name} from your material. Check each week, then drop in anything Studio left out.`;
    return null;
  }

  async function create(answers: CourseAnswers): Promise<string | null> {
    const made = await newCourse.create(answers);
    if (made === null) return null;
    if ("reason" in made) return made.reason;
    starting = false;
    course = made;
    selected = "";
    view = await made.authoring.refresh();
    notice = `Created ${made.name}. Each week's topic is ready for its material.`;
    companionEvent("course-created", view.map);
    return null;
  }

  function proposeFix(finding: Finding) {
    pending = course?.authoring.planFix(finding) ?? null;
  }

  async function openQuiz(folder: string) {
    if (course === null || selectedNode === null) return;
    const isQuiz = selectedNode.kind === "quiz";
    const opened: OpenedQuiz = isQuiz ? await course.authoring.openQuiz(folder) : { page: null, form: emptyQuiz(), leftOut: [] };
    designing = { folder, opened, where: isQuiz ? opened.form.heading || selectedNode.name : selectedNode.name };
    notice = "";
  }

  function planQuiz(form: QuizForm) {
    const target = designing?.opened.page ? { page: designing.opened.page } : { newIn: designing?.folder ?? "" };
    return course!.authoring.planQuiz(target, form);
  }

  async function acceptQuiz(plan: Plan) {
    if (course === null) return;
    designing = null;
    const result = await course.authoring.apply(plan);
    notice = result.ok ? `Done: ${plan.summary}.` : `Nothing changed: ${result.blockedBy} couldn't be written (${result.reason}).`;
    view = await course.authoring.refresh();
    const written = plan.ops[0];
    if (result.ok && written?.op === "write") selected = written.path.slice(0, written.path.lastIndexOf("/"));
  }

  async function acceptMaterial(plan: Plan) {
    if (course === null) return;
    const result = await course.authoring.apply(plan);
    notice = result.ok ? `Done: ${plan.summary}.` : `Nothing changed: ${result.blockedBy} couldn't be written (${result.reason}).`;
    view = await course.authoring.refresh();
    // A folder made visible moves under its new name; stay on it.
    const last = plan.ops[plan.ops.length - 1];
    if (result.ok && last?.op === "move" && last.from === selected) selected = last.to;
  }

  /** Applies a plan accepted on the check screen and checks the course again. */
  async function applyChecked(plan: Plan) {
    if (course === null) return;
    const result = await course.authoring.apply(plan);
    notice = result.ok ? `Done: ${plan.summary}.` : `Nothing changed: ${result.blockedBy} couldn't be changed (${result.reason}).`;
    view = await course.authoring.refresh();
  }

  async function accept() {
    if (course === null || pending === null) return;
    const plan = pending;
    pending = null;
    const result = await course.authoring.apply(plan);
    notice = result.ok ? `Done: ${plan.summary}.` : `Nothing changed: ${result.blockedBy} couldn't be moved (${result.reason}).`;
    view = await course.authoring.refresh();
    if (result.ok && plan.ops[0]?.op === "move") selected = plan.ops[0].to;
    if (result.ok) companionEvent("change-applied");
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
        onClose={() => (settingsOpen = false)}
      />
    </main>
  {:else if loading}
    <LoadCourse folderName={loading.folderName} preview={loading.preview} onCreate={createLoaded} onCancel={() => (loading = null)} />
  {:else if starting}
    <NewCourse patterns={newCourse.patterns} check={newCourse.check} onCreate={create} onCancel={() => (starting = false)} />
  {:else if course === null || view === null}
    <StartScreen onOpen={open} onNew={() => (starting = true)} onSettings={() => (settingsOpen = true)} />
  {:else}
    <aside class="sidebar" aria-label="Contents">
      <header>
        <h1>{view.map.title ?? course.name}</h1>
        <p class="summary" class:has-errors={errors > 0} role="status">
          {errors === 0 ? "Everything checks out." : `${errors} ${errors === 1 ? "thing" : "things"} to fix before publishing`}
        </p>
      </header>
      <div class="contents"><Contents map={view.map} {selected} showFileNames={features.fileNames} onSelect={selectNode} /></div>
      <div class="sidebar-foot">
        <button
          class={errors === 0 && !checkOpen && !publishingOpen ? "next" : "secondary"}
          aria-pressed={checkOpen}
          onclick={() => {
            checkOpen = true;
            publishingOpen = false;
            editing = null;
          }}>Check and publish</button
        >
        <div class="quiet-links">
          <button class="link" onclick={() => (settingsOpen = true)}>Settings</button>
          <button class="link" onclick={open}>Load another course</button>
        </div>
      </div>
    </aside>
    <main class="detail" class:editing={editing !== null}>
      {#if notice}<p class="notice" role="status">{notice}</p>{/if}
      {#if editing}
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
          findings={view.findings}
          handOff={course.handOff}
          readPermission={chosen === null ? undefined : { name: "Claude", allowed, set: setAllowed }}
          onPlanFixAll={() => course!.authoring.planFixAll()}
          onApply={applyChecked}
          onSelect={selectNode}
          onPublish={() => {
            checkOpen = false;
            publishingOpen = true;
          }}
          onClose={() => (checkOpen = false)}
        />
      {:else if publishingOpen}
        <Publish publishing={course.publishing} courseName={course.name} {errors} {openLink} onClose={() => (publishingOpen = false)} />
      {:else if designing}
        {#key designing}
          <QuizDesigner opened={designing.opened} where={designing.where} onPlan={planQuiz} onAccept={acceptQuiz} onClose={() => (designing = null)} />
        {/key}
      {:else if selectedNode}
        <NodeDetail
          node={selectedNode}
          {pending}
          {previews}
          onFix={proposeFix}
          onAccept={accept}
          onCancel={() => (pending = null)}
          onQuiz={openQuiz}
          onMaterial={(folder, files) => course!.authoring.planMaterial(folder, files)}
          onAcceptMaterial={acceptMaterial}
          onItem={(folder, word, title, address) => course!.authoring.planItem(folder, word, title, address)}
          visible={visibleScope === null ? undefined : { scope: visibleScope, plan: (folder, word) => course!.authoring.planVisible(folder, word) }}
          assistant={chosen === null ? undefined : { name: "Claude", explain: (finding) => course!.authoring.explain(finding) }}
          showFileNames={features.fileNames}
          pages={pagesHere}
          onEdit={features.markdownEditor ? editPage : undefined}
          parent={selectedNode.path !== "" && parentNode && parentNode.path !== "" ? { path: parentNode.path, title: parentNode.title ?? parentNode.name } : null}
          onSelect={selectNode}
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
