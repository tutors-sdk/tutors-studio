# Tutors Studio architecture

This document describes how Studio is built: what it talks to, what it's made of, and the rules that hold it together. It is written for maintainers and contributors. Lecturers want the [guides](guides/README.md).

The decisions behind it are in [docs/adr](adr/README.md). Where this document and an ADR disagree, the newer ADR wins and this document is out of date, so fix it. Behaviour is specified as EARS sentences with `STU-` ids in [spec/ears](../spec/ears/README.md). The rules every change follows are in [CLAUDE.md](../CLAUDE.md).

## What Studio is for

Studio shows a lecturer their Tutors course folder the way Tutors will read it, explains what's wrong in the lecturer's words, and fixes it through plans the lecturer accepts. Four commitments shape the architecture:

1. **The rules are Tutors' own.** Every finding comes from `@tutors/course-rules`, the package behind `tutors validate`, so Studio and the command line can never disagree (ADR [0003](adr/0003-course-rules-from-jsr-pinned.md), [0034](adr/0034-tutors-cli-is-the-gate.md)).
2. **Plan, then apply.** Nothing writes to a course except `applyPlan`, with a plan the lecturer accepted ([ADR 0004](adr/0004-plan-then-apply.md)). The one amendment is that files dropped on a week go straight in, with undo ([ADR 0038](adr/0038-drops-on-a-week-go-straight-in.md)).
3. **The course folder is the boundary.** The WebView can't touch a file outside the open course. The Rust side enforces this, not the TypeScript.
4. **Optional help, never required.** Studio works fully with no network and no developer tools. Each of those adds something but takes nothing away.

## C4 level 1: system context

```mermaid
flowchart TB
  %% C4 level 1, system context. Dark blue: people. Blue: Studio. Grey: outside Studio.
  lecturer(["Lecturer<br/>[Person]<br/>knows their subject,<br/>not Git or markdown"])
  advanced(["Learning technologist<br/>[Person]<br/>turns on Advanced mode"])
  studio["Tutors Studio<br/>[Software System]<br/>desktop app: shows a course as Tutors<br/>reads it, fixes it through accepted plans"]
  disk[("Course folder<br/>a Tutors course<br/>on this computer")]
  own[("Lecturer's own folder<br/>slides, notes, labs<br/>read only")]
  jsr["JSR and Docker Hub<br/>the pinned Tutors generator"]
  tutors["Lecturer's copy of Tutors<br/>reader run with pnpm dev"]
  netlify["Netlify<br/>hosts the built course"]
  github["Git remote<br/>GitHub"]
  releases["GitHub Releases<br/>installers, updates"]

  lecturer -- "opens, arranges,<br/>writes, publishes" --> studio
  advanced -- "also edits markdown,<br/>hands off through Git" --> studio
  studio -- "reads; writes only<br/>accepted plans" --> disk
  studio -- "reads, copies from" --> own
  studio -- "fetches the generator" --> jsr
  studio -- "shows the course live" --> tutors
  studio -- "deploys built files" --> netlify
  studio -- "commit, push" --> github
  studio -- "checks for updates" --> releases

  classDef person fill:#08427b,stroke:#052e56,color:#fff
  classDef inside fill:#1168bd,stroke:#0b4884,color:#fff
  classDef outside fill:#6b6b6b,stroke:#4d4d4d,color:#fff
  class lecturer,advanced person
  class studio inside
  class disk,own,jsr,tutors,netlify,github,releases outside
```

Students never meet Studio. They read the published course in the Tutors reader at tutors.dev, which reads what the Tutors generator built from the course folder. Studio's job ends when the course folder is correct and, optionally, online.

## C4 level 2: containers

Studio is one Tauri 2 application ([ADR 0001](adr/0001-tauri-2-as-the-desktop-shell.md)) with two halves: a Svelte 5 WebView that holds all the logic, and a small Rust core that holds every privilege. The headless CLI runs the same TypeScript under Node.

