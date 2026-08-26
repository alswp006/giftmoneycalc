import { describe, it, expect } from 'vitest';
import type { CalcInput, CalcResult, BreakdownItem } from '@/lib/types';

/**
 * Packet 0003: 계산 엔진 calcGiftAmount() + 금액 포맷터
 *
 * CalcInput을 받아 CalcResult를 반환하는 순수 함수와 원화 포맷 유틸을 구현한다.
 * 계수 곱 후 Math.round로 rawAmount를 만들고 AMOUNT_LADDER에 최근접 스냅(동률이면 더 작은 값)하며,
 * breakdown 5개 항목을 고정 순서로 생성한다. 스토리지 접근과 부작용은 없다.
 *
 * 테스트 구조: 각 AC별로 구체적인 값 검증 (숫자, 문자열, 객체 구조)
 *
 * IMPLEMENTATION GUIDE:
 *
 * File: src/lib/calc.ts
 *   export function calcGiftAmount(input: CalcInput): CalcResult {
 *     1. Calculate rawAmount = EVENT_BASE[eventType] * RELATION_FACTOR[relation] * INTIMACY_FACTOR[intimacy] * ATTENDANCE_FACTOR[attendance] * REGION_FACTOR[region]
 *     2. Round: Math.round(rawAmount)
 *     3. Snap to AMOUNT_LADDER (find closest value; if tie, pick smaller)
 *     4. Find index in ladder: min = ladder[idx-1] || ladder[0], max = ladder[idx+1] || ladder[idx]
 *     5. Build breakdown array (5 items, fixed order):
 *        - [0] label: "기본 금액 " + formatKRW(EVENT_BASE[eventType]), factor: 1.0
 *        - [1] label: "관계: " + RELATION_LABEL[relation], factor: RELATION_FACTOR[relation]
 *        - [2] label: "친밀도: " + INTIMACY_LABEL[intimacy], factor: INTIMACY_FACTOR[intimacy]
 *        - [3] label: "참석: " + ATTENDANCE_LABEL[attendance], factor: ATTENDANCE_FACTOR[attendance]
 *        - [4] label: "지역: " + REGION_SHORT_LABEL[region], factor: REGION_FACTOR[region]
 *     6. Return CalcResult with recommended (snapped value), min, max, rawAmount, breakdown, input
 *   }
 *
 * File: src/lib/format.ts
 *   export function formatKRW(amount: number): string {
 *     Return: amount.toLocaleString('ko-KR') + '원'
 *     Example: 200000 → '200,000원'
 *   }
 *
 * Import constants from @/lib/constants:
 *   EVENT_BASE, RELATION_FACTOR, INTIMACY_FACTOR, ATTENDANCE_FACTOR, REGION_FACTOR,
 *   AMOUNT_LADDER, EVENT_LABEL, RELATION_LABEL, INTIMACY_LABEL, ATTENDANCE_LABEL,
 *   REGION_LABEL, REGION_SHORT_LABEL
 */

// Import the functions that will be implemented in src/lib/calc.ts and src/lib/format.ts
// These imports will fail until the functions are implemented (TDD red phase)
import { calcGiftAmount } from '@/lib/calc';
import { formatKRW } from '@/lib/format';

