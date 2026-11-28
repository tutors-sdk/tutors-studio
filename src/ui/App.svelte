<script lang="ts">
  import LoadCourse from "./components/LoadCourse.svelte";
  import type { AppProps, MaterialFolder, OpenedCourse, Pane } from "./app-props.ts";
  import type { WeekEngagement } from "../application/ports/engagement.ts";
  import type { LoadAnswers } from "../application/use-cases/load-course.ts";
  import { untrack } from "svelte";
  import type { PageEntry, OpenedQuiz } from "../application/ports/authoring.ts";
  import type { Plan } from "../domain/plan.ts";
  import type { MapNode, WeekState } from "../domain/course-map.ts";
  import { offersSample, SAMPLE_COURSE, SAMPLE_NOTICE, type CourseAnswers } from "../domain/new-course.ts";
  import StartScreen from "./components/StartScreen.svelte";
  import Library from "./components/Library.svelte";
  import NewCourse from "./components/NewCourse.svelte";
  import CourseSidebar from "./components/CourseSidebar.svelte";
  import Companion from "./components/Companion.svelte";
  import PageEditor from "./components/PageEditor.svelte";
  import PlainEditor from "./components/PlainEditor.svelte";
  import type { CompanionDestination, CompanionEvent } from "../application/companion/moments.ts";
  import { workspaceFeatures } from "../domain/workspace.ts";
  import { flatten, placeName } from "../domain/course-map.ts";
  import { lecturerFindings } from "../domain/finding.ts";
  import NodeDetail from "./components/NodeDetail.svelte";
  import QuizDesigner from "./components/QuizDesigner.svelte";
  import { emptyQuiz, quizPlace, type QuizForm } from "../domain/quiz.ts";
  import StatusBar from "./components/StatusBar.svelte";
  import Publish from "./components/Publish.svelte";
  import History from "./components/History.svelte";
  import Check from "./components/Check.svelte";
  import { AgentSession } from "./agent-session.svelte.ts";
  import Settings from "./components/Settings.svelte";
  import { weekFor } from "../domain/arrange.ts";
  import { carriesFiles } from "./dragging.ts";
  import { droppedFiles } from "./dropped-files.ts";
  import { liveStatusLine } from "../domain/live-tutors.ts";
  import { LiveCourse, TutorsHome } from "./live-course.svelte.ts";
  import { CourseSession } from "./course-session.svelte.ts";
  import { StudioPreferences } from "./studio-preferences.svelte.ts";
  import { RecentList } from "./recent-list.svelte.ts";
  import { CompanionVoice } from "./companion-voice.svelte.ts";
  import { nodeArrange } from "./node-arrange.ts";
  import UpdateReady from "./components/UpdateReady.svelte";
  import type { OwnEntry } from "../application/use-cases/my-files.ts";
  import type { DroppedFile } from "../domain/material.ts";
  import { attachesFiles } from "../domain/attachments.ts";
  const folderOfPage = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");

  let {
    openCourse,
    newCourse,
    openLink,
    folders,
    preferences,
    initialAppearance,
    rulesVersion,
    tutorsHome,
    guide,
    updates,
    accounts,
    myFiles,
    recent,
    library,
    initialCourse,
    usage,
    commandLine,
  }: AppProps = $props();

  const prefs = untrack(() => new StudioPreferences(preferences, initialAppearance));
  $effect(() => prefs.apply(document.documentElement));
  const features = $derived(workspaceFeatures(prefs.advanced));
  function setCompanionHidden(hidden: boolean) {
    prefs.setCompanionHidden(hidden);
    voice.hush();
  }
  let settingsOpen = $state(false);
  /** Whether tutors.dev runs a newer Tutors than the one inside, asked at most once a day (STU-0221). */
  let ahead = $state<string | null>(null);
  $effect(() => void updates?.productionAhead().then((words) => (ahead = words)));

  let starting = $state(false);
  let libraryOpen = $state(false);
  let loading = $state<MaterialFolder | null>(null);

  let course = $state<OpenedCourse | null>(null);
  $effect(() => {
    if (course) prefs.readOptIn(course.key);
  });
  /**
   * What the open course's page shows instead of the selected week or item, one at a time: the changes made
   * since it opened (STU-0092), Check and publish, publishing, a page being written or edited, or a quiz.
   */
  let pane = $state<Pane>(null);
  const historyOpen = $derived(pane?.kind === "history");
  const checkOpen = $derived(pane?.kind === "check");
  const publishingOpen = $derived(pane?.kind === "publishing");
  const writing = $derived(pane?.kind === "writing" ? pane.page : null);
  const editing = $derived(pane?.kind === "editing" ? pane.page : null);
  /** The quiz being designed, and the folder it was opened from: a topic for a new quiz, else the quiz's own folder. */
  const designing = $derived(pane?.kind === "designing" ? pane.quiz : null);
  // The helper waits its turn: opening Settings, an editor, the quiz designer, Check or Changes puts away what it was saying (STU-0219).
  $effect(() => void ((pane !== null || settingsOpen) && untrack(() => voice.screenOpened())));
  /** The open course on screen, and the plans waiting on the lecturer (course-session.svelte.ts). */
  let session = $state<CourseSession | null>(null);

  // An assistant on this computer (STU-0205): while a course is open, its plans wait here, read again every few seconds.
  const agent = new AgentSession();
  $effect(() =>
    agent.watch(course?.agent, () => {
      if (!checkOpen && session) session.notice = "An assistant has a change for you to look at. It is waiting on Check and publish.";
    }),
  );
  const view = $derived(session?.view ?? null);
  /** Files brought to a week from My files or the tray, planned there as a drop (feature 5). */
  let incoming = $state<{ folder: string; files: DroppedFile[] } | null>(null);
  function bring(week: string, files: DroppedFile[]) {
    selectNode(week);
    incoming = { folder: week, files };
  }
  const bringOwn = async (week: string, entry: OwnEntry) => {
    if (myFiles) bring(week, await myFiles.dropped(entry));
  };
  /** Each week's state on the course home, read again with every new reading of the course (feature 9). */
  let weekStates = $state<Record<string, WeekState>>({});
  /** The weeks changed since the course was last published (STU-0139). */
  let weeksChanged = $state<string[]>([]);
  /** How students used each week, while an engagement adapter has figures (STU-0200, STU-0201). */
  let engagement = $state<Record<string, WeekEngagement> | null>(null);
  $effect(() => {
    const reading = view;
    const opened = course;
    if (reading === null || opened === null) return;
    void opened.authoring.weekStates().then((found) => {
      if (view === reading) weekStates = found;
    });
    void (opened.publishing?.weeksChanged() ?? Promise.resolve([])).then((found) => {
      if (view === reading) weeksChanged = found;
    });
    void opened.authoring.engagement().then((found) => {
      if (view === reading) engagement = found;
    });
  });
  /** The course's link in Tutors on this computer while it is live, and how its last rebuild went (ADR 0042). */
  const live = new LiveCourse();
  // Files changed on disk, in another app too (a PDF saved, a page written elsewhere), show as they change,
  // and in Tutors too while the course is live there (STU-0166).
  $effect(() => {
    const current = session;
    const opened = course;
    if (current === null || opened === null) return;
    return opened.authoring.watch(() => {
      void current.refresh();
      live.rebuild(opened.live);
    });
  });
  const stopLive = () => live.stop(course?.live);
  const home = new TutorsHome(() => tutorsHome);
  const selected = $derived(session?.selected ?? "");
  const selectedNode = $derived(session?.selectedNode ?? null);
  const parentNode = $derived(session?.parentNode ?? null);
  const errors = $derived(session?.errors ?? 0);
  const notice = $derived(session?.notice ?? "");
  const startSession = (opened: OpenedCourse) =>
    (session = new CourseSession(opened.authoring, { applied: () => companionEvent("change-applied"), select: (path) => selectNode(path) }));
  // The companion (ADR 0015): silent for a moment after any typing or dragging.
  const voice = new CompanionVoice();
  const companionEvent = (event: CompanionEvent, node: MapNode | null = selectedNode) =>
    voice.hear(event, {
      errors: view?.findings.filter((f) => f.severity === "error").length ?? 0,
      emptyWeek: node?.kind === "topic" && node.children.length === 0,
      needsPermission: prefs.chosen !== null && !prefs.allowed,
      hidden: prefs.companionHidden,
    });
  function askCompanion(question: string) {
    const panes: Record<string, string> = { editing: "The markdown editor", writing: "Writing a page", check: "Check and publish", publishing: "Publishing" };
    const where = (pane && panes[pane.kind]) ?? (settingsOpen ? "Settings" : (selectedNode?.title ?? selectedNode?.name ?? "The start screen"));
    return (course?.companion ?? guide).ask(question, {
      where,
      problems: (features.fileNames ? (view?.findings ?? []) : lecturerFindings(view?.findings ?? [])).slice(0, 30).map((finding) => finding.message),
    });
  }
  function companionGo(place: CompanionDestination) {
    voice.hush();
    if (place === "problem") {
      const holder = view === null ? undefined : flatten(view.map).find((node) => node.status === "error");
      settingsOpen = false;
      if (holder) selectNode(holder.path);
    } else if (place === "settings") settingsOpen = true;
    else if (course !== null) {
      settingsOpen = false;
      pane = place === "check" ? { kind: "check" } : place === "publish" ? { kind: "publishing" } : null;
    }
  }

  // The markdown pages directly in the selected folder; the one written plainly, or (Advanced mode) edited as markdown.
  let pagesHere = $state<PageEntry[]>([]);
  /** The week the page on screen belongs to, when it isn't being edited. */
  const pageWeek = $derived(view && editing === null && writing === null && designing === null ? weekFor(view.map, selected) : null);
  async function dropOnPage(event: DragEvent) {
    // The drop zone plans its own drops.
    if (event.defaultPrevented || pageWeek === null || !carriesFiles(event) || !event.dataTransfer) return;
    event.preventDefault();
    const week = pageWeek;
    bring(week, await droppedFiles(event.dataTransfer));
  }
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
    pane = { kind: "editing", page: await course.authoring.openPage(path) };
  }
  async function writePage(path: string) {
    if (!course) return;
    pane = { kind: "writing", page: await course.authoring.openPage(path) };
  }
  async function acceptPage(plan: Plan) {
    pane = null;
    await session?.acceptPage(plan);
  }
  function selectNode(path: string) {
    // Files brought to a week are planned once, when it opens; going elsewhere lets them go.
    incoming = null;
    if (session) {
      session.selected = path;
      session.arranging = null;
    }
    pane = null;
    if (session?.view) companionEvent("week-opened", session.find(path));
  }

  const recentList = untrack(() => new RecentList(recent));
  $effect(() => {
    // Read again whenever the start screen shows, so a course just closed is first.
    if (course === null) void recentList.refresh().then(() => offersSample(recentList.courses.length) && companionEvent("first-run", null));
  });
  $effect(() => {
    if (initialCourse) void untrack(() => show(initialCourse));
  });

  /** Back to the start screen, with the recent courses and Load a course (feature 9). */
  function closeCourse() {
    stopLive();
    course = null;
    session = null;
    pane = null;
  }

  async function open(path?: string) {
    const opened = path === undefined || !recent ? await openCourse() : await recent.open(path);
    if (opened === null) return;
    recentList.forgotten = null;
    if ("missing" in opened) return recentList.missing(opened.missing);
    recentList.notice = "";
    if ("material" in opened) {
      loading = opened.material;
      return;
    }
    show(opened);
  }

  async function show(opened: OpenedCourse, said: CompanionEvent = "course-opened") {
    loading = null;
    if (course !== opened) stopLive();
    course = opened;
    pane = null;
    const opening = startSession(opened);
    companionEvent(said, (await opening.refresh()).map);
  }

  type Made = OpenedCourse | { reason: string } | null | undefined;
  /** A course just made, opened with what Studio says about it; the reason when nothing was made, null otherwise. */
  async function opens(made: Made, notice: (name: string) => string, said: CompanionEvent = "course-opened"): Promise<string | null> {
    if (!made) return null;
    if ("reason" in made) return made.reason;
    starting = false;
    await show(made, said);
    if (session) session.notice = notice(made.name);
    return null;
  }
  const createLoaded = async (answers: LoadAnswers) =>
    loading && opens(await loading.create(answers), (name) => `Created ${name} from your material. Check each week, then drop in anything Studio left out.`);
  const create = async (answers: CourseAnswers) =>
    opens(await newCourse.create(answers), (name) => `Created ${name}. Each week's topic is ready for its material.`, "course-created");
  /** The sample course a first run offers (STU-0211), made like any new course, then opened with what it is for. */
  const trySample = async () => (recentList.notice = (await opens(await newCourse.create(SAMPLE_COURSE), () => SAMPLE_NOTICE, "sample-opened")) ?? "");
  const rollOver = async (answers: { name: string; start: string | null }) =>
    opens(await course?.rollOver?.(answers), (name) => `Created ${name} from last year's course. Its weeks are all visible; give any a release date to hide it until then.`);

  async function openQuiz(folder: string) {
    if (course === null || selectedNode === null) return;
    const isQuiz = selectedNode.kind === "quiz";
    const opened: OpenedQuiz = isQuiz ? await course.authoring.openQuiz(folder) : { page: null, form: emptyQuiz(), leftOut: [] };
    pane = { kind: "designing", quiz: { folder, opened, where: quizPlace(selectedNode, opened.form.heading) } };
    if (session) session.notice = "";
  }

  const planQuiz = (form: QuizForm) => course!.authoring.planQuiz(designing?.opened.page ? { page: designing.opened.page } : { newIn: designing?.folder ?? "" }, form);

  async function acceptQuiz(plan: Plan) {
    pane = null;
    await session?.acceptQuiz(plan);
  }

  const openHistory = () => (pane = { kind: "history" });
