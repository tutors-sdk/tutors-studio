// Written by `pnpm bundle pins` from tutors-bundle.json. Change that file, not this one.
//
// The Tutors tools program bundled beside Studio (ADR 0044): the generator and tutors-lite in one file,
// compiled with `deno compile` so a lecturer needs no Deno. Each package builds the course in the current
// folder when it is imported, as `deno run jsr:...` does.
const command = Deno.args[0];
if (command === "build") {
  await import("jsr:@tutors/tutors@5.3.0");
} else if (command === "website") {
  await import("jsr:@tutors/tutors-lite@5.3.0");
} else if (command === "--version") {
  console.log("tutors-tools: Tutors 17.1.0, @tutors/tutors@5.3.0, @tutors/tutors-lite@5.3.0");
} else {
  console.error("Usage: tutors-tools build | website | --version");
  Deno.exit(2);
}
