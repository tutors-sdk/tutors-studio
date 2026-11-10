import { slugify } from "./slug.ts";

/**
 * Where a course goes when the lecturer publishes it: a Tutors reader on this computer (in containers,
 * nothing leaves the machine) or Netlify, where tutors.dev reads it. Pure names and links; the ports do
 * the work.
 */
export type PublishTarget = "this-computer" | "netlify" | "website";

/** The pinned Tutors generator Studio builds with: the same `tutors` the course's netlify.toml runs. */
export const TUTORS_GENERATOR = "jsr:@tutors/tutors@5.3.0";

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
