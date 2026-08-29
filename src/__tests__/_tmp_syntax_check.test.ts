import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

describe("tmp syntax sanity", () => {
  it("fs/path/url imports resolve and basic regex logic works", () => {
    const fakeSrc = "export const x = 1; // no hex here, uses ScreenScaffold";
    expect(fakeSrc).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(fakeSrc).toMatch(/ScreenScaffold/);
    expect(typeof fs.readFileSync).toBe("function");
    expect(currentDir.length > 0).toBe(true);
  });
});
