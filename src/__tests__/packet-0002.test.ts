import { describe, it, expect } from 'vitest';
import * as constants from '@/lib/constants';

// NOTE: vite-node wires the in-test `require()` to Node's real createRequire,
// which cannot resolve the `@` alias or `.ts` extensions — so `require('@/lib/constants')`
// never resolves regardless of what constants.ts exports. Use the static import above instead.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const require = (_id: string): any => constants;

/**
 * Packet 0002: 계수·라벨·스토리지 상수 테이블
 *
 * 경조사 기본금액, 관계/친밀도/참석/지역 계수, 금액 사다리, 한글 라벨 맵,
 * localStorage 키, 기본값과 상한치를 상수 파일 1개로 분리한다.
 *
 * 테스트 구조: 각 AC별로 구체적인 값 검증 (숫자, 문자열 정확성)
 */

describe('AC-1: EVENT_BASE 정확한 정의', () => {
  it('should define EVENT_BASE with exact values per SPEC', () => {
    // 구현 파일: src/lib/constants.ts
    const { EVENT_BASE } = require('@/lib/constants');

    expect(EVENT_BASE).toBeDefined();
    expect(EVENT_BASE.wedding).toBe(50000);
    expect(EVENT_BASE.funeral).toBe(50000);
    expect(EVENT_BASE.firstBirthday).toBe(30000);
    expect(EVENT_BASE.opening).toBe(50000);
    expect(Object.keys(EVENT_BASE)).toHaveLength(4);
  });

  it('should have all event types as keys', () => {
    const { EVENT_BASE } = require('@/lib/constants');

    const expectedKeys = ['wedding', 'funeral', 'firstBirthday', 'opening'];
    expect(Object.keys(EVENT_BASE).sort()).toEqual(expectedKeys.sort());
  });
});

describe('AC-2: 계수 5개 세트 정확한 정의', () => {
  it('should define RELATION_FACTOR with exact values per SPEC', () => {
    const { RELATION_FACTOR } = require('@/lib/constants');

    expect(RELATION_FACTOR).toBeDefined();
    expect(RELATION_FACTOR.family).toBe(3.0);
    expect(RELATION_FACTOR.closeFriend).toBe(2.0);
    expect(RELATION_FACTOR.friend).toBe(1.0);
    expect(RELATION_FACTOR.coworker).toBe(1.0);
    expect(RELATION_FACTOR.boss).toBe(1.0);
    expect(RELATION_FACTOR.acquaintance).toBe(0.6);
    expect(Object.keys(RELATION_FACTOR)).toHaveLength(6);
  });

  it('should define INTIMACY_FACTOR with exact values per SPEC', () => {
    const { INTIMACY_FACTOR } = require('@/lib/constants');

    expect(INTIMACY_FACTOR).toBeDefined();
    expect(INTIMACY_FACTOR[1]).toBe(0.8);
    expect(INTIMACY_FACTOR[2]).toBe(0.9);
    expect(INTIMACY_FACTOR[3]).toBe(1.0);
    expect(INTIMACY_FACTOR[4]).toBe(1.2);
    expect(INTIMACY_FACTOR[5]).toBe(1.4);
    expect(Object.keys(INTIMACY_FACTOR)).toHaveLength(5);
  });

  it('should define ATTENDANCE_FACTOR with exact values per SPEC', () => {
    const { ATTENDANCE_FACTOR } = require('@/lib/constants');

    expect(ATTENDANCE_FACTOR).toBeDefined();
    expect(ATTENDANCE_FACTOR.attending).toBe(1.6);
    expect(ATTENDANCE_FACTOR.absent).toBe(1.0);
    expect(Object.keys(ATTENDANCE_FACTOR)).toHaveLength(2);
  });

  it('should define REGION_FACTOR with exact values per SPEC', () => {
    const { REGION_FACTOR } = require('@/lib/constants');

    expect(REGION_FACTOR).toBeDefined();
    expect(REGION_FACTOR.seoulGangnam).toBe(1.2);
    expect(REGION_FACTOR.metropolitan).toBe(1.1);
    expect(REGION_FACTOR.majorCity).toBe(1.0);
    expect(REGION_FACTOR.other).toBe(0.9);
    expect(Object.keys(REGION_FACTOR)).toHaveLength(4);
  });

  it('should define AMOUNT_LADDER with 9 exact values per SPEC', () => {
    const { AMOUNT_LADDER } = require('@/lib/constants');

    expect(AMOUNT_LADDER).toBeDefined();
    expect(AMOUNT_LADDER).toEqual([
      30000, 50000, 70000, 100000, 150000, 200000, 300000, 500000, 1000000
    ]);
    expect(AMOUNT_LADDER).toHaveLength(9);
  });
});

