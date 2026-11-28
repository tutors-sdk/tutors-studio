/** What Studio shows beyond the basics. Pure: Advanced mode decides, and the UI only reads this (ADR 0024). */
export interface WorkspaceFeatures {
  fileNames: boolean;
  rulesVersion: boolean;
  markdownEditor: boolean;
  /** Letting Claude read a course's problems, and an assistant on this computer work on it (STU-0306). */
  assistants: boolean;
  /** The line on every screen that says Advanced mode is on (STU-0308). */
  advancedShown: boolean;
  /** Choosing a copy of Tutors of the lecturer's own, instead of the Tutors inside Studio (STU-0309). */
  ownTutors: boolean;
}

export const workspaceFeatures = (advanced: boolean): WorkspaceFeatures => ({
  fileNames: advanced,
  rulesVersion: advanced,
  markdownEditor: advanced,
  assistants: advanced,
  advancedShown: advanced,
  ownTutors: advanced,
});

/** What Advanced mode is for, beside its switch in Settings (STU-0307). */
export const ADVANCED_ABOUT =
  "For people comfortable with technology and the command line. Adds a markdown editor, file names and technical settings, lets an assistant such as Claude read and work on a course, and lets you run Tutors from your own copy of it.";

/** Said as Advanced mode is turned on (STU-0307). */
export const ADVANCED_TURNED_ON =
  "Advanced mode is on. It is meant for people comfortable with technology and the command line: if a screen asks for something you don't recognise, turn it off here and Studio goes back to the basics.";

/** The line on every screen while Advanced mode is on (STU-0308). */
export const ADVANCED_SHOWN = "Advanced mode is on";
