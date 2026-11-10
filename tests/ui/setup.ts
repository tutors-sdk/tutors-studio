import { afterEach } from "vitest";
import { cleanup } from "@testing-library/svelte";

// Each screen test starts on an empty page.
afterEach(() => cleanup());
// jsdom lays nothing out, so it has no scrolling to do.
Element.prototype.scrollIntoView = () => {};
