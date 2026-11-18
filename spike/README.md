# Spikes for the bundled release

Throwaway probes for gate G0 of the "Tutors Studio: bundled release and feature overhaul" design. They run in
`.github/workflows/spike-bundle.yml` on Windows and write their findings to the run summary. Nothing here ships.

- `tools/`: S2. Compiles the Tutors generator and tutors-lite into one program with `deno compile` and compares what
  it writes with `deno run`.
- `reader/`: S1. Builds the Tutors reader at a release tag with SvelteKit's static adapter, serves it beside a built
  course and records every request that fails.
