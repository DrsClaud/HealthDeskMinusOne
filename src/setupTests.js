import "@testing-library/jest-dom";
import { ReadableStream, TransformStream, WritableStream } from "stream/web";
import { TextDecoder, TextEncoder } from "util";

global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;
global.ReadableStream = global.ReadableStream || ReadableStream;
global.TransformStream = global.TransformStream || TransformStream;
global.WritableStream = global.WritableStream || WritableStream;

// Suppress "not wrapped in act(...)" from MUI/third-party internals (TransitionGroup, TouchRipple,
// Autocomplete, Portal, etc.) that schedule state updates after mount. Tests wrap interactions in act() where appropriate.
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === "string" && args[0].includes("not wrapped in act")) return;
    originalError.apply(console, args);
  };
});
afterAll(() => {
  console.error = originalError;
});
