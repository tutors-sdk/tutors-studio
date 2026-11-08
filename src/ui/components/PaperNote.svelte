<script lang="ts">
  import type { Pose } from "../../application/companion/moments.ts";
  let { pose = "idle" }: { pose?: Pose } = $props();
</script>

<svg class={`paper ${pose}`} viewBox="0 0 84 92" aria-hidden="true" focusable="false">
  <path class="arm left" d="M16 56 C8 56 5 62 6 68" />
  <path class="arm right" d="M68 56 C76 56 79 62 78 68" />
  <path class="sheet" d="M20 8 H52 L68 24 V78 a5 5 0 0 1 -5 5 H21 a5 5 0 0 1 -5 -5 V12 a4 4 0 0 1 4 -4 Z" />
  <path class="line" d="M25 21 H42 M25 29 H38" />
  <g class="fold"><path d="M52 8 V19 a5 5 0 0 0 5 5 H68 Z" /></g>
  {#if pose === "pleased"}
    <path class="feature" d="M28 49 q4 -6 8 0 M48 49 q4 -6 8 0" />
    <path class="feature" d="M32 60 q10 11 20 0" />
  {:else if pose === "thinking"}
    <circle class="eye" cx="34" cy="45" r="3.4" />
    <circle class="eye" cx="54" cy="45" r="3.4" />
    <path class="feature" d="M36 64 H48" />
    <g class="dots"><circle cx="66" cy="4" r="2" /><circle cx="74" cy="4" r="2" /><circle cx="82" cy="4" r="2" /></g>
  {:else}
    <circle class="eye" cx="32" cy="48" r="3.4" />
    <circle class="eye" cx="52" cy="48" r="3.4" />
    {#if pose === "noticing"}<path class="feature" d="M27 40 l9 -2 M48 38 l9 2" />{/if}
    <path class="feature" d="M35 61 q7 5 14 0" />
  {/if}
</svg>

<style>
  .paper {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .sheet {
    fill: var(--ui-surface);
    stroke: var(--ui-ink);
    stroke-width: 2.5;
    stroke-linejoin: round;
  }
  .fold path {
    fill: var(--ui-raised);
    stroke: var(--ui-ink);
    stroke-width: 2.5;
    stroke-linejoin: round;
  }
  .fold {
    transform-origin: 60px 16px;
    transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .noticing .fold {
    transform: translate(3px, -4px) rotate(-16deg);
  }
  .line {
    fill: none;
    stroke: var(--ui-muted);
    stroke-width: 2.5;
    stroke-linecap: round;
  }
  .eye {
    fill: var(--ui-ink);
  }
  .feature,
  .arm {
    fill: none;
    stroke: var(--ui-ink);
    stroke-width: 2.5;
    stroke-linecap: round;
  }
  .arm {
    transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
    transform-origin: 68px 56px;
  }
  .noticing .arm.right,
  .pleased .arm.right {
    transform: rotate(-112deg);
  }
  .dots circle {
    fill: var(--ui-muted);
    animation: think 1.2s ease-in-out infinite;
  }
  .dots circle:nth-child(2) {
    animation-delay: 150ms;
  }
  .dots circle:nth-child(3) {
    animation-delay: 300ms;
  }
  @keyframes think {
    50% {
      opacity: 0.25;
    }
  }
</style>
