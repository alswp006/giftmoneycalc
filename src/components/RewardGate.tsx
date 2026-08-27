import type { ReactNode } from "react";
import { TossRewardAd } from "@/components/TossRewardAd";

export function isRewardUnlocked(lastUnlockedAt: number | null, now: number): boolean {
  if (lastUnlockedAt === null || !Number.isFinite(lastUnlockedAt)) return false;
  return lastUnlockedAt <= now;
}

export function RewardGate({ slotId, children }: { slotId: string | null; children?: ReactNode }) {
  if (!slotId) return <>{children}</>;
  return <TossRewardAd slotId={slotId}>{children}</TossRewardAd>;
}
