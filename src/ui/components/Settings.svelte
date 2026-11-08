<script lang="ts">
  import type { EnvSetting, PreferencesPort } from "../../application/ports/preferences.ts";
  import { textSizes, type Appearance } from "../../domain/appearance.ts";
  import { envGroups } from "../../domain/environment.ts";
  import { claudeModels, type AssistantProvider } from "../../domain/assistant.ts";

  interface Props {
    preferences: PreferencesPort;
    appearance: Appearance;
    onAppearance: (appearance: Appearance) => void;
    onClose: () => void;
    /** Called after the assistant choice changes, so the window can show the new one. */
    onAssistant?: () => void;
  }
  let { preferences, appearance, onAppearance, onClose, onAssistant }: Props = $props();

  let assistant = $state<{ provider: AssistantProvider; model: string; keySet: boolean } | null>(null);
  let key = $state("");
  $effect(() => {
    preferences.assistant().then((found) => (assistant = found));
  });
  async function chooseAssistant(provider: AssistantProvider, model: string) {
    await preferences.setAssistant(provider, model);
    assistant = await preferences.assistant();
    onAssistant?.();
  }
  async function saveKey() {
    await preferences.setAssistantKey(key);
    key = "";
    assistant = await preferences.assistant();
    saved = assistant.keySet ? "Saved the Claude API key in this computer's keychain." : "Removed the Claude API key.";
    onAssistant?.();
  }

  let variables = $state<EnvSetting[]>([]);
  let drafts = $state<Record<string, string>>({});
  let saved = $state("");

  $effect(() => {
    preferences.environment().then((found) => (variables = found));
  });

  const change = <K extends keyof Appearance>(key: K, value: Appearance[K]) => onAppearance({ ...appearance, [key]: value });

  async function save(variable: EnvSetting) {
    await preferences.setVariable(variable.name, drafts[variable.name] ?? "");
    delete drafts[variable.name];
    variables = await preferences.environment();
    saved = `Saved ${variable.name}.`;
  }

  const draft = (variable: EnvSetting) => drafts[variable.name] ?? (variable.secret ? "" : variable.value);
  const changed = (variable: EnvSetting) => variable.name in drafts && (variable.secret || drafts[variable.name] !== variable.value);
</script>

<section class="settings" aria-labelledby="settings-title">
  <p class="eyebrow">Settings</p>
  <h2 id="settings-title">Make Studio work for you</h2>

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
    <legend>Assistant</legend>
    <p class="help">
      An assistant explains a course's problems in plainer words. Studio works the same without one. Claude needs an API key from the Claude Console, and each answer costs a little
      on that account.
    </p>
    {#if assistant}
      <div class="choices" role="radiogroup" aria-label="Assistant">
        <label class="choice"><input type="radio" name="assistant" checked={assistant.provider === "none"} onchange={() => chooseAssistant("none", assistant!.model)} /> None</label
        >
        <label class="choice"
          ><input type="radio" name="assistant" checked={assistant.provider === "anthropic"} onchange={() => chooseAssistant("anthropic", assistant!.model)} /> Claude</label
        >
      </div>
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
    <legend>Environment</legend>
    <p class="help">
      The settings in Tutors' .env file. Studio gives them to the Tutors reader it runs on this computer, and uses the Netlify token to publish. Tokens and secrets are kept in this
      computer's keychain and are never shown again.
    </p>
    {#if saved}<p class="saved" role="status">{saved}</p>{/if}
    {#each envGroups as group (group.id)}
      <h3>{group.title}</h3>
      <p class="help">{group.about}</p>
      <ul class="variables">
        {#each variables.filter((variable) => variable.group === group.id) as variable (variable.name)}
          <li>
            <label for={`env-${variable.name}`}><code>{variable.name}</code></label>
            <p class="help" id={`env-${variable.name}-about`}>
              {variable.about}{#if variable.secret}{variable.isSet ? " Set." : " Not set."}{/if}
            </p>
            <div class="row">
              <input
                id={`env-${variable.name}`}
                type={variable.secret ? "password" : "text"}
                autocomplete="off"
                spellcheck="false"
                aria-describedby={`env-${variable.name}-about`}
                placeholder={variable.secret ? (variable.isSet ? "Type a new value to replace it" : "") : variable.example}
                value={draft(variable)}
                oninput={(event) => (drafts[variable.name] = event.currentTarget.value)}
              />
              <button class="quiet" disabled={!changed(variable)} onclick={() => save(variable)}>Save</button>
            </div>
          </li>
        {/each}
      </ul>
    {/each}
  </fieldset>

  <button class="quiet close" onclick={onClose}>Done</button>
</section>

<style>
  .settings {
    display: grid;
    gap: var(--space-5);
    max-width: 48rem;
  }
  .eyebrow {
    margin: 0;
    color: var(--ui-muted);
    font-size: var(--font-caption);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  h2 {
    margin: 0;
    font-size: var(--font-title);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
  }
  h3 {
    margin: var(--space-4) 0 0;
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
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
  legend {
    padding: 0 var(--space-2);
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  p {
    margin: 0;
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
  select,
  input[type="text"],
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
  input[type="text"],
  input[type="password"] {
    flex: 1;
    min-width: 16rem;
  }
  .variables {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-4);
  }
  .variables li {
    display: grid;
    gap: var(--space-1);
  }
  code {
    font-size: var(--font-label);
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
  .close {
    justify-self: start;
  }
</style>
