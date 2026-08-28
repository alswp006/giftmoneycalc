import { describe, it, expect } from "vitest";

describe("오류 문구 단일 소스 errors.ts + 하드코딩 검증 스크립트", () => {
  describe("AC-1: ERROR_MESSAGES와 헬퍼 함수 export", () => {
    it("should export ERROR_MESSAGES object", async () => {
      const { ERROR_MESSAGES } = await import("@/lib/errors");
      expect(ERROR_MESSAGES).toBeDefined();
      expect(typeof ERROR_MESSAGES).toBe("object");
    });

    it("should export fail() function", async () => {
      const { fail } = await import("@/lib/errors");
      expect(fail).toBeDefined();
      expect(typeof fail).toBe("function");
    });

    it("should export ok() function", async () => {
      const { ok } = await import("@/lib/errors");
      expect(ok).toBeDefined();
      expect(typeof ok).toBe("function");
    });
  });

  describe("AC-2: 문구가 SPEC과 문자 단위 일치", () => {
    it("409 should match SPEC message", async () => {
      const { ERROR_MESSAGES } = await import("@/lib/errors");
      expect(ERROR_MESSAGES[409]).toBe(
        "다른 화면에서 이미 수정된 기록이에요. 새로고침 후 다시 시도해주세요"
      );
    });

    it("404 should match SPEC message", async () => {
      const { ERROR_MESSAGES } = await import("@/lib/errors");
      expect(ERROR_MESSAGES[404]).toBe("삭제되었거나 없는 기록이에요");
    });

    it("500 should match SPEC message", async () => {
      const { ERROR_MESSAGES } = await import("@/lib/errors");
      expect(ERROR_MESSAGES[500]).toBe(
        "광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요"
      );
    });

    it("401 should match SPEC message", async () => {
      const { ERROR_MESSAGES } = await import("@/lib/errors");
      expect(ERROR_MESSAGES[401]).toBe(
        "토스 앱에서 광고를 보면 상세 리포트를 열 수 있어요"
      );
    });

    it("416 should match SPEC message", async () => {
      const { ERROR_MESSAGES } = await import("@/lib/errors");
      expect(ERROR_MESSAGES[416]).toBe("모든 기록을 다 봤어요");
    });
  });

  describe("AC-3: 모든 오류 코드에 문구가 있고 숫자 미포함", () => {
    it("should have exactly 9 error messages", async () => {
      const { ERROR_MESSAGES } = await import("@/lib/errors");
      expect(Object.keys(ERROR_MESSAGES).length).toBe(9);
    });

    it("should not have any empty message", async () => {
      const { ERROR_MESSAGES } = await import("@/lib/errors");
      Object.values(ERROR_MESSAGES).forEach((message) => {
        expect(message).toBeTruthy();
        expect(message.length).toBeGreaterThan(0);
      });
    });

    it("should not expose error codes in messages", async () => {
      const { ERROR_MESSAGES } = await import("@/lib/errors");
      const codePattern = /[0-9]{3}/;
      Object.values(ERROR_MESSAGES).forEach((message) => {
        expect(message).not.toMatch(codePattern);
      });
    });

    it("should cover all 9 error codes: 401, 403, 404, 409, 413, 416, 422, 500, 507", async () => {
      const { ERROR_MESSAGES } = await import("@/lib/errors");
      const codes: (401 | 403 | 404 | 409 | 413 | 416 | 422 | 500 | 507)[] = [
        401, 403, 404, 409, 413, 416, 422, 500, 507,
      ];
      codes.forEach((code) => {
        expect(ERROR_MESSAGES[code]).toBeDefined();
      });
    });
  });

  describe("AC-4 helper: fail() function returns error Result", () => {
    it("fail() should return object with ok: false", async () => {
      const { fail } = await import("@/lib/errors");
      const result = fail(404);
      expect(result.ok).toBe(false);
    });

    it("fail() should include code in error object", async () => {
      const { fail } = await import("@/lib/errors");
      const result = fail(409);
      expect(result).toHaveProperty("error");
      expect(result.error.code).toBe(409);
    });

    it("fail() should include message from ERROR_MESSAGES", async () => {
      const { fail, ERROR_MESSAGES } = await import("@/lib/errors");
      const result = fail(500);
      expect(result.error.message).toBe(ERROR_MESSAGES[500]);
    });
  });

  describe("AC-4 helper: ok() function returns success Result", () => {
    it("ok() should return object with ok: true", async () => {
      const { ok } = await import("@/lib/errors");
      const result = ok({ foo: "bar" });
      expect(result.ok).toBe(true);
    });

    it("ok() should include data", async () => {
      const { ok } = await import("@/lib/errors");
      const data = { id: "123", amount: 5000 };
      const result = ok(data);
      expect(result).toHaveProperty("data");
      expect(result.data).toEqual(data);
    });

    it("ok() should preserve data type", async () => {
      const { ok } = await import("@/lib/errors");
      const testData = { records: [{ id: "1" }, { id: "2" }], total: 50000 };
      const result = ok(testData);
      expect(result.data).toEqual(testData);
      expect(result.data.records.length).toBe(2);
      expect(result.data.total).toBe(50000);
    });
  });
});
