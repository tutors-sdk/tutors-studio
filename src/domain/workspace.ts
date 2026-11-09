/** What Studio shows beyond the basics. Pure: Advanced mode decides, and the UI only reads this (ADR 0024). */
export interface WorkspaceFeatures {
  fileNames: boolean;
  environment: boolean;
  rulesVersion: boolean;
  markdownEditor: boolean;
}

export const workspaceFeatures = (advanced: boolean): WorkspaceFeatures => ({
  fileNames: advanced,
  environment: advanced,
  rulesVersion: advanced,
  markdownEditor: advanced,
});
