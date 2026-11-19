// Written by `pnpm bundle pins` from tutors-bundle.json. Change that file, not this one.
//
// The Tutors tools program bundled beside Studio (ADR 0044): the generator and tutors-lite in one file,
// compiled with `deno compile` so a lecturer needs no Deno. `pnpm bundle tools` compiles it with the deno.json
// of a tutors-mono-repo checkout at the pinned commit, whose workspace answers these two imports, so the tools
// are the same Tutors as the reader inside Studio. Each package builds the course in the current folder when
// it is imported, as `deno run jsr:...` does.
const command = Deno.args[0];
if (command === "build") {
  await import("@tutors/tutors");
} else if (command === "website") {
  await import("@tutors/tutors-lite");
} else if (command === "--version") {
  console.log("tutors-tools: Tutors 17.1.0, @tutors/tutors@5.3.0, @tutors/tutors-lite@5.3.0, from tutors-sdk/tutors-mono-repo@9f427d7");
} else {
  console.error("Usage: tutors-tools build | website | --version");
  Deno.exit(2);
}
