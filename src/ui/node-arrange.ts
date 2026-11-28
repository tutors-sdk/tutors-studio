import type { AuthoringPort } from "../application/ports/authoring.ts";
import type { MapNode } from "../domain/course-map.ts";
import type { CourseSession } from "./course-session.svelte.ts";
import type { NodeArrange } from "./components/node-detail-props.ts";

/**
 * What the week, item and course-home view arranges with: every change it offers asks the course for a plan,
 * and the session shows the plan before anything changes (ADR 0004).
 */
export const nodeArrange = (root: MapNode, session: CourseSession, authoring: AuthoringPort): NodeArrange => ({
  root,
  places: session.places,
  proposal: session.arranging ? { summary: session.arranging.plan.summary, notes: session.arranging.notes } : null,
  onArrange: (action) => session.arrange(action),
  onAccept: () => session.acceptArrange(),
  onCancel: () => (session.arranging = null),
  onPropose: (planned) => session.propose(planned),
  details: () => authoring.courseDetails(),
  planDetails: (wanted) => authoring.planDetails(wanted),
  cardPicture: (folder) => authoring.cardPicture(folder),
  planPicture: (folder, file) => authoring.planPicture(folder, file),
  planUpload: (item, files) => authoring.planUpload(item, files),
  labSteps: (lab) => authoring.labSteps(lab),
  planLabStep: (lab, change) => authoring.planLabStep(lab, change),
  planLabDraft: (lab, notes) => authoring.planLabDraft(lab, notes),
  planWeekSuggestion: (week) => authoring.planWeekSuggestion(week),
  outcomes: {
    list: () => authoring.outcomes(),
    coverage: () => authoring.coverage(),
    tagged: (item) => authoring.itemOutcomes(item),
    plan: (drafts) => authoring.planOutcomes(drafts),
    tag: (item, ids) => authoring.planTag(item, ids),
    draft: (description) => authoring.planOutcomeDraft(description),
    suggestServes: (week) => authoring.planServesSuggestion(week),
  },
  term: {
    read: () => authoring.term(),
    hidden: () => authoring.hiddenFromStudents(),
    planRelease: (folder, date) => authoring.planRelease(folder, date),
    planShowDue: (folder) => authoring.planShowDue(folder),
  },
});
