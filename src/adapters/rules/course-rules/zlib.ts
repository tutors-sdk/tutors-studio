import { gunzipSync as gunzip, inflateSync } from "fflate";

/**
 * The two node:zlib calls tutors-create's archive reader makes, answered by fflate so the reader runs in the
 * webview, where there is no node:zlib (ADR 0056). Vite resolves node:zlib to this file.
 */
export const gunzipSync = (data: Uint8Array): Uint8Array => gunzip(data);
/** Raw DEFLATE, as a zip entry stores it. */
export const inflateRawSync = (data: Uint8Array): Uint8Array => inflateSync(data);
