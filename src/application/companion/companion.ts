import { AssistantUnavailable, type AskContext, type AssistantPort } from "../ports/assistant.ts";
import { answerFromGuide, type GuideAnswer } from "./guide.ts";

export interface CompanionAnswer extends GuideAnswer {
  by: "assistant" | "guide";
  /** Why the assistant couldn't answer, shown beside the guide's answer. */
  problem?: string;
}

export interface CompanionPort {
  ask(question: string, context: AskContext): Promise<CompanionAnswer>;
}

/** Answers what the lecturer asks: the assistant's words when one can answer, else Studio's own guide. It holds no way to write to a course. */
export function createCompanion(deps: { assistant: AssistantPort }): CompanionPort {
  return {
    async ask(question, context) {
      const guide = answerFromGuide(question);
      try {
        const text = await deps.assistant.answer(question, context);
        return text === "" ? { ...guide, by: "guide" } : { text, action: guide.action, by: "assistant" };
      } catch (error) {
        if (error instanceof AssistantUnavailable) return { ...guide, by: "guide", problem: error.message };
        throw error;
      }
    },
  };
}
