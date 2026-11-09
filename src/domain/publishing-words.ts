/** What the Check and Publish screens call things. Pure, so a test can read every sentence (STU-0074, STU-0075). */
export interface PublishingWords {
  fixHelp: string;
  planSummary: (renames: number, additions: number) => string;
  sendTitle: string;
  sendDesktopOnly: string;
  sendAsking: string;
  notConnected: string;
  changes: (count: number) => string;
  willAddSetup: string;
  setupFailed: string;
  blocked: (count: number) => string;
  send: string;
  sending: string;
  sent: (summary: string) => string;
  sendFailed: (reason: string) => string;
  previewBody: string;
  publishDesktopOnly: string;
  addressLabel: string;
  publishButton: string;
  published: (siteUrl: string, uploaded: number) => string;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

const plain: PublishingWords = {
  fixHelp: "Small tidy-ups that change nothing else. You see what will happen first.",
  planSummary: (renames, additions) =>
    `Studio will ${[renames > 0 ? `rename ${plural(renames, "item", "items")}` : "", additions > 0 ? `add or update ${plural(additions, "setup file", "setup files")}` : ""].filter(Boolean).join(" and ")}. Nothing else is touched.`,
  sendTitle: "Send your changes online",
  sendDesktopOnly: "Sending changes works in the desktop app, not this browser preview.",
  sendAsking: "Looking for changes…",
  notConnected: "This course isn't connected to an online copy, so there is nothing to send. You can publish it from here instead.",
  changes: (count) => (count === 0 ? "Nothing has changed since you last sent this course." : `${plural(count, "change", "changes")} since you last sent this course.`),
  willAddSetup: "Studio will also add the setup your course needs to go online.",
  setupFailed: "Studio couldn't add the setup your course needs, so nothing was sent. Try again.",
  blocked: (count) => `Sort out the ${plural(count, "thing", "things")} listed under Check and publish first, so students see the whole course.`,
  send: "Send changes",
  sending: "Sending…",
  sent: () => "Your changes are sent. Your published course updates from here.",
  sendFailed: () => "Studio couldn't send your changes. The details below will help anyone supporting you.",
  previewBody: "Builds the course and opens it here, as students will see it. Nothing leaves this computer. If this computer needs something extra, Studio says what.",
  publishDesktopOnly: "Previewing and publishing work in the desktop app, not this browser preview.",
  addressLabel: "Course address",
  publishButton: "Publish for students",
  published: () => "Your course is published.",
};

const technical = (host: string): PublishingWords => ({
  fixHelp: "Renames and the standard netlify.toml that change nothing else. You see the plan first.",
  planSummary: () => "",
  sendTitle: "Hand off to GitHub",
  sendDesktopOnly: "Commit and push uses this computer's git, so it works in the desktop app, not this browser preview.",
  sendAsking: "Asking git about this folder…",
  notConnected: `This course folder isn't a git repository, so there is nothing to commit. Publish it to ${host} instead, or make the folder a repository (GitHub Desktop does it in one step) and come back here.`,
  changes: (count) => (count === 0 ? "Nothing has changed since the last commit." : `${plural(count, "file has", "files have")} changed since the last commit.`),
  willAddSetup: "",
  setupFailed: "",
  blocked: (count) => `Fix the ${plural(count, "problem", "problems")} the course map shows before publishing, so students see the whole course.`,
  send: "Commit and push",
  sending: "Pushing…",
  sent: (summary) => `${summary} ${host} builds it from there.`,
  sendFailed: (reason) => reason,
  previewBody: "Builds the course and opens it in the Tutors reader here. Nothing leaves this computer. Needs Docker Desktop or Podman Desktop.",
  publishDesktopOnly: "Previewing and publishing build the course with the Tutors generator, so they work in the desktop app, not this browser preview.",
  addressLabel: "Site name",
  publishButton: `Publish to ${host}`,
  published: (siteUrl, uploaded) => `Published to ${host}: ${siteUrl} (${plural(uploaded, "file", "files")} sent).`,
});

export const publishingWords = (advanced: boolean, host = "Netlify"): PublishingWords => (advanced ? technical(host) : plain);

/** The one place a lecturer has to meet the host by name: they must go there for the token. */
export const hostSignIn = (host: string, advanced: boolean) =>
  advanced
    ? {
        help: `Studio publishes with a ${host} personal access token, kept in this computer's keychain. Make one in ${host} under User settings, Applications, Personal access tokens, and paste it here.`,
        label: "Access token",
      }
    : {
        help: `Your course is hosted by ${host}, so Studio needs a code from your ${host} account once. In ${host}, open User settings, Applications, Personal access tokens, make one, and paste it here. Studio keeps it safely on this computer.`,
        label: `Code from ${host}`,
      };