```mermaid
flowchart TB
  %% C4 level 2, containers. Blue: inside Studio. Grey: outside it.
  lecturer(["Lecturer"])
  subgraph app["Tutors Studio: a Tauri 2 app"]
    webview["Studio UI and core<br/>[TypeScript, Svelte 5, in the OS WebView]<br/>domain, use cases, screens, adapters"]
    rust["Rust core<br/>[Tauri 2 commands]<br/>holds the course root, runs only<br/>allow-listed tools, watches files"]
    settings[("Settings<br/>[localStorage]<br/>never secrets")]
    keychain[("OS keychain<br/>Netlify token")]
  end
  headless["Headless CLI<br/>[TypeScript under Node]<br/>the same use cases over node:fs"]
  disk[("Course folder")]
  own[("Lecturer's own folder")]
  tools["deno, docker, podman, git,<br/>pnpm in the lecturer's Tutors"]
  netlify["Netlify API"]
  releases["GitHub Releases"]

  lecturer -- "uses" --> webview
  webview -- "invoke(), Tauri IPC" --> rust
  webview -- "reads, writes" --> settings
  rust -- "secret_get, secret_set" --> keychain
  rust -- "list, read, write,<br/>move, watch" --> disk
  rust -- "own_list, own_read" --> own
  rust -- "run_tool: allow-listed<br/>arguments only" --> tools
  webview -- "deploy, fetch" --> netlify
  rust -- "update check" --> releases
  headless -- "node:fs" --> disk
  headless -- "child_process" --> tools

  classDef person fill:#08427b,stroke:#052e56,color:#fff
  classDef inside fill:#1168bd,stroke:#0b4884,color:#fff
  classDef outside fill:#6b6b6b,stroke:#4d4d4d,color:#fff
  class lecturer person
  class webview,rust,settings,keychain inside
  class headless,disk,own,tools,netlify,releases outside
```

| Container          | Code                                           | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Studio UI and core | `src/`                                         | Everything a lecturer sees, every rule about plans, every use case. Runs in the OS WebView (WebKit on macOS and Linux, WebView2 on Windows).                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Rust core          | `src-tauri/src`                                | `fs.rs`: opens one course root, resolves every course-relative path against it and refuses `..`, absolute paths, drive letters and backslashes (STU-0006); watches the folder and emits a change event (STU-0130). `own.rs`: the same for the lecturer's own folder, read only (ADR 0035). `tool.rs`: `run_tool` runs only `deno`, `git`, `docker` and `podman`, each only with the exact argument shapes Studio's adapters use, containers only with the pinned deno image and only mounting the open course; and `secret_get`/`secret_set` over the `keyring` crate (ADR 0016). |
| Settings           | `src/adapters/settings/local-storage`          | Typed per-user settings. Secrets are never stored here.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| OS keychain        | `src-tauri/src/tool.rs`                        | The Netlify sign-in.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Headless CLI       | `src/headless.ts`, `src/adapters/cli/headless` | The second composition root: the same use cases over `node:fs`, `child_process` and environment secrets. See [guide 11](guides/11-command-line.md).                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Browser preview    | `pnpm dev`                                     | `src/main.ts` outside Tauri: a sample course in memory, no publishing, no keychain. For UI work and screenshots.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## The rings

Inside the WebView the code is hexagonal ([ADR 0002](adr/0002-hexagonal-rings.md)). `pnpm architecture` (dependency-cruiser, `.dependency-cruiser.cjs`) fails the build when a ring rule breaks.

```mermaid
flowchart TB
  subgraph roots["Composition roots: src/main.ts, src/headless.ts"]
    direction TB
    subgraph ui["src/ui: Svelte 5 screens"]
      subgraph adapters["src/adapters/port/impl: one SDK each"]
        subgraph app["src/application: use cases and ports"]
          domain["src/domain: course map, plans, words. Imports nothing."]
        end
      end
    end
  end
```

