import { describe, it, expect, beforeEach, vi } from "vitest";
import type { RecordsEnvelope, SettingsEnvelope, RewardEnvelope } from "@/storage/keys";
import { STORAGE_KEYS, SCHEMA_VERSION, CORRUPT_KEY_PREFIX } from "@/storage/keys";

/**
 * Packet 0004: 저장소 저수준 I/O — Envelope 읽기/쓰기 · 손상 격리 · 마이그레이션 · UUID 폴백
 *
 * readEnvelope/writeEnvelope는 파싱 실패·스키마 불일치·쿼터 초과를 전면 try/catch로
 * 흡수해 StorageResult 객체로 반환하고, 예외를 상위로 던지지 않는다.
 * migrations 등록부와 crypto.randomUUID 폴백(newUuid)은 이 파일들에만 둔다.
 */

describe("Packet 0004: 저장소 저수준 I/O — readEnvelope/writeEnvelope/newUuid", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ============ AC-1: readEnvelope 손상 복구 ============

  describe("AC-1: readEnvelope 손상 복구", () => {
    it("AC-1[P0]: JSON.parse 실패 시 원본을 corrupt 백업에 저장하고 fallback으로 재초기화한다", async () => {
      const { readEnvelope } = await import("@/storage/envelope");

      const key = STORAGE_KEYS.records;
      const malformedJson = "{ invalid json }";
      localStorage.setItem(key, malformedJson);

      const fallback: RecordsEnvelope = {
        schemaVersion: 1,
        updatedAt: "2026-08-28T00:00:00Z",
        records: [],
      };

      const result = await readEnvelope<RecordsEnvelope>(key, fallback);

      // 1. 반환값이 CORRUPTED 코드를 가짐
      expect(result.ok).toBe(false);
      expect(result.code).toBe("CORRUPTED");

      // 2. 원본이 corrupt 키에 백업됨
      const corruptKey = `${CORRUPT_KEY_PREFIX}${key}`;
      const backupedValue = localStorage.getItem(corruptKey);
      expect(backupedValue).toBe(malformedJson);

      // 3. 원 키가 fallback으로 재초기화됨
      const restoredValue = localStorage.getItem(key);
      expect(restoredValue).toBe(JSON.stringify(fallback));
    });

    it("AC-1[P0]: schemaVersion 누락 시 손상 처리", async () => {
      const { readEnvelope } = await import("@/storage/envelope");

      const key = STORAGE_KEYS.records;
      const missingVersionJson = JSON.stringify({
        updatedAt: "2026-08-28T00:00:00Z",
        records: [],
        // schemaVersion 누락
      });
      localStorage.setItem(key, missingVersionJson);

      const fallback: RecordsEnvelope = {
        schemaVersion: 1,
        updatedAt: "2026-08-28T00:00:00Z",
        records: [],
      };

      const result = await readEnvelope<RecordsEnvelope>(key, fallback);

      expect(result.ok).toBe(false);
      expect(result.code).toBe("CORRUPTED");

      const corruptKey = `${CORRUPT_KEY_PREFIX}${key}`;
      expect(localStorage.getItem(corruptKey)).toBe(missingVersionJson);
    });

    it("AC-1[P0]: schemaVersion이 비정수 시 손상 처리", async () => {
      const { readEnvelope } = await import("@/storage/envelope");

      const key = STORAGE_KEYS.records;
      const invalidVersionJson = JSON.stringify({
        schemaVersion: "1.5", // 비정수
        updatedAt: "2026-08-28T00:00:00Z",
        records: [],
      });
      localStorage.setItem(key, invalidVersionJson);

      const fallback: RecordsEnvelope = {
        schemaVersion: 1,
        updatedAt: "2026-08-28T00:00:00Z",
        records: [],
      };

      const result = await readEnvelope<RecordsEnvelope>(key, fallback);

      expect(result.ok).toBe(false);
      expect(result.code).toBe("CORRUPTED");
    });

    it("AC-1: corrupt 백업은 호출 간에 누적되지 않는다 (최신 1개만 유지)", async () => {
      const { readEnvelope } = await import("@/storage/envelope");

      const key = STORAGE_KEYS.records;
      const fallback: RecordsEnvelope = {
        schemaVersion: 1,
        updatedAt: "2026-08-28T00:00:00Z",
        records: [],
      };

      // 첫 번째 손상
      const malformedJson1 = "{ bad1 }";
      localStorage.setItem(key, malformedJson1);
      await readEnvelope<RecordsEnvelope>(key, fallback);

      const corruptKey = `${CORRUPT_KEY_PREFIX}${key}`;
      const backup1 = localStorage.getItem(corruptKey);
      expect(backup1).toBe(malformedJson1);

      // 두 번째 손상
      const malformedJson2 = "{ bad2 }";
      localStorage.setItem(key, malformedJson2);
      await readEnvelope<RecordsEnvelope>(key, fallback);

      // corrupt 키가 최신값으로 업데이트됨
      const backup2 = localStorage.getItem(corruptKey);
      expect(backup2).toBe(malformedJson2);
      expect(backup2).not.toBe(backup1);
    });
  });

  // ============ AC-2: readEnvelope 마이그레이션 및 버전 관리 ============

  describe("AC-2: readEnvelope 마이그레이션 및 버전 관리", () => {
    it("AC-2[P0]: schemaVersion < SCHEMA_VERSION 시 마이그레이션 적용 후 저장", async () => {
      const { readEnvelope } = await import("@/storage/envelope");

      const key = STORAGE_KEYS.records;
      // schemaVersion = 0 (SCHEMA_VERSION=1보다 낮음)
      const oldVersionData: RecordsEnvelope = {
        schemaVersion: 0,
        updatedAt: "2026-08-28T00:00:00Z",
        records: [],
      };
      localStorage.setItem(key, JSON.stringify(oldVersionData));

      const fallback: RecordsEnvelope = {
        schemaVersion: 1,
        updatedAt: "2026-08-28T00:00:00Z",
        records: [],
      };

      const result = await readEnvelope<RecordsEnvelope>(key, fallback);

      // 1. 반환값이 성공
      expect(result.ok).toBe(true);

      // 2. 마이그레이션 후 저장됨
      const savedValue = localStorage.getItem(key);
      expect(savedValue).toBeTruthy();
      const parsed = JSON.parse(savedValue!);
      expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    });

    it("AC-2[P0]: schemaVersion > SCHEMA_VERSION 시 READ_ONLY_VERSION 반환 (쓰기 없음)", async () => {
      const { readEnvelope } = await import("@/storage/envelope");

      const key = STORAGE_KEYS.records;
      // schemaVersion = 999 (SCHEMA_VERSION=1보다 높음)
      const futureVersionData: RecordsEnvelope = {
        schemaVersion: 999,
        updatedAt: "2026-08-28T00:00:00Z",
        records: [],
      };
      const originalJson = JSON.stringify(futureVersionData);
      localStorage.setItem(key, originalJson);

      const fallback: RecordsEnvelope = {
        schemaVersion: 1,
        updatedAt: "2026-08-28T00:00:00Z",
        records: [],
      };

      const result = await readEnvelope<RecordsEnvelope>(key, fallback);

      // 1. 반환값이 READ_ONLY_VERSION 에러
      expect(result.ok).toBe(false);
      expect(result.code).toBe("READ_ONLY_VERSION");

      // 2. localStorage 값이 변경되지 않음 (호출 전후 동일)
      const afterValue = localStorage.getItem(key);
      expect(afterValue).toBe(originalJson);
    });

    it("AC-2: schemaVersion === SCHEMA_VERSION 시 마이그레이션 없이 반환", async () => {
      const { readEnvelope } = await import("@/storage/envelope");

      const key = STORAGE_KEYS.records;
      const currentVersionData: RecordsEnvelope = {
        schemaVersion: SCHEMA_VERSION,
        updatedAt: "2026-08-28T00:00:00Z",
        records: [],
      };
      const originalJson = JSON.stringify(currentVersionData);
      localStorage.setItem(key, originalJson);

      const fallback: RecordsEnvelope = {
        schemaVersion: 1,
        updatedAt: "2026-08-28T00:00:00Z",
        records: [],
      };

      const result = await readEnvelope<RecordsEnvelope>(key, fallback);

      expect(result.ok).toBe(true);
      // localStorage 값이 변경되지 않음 (불필요한 쓰기 없음)
      expect(localStorage.getItem(key)).toBe(originalJson);
    });
  });

  // ============ AC-3: readEnvelope 키 부재 시 초기화 ============

  describe("AC-3: readEnvelope 키 부재 시 초기화", () => {
    it("AC-3[P0]: 키가 없으면 빈 Envelope로 초기화하고 반환", async () => {
      const { readEnvelope } = await import("@/storage/envelope");

      const key = STORAGE_KEYS.records;
      expect(localStorage.getItem(key)).toBeNull();

      const fallback: RecordsEnvelope = {
        schemaVersion: 1,
        updatedAt: "2026-08-28T00:00:00Z",
        records: [],
      };

      const result = await readEnvelope<RecordsEnvelope>(key, fallback);

      // 1. 성공 반환
      expect(result.ok).toBe(true);

      // 2. 초기화되어 저장됨
      const saved = localStorage.getItem(key);
      expect(saved).toBeTruthy();
      const parsed = JSON.parse(saved!);
      expect(parsed.schemaVersion).toBe(1);
      expect(Array.isArray(parsed.records)).toBe(true);

      // 3. updatedAt은 현재 시각 근처 (정확한 값은 테스트 불가하므로 타입만 확인)
      expect(typeof parsed.updatedAt).toBe("string");
    });

    it("AC-3: 초기화 후 반환값의 records는 빈 배열", async () => {
      const { readEnvelope } = await import("@/storage/envelope");

      const key = STORAGE_KEYS.records;
      const fallback: RecordsEnvelope = {
        schemaVersion: 1,
        updatedAt: "2026-08-28T00:00:00Z",
        records: [],
      };

      const result = await readEnvelope<RecordsEnvelope>(key, fallback);

      expect(result.ok).toBe(true);
      const saved = JSON.parse(localStorage.getItem(key)!);
      expect(saved.records).toEqual([]);
    });

    it("AC-3: 키 부재 시 fallback이 사용되지 않고 기본 초기화 스키마가 사용됨", async () => {
      const { readEnvelope } = await import("@/storage/envelope");

      const key = STORAGE_KEYS.reward;
      const fallback = {
        schemaVersion: 1,
        lastUnlockedAt: 123456789,
      };

      const result = await readEnvelope(key, fallback);

      expect(result.ok).toBe(true);
      const saved = JSON.parse(localStorage.getItem(key)!);
      // reward 타입이므로 records 필드가 없어야 함
      expect(saved).not.toHaveProperty("records");
    });
  });

  // ============ AC-4: writeEnvelope 쿼터 초과 ============

  describe("AC-4: writeEnvelope 쿼터 초과 처리", () => {
    it("AC-4[P0]: QuotaExceededError 예외 시 QUOTA_EXCEEDED 반환 (예외 미전파)", async () => {
      const { writeEnvelope } = await import("@/storage/envelope");

      const key = STORAGE_KEYS.records;
      const data: RecordsEnvelope = {
        schemaVersion: 1,
        updatedAt: "2026-08-28T00:00:00Z",
        records: [],
      };

      // localStorage.setItem을 mock해서 QuotaExceededError 발생
      const error = new Error("QuotaExceededError");
      error.name = "QuotaExceededError";
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
        throw error;
      });

      const result = await writeEnvelope(key, data);

      expect(result.ok).toBe(false);
      expect(result.code).toBe("QUOTA_EXCEEDED");
      // 예외가 전파되지 않음
      setItemSpy.mockRestore();
    });

    it("AC-4[P0]: NS_ERROR_DOM_QUOTA_REACHED 예외 시 QUOTA_EXCEEDED 반환", async () => {
      const { writeEnvelope } = await import("@/storage/envelope");

      const key = STORAGE_KEYS.records;
      const data: RecordsEnvelope = {
        schemaVersion: 1,
        updatedAt: "2026-08-28T00:00:00Z",
        records: [],
      };

      // NS_ERROR_DOM_QUOTA_REACHED 에러
      const error = new Error("NS_ERROR_DOM_QUOTA_REACHED");
      error.name = "NS_ERROR_DOM_QUOTA_REACHED";
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
        throw error;
      });

      const result = await writeEnvelope(key, data);

      expect(result.ok).toBe(false);
      expect(result.code).toBe("QUOTA_EXCEEDED");

      setItemSpy.mockRestore();
    });

    it("AC-4: 정상 쓰기는 { ok: true } 반환", async () => {
      const { writeEnvelope } = await import("@/storage/envelope");

      const key = STORAGE_KEYS.records;
      const data: RecordsEnvelope = {
        schemaVersion: 1,
        updatedAt: "2026-08-28T00:00:00Z",
        records: [],
      };

      const result = await writeEnvelope(key, data);

      expect(result.ok).toBe(true);
      // localStorage에 저장됨
      expect(localStorage.getItem(key)).toBe(JSON.stringify(data));
    });

    it("AC-4: 다른 에러는 예외 전파", async () => {
      const { writeEnvelope } = await import("@/storage/envelope");

      const key = STORAGE_KEYS.records;
      const data: RecordsEnvelope = {
        schemaVersion: 1,
        updatedAt: "2026-08-28T00:00:00Z",
        records: [],
      };

      const customError = new Error("Custom storage error");
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
        throw customError;
      });

      // 예외가 전파되어야 함
      await expect(writeEnvelope(key, data)).rejects.toThrow("Custom storage error");

      setItemSpy.mockRestore();
    });
  });

  // ============ AC-5: UUID 폴백 ============

  describe("AC-5: newUuid() 폴백", () => {
    it("AC-5[P0]: crypto.randomUUID 있으면 사용", async () => {
      const { newUuid } = await import("@/storage/uuid");

      // crypto.randomUUID가 존재하는 환경에서 테스트
      if (crypto?.randomUUID) {
        const uuid = newUuid();
        // 반환값이 문자열
        expect(typeof uuid).toBe("string");
        // UUID v4 형식
        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      }
    });

    it("AC-5[P0]: 폴백은 1000회 생성값 모두 정규식 일치", async () => {
      const { newUuid } = await import("@/storage/uuid");

      const uuids = Array.from({ length: 1000 }, () => newUuid());
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      uuids.forEach((uuid) => {
        expect(uuid).toMatch(uuidPattern);
      });
    });

    it("AC-5: newUuid() 호출 시마다 다른 값 생성", async () => {
      const { newUuid } = await import("@/storage/uuid");

      const uuid1 = newUuid();
      const uuid2 = newUuid();
      const uuid3 = newUuid();

      // 서로 다른 값
      expect(uuid1).not.toBe(uuid2);
      expect(uuid2).not.toBe(uuid3);
      expect(uuid1).not.toBe(uuid3);
    });

    it("AC-5: v4 폴백의 variant 필드는 1000회 모두 [89ab] 범위", async () => {
      const { newUuid } = await import("@/storage/uuid");

      const uuids = Array.from({ length: 1000 }, () => newUuid());

      uuids.forEach((uuid) => {
        // variant 필드는 4번째 그룹의 첫 글자
        const variant = uuid.split("-")[3][0];
        expect(["8", "9", "a", "b"]).toContain(variant.toLowerCase());
      });
    });

    it("AC-5: v4 폴백의 version 필드는 1000회 모두 4", async () => {
      const { newUuid } = await import("@/storage/uuid");

      const uuids = Array.from({ length: 1000 }, () => newUuid());

      uuids.forEach((uuid) => {
        // version 필드는 3번째 그룹의 첫 글자
        const version = uuid.split("-")[2][0];
        expect(version).toBe("4");
      });
    });
  });

  // ============ 통합 테스트 ============

  describe("통합: readEnvelope + writeEnvelope 라운드트립", () => {
    it("정상 데이터 쓰기 → 읽기 → 동일성 검증", async () => {
      const { readEnvelope, writeEnvelope } = await import("@/storage/envelope");

      const key = STORAGE_KEYS.records;
      const original: RecordsEnvelope = {
        schemaVersion: SCHEMA_VERSION,
        updatedAt: "2026-08-28T12:34:56Z",
        records: [],
      };

      // 쓰기
      const writeResult = await writeEnvelope(key, original);
      expect(writeResult.ok).toBe(true);

      // 읽기
      const readResult = await readEnvelope<RecordsEnvelope>(key, {
        schemaVersion: 1,
        updatedAt: "fallback",
        records: [],
      });
      expect(readResult.ok).toBe(true);

      // 동일성 (schemaVersion, records는 동일해야 하나 updatedAt은 서버에서 갱신될 수 있음)
      const saved = JSON.parse(localStorage.getItem(key)!);
      expect(saved.schemaVersion).toBe(SCHEMA_VERSION);
      expect(saved.records).toEqual([]);
    });
  });
});
