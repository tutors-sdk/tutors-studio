<script lang="ts">
  import { untrack } from "svelte";
  import type { OpenedQuiz, QuizPlan } from "../../application/ports/authoring.ts";
  import type { Plan } from "../../domain/plan.ts";
  import { joinSnippet, newQuestion, splitSnippet, type QuizForm, type QuizFormQuestion } from "../../domain/quiz.ts";

  interface Props {
    opened: OpenedQuiz;
    /** Where the quiz goes, as the lecturer knows it: "Week one" for a new quiz, the quiz's title when editing. */
    where: string;
    /** Plans the save; nothing is written until the lecturer accepts the plan. */
    onPlan: (form: QuizForm) => Promise<QuizPlan>;
    onAccept: (plan: Plan) => void;
    onClose: () => void;
  }
  let { opened, where, onPlan, onAccept, onClose }: Props = $props();

  /** One question as the designer edits it: the words and the code snippet apart, no markdown. */
  interface Editing {
    kind: QuizFormQuestion["kind"];
    words: string;
    code: string;
    language: string;
    showCode: boolean;
    answers: string[];
    right: number;
  }
  const editing = (question: QuizFormQuestion): Editing => {
    const text = splitSnippet(question.text);
    return { kind: question.kind, ...text, showCode: text.code !== "", answers: [...question.answers], right: question.right };
  };

  // The form is a copy the lecturer edits; the parent remounts the designer for another quiz.
  const initial = untrack(() => opened.form);
  let heading = $state(initial.heading);
  let introduction = $state(initial.introduction);
  let timed = $state(initial.timeLimit !== null);
  let seconds = $state(initial.timeLimit ?? 30);
  let questions = $state<Editing[]>(initial.questions.length > 0 ? initial.questions.map(editing) : [editing(newQuestion())]);
  let problem = $state("");
  let pending = $state<Plan | null>(null);
  let saving = $state(false);

  const form = (): QuizForm => ({
    heading,
    introduction,
    timeLimit: timed ? seconds : null,
    blockTitle: opened.form.blockTitle,
    questions: questions.map((q) => ({
      kind: q.kind,
      text: joinSnippet({ words: q.words, code: q.showCode ? q.code : "", language: q.language }),
      answers: q.kind === "true-false" ? ["True", "False"] : q.answers,
      right: q.right,
    })),
  });

  function setKind(question: Editing, kind: Editing["kind"]) {
    if (question.kind === kind) return;
    question.kind = kind;
    question.right = 0;
    if (kind === "multiple-choice" && question.answers.every((a) => a === "True" || a === "False")) question.answers = ["", ""];
  }

  function removeAnswer(question: Editing, index: number) {
    question.answers.splice(index, 1);
    if (index === question.right) question.right = 0;
    else if (index < question.right) question.right--;
  }

  function move(index: number, by: -1 | 1) {
    const [question] = questions.splice(index, 1);
    questions.splice(index + by, 0, question);
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    const planned = await onPlan(form());
    saving = false;
    problem = planned.ok ? "" : planned.message;
    pending = planned.ok ? planned.plan : null;
  }
</script>

