import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { globSync } from "glob";

function scanSourceFiles(pattern: string): string {
  const files = globSync(pattern, { ignore: ["**/node_modules/**", "**/__tests__/**"] });
  return files
    .map((f) => readFileSync(f, "utf-8").split("\n").map((line) => line.split("//")[0]).join("\n"))
    .join("\n");
}

describe("src/domain 정적 결정론 스캔", () => {
  it("Date.now / new Date / Math.random / crypto. 문자열이 0건이다", () => {
    const source = scanSourceFiles("src/domain/**/*.ts");
    expect(source.match(/Date\.now/g) || []).toHaveLength(0);
    expect(source.match(/new Date/g) || []).toHaveLength(0);
    expect(source.match(/Math\.random/g) || []).toHaveLength(0);
    expect(source.match(/crypto\./g) || []).toHaveLength(0);
  });

  it("storage/uuid import가 0건이다", () => {
    const source = scanSourceFiles("src/domain/**/*.ts");
    expect(source.match(/from\s+['"]\@?\/storage\/uuid['"];?/g) || []).toHaveLength(0);
  });
});
