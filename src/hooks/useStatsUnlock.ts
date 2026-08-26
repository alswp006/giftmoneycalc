import { useStorage, type StorageState } from "@/store/StorageProvider";

/**
 * 통계 상세 리포트의 리워드 해제 판정 — records.length와 무관하게
 * statsUnlockedUntil > Date.now() 단일 조건으로만 결정한다(건수 게이트는 호출부 책임).
 */
export function useStatsUnlock(): {
  unlocked: boolean;
  unlockStats: StorageState["unlockStats"];
} {
  const { rewardUnlock, unlockStats } = useStorage();
  const now = Date.now();
  const unlocked = rewardUnlock.statsUnlockedUntil > now;

  return { unlocked, unlockStats };
}