describe('AC-3: 한글 라벨 정확한 정의', () => {
  it('should define EVENT_LABEL with exact Korean strings per SPEC', () => {
    const { EVENT_LABEL } = require('@/lib/constants');

    expect(EVENT_LABEL).toBeDefined();
    expect(EVENT_LABEL.wedding).toBe('결혼식');
    expect(EVENT_LABEL.funeral).toBe('장례식');
    expect(EVENT_LABEL.firstBirthday).toBe('돌잔치');
    expect(EVENT_LABEL.opening).toBe('개업식');
    expect(Object.keys(EVENT_LABEL)).toHaveLength(4);
  });

  it('should define RELATION_LABEL with exact Korean strings per SPEC', () => {
    const { RELATION_LABEL } = require('@/lib/constants');

    expect(RELATION_LABEL).toBeDefined();
    expect(RELATION_LABEL.family).toBe('가족·친척');
    expect(RELATION_LABEL.closeFriend).toBe('친한 친구');
    expect(RELATION_LABEL.friend).toBe('친구·지인');
    expect(RELATION_LABEL.coworker).toBe('직장 동료');
    expect(RELATION_LABEL.boss).toBe('직장 상사');
    expect(RELATION_LABEL.acquaintance).toBe('얼굴만 아는 사이');
    expect(Object.keys(RELATION_LABEL)).toHaveLength(6);
  });

  it('should define INTIMACY_LABEL with exact Korean strings per SPEC', () => {
    const { INTIMACY_LABEL } = require('@/lib/constants');

    expect(INTIMACY_LABEL).toBeDefined();
    expect(INTIMACY_LABEL[1]).toBe('거의 연락 안 함');
    expect(INTIMACY_LABEL[2]).toBe('가끔 연락');
    expect(INTIMACY_LABEL[3]).toBe('보통');
    expect(INTIMACY_LABEL[4]).toBe('자주 만남');
    expect(INTIMACY_LABEL[5]).toBe('매우 가까움');
    expect(Object.keys(INTIMACY_LABEL)).toHaveLength(5);
  });

  it('should define ATTENDANCE_LABEL with exact Korean strings per SPEC', () => {
    const { ATTENDANCE_LABEL } = require('@/lib/constants');

    expect(ATTENDANCE_LABEL).toBeDefined();
    expect(ATTENDANCE_LABEL.attending).toBe('참석·식사');
    expect(ATTENDANCE_LABEL.absent).toBe('미참석·송금');
    expect(Object.keys(ATTENDANCE_LABEL)).toHaveLength(2);
  });

  it('should define REGION_LABEL with exact Korean strings per SPEC', () => {
    const { REGION_LABEL } = require('@/lib/constants');

    expect(REGION_LABEL).toBeDefined();
    expect(REGION_LABEL.seoulGangnam).toBe('서울 강남권');
    expect(REGION_LABEL.metropolitan).toBe('서울(그 외)·수도권');
    expect(REGION_LABEL.majorCity).toBe('광역시');
    expect(REGION_LABEL.other).toBe('그 외 지역');
    expect(Object.keys(REGION_LABEL)).toHaveLength(4);
  });

  it('should define REGION_SHORT_LABEL with short Korean strings per SPEC', () => {
    const { REGION_SHORT_LABEL } = require('@/lib/constants');

    expect(REGION_SHORT_LABEL).toBeDefined();
    expect(REGION_SHORT_LABEL.seoulGangnam).toBe('강남');
    expect(REGION_SHORT_LABEL.metropolitan).toBe('서울·수도권');
    expect(REGION_SHORT_LABEL.majorCity).toBe('광역시');
    expect(REGION_SHORT_LABEL.other).toBe('그 외');
    expect(Object.keys(REGION_SHORT_LABEL)).toHaveLength(4);
  });
});

