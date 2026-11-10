<script lang="ts">
  import Updates from "./Updates.svelte";
  import type { StudioUpdates } from "../../application/use-cases/updates.ts";
  import type { PreferencesPort } from "../../application/ports/preferences.ts";
  import { textSizes, type Appearance } from "../../domain/appearance.ts";
  import { claudeModels, sizeInWords, suggestedLocalModel, type AssistantProvider, type LocalModel } from "../../domain/assistant.ts";

  interface Props {
    preferences: PreferencesPort;
    appearance: Appearance;
    onAppearance: (appearance: Appearance) => void;
    onClose: () => void;
    /** Called after the assistant choice changes, so the window can show the new one. */
    onAssistant?: () => void;
    advanced: boolean;
    onAdvanced: (on: boolean) => void;
    companionHidden: boolean;
    onCompanionHidden: (hidden: boolean) => void;
    /** Checking for a newer Studio and installing it once accepted (ADR 0033), and opening the download page. */
    updates?: StudioUpdates;
    openLink?: (url: string) => void;
  }
  let { preferences, appearance, onAppearance, onClose, onAssistant, advanced, onAdvanced, companionHidden, onCompanionHidden, updates, openLink }: Props = $props();

  let assistant = $state<{ provider: AssistantProvider; model: string; keySet: boolean } | null>(null);
  let key = $state("");
  $effect(() => {
    preferences.assistant().then((found) => (assistant = found));
  });
  // Ollama's models, read again whenever the lecturer picks "A model on this computer"; null when Ollama isn't running.
  let localModels = $state<LocalModel[] | null | undefined>(undefined);
  let downloading = $state(false);
  let localProblem = $state("");
  const readLocalModels = async () => (localModels = await preferences.localModels());
  $effect(() => {
    if (assistant?.provider === "ollama" && localModels === undefined) void readLocalModels();
  });
  async function chooseAssistant(provider: AssistantProvider, model: string) {
    if (provider === "ollama") await readLocalModels();
    await preferences.setAssistant(provider, model);
    assistant = await preferences.assistant();
    onAssistant?.();
  }
  async function downloadModel() {
    downloading = true;
    localProblem = "";
    try {
      await preferences.downloadLocalModel(suggestedLocalModel.name);
      await readLocalModels();
      assistant = await preferences.assistant();
      onAssistant?.();
    } catch (error) {
      localProblem = error instanceof Error ? error.message : String(error);
    } finally {
      downloading = false;
    }
  }
  async function saveKey() {
    await preferences.setAssistantKey(key);
    key = "";
    assistant = await preferences.assistant();
    saved = assistant.keySet ? "Saved the Claude API key in this computer's keychain." : "Removed the Claude API key.";
    onAssistant?.();
  }

  let saved = $state("");

  const change = <K extends keyof Appearance>(key: K, value: Appearance[K]) => onAppearance({ ...appearance, [key]: value });
</script>