<form class="designer" onsubmit={save} novalidate aria-labelledby="quiz-title">
  <p class="eyebrow">{opened.page === null ? `New quiz in ${where}` : "Quiz"}</p>
  <h2 id="quiz-title">{opened.page === null ? "Add a quiz" : `Edit ${where}`}</h2>

  {#if opened.leftOut.length > 0}
    <div class="left-out" role="note">
      <p>
        Students don't see {opened.leftOut.length === 1 ? "this question" : "these questions"} now, and saving here removes {opened.leftOut.length === 1 ? "it" : "them"} from the page:
      </p>
      <ul>
        {#each opened.leftOut as sentence (sentence)}<li>{sentence}</li>{/each}
      </ul>
    </div>
  {/if}

  <label for="quiz-heading">Title</label>
  <input id="quiz-heading" bind:value={heading} placeholder="Week one check" />
  <label for="quiz-intro">Introduction <span class="optional">(optional)</span></label>
  <textarea id="quiz-intro" rows="2" bind:value={introduction} placeholder="Try these before the lab."></textarea>
  <label class="check"><input type="checkbox" bind:checked={timed} /> Time each question</label>
  {#if timed}
    <label for="quiz-seconds">Seconds per question</label>
    <input id="quiz-seconds" type="number" min="5" step="5" bind:value={seconds} />
  {/if}

  <ol class="questions">
    {#each questions as question, index (question)}
      <li class="question">
        <fieldset>
          <legend>Question {index + 1}</legend>
          <div class="kind" role="radiogroup" aria-label="Kind of question">
            <button type="button" role="radio" aria-checked={question.kind === "multiple-choice"} onclick={() => setKind(question, "multiple-choice")}>Choose an answer</button>
            <button type="button" role="radio" aria-checked={question.kind === "true-false"} onclick={() => setKind(question, "true-false")}>True or false</button>
          </div>
          <label for="q{index}-words">{question.kind === "true-false" ? "Statement" : "Question"}</label>
          <textarea id="q{index}-words" rows="2" bind:value={question.words} placeholder={question.kind === "true-false" ? "HTTP is stateless." : "Which tag makes a link?"}
          ></textarea>
          {#if question.showCode}
            <label for="q{index}-code">Code snippet</label>
            <textarea id="q{index}-code" class="code" rows="4" spellcheck="false" bind:value={question.code}></textarea>
            <label for="q{index}-language">Language <span class="optional">(optional, for highlighting)</span></label>
            <input id="q{index}-language" class="short" bind:value={question.language} placeholder="js" />
            <button type="button" class="link" onclick={() => (question.showCode = false)}>Remove the snippet</button>
          {:else}
            <button type="button" class="link" onclick={() => (question.showCode = true)}>Add a code snippet</button>
          {/if}

          <p class="answers-label" id="q{index}-answers">{question.kind === "true-false" ? "The right answer" : "Answers: tick the right one"}</p>
          <div class="answers" role="radiogroup" aria-labelledby="q{index}-answers">
            {#if question.kind === "true-false"}
              {#each ["True", "False"] as answer, at (answer)}
                <label class="answer"><input type="radio" name="q{index}-right" checked={question.right === at} onchange={() => (question.right = at)} /> {answer}</label>
              {/each}
            {:else}
              {#each question.answers as _, at (at)}
                <div class="answer">
                  <input type="radio" name="q{index}-right" aria-label="Answer {at + 1} is right" checked={question.right === at} onchange={() => (question.right = at)} />
                  <input aria-label="Answer {at + 1}" bind:value={question.answers[at]} />
                  {#if question.answers.length > 2}
                    <button type="button" class="link" aria-label="Remove answer {at + 1}" onclick={() => removeAnswer(question, at)}>Remove</button>
                  {/if}
                </div>
              {/each}
              <button type="button" class="link" onclick={() => question.answers.push("")}>Add an answer</button>
            {/if}
          </div>

          <div class="question-actions">
            {#if index > 0}<button type="button" class="link" onclick={() => move(index, -1)}>Move up</button>{/if}
            {#if index < questions.length - 1}<button type="button" class="link" onclick={() => move(index, 1)}>Move down</button>{/if}
            {#if questions.length > 1}<button type="button" class="link" onclick={() => questions.splice(index, 1)}>Remove question {index + 1}</button>{/if}
          </div>
        </fieldset>
      </li>
    {/each}
  </ol>
  <button type="button" class="secondary" onclick={() => questions.push(editing(newQuestion()))}>Add a question</button>

  {#if problem}<p class="problem" role="alert">{problem}</p>{/if}

  {#if pending}
    <div class="plan" role="dialog" aria-modal="false" aria-labelledby="quiz-plan-title">
      <h3 id="quiz-plan-title">Before anything changes</h3>
      <p>{pending.summary}. {opened.page === null ? "Studio adds one new folder with the quiz page in it" : "Studio rewrites this quiz's page"}; nothing else is touched.</p>
      <div class="actions">
        <button type="button" class="primary" onclick={() => pending && onAccept(pending)}>Make this change</button>
        <button type="button" class="secondary" onclick={() => (pending = null)}>Keep editing</button>
      </div>
    </div>
  {:else}
    <div class="actions">
      <button type="submit" class="primary" disabled={saving}>Save quiz</button>
      <button type="button" class="secondary" onclick={onClose}>Cancel</button>
    </div>
  {/if}
</form>

<style>
  .designer {
    max-width: var(--reading-width);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .eyebrow {
    margin: 0;
    color: var(--ui-muted);
    font-size: var(--font-caption);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  h2 {
    margin: var(--space-1) 0 var(--space-4);
    font-size: var(--font-heading);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-heading);
  }
  h3 {
    margin: 0 0 var(--space-2);
    font-size: var(--font-section);
    font-weight: var(--weight-semibold);
  }
  label,
  .answers-label {
    margin: var(--space-3) 0 0;
    font-size: var(--font-label);
    font-weight: var(--weight-medium);
  }
  .optional {
    color: var(--ui-muted);
    font-weight: var(--weight-regular);
  }
  input:not([type="checkbox"], [type="radio"]),
  textarea {
    font: inherit;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--ui-control-border);
    border-radius: var(--radius-control);
    background: var(--ui-canvas);
    color: var(--ui-ink);
  }
  .code {
    font-family: ui-monospace, monospace;
    font-size: var(--font-label);
  }
  .short {
    max-width: 160px;
  }
  .check,
  .answer {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    font-weight: var(--weight-regular);
  }
  .answer input:not([type="radio"]) {
    flex: 1;
  }
  .answers {
    display: grid;
    gap: var(--space-2);
  }
  .answers .link {
    justify-self: start;
  }
  .questions {
    list-style: none;
    padding: 0;
    margin: var(--space-6) 0 var(--space-2);
    display: grid;
    gap: var(--space-4);
  }
  fieldset {
    margin: 0;
    border: 1px solid var(--ui-border);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  legend {
    font-weight: var(--weight-semibold);
    padding: 0 var(--space-1);
  }
  .kind {
    display: flex;
    gap: var(--space-2);
  }
  .kind button {
    font: inherit;
    font-size: var(--font-label);
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--ui-control-border);
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--ui-ink);
    cursor: pointer;
  }
  .kind button[aria-checked="true"] {
    border-color: var(--ui-ink);
    background: var(--ui-selected);
    font-weight: var(--weight-medium);
  }
  .question-actions {
    display: flex;
    gap: var(--space-4);
    margin-top: var(--space-3);
  }
  .link {
    align-self: flex-start;
    font: inherit;
    font-size: var(--font-label);
    padding: 0;
    border: none;
    background: none;
    color: var(--ui-ink);
    text-decoration: underline;
    cursor: pointer;
  }
  .left-out {
    border: 1px solid var(--ui-warning);
    border-radius: var(--radius-card);
    padding: var(--space-4);
  }
  .left-out p,
  .left-out ul {
    margin: 0;
  }
  .left-out ul {
    margin-top: var(--space-2);
  }
  .problem {
    margin: var(--space-3) 0 0;
    color: var(--ui-danger);
  }
  .plan {
    margin-top: var(--space-6);
    padding: var(--space-5);
    border: 1px solid var(--ui-brand);
    border-radius: var(--radius-card);
    background: var(--ui-surface);
  }
  .actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-6);
  }
  .primary,
  .secondary {
    font: inherit;
    font-size: var(--font-control);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-control);
    cursor: pointer;
  }
  .secondary {
    align-self: flex-start;
    border: 1px solid var(--ui-control-border);
    background: transparent;
    color: var(--ui-ink);
  }
  .primary {
    border: none;
    background: var(--ui-brand);
    color: var(--ui-on-brand);
  }
  .primary:hover {
    background: var(--ui-brand-hover);
  }
  .primary:disabled {
    background: var(--ui-disabled-ink);
  }
</style>
