import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { envExample } from "../../src/domain/environment.ts";
import { COURSE_SERVER_IMAGE, READER_IMAGE } from "../../src/adapters/reader/container/container-reader.ts";
import { DENO_IMAGE } from "../../src/adapters/build/tutors-gen/tutors-gen-build.ts";
import { TUTORS_GENERATOR } from "../../src/domain/publish.ts";

describe("what lives in two places stays in step", () => {
  it(".env.example lists exactly the variables Settings shows", () => {
    expect(readFileSync(".env.example", "utf8").replace(/\r\n/g, "\n")).toContain(envExample());
  });

  it("the Rust allowlist pins the same images and generator the adapters run", () => {
    const rust = readFileSync("src-tauri/src/tool.rs", "utf8");
    for (const pinned of [READER_IMAGE, COURSE_SERVER_IMAGE, DENO_IMAGE, TUTORS_GENERATOR]) expect(rust).toContain(`"${pinned}"`);
  });
});