<section class="settings" aria-labelledby="settings-title">
  <header class="settings-head">
    <h2 id="settings-title">Settings</h2>
    {#if saved}<p class="saved" role="status">{saved}</p>{/if}
    <button class="quiet" onclick={onClose}>Done</button>
  </header>

  <fieldset>
    <legend>Appearance</legend>
    <div class="choices" role="radiogroup" aria-label="Light or dark">
      {#each [["system", "Match this computer"], ["light", "Light"], ["dark", "Dark"]] as [value, label] (value)}
        <label class="choice"><input type="radio" name="theme" checked={appearance.theme === value} onchange={() => change("theme", value as Appearance["theme"])} /> {label}</label
        >
      {/each}
    </div>
  </fieldset>

  <fieldset>
    <legend>Reading</legend>
    <label class="check">
      <input type="checkbox" checked={appearance.dyslexia} onchange={(event) => change("dyslexia", event.currentTarget.checked)} />
      Dyslexia mode
    </label>
    <p class="help">
      A dyslexia-friendly font on a cream background, with wider spacing between letters, words and lines, and no italics, as the British Dyslexia Association's style guide
      recommends.
    </p>
    {#if appearance.dyslexia}
      <div class="choices" role="radiogroup" aria-label="Dyslexia font">
        <label class="choice"
          ><input type="radio" name="dyslexia-font" checked={appearance.dyslexiaFont === "opendyslexic"} onchange={() => change("dyslexiaFont", "opendyslexic")} /> OpenDyslexic</label
        >
        <label class="choice"
          ><input type="radio" name="dyslexia-font" checked={appearance.dyslexiaFont === "plain"} onchange={() => change("dyslexiaFont", "plain")} /> A plain font (Verdana)</label
        >
      </div>
    {/if}
  </fieldset>

  <fieldset>
    <legend>Vision</legend>
    <div class="row">
      <label for="text-size">Text size</label>
      <select id="text-size" value={appearance.textSize} onchange={(event) => change("textSize", Number(event.currentTarget.value) as Appearance["textSize"])}>
        {#each textSizes as size (size)}<option value={size}>{size}%</option>{/each}
      </select>
    </div>
    <p class="help">Makes text and controls bigger together. Ctrl and + or − (⌘ on a Mac) change it from anywhere; Ctrl and 0 resets it.</p>
    <div class="choices" role="radiogroup" aria-label="Contrast">
      {#each [["system", "Contrast: match this computer"], ["standard", "Standard contrast"], ["high", "High contrast"]] as [value, label] (value)}
        <label class="choice"
          ><input type="radio" name="contrast" checked={appearance.contrast === value} onchange={() => change("contrast", value as Appearance["contrast"])} /> {label}</label
        >
      {/each}
    </div>
    <label class="check">
      <input type="checkbox" checked={appearance.motion === "reduced"} onchange={(event) => change("motion", event.currentTarget.checked ? "reduced" : "system")} />
      Reduce motion
    </label>
  </fieldset>

  <fieldset>
    <legend>Helper</legend>
    <label class="check">
      <input type="checkbox" checked={!companionHidden} onchange={(event) => onCompanionHidden(!event.currentTarget.checked)} />
      Show the helper
    </label>
    <p class="help">The paper note in the corner. It speaks up now and then, never while you're working, and answers when you ask.</p>
  </fieldset>

  <fieldset>
    <legend>Assistant</legend>
    <p class="help">
      An assistant explains a course's problems in plainer words. Studio works the same without one. A model on this computer keeps everything on this computer and costs nothing,
      but answers more slowly. Claude needs an API key from the Claude Console, and each answer costs a little on that account.
    </p>
    {#if assistant}
      <div class="choices" role="radiogroup" aria-label="Assistant">
        <label class="choice"><input type="radio" name="assistant" checked={assistant.provider === "none"} onchange={() => chooseAssistant("none", assistant!.model)} /> None</label
        >
        <label class="choice"
          ><input type="radio" name="assistant" checked={assistant.provider === "ollama"} onchange={() => chooseAssistant("ollama", assistant!.model)} /> A model on this computer</label
        >
        <label class="choice"
          ><input type="radio" name="assistant" checked={assistant.provider === "anthropic"} onchange={() => chooseAssistant("anthropic", assistant!.model)} /> Claude</label
        >
      </div>
      {#if assistant.provider === "ollama"}
        {#if localModels === null}
          <p class="help" role="status">Studio couldn't find Ollama on this computer. Install it free from ollama.com/download, open it, then check again.</p>
          <div class="row"><button class="quiet" onclick={readLocalModels}>Check again</button></div>
        {:else if localModels !== undefined && localModels.length === 0}
          <p class="help" role="status">Ollama is running but has no models yet. A small one, {suggestedLocalModel.label}, works on most laptops.</p>
          <div class="row">
            <button class="quiet" disabled={downloading} onclick={downloadModel}>{downloading ? "Downloading, this can take several minutes…" : "Download it"}</button>
          </div>
        {:else if localModels !== undefined}
          <div class="row">
            <label for="local-model">Model</label>
            <select id="local-model" value={assistant.model} onchange={(event) => chooseAssistant("ollama", event.currentTarget.value)}>
              {#each localModels as model (model.name)}<option value={model.name}>{model.name} ({sizeInWords(model.size)})</option>{/each}
            </select>
          </div>
          <p class="help">Smallest first. Smaller models answer sooner; larger ones explain better. Nothing you ask leaves this computer.</p>
        {/if}
        {#if localProblem}<p class="problem" role="alert">{localProblem}</p>{/if}
      {/if}
      {#if assistant.provider === "anthropic"}
        <div class="row">
          <label for="assistant-model">Model</label>
          <select id="assistant-model" value={assistant.model} onchange={(event) => chooseAssistant("anthropic", event.currentTarget.value)}>
            {#each claudeModels as model (model.id)}<option value={model.id}>{model.label}</option>{/each}
          </select>
        </div>
        <label for="assistant-key">Claude API key</label>
        <p class="help" id="assistant-key-about">
          Kept in this computer's keychain and never shown again.{assistant.keySet ? " Set." : " Not set."} Claude reads only the courses you allow on their Check and publish screen.
        </p>
        <div class="row">
          <input
            id="assistant-key"
            type="password"
            autocomplete="off"
            spellcheck="false"
            aria-describedby="assistant-key-about"
            placeholder={assistant.keySet ? "Type a new key to replace it" : "sk-ant-…"}
            bind:value={key}
          />
          <button class="quiet" disabled={key.trim() === "" && !assistant.keySet} onclick={saveKey}>{key.trim() === "" && assistant.keySet ? "Remove" : "Save"}</button>
        </div>
      {/if}
    {/if}
  </fieldset>

  <fieldset>
    <legend>Advanced</legend>
    <label class="check">
      <input type="checkbox" checked={advanced} onchange={(event) => onAdvanced(event.currentTarget.checked)} />
      Advanced mode
    </label>
    <p class="help">
      For people comfortable with files and markdown. Adds a markdown editor, shows file names, and shows technical settings for Tutors. Everything else stays the same.
    </p>
  </fieldset>

  {#if updates && openLink}<Updates {updates} {openLink} />{/if}
</section>

<style>
  .settings {
    display: grid;
    gap: var(--space-5);
    max-width: 48rem;
  }
  h2 {
    margin: 0;
    font-size: var(--font-title);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
  }
  fieldset {
    margin: 0;
    padding: var(--space-5);
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
    display: grid;
    gap: var(--space-3);
  }
  .settings-head {
    position: sticky;
    top: calc(-1 * var(--space-8));
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) 0;
    background: var(--ui-canvas);
  }
  legend {
    float: left;
    width: 100%;
    padding: 0;
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  p {
    margin: 0;
  }
  .problem {
    margin: 0;
    color: var(--ui-danger);
  }
  .help {
    color: var(--ui-muted);
    font-size: var(--font-label);
  }
  .saved {
    color: var(--ui-success);
    font-size: var(--font-label);
  }
  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-5);
  }
  .choice,
  .check {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    min-height: 44px;
  }
  input[type="radio"],
  input[type="checkbox"] {
    width: 1.25em;
    height: 1.25em;
    accent-color: var(--ui-brand);
  }
  .row {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    flex-wrap: wrap;
  }
  .settings select {
    appearance: none;
    padding-right: var(--space-8);
    background-image: linear-gradient(45deg, transparent 50%, var(--ui-muted) 50%), linear-gradient(-45deg, transparent 50%, var(--ui-muted) 50%);
    background-position:
      calc(100% - 20px) 50%,
      calc(100% - 15px) 50%;
    background-size: 5px 5px;
    background-repeat: no-repeat;
  }
  select,
  input[type="password"] {
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--ui-control-border);
    border-radius: var(--radius-control);
    background: var(--ui-surface);
    color: var(--ui-ink);
  }
  input[type="password"] {
    flex: 1;
    min-width: 16rem;
  }
  .quiet {
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
    cursor: pointer;
  }
  .quiet:disabled {
    color: var(--ui-disabled-ink);
    cursor: default;
  }
</style>