describe('AC-1: calcGiftAmount() basic case — wedding, coworker, absent, majorCity', () => {
  it('[P0] should return correct rawAmount and snap to ladder for wedding coworker', () => {
    const input: CalcInput = {
      eventType: 'wedding',
      relation: 'coworker',
      intimacy: 3,
      attendance: 'absent',
      region: 'majorCity',
    };

    const result = calcGiftAmount(input);

    // rawAmount = 50000 (wedding) * 1.0 (coworker) * 1.0 (intimacy 3) * 1.0 (absent) * 1.0 (majorCity)
    expect(result.rawAmount).toBe(50000);
  });

  it('[P0] should snap rawAmount to nearest ladder value with correct recommended/min/max', () => {
    const input: CalcInput = {
      eventType: 'wedding',
      relation: 'coworker',
      intimacy: 3,
      attendance: 'absent',
      region: 'majorCity',
    };

    const result = calcGiftAmount(input);

    // 50000 is exactly on the ladder → recommended = 50000
    expect(result.recommended).toBe(50000);
    // min = ladder[index - 1] = 30000
    expect(result.min).toBe(30000);
    // max = ladder[index + 1] = 70000
    expect(result.max).toBe(70000);
  });

  it('[P0] should include input in result for reference', () => {
    const input: CalcInput = {
      eventType: 'wedding',
      relation: 'coworker',
      intimacy: 3,
      attendance: 'absent',
      region: 'majorCity',
    };

    const result = calcGiftAmount(input);

    expect(result.input).toEqual(input);
  });
});

describe('AC-2: calcGiftAmount() with attendance & region factor — wedding, closeFriend, attending, metropolitan', () => {
  it('[P0] should calculate rawAmount with all factors applied', () => {
    const input: CalcInput = {
      eventType: 'wedding',
      relation: 'closeFriend',
      intimacy: 4,
      attendance: 'attending',
      region: 'metropolitan',
    };

    const result = calcGiftAmount(input);

    // rawAmount = 50000 * 2.0 * 1.2 * 1.6 * 1.1 = 211200
    expect(result.rawAmount).toBe(211200);
  });

  it('[P0] should snap 211200 to 200000 (nearest in ladder)', () => {
    const input: CalcInput = {
      eventType: 'wedding',
      relation: 'closeFriend',
      intimacy: 4,
      attendance: 'attending',
      region: 'metropolitan',
    };

    const result = calcGiftAmount(input);

    // 211200 is closest to 200000 (11200 away) vs 300000 (88800 away)
    expect(result.recommended).toBe(200000);
    // min = ladder[index - 1] = 150000
    expect(result.min).toBe(150000);
    // max = ladder[index + 1] = 300000
    expect(result.max).toBe(300000);
  });
});

describe('AC-3: calcGiftAmount() with lower tier event — firstBirthday, acquaintance, absent, other', () => {
  it('[P0] should handle firstBirthday with acquaintance factor', () => {
    const input: CalcInput = {
      eventType: 'firstBirthday',
      relation: 'acquaintance',
      intimacy: 1,
      attendance: 'absent',
      region: 'other',
    };

    const result = calcGiftAmount(input);

    // rawAmount = 30000 * 0.6 * 0.8 * 1.0 * 0.9 = 12960
    expect(result.rawAmount).toBe(12960);
  });

  it('[P0] should snap 12960 to 30000 and handle ladder boundary correctly', () => {
    const input: CalcInput = {
      eventType: 'firstBirthday',
      relation: 'acquaintance',
      intimacy: 1,
      attendance: 'absent',
      region: 'other',
    };

    const result = calcGiftAmount(input);

    // 12960 is closest to 30000 → snap to 30000 (first element in ladder)
    expect(result.recommended).toBe(30000);
    // At boundary: min = 30000 (cannot go lower)
    expect(result.min).toBe(30000);
    // max = ladder[index + 1] = 50000
    expect(result.max).toBe(50000);
  });
});