| Rule (`.dependency-cruiser.cjs`)              | Meaning                                                                                                   |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `domain-imports-nothing`                      | `src/domain` is pure TypeScript: no Svelte, no Tauri, no Node, no other ring.                             |
| `application-imports-only-domain`             | Use cases and ports know the domain and nothing else.                                                     |
| `adapters-never-import-ui-or-each-other`      | An adapter implements one port with one SDK.                                                              |
| `ui-never-imports-adapters`                   | Screens receive use cases as props; they never reach an adapter.                                          |
| `only-the-rules-adapter-imports-course-rules` | `@tutors/course-rules` (vendored in `vendor/course-rules` until it's on JSR) is behind `CourseRulesPort`. |
| `only-tauri-adapters-import-tauri`            | `@tauri-apps/*` appears only in `src/adapters/*/tauri`.                                                   |
| `no-circular`                                 | No import cycles.                                                                                         |

Only `src/main.ts` and `src/headless.ts` name adapters.

## C4 level 3: components of the Studio core

```mermaid
flowchart LR
  %% C4 level 3, components of src/. Blue: in the core. Grey: adapters, behind ports.
  subgraph core["Studio UI and core (src/)"]
    ui["Screens<br/>src/ui, Svelte 5"]
    session["CourseSession<br/>the open course,<br/>refreshed on change"]
    authoring["Authoring<br/>course map, findings,<br/>every plan, undo"]
    applyplan["applyPlan<br/>the only writer"]
    creation["New course, Load"]
    publishing["Publishing<br/>save, build, deploy"]
    live["Live Tutors<br/>rebuild, reload"]
    handoff["Hand-off<br/>git commit, push"]
    prefs["Preferences, usage,<br/>updates"]
    domain["Domain<br/>plans, course map, words"]
  end
  rulesA["course-rules adapter"]
  fsA["File system<br/>tauri, node, memory"]
  buildA["tutors-gen build"]
  hostA["Netlify hosting"]
  localA["Local Tutors<br/>tauri, node"]
  gitA["git publish"]
  otherA["Settings, secrets,<br/>telemetry, updates"]

  ui --> session
  session -- "AuthoringPort" --> authoring
  ui --> creation
  ui -- "PublishingPort" --> publishing
  ui -- "LiveTutorsPort" --> live
  ui -- "HandOffPort" --> handoff
  ui -- "PreferencesPort" --> prefs
  authoring -- "accepted Plan" --> applyplan
  authoring --> domain
  applyplan -- "FileSystemPort" --> fsA
  authoring -- "CourseRulesPort" --> rulesA
  creation --> rulesA
  publishing -- "CourseBuildPort" --> buildA
  publishing -- "HostingPort" --> hostA
  live -- "LocalTutorsPort" --> localA
  live --> buildA
  handoff -- "PublishPort" --> gitA
  prefs -- "SettingsPort,<br/>SecretsPort" --> otherA

  classDef person fill:#08427b,stroke:#052e56,color:#fff
  classDef inside fill:#1168bd,stroke:#0b4884,color:#fff
  classDef outside fill:#6b6b6b,stroke:#4d4d4d,color:#fff
  class ui,session,authoring,applyplan,creation,publishing,live,handoff,prefs,domain inside
  class rulesA,fsA,buildA,hostA,localA,gitA,otherA outside
```

### Ports and adapters

Driving ports are what the UI and the CLI call. Driven ports are what the use cases call out through.

| Port              | Kind    | Adapters                                                                      | ADR              |
| ----------------- | ------- | ----------------------------------------------------------------------------- | ---------------- |
| `AuthoringPort`   | driving | `createAuthoring`                                                             | 0004             |
| `PublishingPort`  | driving | `createPublishing`                                                            | 0019, 0030       |
| `LiveTutorsPort`  | driving | `createLiveTutors`                                                            | 0042             |
| `HandOffPort`     | driving | `createHandOff`                                                               | 0021             |
| `PreferencesPort` | driving | `createPreferences`                                                           | 0020, 0024       |
| `UsagePort`       | driving | `createUsage`                                                                 | 0037             |
| `ToolHostPort`    | driving | none yet (MCP server, planned)                                                | 0007             |
| `FileSystemPort`  | driven  | `fs/tauri`, `fs/node`, `fs/memory`; one contract suite runs against all three | 0009             |
| `CourseRulesPort` | driven  | `rules/course-rules` over `vendor/course-rules` (pinned)                      | 0003             |
| `CourseBuildPort` | driven  | `build/tutors-gen` (deno, or deno in docker/podman)                           | 0019, 0029, 0034 |
| `ProcessPort`     | driven  | `process/tauri` (`run_tool`), `process/node`                                  | 0019             |
| `LocalTutorsPort` | driven  | `local-tutors/tauri` (Rust `live.rs`), `local-tutors/node`                    | 0042             |
| `HostingPort`     | driven  | `hosting/netlify`                                                             | 0019             |
| `PublishPort`     | driven  | `publish/git` over `ProcessPort`                                              | 0021             |
| `SaveCopyPort`    | driven  | `save-copy/tauri`, `save-copy/node`                                           | 0029             |
| `OwnFilesPort`    | driven  | `own-files/tauri`, `own-files/memory`                                         | 0035             |
| `SettingsPort`    | driven  | `settings/local-storage`, `settings/memory`                                   | 0020             |
| `SecretsPort`     | driven  | `secrets/tauri` (keychain), `secrets/env`, `secrets/memory`                   | 0016             |
| `MarkdownPort`    | driven  | `markdown/markdown-it` (raw HTML shown as text)                               | 0025             |
| `TelemetryPort`   | driven  | `telemetry/local`, wrapped by the opt-in counter                              | 0037             |
| `UpdatesPort`     | driven  | `updates/tauri`, `updates/none`                                               | 0033             |

A new port, a new adapter for a port, an MCP schema change, a token change or an unpinned dependency needs an ADR.

## How a change reaches the disk

Every write goes through one function. A `Plan` is a list of `write` and `move` operations on course-relative paths with a one-line summary (`src/domain/plan.ts`). `checkPlan` rejects the whole plan if any path is unsafe, two operations land on one path, or a move goes nowhere. `applyPlan` (`src/application/use-cases/apply-plan.ts`) applies the operations in order, records an undo step for each, and on any failure replays the undo steps and reports the file that blocked it (STU-0004). The Rust side checks every path again.

```mermaid
sequenceDiagram
  actor L as Lecturer
  participant UI as Screen (Svelte)
  participant A as Authoring use case
  participant R as CourseRulesPort
  participant P as applyPlan
  participant F as FileSystemPort (Tauri)
  participant K as Rust fs.rs

  L->>UI: Make it a week
  UI->>A: planMakeVisible(path, "topic")
  A->>R: rename and starter files for kind
  R-->>A: ops + sentences
  A-->>UI: Plan (summary, ops)
  UI-->>L: Before anything changes
  L->>UI: Make it visible (accept)
  UI->>A: apply(plan)
  A->>P: applyPlan(fs, plan)
  P->>P: checkPlan: safe paths, no clashes
  loop each op
    P->>F: move / write
    F->>K: invoke fs_move / fs_write
    K->>K: resolve() refuses paths outside root
  end
  alt an op fails
    P->>F: replay undo steps
    P-->>A: blockedBy file
  else all applied
    P-->>A: undo steps
    A->>A: add to history
  end
  K-->>UI: watcher event
  UI->>A: refresh: read tree, run rules
  A-->>UI: new course map, Done: … Put it back
```

Undo is the same path in reverse. History keeps each applied plan's undo steps. **Put back** turns them into a new plan, shown and accepted like any other. Files the plan added are moved to `.tutors-bin/`, never deleted, and a file changed since is left alone and named (STU-0091 to STU-0094, [ADR 0032](adr/0032-undo-history-and-the-bin.md)).

## How a course is published

```mermaid
sequenceDiagram
  actor L as Lecturer
  participant UI as Publish screen
  participant Pub as Publishing use case
  participant R as CourseRulesPort
  participant P as applyPlan
  participant B as CourseBuildPort (tutors-gen)
  participant T as Rust run_tool
  participant H as HostingPort (Netlify)

  L->>UI: Publish for students (site)
  UI->>Pub: publish(site)
  Pub->>R: check course
  alt errors
    Pub-->>UI: refuse, N to fix
  end
  Pub->>R: standard setup the course lacks
  Pub->>P: apply setup plan (netlify.toml, .gitignore)
  Pub->>B: validate (when a validating CLI is pinned)
  B->>T: deno run tutors validate
  Pub->>B: build json/
  B->>T: deno run -A jsr:@tutors/tutors@pinned (or deno image in docker/podman)
  Pub->>H: digests of built files
  H-->>Pub: files Netlify lacks
  Pub->>H: upload only those
  H-->>Pub: site URL
  Pub->>Pub: remember site, last-publish digest
  Pub-->>UI: tutors.dev/course/site, changes since
```

**See it in Tutors on this computer** builds the same `json/`, serves it on 127.0.0.1 and shows it in the lecturer's own Tutors reader, rebuilding after every change ([below](#how-a-course-shows-live-in-tutors)). **Save the course** stops after the setup plan and the validation, with no build and nothing sent ([ADR 0030](adr/0030-publish-saves-a-compliant-course.md)). **Save as a website** builds with tutors-lite into `html/` and copies it to a new folder the lecturer picks, never over an existing one ([ADR 0029](adr/0029-save-the-course-as-a-website.md)). The Git hand-off runs `git status`, `add -A`, `commit -m` and `push -u <remote> HEAD`, nothing else, and refuses while the course has errors or its `.gitignore` would commit `json/` ([ADR 0021](adr/0021-handing-off-through-the-computers-git.md)).

## How a course shows live in Tutors

**See it in Tutors on this computer** ([ADR 0042](adr/0042-a-live-course-in-the-lecturers-own-tutors.md), STU-0164 to STU-0170) is not continuous delivery: each change is a rebuild of the whole course, so Studio says when Tutors is behind and when it has caught up.

Deploying to Tutors on this computer, when the lecturer presses **Show it in Tutors**:

```mermaid
flowchart LR
  studio["Tutors Studio"]
  gen["Tutors generator<br/>builds the course"]
  json[("json/<br/>in the course folder")]
  server["Course server<br/>127.0.0.1:8190"]
  reader["Tutors reader<br/>pnpm dev in the<br/>lecturer's copy of Tutors"]
  window["Tutors window<br/>/course/127.0.0.1:8190"]

  studio -- "1. build" --> gen
  gen -- "2. writes" --> json
  studio -- "3. serve" --> server
  server -- "reads" --> json
  studio -- "4. start, unless<br/>already running" --> reader
  studio -- "5. open" --> window
  window -- "shows the course<br/>from the server" --> reader

  classDef inside fill:#1168bd,stroke:#0b4884,color:#fff
  classDef outside fill:#6b6b6b,stroke:#4d4d4d,color:#fff
  class studio,server,window inside
  class gen,json,reader outside
```

After that, each change runs this loop. The numbers on the arrows are one change, from the lecturer's edit to the page they see in Tutors.

```mermaid
flowchart TB
  %% C4 level 2, dynamic: one change, numbered in order. Blue is inside Studio, grey is outside it.
  lecturer(["Lecturer"])
  folder[("Course folder")]
  subgraph studio["Tutors Studio"]
    rust["Rust core<br/>watches the course,<br/>serves json/ on 127.0.0.1"]
    ui["Studio UI and core<br/>rebuilds, says what<br/>Tutors shows"]
    window["Tutors window<br/>on the lecturer's page"]
  end
  gen["Tutors generator"]
  reader["Tutors reader<br/>pnpm dev, localhost:5173"]

  lecturer -- "1. edits a page" --> folder
  rust -- "2. course changed" --> ui
  ui -- "3. updating…" --> window
  ui -- "4. build, after 0.4 s<br/>with no more edits" --> gen
  gen -- "5. writes json/" --> folder
  ui -- "6. reload" --> window
  window -- "7. same page" --> reader
  reader -- "8. GET tutors.json" --> rust
  ui -- "9. up to date,<br/>rebuilt in 0.3 s" --> lecturer

  classDef inside fill:#1168bd,stroke:#0b4884,color:#fff
  classDef outside fill:#6b6b6b,stroke:#4d4d4d,color:#fff
  classDef person fill:#08427b,stroke:#052e56,color:#fff
  class ui,rust,window inside
  class folder,gen,reader outside
  class lecturer person
```

The same flow in time, with the two things that can go differently: another change during a rebuild, and a change that doesn't build.

```mermaid
sequenceDiagram
  actor L as Lecturer
  participant S as Studio (foot line)
  participant W as Tutors window
  participant G as Generator
  participant C as Course server (127.0.0.1)
  participant R as Tutors reader (pnpm dev)

  L->>S: edit
  S->>S: wait 0.4 s for more edits
  S-->>L: Live in Tutors: updating…
  S->>W: note "Studio is updating this course…"
  S->>G: build json/
  opt edited again during the build
    L->>S: edit
    S->>G: build once more when this one ends
  end
  alt it built
    G-->>S: ok, in N seconds
    S->>W: reload on the same page
    W->>R: /course/127.0.0.1:8190/…
    R->>C: tutors.json, images, PDFs
    C-->>R: the new build (no-store, CORS *)
    S-->>L: up to date at HH:MM, rebuilt in N seconds
  else it didn't build
    G-->>S: error
    S->>W: note "This change didn't build. You're seeing the last version"
    S-->>L: the last change didn't build, and why
  end
```

A starter course rebuilds in about 0.3 seconds, so the note barely shows. A big course with LLM exports (`llm:` in properties.yaml) took about 3 seconds, most of it zipping every talk PDF again; with tutors-sdk/tutors-mono-repo#596 the generator writes only the files and zips that changed, and the same rebuild takes about half a second. The first build on a computer adds about 15 seconds while Deno fetches the generator.

## Files in a course

Studio places every file where Tutors will publish and link it: a PDF that is content gets its own Talk or Tutorial folder; a file that supports a lab or note goes in that page's `archives/` folder and is linked as `archives/name`; a download is an Archive holding one zip; module-wide files go in the `side/` unit; never a kindless folder at the course root. The standard, and the reasons read from the generator and reader code, are in [Course files](course-files.md). It is decided in [ADR 0040](adr/0040-files-belong-to-what-shows-them.md) and specified by STU-0155 to STU-0161. The placement code is the material planning in `authoring.ts` over course-rules' `shape` and tutors-create's item layout: Word and other unpublished types are zipped into a note's `archives/`, files beside a lab's steps go to its `archives/` with the links rewritten, extensions are lower-cased, and **Attach a file** writes the file and the page in one plan. A file of a kind Tutors doesn't show, dropped as itself, is kept unopened in the week's `files/` working folder, which course-rules accepts (V018).

## Privacy and trust boundaries

| Boundary                             | What crosses it                                                   | Guard                                                                                                                                                         |
| ------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WebView to disk                      | Course-relative paths only                                        | `fs.rs` `resolve()`; `checkPlan`                                                                                                                              |
| WebView to the lecturer's own folder | Reads only                                                        | `own.rs` has no write command (ADR 0035)                                                                                                                      |
| WebView to programs                  | `deno`, `git`, `docker`, `podman` with fixed argument shapes      | `tool.rs` `allowed()`; containers: one pinned image, no `--privileged`/`--network`/`--env`/extra mounts, only the course mounted                              |
| Studio to the lecturer's Tutors      | The built course on 127.0.0.1, `pnpm dev` in their copy of Tutors | Server: GET/HEAD inside `json/` only; `pnpm dev` only in a folder named `tutors-mono-repo` with `apps/reader`; the Tutors window has no capability (ADR 0042) |
| Studio to Netlify                    | Built files only, and the token                                   | Token in the keychain; deploy refuses a course with errors                                                                                                    |
| Secrets at rest                      | Netlify token                                                     | OS keychain only, never settings (ADR 0016)                                                                                                                   |
| Usage counts                         | Numbers by event name                                             | Off by default, never sent; copy gives version and numbers only (ADR 0037)                                                                                    |

## Testing

| Layer          | Where                              | What it proves                                                                                                                                                          |
| -------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain         | `tests/domain`                     | Pure functions: plans, map, arrange, quiz, plain writing round-trips                                                                                                    |
| Application    | `tests/application`                | `applyPlan` rollback, history, new course, the headless CLI                                                                                                             |
| Contract       | `tests/contract`                   | One suite per port, run against every adapter (ADR 0009)                                                                                                                |
| Screens        | `vitest` project `screens` (jsdom) | Svelte screens against fakes                                                                                                                                            |
| EARS scenarios | `spec/features` + `spec/steps`     | Every `STU-` sentence as Gherkin, driven through the headless adapter over an in-memory course; `pnpm ears:audit` keeps register, features and steps in step (ADR 0008) |
| Rust           | `pnpm test:rust`                   | Path guard, tool allow-list, move semantics                                                                                                                             |
| Architecture   | `pnpm architecture`                | The ring rules                                                                                                                                                          |

CI runs format, `pnpm check`, tests, Rust tests, the architecture rules, the EARS audit and an app build on Ubuntu (latest and 22.04), macOS and Windows for every PR ([ADR 0010](adr/0010-three-os-ci.md)). The release workflow builds signed-when-possible installers for each OS, then installs and opens each one ([ADR 0017](adr/0017-installing-without-a-fight.md), [releasing](releasing.md)).

## Where to read next

- [ADR index](adr/README.md): every decision, with its status.
- [spec/ears](../spec/ears/README.md): every behaviour, by `STU-` id.
- [DESIGN.md](../DESIGN.md) and [PRODUCT.md](../PRODUCT.md): the visual contract and who Studio is for.
- [Course files](course-files.md): where files belong.
- [Guides](guides/README.md): Studio as a lecturer sees it.
