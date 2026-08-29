// 이벤트/관계별 기본 축의금 금액(원). intimacy 3(기본)·metro·attend 기준 base 값.
export const BASE_TABLE: Record<string, Record<string, number>> = {
  wedding: {
    friend: 70000,
    family: 100000,
    relative: 100000,
    colleague: 50000,
    parent: 200000,
    acquaintance: 30000,
  },
  doljanchi: {
    relative: 50000,
    friend: 50000,
    family: 70000,
    colleague: 30000,
  },
  birthday: {
    colleague: 30000,
    friend: 30000,
    family: 50000,
    parent: 70000,
  },
  hwangap: {
    parent: 200000,
    relative: 150000,
    family: 200000,
  },
};

// 오름차순 정렬된 축의금 단위 사다리. recommended/range 계산이 이 배열의 인덱스에 의존한다.
export const LADDER: number[] = [
  10000, 20000, 30000, 40000, 50000, 70000, 80000, 100000, 120000, 150000,
  200000, 250000, 300000, 500000, 1000000,
];

export const HOTEL_VENUE_BONUS = 30000;

export const DEFAULT_INTIMACY = 3;
export const DEFAULT_REGION = "metro";
export const DEFAULT_ATTENDANCE = "attend";
export const MIN_INTIMACY = 1;
export const MAX_INTIMACY = 5;