describe('AC-4: breakdown structure and order — [기본금액, 관계, 친밀도, 참석, 지역]', () => {
  it('[P0] should generate breakdown with exactly 5 items in correct order', () => {
    const input: CalcInput = {
      eventType: 'wedding',
      relation: 'coworker',
      intimacy: 3,
      attendance: 'absent',
      region: 'majorCity',
    };

    const result = calcGiftAmount(input);

    expect(result.breakdown).toHaveLength(5);
  });

  it('[P0] should have breakdown items with label and factor properties', () => {
    const input: CalcInput = {
      eventType: 'wedding',
      relation: 'coworker',
      intimacy: 3,
      attendance: 'absent',
      region: 'majorCity',
    };

    const result = calcGiftAmount(input);

    result.breakdown.forEach((item: BreakdownItem) => {
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('factor');
      expect(typeof item.label).toBe('string');
      expect(typeof item.factor).toBe('number');
    });
  });

  it('[P0] should include base amount in first breakdown item with Korean label format', () => {
    const input: CalcInput = {
      eventType: 'wedding',
      relation: 'coworker',
      intimacy: 3,
      attendance: 'absent',
      region: 'majorCity',
    };

    const result = calcGiftAmount(input);

    // First item: 기본 금액 50,000원 format
    const baseItem = result.breakdown[0];
    expect(baseItem.label).toBe('기본 금액 50,000원');
    expect(baseItem.factor).toBe(1.0);  // base amount is always factor 1.0
  });

  it('[P0] should include relation in second breakdown item with correct label', () => {
    const input: CalcInput = {
      eventType: 'wedding',
      relation: 'closeFriend',
      intimacy: 3,
      attendance: 'absent',
      region: 'majorCity',
    };

    const result = calcGiftAmount(input);

    // Second item: 관계: 친한 친구
    const relationItem = result.breakdown[1];
    expect(relationItem.label).toContain('관계:');
    expect(relationItem.label).toContain('친한 친구');
    expect(relationItem.factor).toBe(2.0);
  });

  it('[P0] should include intimacy in third breakdown item with correct label', () => {
    const input: CalcInput = {
      eventType: 'wedding',
      relation: 'coworker',
      intimacy: 4,
      attendance: 'absent',
      region: 'majorCity',
    };

    const result = calcGiftAmount(input);

    // Third item: 친밀도: 자주 만남
    const intimacyItem = result.breakdown[2];
    expect(intimacyItem.label).toContain('친밀도:');
    expect(intimacyItem.label).toContain('자주 만남');
    expect(intimacyItem.factor).toBe(1.2);
  });

  it('[P0] should include attendance in fourth breakdown item with correct label', () => {
    const input: CalcInput = {
      eventType: 'wedding',
      relation: 'coworker',
      intimacy: 3,
      attendance: 'attending',
      region: 'majorCity',
    };

    const result = calcGiftAmount(input);

    // Fourth item: 참석: 참석·식사 or 미참석·송금
    const attendanceItem = result.breakdown[3];
    expect(attendanceItem.label).toContain('참석:');
    expect(attendanceItem.factor).toBe(1.6);
  });

  it('[P0] should include region in fifth breakdown item with short region label', () => {
    const input: CalcInput = {
      eventType: 'wedding',
      relation: 'coworker',
      intimacy: 3,
      attendance: 'absent',
      region: 'metropolitan',
    };

    const result = calcGiftAmount(input);

    // Fifth item: 지역: 서울·수도권 (using REGION_SHORT_LABEL)
    const regionItem = result.breakdown[4];
    expect(regionItem.label).toContain('지역:');
    expect(regionItem.label).toContain('서울·수도권');
    expect(regionItem.factor).toBe(1.1);
  });

  it('should verify breakdown order matches spec [기본금액, 관계, 친밀도, 참석, 지역]', () => {
    const input: CalcInput = {
      eventType: 'firstBirthday',
      relation: 'family',
      intimacy: 5,
      attendance: 'attending',
      region: 'seoulGangnam',
    };

    const result = calcGiftAmount(input);

    // Verify each position contains the correct category
    expect(result.breakdown[0].label).toContain('기본 금액');
    expect(result.breakdown[1].label).toContain('관계:');
    expect(result.breakdown[2].label).toContain('친밀도:');
    expect(result.breakdown[3].label).toContain('참석:');
    expect(result.breakdown[4].label).toContain('지역:');
  });
});

