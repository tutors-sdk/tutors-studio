/**
 * The environment variables of the Tutors .env (tutors-mono-repo's .env.example and
 * packages/svelte/app-config's env contract), as Studio's Settings shows them. Studio passes the
 * reader's to the Tutors reader it runs on this computer; NETLIFY_AUTH_TOKEN is Studio's own, for
 * publishing. Secret values live in the keychain, never in settings (ADR 0016). Pure data.
 */
export type EnvGroup = "reader" | "sign-in" | "integrations" | "operations" | "publishing";

export interface EnvVar {
  name: string;
  group: EnvGroup;
  /** What it does, for a lecturer. */
  about: string;
  /** True for a token, key or secret: kept in the keychain and never shown back. */
  secret: boolean;
  /** The value the Tutors .env.example ships, used when the lecturer sets none. */
  example: string;
}

export const envGroups: { id: EnvGroup; title: string; about: string }[] = [
  { id: "reader", title: "Tutors reader", about: "How the Tutors reader on this computer runs." },
  { id: "sign-in", title: "Sign-in", about: "Only used when anonymous mode is off: the Supabase project and GitHub app students sign in with." },
  { id: "integrations", title: "Integrations", about: "PDF viewing and Moodle." },
  { id: "operations", title: "Operations", about: "Logs and metrics, for whoever runs the servers." },
  { id: "publishing", title: "Publishing", about: "Studio's own: where it publishes your course." },
];

export const envContract: readonly EnvVar[] = [
  {
    name: "PUBLIC_ANON_MODE",
    group: "reader",
    secret: false,
    example: "TRUE",
    about: "TRUE runs the reader with no sign-in, presence or analytics. Leave it TRUE on this computer.",
  },
  { name: "PUBLIC_READER_ORIGIN", group: "reader", secret: false, example: "https://tutors.dev", about: "Where links to the reader go." },
  { name: "PUBLIC_CATALOGUE_ORIGIN", group: "reader", secret: false, example: "https://catalogue.tutors.dev", about: "Where links to the course catalogue go." },
  { name: "PUBLIC_LIVE_ORIGIN", group: "reader", secret: false, example: "https://live.tutors.dev", about: "Where links to Tutors Live go." },
  { name: "PUBLIC_TIME_ORIGIN", group: "reader", secret: false, example: "https://time.tutors.dev", about: "Where links to the time dashboard go." },
  { name: "PUBLIC_READER_URL", group: "reader", secret: false, example: "https://tutors.dev", about: "The reader the time dashboard reads course time from." },
  { name: "PRIVATE_COURSE_HOSTS", group: "reader", secret: false, example: "", about: "Hosts other than netlify.app that serve courses, comma-separated." },
  { name: "PRIVATE_TUTORS_ADMINS", group: "reader", secret: false, example: "", about: "GitHub logins that count as an educator of every course, comma-separated." },
  {
    name: "PRIVATE_API_ALLOWED_ORIGINS",
    group: "reader",
    secret: false,
    example: "https://time.tutors.dev",
    about: "Origins allowed to read the reader's time API, comma-separated.",
  },
  { name: "PUBLIC_SUPABASE_URL", group: "sign-in", secret: false, example: "https://your-project.supabase.co", about: "Your Supabase project's address." },
  { name: "PUBLIC_SUPABASE_ANON_KEY", group: "sign-in", secret: false, example: "your-supabase-anon-key", about: "Your Supabase project's public (anon) key." },
  { name: "PRIVATE_SUPABASE_SERVICE_ROLE_KEY", group: "sign-in", secret: true, example: "", about: "Your Supabase service-role key. It bypasses row security: keep it secret." },
  { name: "PRIVATE_AUTH_GITHUB_ID", group: "sign-in", secret: false, example: "your-github-oauth-app-id", about: "Your GitHub OAuth app's client id." },
  { name: "PRIVATE_AUTH_GITHUB_SECRET", group: "sign-in", secret: true, example: "your-github-oauth-app-secret", about: "Your GitHub OAuth app's client secret." },
  { name: "PRIVATE_AUTH_SECRET", group: "sign-in", secret: true, example: "your-secret-key-at-least-32-chars-long", about: "Signs sign-in sessions; at least 32 characters." },
  { name: "PUBLIC_PDF_KEY", group: "integrations", secret: false, example: "your-adobe-pdf-key", about: "Adobe PDF Embed key, for showing talks with Adobe's viewer." },
  {
    name: "MOODLE_WS_URL",
    group: "integrations",
    secret: false,
    example: "https://your-moodle.example.com/webservice/rest/server.php",
    about: "Your Moodle web-service address, for the educator Moodle sync.",
  },
  { name: "MOODLE_WS_TOKEN", group: "integrations", secret: true, example: "your-moodle-ws-token", about: "Your Moodle web-service token." },
  { name: "MOODLE_WS_REST_FORMAT", group: "integrations", secret: false, example: "json", about: "Moodle's reply format; leave it json." },
  { name: "SYNC_INTERVAL_MINUTES", group: "integrations", secret: false, example: "60", about: "How often the Moodle sync runs, in minutes." },
  { name: "LOG_LEVEL", group: "operations", secret: false, example: "", about: "debug, info, warn or error. Empty means the default." },
  { name: "METRICS_TOKEN", group: "operations", secret: true, example: "", about: "When set, the metrics page needs this token." },
  { name: "NETLIFY_AUTH_TOKEN", group: "publishing", secret: true, example: "", about: "A Netlify personal access token, for Publish to Netlify." },
];

/** Placeholder values from .env.example ("your-...") are examples, not settings, and are never passed on. */
const isPlaceholder = (value: string) => /^your-|your-[a-z-]+\.(supabase\.co|example\.com)/.test(value);

/**
 * The variables the Tutors reader on this computer gets: everything but Studio's own publishing group,
 * the lecturer's value where they set one, else the example unless it is only a placeholder. Anonymous
 * mode stays on unless the lecturer turned it off.
 */
export function readerEnvironment(values: Readonly<Record<string, string>>): Record<string, string> {
  const env: Record<string, string> = {};
  for (const variable of envContract) {
    if (variable.group === "publishing") continue;
    const value = values[variable.name] ?? variable.example;
    if (value !== "" && !isPlaceholder(value)) env[variable.name] = value;
  }
  return env;
}

/** The .env.example text for these variables, grouped, the way Studio's own .env.example reads. */
export function envExample(): string {
  return envGroups
    .map((group) => {
      const lines = envContract.filter((variable) => variable.group === group.id).map((variable) => `# ${variable.about}\n${variable.name}=${variable.example}`);
      return `# --- ${group.title}: ${group.about}\n${lines.join("\n")}`;
    })
    .join("\n\n")
    .concat("\n");
}
