// 계산 규칙 상수 — 함수 선언 금지 (packet 0006 AC-1). calc.ts에서만 이 값들을 사용해 계산한다.
import type { EventType, Relationship, Region } from "@/lib/types";

/** 10,000원 단위 반올림/절사 기준 */
export const ROUND_UNIT = 10000;

/** 행사유형 × 관계 기준 금액표 (원) */
export const BASE_AMOUNT_TABLE: Record<EventType, Record<Relationship, number>> = {
  wedding: {
    parents: 500000,
    siblings: 300000,
    spouse: 1000000,
    children: 500000,
    relatives: 100000,
    friends: 100000,
    colleagues: 50000,
    boss: 100000,
    acquaintance: 50000,
  },
  funeral: {
    parents: 500000,
    siblings: 300000,
    spouse: 1000000,
    children: 300000,
    relatives: 100000,
    friends: 100000,
    colleagues: 50000,
    boss: 100000,
    acquaintance: 30000,
  },
  firstBirthday: {
    parents: 300000,
    siblings: 200000,
    spouse: 300000,
    children: 200000,
    relatives: 100000,
    friends: 100000,
    colleagues: 50000,
    boss: 100000,
    acquaintance: 50000,
  },
  etc: {
    parents: 200000,
    siblings: 150000,
    spouse: 200000,
    children: 150000,
    relatives: 100000,
    friends: 50000,
    colleagues: 30000,
    boss: 50000,
    acquaintance: 30000,
  },
};

/** 참석 여부 배수 */
export const ATTEND_MULTIPLIER = 1.0;
export const ABSENT_MULTIPLIER = 0.8;

/** 지역 물가 보정 계수 — 수도권 > 광역시 > 그 외 */
export const REGION_MULTIPLIER: Record<Region, number> = {
  seoul: 1.1,
  gyeonggi: 1.1,
  incheon: 1.1,
  busan: 1.0,
  daegu: 1.0,
  daejeon: 1.0,
  gwangju: 1.0,
  ulsan: 1.0,
  sejong: 1.0,
  gangwon: 0.9,
  chungbuk: 0.9,
  chungnam: 0.9,
  jeonbuk: 0.9,
  jeonnam: 0.9,
  gyeongbuk: 0.9,
  gyeongnam: 0.9,
  jeju: 0.9,
};

/** 물가 상승분 반영 배수 */
export const INFLATION_MULTIPLIER = 1.05;
export const NO_INFLATION_MULTIPLIER = 1.0;

/** 추천 금액 대비 권장 범위 비율 */
export const RANGE_MIN_RATIO = 0.8;
export const RANGE_MAX_RATIO = 1.2;

/** reasons 문구용 라벨 */
export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  wedding: "결혼식",
  funeral: "장례식",
  firstBirthday: "돌잔치",
  etc: "기타 경조사",
};

export const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  parents: "부모님",
  siblings: "형제자매",
  spouse: "배우자",
  children: "자녀",
  relatives: "친척",
  friends: "친구",
  colleagues: "동료",
  boss: "상사",
  acquaintance: "지인",
};

export const REGION_LABEL: Record<Region, string> = {
  seoul: "서울",
  gyeonggi: "경기",
  incheon: "인천",
  busan: "부산",
  daegu: "대구",
  daejeon: "대전",
  gwangju: "광주",
  ulsan: "울산",
  sejong: "세종",
  gangwon: "강원",
  chungbuk: "충북",
  chungnam: "충남",
  jeonbuk: "전북",
  jeonnam: "전남",
  gyeongbuk: "경북",
  gyeongnam: "경남",
  jeju: "제주",
};
