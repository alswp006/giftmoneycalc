import { describe, it, expect } from "vitest";
import { newUuid } from "@/storage/uuid";

describe("newUuid", () => {
  it("generates a v4-shaped UUID string", () => {
    const uuid = newUuid();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("generates unique values across many calls", () => {
    const uuids = new Set(Array.from({ length: 200 }, () => newUuid()));
    expect(uuids.size).toBe(200);
  });

  it("falls back to Math.random-based v4 when crypto.randomUUID is unavailable", () => {
    const original = crypto.randomUUID;
    // @ts-expect-error simulate environment without randomUUID
    crypto.randomUUID = undefined;
    try {
      const uuid = newUuid();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    } finally {
      crypto.randomUUID = original;
    }
  });
});