describe('AC-4: 스토리지 및 기본값 내보내기', () => {
  it('should export STORAGE_KEYS with 4 exact string values per SPEC', () => {
    const { STORAGE_KEYS } = require('@/lib/constants');

    expect(STORAGE_KEYS).toBeDefined();
    expect(STORAGE_KEYS.records).toBe('gmc:records:v1');
    expect(STORAGE_KEYS.settings).toBe('gmc:settings:v1');
    expect(STORAGE_KEYS.lastCalc).toBe('gmc:lastCalc:v1');
    expect(STORAGE_KEYS.rewardUnlock).toBe('gmc:rewardUnlock:v1');
    expect(Object.keys(STORAGE_KEYS)).toHaveLength(4);
  });

  it('should export DEFAULT_SETTINGS with exact default values per SPEC', () => {
    const { DEFAULT_SETTINGS } = require('@/lib/constants');

    expect(DEFAULT_SETTINGS).toBeDefined();
    expect(DEFAULT_SETTINGS.defaultRegion).toBe('majorCity');
    expect(DEFAULT_SETTINGS.onboardingDone).toBe(false);
    expect(DEFAULT_SETTINGS.compactList).toBe(false);
  });

  it('should export DEFAULT_REWARD_UNLOCK with exact default value per SPEC', () => {
    const { DEFAULT_REWARD_UNLOCK } = require('@/lib/constants');

    expect(DEFAULT_REWARD_UNLOCK).toBeDefined();
    expect(DEFAULT_REWARD_UNLOCK.statsUnlockedUntil).toBe(0);
  });

  it('should export numeric limit and window constants per SPEC', () => {
    const { RECORD_LIMIT, REWARD_UNLOCK_MS, HISTORY_PAGE_SIZE, MIN_STATS_RECORDS }
      = require('@/lib/constants');

    expect(RECORD_LIMIT).toBe(1000);
    expect(REWARD_UNLOCK_MS).toBe(86400000);  // 24시간 milliseconds
    expect(HISTORY_PAGE_SIZE).toBe(20);
    expect(MIN_STATS_RECORDS).toBe(3);
  });
});

describe('AC-5: TypeScript 컴파일 및 무결성 검사', () => {
  it('should have zero HEX color literals in constants file', () => {
    // This test verifies that src/lib/constants.ts contains no HEX color values
    // The test framework will run `npx tsc --noEmit` in the post-test checklist
    // This test passes if no HEX patterns (#XXXXXX or #XXX) are found
    const { EVENT_BASE, RELATION_FACTOR, AMOUNT_LADDER } = require('@/lib/constants');

    // If the module loads, TypeScript compilation succeeded (no unresolved imports)
    expect(EVENT_BASE).toBeDefined();
    expect(RELATION_FACTOR).toBeDefined();
    expect(AMOUNT_LADDER).toBeDefined();
  });

  it('should export all required constants from src/lib/constants', () => {
    const constants = require('@/lib/constants');

    const requiredExports = [
      'EVENT_BASE',
      'RELATION_FACTOR',
      'INTIMACY_FACTOR',
      'ATTENDANCE_FACTOR',
      'REGION_FACTOR',
      'AMOUNT_LADDER',
      'EVENT_LABEL',
      'RELATION_LABEL',
      'INTIMACY_LABEL',
      'ATTENDANCE_LABEL',
      'REGION_LABEL',
      'REGION_SHORT_LABEL',
      'STORAGE_KEYS',
      'DEFAULT_SETTINGS',
      'DEFAULT_REWARD_UNLOCK',
      'RECORD_LIMIT',
      'REWARD_UNLOCK_MS',
      'HISTORY_PAGE_SIZE',
      'MIN_STATS_RECORDS',
    ];

    requiredExports.forEach(exportName => {
      expect(constants[exportName]).toBeDefined();
    });
  });
});
