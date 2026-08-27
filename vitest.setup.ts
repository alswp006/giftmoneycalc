/**
 * Vitest setup — runs before each test file.
 *
 * Handles:
 *  - localStorage isolation between tests (prevents cross-test pollution)
 *  - requestAnimationFrame shim for jsdom (needed for animate/countup utilities)
 *  - sessionStorage isolation
 *  - console.error filtering (React Router warnings etc.)
 */

import { beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import Module from "node:module";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// ── "@/" alias support for bare require() calls in test files ──
// vite-node's per-file `require` is a plain Node `createRequire`, which is unaware
// of Vite's `resolve.alias` — it only kicks in for `import`. Some packet tests call
// `require("@/domain/xyz")` directly, so patch Node's module resolver process-wide
// (same trick as the `module-alias` package) to rewrite "@/..." to "<root>/src/...".
const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "src");
const originalResolveFilename = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (request: string, ...rest: unknown[]) {
  if (request.startsWith("@/")) {
    const base = path.join(srcRoot, request.slice(2));
    const candidate = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find((p) =>
      fs.existsSync(p),
    );
    if (candidate) {
      return originalResolveFilename.call(this, candidate, ...rest);
    }
  }
  return originalResolveFilename.call(this, request, ...rest);
};

// ── localStorage / sessionStorage isolation ──
// jsdom's storage persists between tests by default. Clear it to prevent pollution.
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

// ── requestAnimationFrame shim for jsdom ──
// jsdom does NOT implement rAF natively, so animate/countup code hangs forever.
// Shim that immediately invokes callback with a monotonic timestamp.
if (typeof globalThis.requestAnimationFrame !== "function") {
  let now = 0;
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    now += 16;
    return setTimeout(() => cb(now), 0) as unknown as number;
  }) as typeof globalThis.requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as typeof globalThis.cancelAnimationFrame;
}

// ── afterEach reset ──
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers(); // in case a test used fake timers
});
