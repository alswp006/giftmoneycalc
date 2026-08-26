import { describe, it, expect } from "vitest";
import { formatAmountKrw, formatDate } from "@/lib/format";

describe("formatAmountKrw()", () => {
  it("formats full amount with comma separators by default", () => {
    expect(formatAmountKrw(1234567)).toBe("1,234,567원");
  });

  it("returns 0원 for non-finite input", () => {
    expect(formatAmountKrw(NaN)).toBe("0원");
    expect(formatAmountKrw(Infinity)).toBe("0원");
  });

  it("formats short amounts under 10,000 with full comma format", () => {
    expect(formatAmountKrw(5000, { short: true })).toBe("5,000원");
  });

  it("formats short amounts in 만원 units", () => {
    expect(formatAmountKrw(50000, { short: true })).toBe("5만원");
    expect(formatAmountKrw(123456, { short: true })).toBe("12.3만원");
  });

  it("formats short amounts in 억원 units", () => {
    expect(formatAmountKrw(150000000, { short: true })).toBe("1.5억원");
  });
});

describe("formatDate()", () => {
  it("formats short date as M월 D일", () => {
    expect(formatDate("2026-08-27")).toBe("8월 27일");
    expect(formatDate("2026-08-27", "short")).toBe("8월 27일");
  });

  it("formats long date as YYYY년 M월 D일", () => {
    expect(formatDate("2026-08-27", "long")).toBe("2026년 8월 27일");
  });

  it("returns empty string for malformed input without throwing", () => {
    expect(formatDate("not-a-date")).toBe("");
    expect(() => formatDate("")).not.toThrow();
  });
});
