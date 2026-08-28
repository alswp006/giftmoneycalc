import { describe, it, expect } from "vitest";
import { ERROR_MESSAGES, getErrorMessage } from "@/lib/errors";

describe("errors.ts — ERROR_MESSAGES", () => {
  it("has exactly 9 error codes", () => {
    expect(Object.keys(ERROR_MESSAGES).length).toBe(9);
  });

  it("has no empty message", () => {
    Object.values(ERROR_MESSAGES).forEach((message) => {
      expect(message.length).toBeGreaterThan(0);
    });
  });

  it("never exposes a numeric error code in its message", () => {
    const codePattern = /[0-9]{3}/;
    Object.values(ERROR_MESSAGES).forEach((message) => {
      expect(message).not.toMatch(codePattern);
    });
  });
});

describe("errors.ts — getErrorMessage", () => {
  it("returns the same message as ERROR_MESSAGES for a given code", () => {
    expect(getErrorMessage(404)).toBe(ERROR_MESSAGES[404]);
    expect(getErrorMessage(409)).toBe(ERROR_MESSAGES[409]);
  });

  it("returns a message for every AppErrorCode", () => {
    (Object.keys(ERROR_MESSAGES).map(Number) as (keyof typeof ERROR_MESSAGES)[]).forEach(
      (code) => {
        expect(getErrorMessage(code).length).toBeGreaterThan(0);
      }
    );
  });
});
