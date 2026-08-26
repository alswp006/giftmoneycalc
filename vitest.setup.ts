/**
 * Vitest setup — runs before each test file.
 *
 * Handles:
 *  - localStorage isolation between tests (prevents cross-test pollution)
 *  - requestAnimationFrame shim for jsdom (needed for animate/countup utilities)
 *  - Canvas 2D context shim for jsdom (needed for canvas rendering utilities)
 *  - sessionStorage isolation
 *  - console.error filtering (React Router warnings etc.)
 */

import { beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

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

// ── Canvas 2D context shim for jsdom ──
// jsdom does NOT implement canvas rendering natively (requires the native "canvas"
// package). Stub a minimal 2D context so canvas-drawing utilities are testable.
if (typeof HTMLCanvasElement !== "undefined") {
  const fakeContexts = new WeakMap<HTMLCanvasElement, object>();
  HTMLCanvasElement.prototype.getContext = function (contextId: string) {
    if (contextId !== "2d") return null;
    const existing = fakeContexts.get(this);
    if (existing) return existing;
    const ctx = {
      fillStyle: "",
      strokeStyle: "",
      font: "",
      textAlign: "start",
      textBaseline: "alphabetic",
      lineWidth: 1,
      globalAlpha: 1,
      fillRect: () => {},
      clearRect: () => {},
      strokeRect: () => {},
      fillText: () => {},
      strokeText: () => {},
      measureText: () => ({ width: 0 }),
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      drawImage: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      setLineDash: () => {},
      roundRect: () => {},
    };
    fakeContexts.set(this, ctx);
    return ctx;
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

// ── afterEach reset ──
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers(); // in case a test used fake timers
});
