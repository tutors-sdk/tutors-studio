// S2: one program holding the Tutors generator and tutors-lite. Each package builds the course in the
// current folder when it is imported, which is how `deno run jsr:@tutors/tutors` works too.
const command = Deno.args[0];
if (command === "build") {
  await import("jsr:@tutors/tutors@5.3.0");
} else if (command === "website") {
  await import("jsr:@tutors/tutors-lite@5.3.0");
} else if (command === "--version") {
  console.log("tutors-tools spike: @tutors/tutors 5.3.0, @tutors/tutors-lite 5.3.0");
} else {
  console.error("Usage: tutors-tools build | website | --version");
  Deno.exit(2);
}
