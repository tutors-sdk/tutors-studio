import { slugify } from "./slug.ts";

/**
 * Where a course goes when the lecturer publishes it: a Tutors reader on this computer (in containers,
 * nothing leaves the machine) or Netlify, where tutors.dev reads it. Pure names and links; the ports do
 * the work.
 */
export type PublishTarget = "this-computer" | "netlify" | "website";

/** The pinned Tutors generator Studio builds with: the same `tutors` the course's netlify.toml runs. */
export const TUTORS_GENERATOR = "jsr:@tutors/tutors@5.3.0";

/**
 * The pinned Tutors command line whose `tutors validate --format json` is the last check before a course is
 * saved or put online (feature 14, ADR 0034). Null until a release of `@tutors/tutors` carries `validate`:
 * until then the same rules, in Studio, are the whole check.
 */
export const TUTORS_VALIDATOR: string | null = null;

/** The folder the generator writes into, inside the course folder (the netlify.toml publish folder). */
export const BUILD_FOLDER = "json";

/** The pinned generator that builds a course as a website of its own, which any browser opens with no reader. */
export const WEBSITE_GENERATOR = "jsr:@tutors/tutors-lite@5.3.0";

/** The folder the website generator writes into, inside the course folder. */
export const WEBSITE_FOLDER = "html";

/** The folder a course's website is saved as, beside the lecturer's other files: "web-development-website". */
export const websiteFolderFor = (courseName: string) => `${netlifySiteFor(courseName)}-website`;

/** The Netlify site a course publishes to: its folder's name as a Netlify site name (a-z, 0-9, hyphens, at most 63). */
export function netlifySiteFor(courseFolderName: string): string {
  return slugify(courseFolderName).slice(0, 63).replace(/-+$/, "") || "tutors-course";
}

/** True for a name Netlify takes as a site: lower-case letters, digits and single hyphens, not at either end. */
export function isNetlifySiteName(name: string): boolean {
  return name.length > 0 && name.length <= 63 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name);
}

/** Where students read a course published to a Netlify site. */
export const readerLinkFor = (site: string) => `https://tutors.dev/course/${site}`;

/**
 * What the Check and Publish screens offer (STU-0116): Publish and Save for everyone; the git hand-off and
 * Save as a website only in Advanced mode, where the lecturer keeps the course in git or on another host.
 */
export function publishChoices(advanced: boolean): { publish: true; save: true; website: boolean; handOff: boolean } {
  return { publish: true, save: true, website: advanced, handOff: advanced };
}
