<script lang="ts">
  import type { Accounts } from "../../application/use-cases/accounts.ts";
  import { hostSignIn } from "../../domain/publishing-words.ts";

  interface Props {
    accounts: Accounts;
    advanced: boolean;
  }
  let { accounts, advanced }: Props = $props();

  let host = $state<{ name: string; signedIn: boolean; browser: boolean } | null>(null);
  let token = $state("");
  let waiting = $state(false);
  let problem = $state("");
  const read = async () => (host = await accounts.host());
  $effect(() => {
    void read();
  });
  const signing = $derived(hostSignIn(host?.name ?? "Netlify", advanced));

  async function inBrowser() {
    waiting = true;
    problem = "";
    const result = await accounts.signInInBrowser();
    waiting = false;
    if (!result.ok) problem = result.reason;
    await read();
  }
  async function withToken() {
    if (token.trim() === "") return;
    await accounts.signInWithToken(token.trim());
    token = "";
    await read();
  }
  async function signOut() {
    await accounts.signOut();
    await read();
  }
</script>

<fieldset>
  <legend>Accounts</legend>
  {#if host}
    {#if host.signedIn}
      <p>Signed in to {host.name}, so Publish puts your course online with one press.</p>
      <div class="row"><button class="quiet" onclick={signOut}>Sign out of {host.name}</button></div>
    {:else if host.browser}
      <p class="help">Sign in once, in your browser, and Publish puts your course online for your students. Studio keeps the sign-in in this computer's keychain.</p>
      <div class="row">
        <button class="quiet" disabled={waiting} onclick={inBrowser}>{waiting ? `Waiting for ${host.name}…` : `Sign in to ${host.name}`}</button>
      </div>
      {#if waiting}<p class="help" role="status">Press Authorize on {host.name}'s page in your browser, then come back here.</p>{/if}
    {:else}
      <p class="help">{signing.help}</p>
      <div class="row">
        <label for="netlify-token">{signing.label}</label>
        <input id="netlify-token" type="password" autocomplete="off" bind:value={token} />
        <button class="quiet" disabled={token.trim() === ""} onclick={withToken}>Sign in</button>
      </div>
    {/if}
    {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
  {/if}
</fieldset>

<style>
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
    float: left;
    width: 100%;
    padding: 0;
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  p {
    margin: 0;
  }
  .help {
    font-size: var(--font-label);
    color: var(--ui-muted);
  }
  .problem {
    color: var(--ui-danger);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
  }
  label {
    font-size: var(--font-label);
    color: var(--ui-muted);
  }
  input {
    flex: 1 1 14rem;
    font: inherit;
    font-size: var(--font-control);
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--ui-control-border);
    border-radius: var(--radius-control);
    background: var(--ui-surface);
    color: var(--ui-ink);
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
    cursor: default;
    opacity: 0.6;
  }
</style>