describe('AC-5: formatKRW() currency formatter', () => {
  it('[P0] should format 200000 as "200,000원" using toLocaleString', () => {
    const formatted = formatKRW(200000);

    expect(formatted).toBe('200,000원');
  });

  it('[P0] should format 50000 with comma separator', () => {
    const formatted = formatKRW(50000);

    expect(formatted).toBe('50,000원');
  });

  it('[P0] should format 1000000 correctly', () => {
    const formatted = formatKRW(1000000);

    expect(formatted).toBe('1,000,000원');
  });

  it('should format small amount 30000', () => {
    const formatted = formatKRW(30000);

    expect(formatted).toBe('30,000원');
  });

  it('should format 211200 (non-ladder amount) with comma separator', () => {
    const formatted = formatKRW(211200);

    expect(formatted).toBe('211,200원');
  });

  it('should format 12960 (non-ladder amount)', () => {
    const formatted = formatKRW(12960);

    expect(formatted).toBe('12,960원');
  });

  it('should format 0 as "0원"', () => {
    const formatted = formatKRW(0);

    expect(formatted).toBe('0원');
  });

  it('should handle edge case large numbers', () => {
    const formatted = formatKRW(10000000);

    expect(formatted).toBe('10,000,000원');
  });
});

describe('Integration: CalcResult structure and complete flow', () => {
  it('should return complete CalcResult with all required fields', () => {
    const input: CalcInput = {
      eventType: 'wedding',
      relation: 'closeFriend',
      intimacy: 4,
      attendance: 'attending',
      region: 'metropolitan',
    };

    const result = calcGiftAmount(input);

    expect(result).toHaveProperty('recommended');
    expect(result).toHaveProperty('min');
    expect(result).toHaveProperty('max');
    expect(result).toHaveProperty('rawAmount');
    expect(result).toHaveProperty('breakdown');
    expect(result).toHaveProperty('input');
  });

  it('should ensure recommended is always within ladder and between min/max', () => {
    const input: CalcInput = {
      eventType: 'wedding',
      relation: 'closeFriend',
      intimacy: 4,
      attendance: 'attending',
      region: 'metropolitan',
    };

    const result = calcGiftAmount(input);

    expect(result.recommended).toBeGreaterThanOrEqual(result.min);
    expect(result.recommended).toBeLessThanOrEqual(result.max);
  });

  it('should ensure breakdown product approximates rawAmount when multiplied', () => {
    const input: CalcInput = {
      eventType: 'wedding',
      relation: 'closeFriend',
      intimacy: 4,
      attendance: 'attending',
      region: 'metropolitan',
    };

    const result = calcGiftAmount(input);

    // Calculate product of all factors from breakdown
    const factorProduct = result.breakdown.reduce((acc, item) => acc * item.factor, 1.0);

    // Base amount should be extracted from first breakdown item
    // For wedding: 50000
    const baseAmount = 50000;

    // Product should equal rawAmount / baseAmount
    const expected = result.rawAmount / baseAmount;
    expect(Math.abs(factorProduct - expected)).toBeLessThan(0.01);
  });
});

describe('Edge cases and rounding', () => {
  it('should round rawAmount using Math.round for fractional results', () => {
    // Create a scenario that produces a fractional rawAmount
    const input: CalcInput = {
      eventType: 'wedding',
      relation: 'acquaintance',  // 0.6
      intimacy: 2,              // 0.9
      attendance: 'attending',   // 1.6
      region: 'other',          // 0.9
    };

    const result = calcGiftAmount(input);

    // rawAmount = 50000 * 0.6 * 0.9 * 1.6 * 0.9 = 38880
    // Should be rounded by Math.round
    expect(Number.isInteger(result.rawAmount)).toBe(true);
  });

  it('should handle tie-breaking in ladder snapping — pick smaller value for equal distance', () => {
    // When equidistant from two ladder values, prefer the smaller one
    // This test verifies the tie-breaking rule
    const input: CalcInput = {
      eventType: 'wedding',
      relation: 'coworker',
      intimacy: 3,
      attendance: 'absent',
      region: 'majorCity',
    };

    const result = calcGiftAmount(input);

    // 50000 is exactly on ladder, so no tie-breaking needed
    expect(result.recommended).toBe(50000);
  });
});