</script>

<svelte:window onkeydown={(event) => (prefs.zoomKeys(event), voice.typing(event))} ondragover={() => voice.dragging()} />

{#if updates}<UpdateReady {updates} />{/if}
<div class="shell" class:with-status={features.rulesVersion}>
  {#if settingsOpen}
    <main class="detail wide">
      <Settings
        {preferences}
        appearance={prefs.appearance}
        onAppearance={(next) => prefs.setAppearance(next)}
        onAssistant={() => prefs.readAssistant()}
        advanced={prefs.advanced}
        onAdvanced={(on) => prefs.setAdvanced(on)}
        companionHidden={prefs.companionHidden}
        onCompanionHidden={setCompanionHidden}
        {updates}
        {openLink}
        {accounts}
        {usage}
        {commandLine}
        onClose={() => (settingsOpen = false)}
      />
    </main>
  {:else if loading}
    <LoadCourse folderName={loading.folderName} preview={loading.preview} onCreate={createLoaded} onCancel={() => (loading = null)} />
  {:else if libraryOpen && library}
    <Library {library} choose={folders?.choose} onOpen={(o) => ((libraryOpen = false), typeof o === "string" ? open(o) : show(o))} onClose={() => (libraryOpen = false)} />
  {:else if starting}
    <NewCourse check={newCourse.check} onCreate={create} onCancel={() => (starting = false)} />
  {:else if course === null || session === null || view === null}
    <StartScreen
      onOpen={() => (voice.leftStart(), open())}
      onNew={() => (voice.leftStart(), (starting = true))}
      onSettings={() => (settingsOpen = true)}
      recent={recentList.courses}
      onRecent={(path) => open(path)}
      onForget={recent ? (path) => recentList.forget(path) : undefined}
      notice={recentList.notice}
      onPutBack={recentList.forgotten ? () => recentList.putBack() : undefined}
      onSample={() => void trySample()}
      onLibrary={library ? () => (voice.leftStart(), (libraryOpen = true)) : undefined}
      tutors={tutorsHome ? { onView: () => void home.view(), opening: home.opening, failed: home.failed } : undefined}
    />
  {:else}
    <CourseSidebar
      title={view.map.title ?? course.name}
      {errors}
      {weekStates}
      quiet={pane !== null}
      map={view.map}
      selected={pane?.kind === "check" || pane?.kind === "history" || pane?.kind === "publishing" ? null : selected}
      {selectedNode}
      showFileNames={features.fileNames}
      onSelect={selectNode}
      onArrange={(action) => session!.arrange(action)}
      onFiles={bring}
      onOwn={myFiles ? bringOwn : undefined}
      own={myFiles && folders ? { myFiles, choose: () => folders.choose("Choose the folder of your own material"), onAdd: bringOwn } : undefined}
      {checkOpen}
      {publishingOpen}
      {historyOpen}
      onCheck={() => (pane = { kind: "check" })}
      onHistory={openHistory}
      onSettings={() => (settingsOpen = true)}
      onClose={closeCourse}
      live={live.link === null ? null : { line: liveStatusLine(live.status), updating: live.status.state === "updating", onOpen: () => openLink(live.link!), onStop: stopLive }}
      tutors={course.live ? { onView: () => void live.show(course?.live), opening: live.opening, failed: live.failed } : undefined}
    />
    <!-- Files from the computer dropped anywhere on a week's page are planned as dropped on its drop zone (STU-0146). -->
    <main
      class="detail"
      class:editing={editing !== null || writing !== null}
      ondragover={(event) => {
        if (pageWeek !== null && carriesFiles(event)) event.preventDefault();
      }}
      ondrop={(event) => void dropOnPage(event)}
    >
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
          onClose={() => (pane = null)}
        />
      {:else if writing}
        {#key writing}
          <PlainEditor
            opened={writing}
            title={selectedNode?.title ?? writing.path}
            onPlan={(markdown, attachments) => course!.authoring.planPage(writing!, markdown, attachments)}
            onAttach={attachesFiles(folderOfPage(writing.path)) ? (file, pending) => course!.authoring.attach(writing!.path, file, pending) : undefined}
            onAccept={acceptPage}
            onClose={() => (pane = null)}
            onSource={features.markdownEditor ? () => editPage(writing!.path) : undefined}
          />
        {/key}
      {:else if editing}
        {#key editing}
          <PageEditor
            opened={editing}
            render={(markdown) => course!.authoring.renderPage(markdown)}
            onPlan={(markdown, attachments) => course!.authoring.planPage(editing!, markdown, attachments)}
            onAttach={attachesFiles(folderOfPage(editing.path)) ? (file, pending) => course!.authoring.attach(editing!.path, file, pending) : undefined}
            onAccept={acceptPage}
            onClose={() => (pane = null)}
          />
        {/key}
      {:else if checkOpen}
        <Check
          advanced={prefs.advanced}
          placeOf={(path) => (features.fileNames ? (path === "" ? "Course folder" : path) : placeName(view!.map, path))}
          findings={view.findings}
          handOff={course.handOff}
          canPublish={course.publishing !== null}
          assistants={features.assistants}
          readPermission={prefs.chosen === null ? undefined : { name: "Claude", allowed: prefs.allowed, set: (next) => course && prefs.setOptIn(course.key, next) }}
          agent={course.agent
            ? {
                allowed: agent.allowed,
                set: (next) => agent.allow(next),
                waiting: agent.waiting,
                onAccept: (id) => agent.accept(id, session!.apply.bind(session)),
                onDecline: (id) => agent.decline(id),
              }
            : undefined}
          onPlanFixAll={() => course!.authoring.planFixAll()}
          onApply={(plan) => session!.apply(plan)}
          onSelect={selectNode}
          onPublish={() => (pane = { kind: "publishing" })}
          onClose={() => (pane = null)}
        />
      {:else if publishingOpen}
        <Publish
          {ahead}
          advanced={prefs.advanced}
          publishing={course.publishing}
          courseName={course.name}
          {errors}
          {openLink}
          {folders}
          onSaved={() => void session?.refresh()}
          onSettings={() => (settingsOpen = true)}
          live={course.live
            ? {
                port: course.live,
                link: live.link,
                problem: live.problem,
                onLive: (link) => live.started(link),
              }
            : null}
          onClose={() => (pane = null)}
        />
      {:else if designing}
        {#key designing}
          <QuizDesigner opened={designing.opened} where={designing.where} onPlan={planQuiz} onAccept={acceptQuiz} onClose={() => (pane = null)} />
        {/key}
      {:else if selectedNode}
        <NodeDetail
          node={selectedNode}
          incoming={incoming?.folder === selectedNode.path ? incoming.files : null}
          onPlace={(week, file) => bring(week, [file])}
          {weekStates}
          {engagement}
          {weeksChanged}
          pending={session.pending}
          onFix={(finding) => session!.proposeFix(finding)}
          onAccept={() => session!.accept()}
          onCancel={() => (session!.pending = null)}
          onQuiz={openQuiz}
          onMaterial={(folder, files) => course!.authoring.planMaterial(folder, files)}
          onAcceptMaterial={(plan) => session!.acceptMaterial(plan)}
          onItem={(folder, word, title, address) => course!.authoring.planItem(folder, word, title, address)}
          visible={session.visibleScope === null ? undefined : { scope: session.visibleScope, plan: (folder, word) => course!.authoring.planVisible(folder, word) }}
          assistant={prefs.chosen === null ? undefined : { name: "Claude", explain: (finding) => course!.authoring.explain(finding) }}
          showFileNames={features.fileNames}
          pages={pagesHere}
          savedNow={session.savedNow}
          onEdit={features.markdownEditor ? editPage : undefined}
          onWrite={writePage}
          parent={selectedNode.path !== "" && parentNode && parentNode.path !== "" ? { path: parentNode.path, title: parentNode.title ?? parentNode.name } : null}
          onSelect={selectNode}
          arrange={nodeArrange(view.map, session, course.authoring)}
          onRollOver={course.rollOver ? rollOver : undefined}
        />
      {/if}
    </main>
  {/if}
  {#if features.rulesVersion}<StatusBar {rulesVersion} assistantName={prefs.assistantName} onSettings={() => (settingsOpen = true)} />{/if}
  <Companion
    moment={voice.moment}
    hidden={prefs.companionHidden}
    assistantName={prefs.chosen === null || !course ? null : "Claude"}
    ask={askCompanion}
    canGo={(place) => place === "settings" || course !== null}
    onGo={companionGo}
    onDismiss={() => voice.hush()}
    onHide={setCompanionHidden}
  />
</div>

<style>
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
    :global(:root[data-text-size="175"]) .detail,
    :global(:root[data-text-size="200"]) .detail {
      padding-left: var(--space-5);
      padding-right: var(--space-5);
      overflow-y: visible;
    }
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
</style>
