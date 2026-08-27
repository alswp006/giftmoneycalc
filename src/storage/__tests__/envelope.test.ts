import { describe, it, expect, beforeEach, vi } from "vitest";
import { readEnvelope, writeEnvelope } from "@/storage/envelope";
import { STORAGE_KEYS, SCHEMA_VERSION, CORRUPT_KEY_PREFIX } from "@/storage/keys";
import type { RecordsEnvelope } from "@/storage/keys";

describe("envelope I/O", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const fallback: RecordsEnvelope = { schemaVersion: 1, updatedAt: "2026-08-28T00:00:00Z", records: [] };

  it("초기화: 키가 없으면 fallback으로 초기화하고 성공을 반환한다", async () => {
    const result = await readEnvelope(STORAGE_KEYS.records, fallback);
    expect(result.ok).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.records)).toBe(JSON.stringify(fallback));
  });

  it("손상 격리: 파싱 불가 문자열은 corrupt 백업 후 fallback으로 복구된다", async () => {
    localStorage.setItem(STORAGE_KEYS.records, "not json");
    const result = await readEnvelope(STORAGE_KEYS.records, fallback);
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ code: "CORRUPTED" });
    expect(localStorage.getItem(`${CORRUPT_KEY_PREFIX}${STORAGE_KEYS.records}`)).toBe("not json");
  });

  it("다운그레이드 거부: 미래 schemaVersion은 쓰기 없이 READ_ONLY_VERSION을 반환한다", async () => {
    const future = { schemaVersion: SCHEMA_VERSION + 1, updatedAt: "x", records: [] };
    const raw = JSON.stringify(future);
    localStorage.setItem(STORAGE_KEYS.records, raw);
    const result = await readEnvelope(STORAGE_KEYS.records, fallback);
    expect(result).toMatchObject({ ok: false, code: "READ_ONLY_VERSION" });
    expect(localStorage.getItem(STORAGE_KEYS.records)).toBe(raw);
  });

  it("쿼터 초과: writeEnvelope는 예외를 던지지 않고 QUOTA_EXCEEDED를 반환한다", async () => {
    const error = new Error("quota");
    error.name = "QuotaExceededError";
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw error;
    });
    const result = await writeEnvelope(STORAGE_KEYS.records, fallback);
    expect(result).toMatchObject({ ok: false, code: "QUOTA_EXCEEDED" });
    spy.mockRestore();
  });

  it("라운드트립: writeEnvelope로 쓴 값을 readEnvelope로 그대로 읽는다", async () => {
    await writeEnvelope(STORAGE_KEYS.records, fallback);
    const result = await readEnvelope(STORAGE_KEYS.records, fallback);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(fallback);
    }
  });
});
