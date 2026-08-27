import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import fs from "fs";
import path from "path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Contract (for the Coder implementing the files below) ──
//
// src/lib/adConfig.ts
//   export function getAdGroupId(): string | null;
//     - reads import.meta.env.VITE_TOSS_AD_GROUP_ID AT CALL TIME (not module-load time,
//       so tests can vi.stubEnv per case and re-import fresh).
//     - undefined or "" -> null. Any other non-empty string -> returned as-is.
//   export function getRewardSlotId(): string | null;
//     - same contract, reads import.meta.env.VITE_TOSS_AD_SLOT_ID.
//   - NEVER hardcode a literal ad id / slot id string as a fallback value anywhere in this file.
//
// src/components/ResultBanner.tsx
//   - No props (or props: {} ) — reads getAdGroupId() itself internally.
//   - If getAdGroupId() is null -> renders null (no wrapping div, no spinner, no placeholder).
//   - If getAdGroupId() is a string -> renders exactly one <AdSlot adGroupId={value} /> (imported
//     from "@/components/AdSlot"). MUST NOT import or reference TossRewardAd, and MUST NOT pass a
//     `slotId` prop to AdSlot.
//
// src/components/RewardGate.tsx
//   export function isRewardUnlocked(lastUnlockedAt: number | null, now: number): boolean;
//     - Pure function. true only when lastUnlockedAt is a finite number AND lastUnlockedAt <= now.
//     - null, NaN, or lastUnlockedAt > now (future) -> false (locked).
//   export function RewardGate(props: { slotId: string | null; children: React.ReactNode }): JSX.Element;
//     - reads getRewardSlotId() is NOT this component's job — slotId is passed in as a prop by the
//       caller (so this component stays pure w.r.t. env access, matching ResultBanner's split).
//     - If slotId is null -> renders children directly, no gate, no <TossRewardAd> wrapper anywhere
//       in the render tree.
//     - If slotId is a string -> renders <TossRewardAd slotId={slotId}>{children}</TossRewardAd>
//       (imported from "@/components/TossRewardAd"). MUST NOT import or reference AdSlot, and MUST
//       NOT pass an `adGroupId` prop to TossRewardAd.

vi.mock("@/components/AdSlot", () => ({
  AdSlot: (props: { adGroupId?: string; slotId?: string }) =>
    React.createElement("div", {
      "data-testid": "ad-slot",
      "data-ad-group-id": props.adGroupId ?? "",
      "data-slot-id-leak": props.slotId ?? "",
    }),
}));

vi.mock("@/components/TossRewardAd", () => ({
  TossRewardAd: (props: { slotId?: string; adGroupId?: string; children?: React.ReactNode }) =>
    React.createElement(
      "div",
      {
        "data-testid": "toss-reward-ad",
        "data-slot-id": props.slotId ?? "",
        "data-ad-group-id-leak": props.adGroupId ?? "",
      },
      props.children,
    ),
}));

describe("광고 컴포넌트 — ResultBanner · RewardGate · 광고 식별자 접근자", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ── AC-1[P0]: adConfig.ts env accessors ──
  describe("AC-1[P0]: getAdGroupId / getRewardSlotId", () => {
    it("returns the env value when VITE_TOSS_AD_GROUP_ID / VITE_TOSS_AD_SLOT_ID are set", async () => {
      vi.stubEnv("VITE_TOSS_AD_GROUP_ID", "banner-group-123");
      vi.stubEnv("VITE_TOSS_AD_SLOT_ID", "reward-slot-456");
      const { getAdGroupId, getRewardSlotId } = await import("@/lib/adConfig");

      expect(getAdGroupId()).toBe("banner-group-123");
      expect(getRewardSlotId()).toBe("reward-slot-456");
    });

    it("returns null when env vars are undefined or empty string", async () => {
      vi.stubEnv("VITE_TOSS_AD_GROUP_ID", "");
      vi.stubEnv("VITE_TOSS_AD_SLOT_ID", undefined as unknown as string);
      const { getAdGroupId, getRewardSlotId } = await import("@/lib/adConfig");

      expect(getAdGroupId()).toBeNull();
      expect(getRewardSlotId()).toBeNull();
    });

    it("does not hardcode any ad id literal in adConfig.ts (import.meta.env only)", () => {
      const filePath = path.resolve(__dirname, "../lib/adConfig.ts");
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toMatch(/import\.meta\.env\.VITE_TOSS_AD_GROUP_ID/);
      expect(source).toMatch(/import\.meta\.env\.VITE_TOSS_AD_SLOT_ID/);
      // No quoted string that looks like a real console-issued ad/slot id literal.
      expect(source).not.toMatch(/["'](banner|reward|ad)[-_][a-z0-9]+["']/i);
    });
  });

  // ── AC-2[P0]: ResultBanner ──
  describe("AC-2[P0]: ResultBanner renders AdSlot only when adGroupId is present", () => {
    it("renders nothing when getAdGroupId() is null", async () => {
      vi.stubEnv("VITE_TOSS_AD_GROUP_ID", "");
      const { ResultBanner } = await import("@/components/ResultBanner");
      const { container } = render(
        React.createElement(MemoryRouter, null, React.createElement(ResultBanner)),
      );

      expect(container.firstChild).toBeNull();
      expect(screen.queryByTestId("ad-slot")).not.toBeInTheDocument();
    });

    it("renders exactly one AdSlot with the resolved adGroupId when present", async () => {
      vi.stubEnv("VITE_TOSS_AD_GROUP_ID", "banner-group-789");
      const { ResultBanner } = await import("@/components/ResultBanner");
      render(React.createElement(MemoryRouter, null, React.createElement(ResultBanner)));

      const slots = screen.getAllByTestId("ad-slot");
      expect(slots).toHaveLength(1);
      expect(slots[0]).toHaveAttribute("data-ad-group-id", "banner-group-789");
      expect(screen.queryByTestId("toss-reward-ad")).not.toBeInTheDocument();
    });
  });

  // ── AC-3[P0]: RewardGate ──
  describe("AC-3[P0]: RewardGate wraps children with TossRewardAd only when slotId is present", () => {
    it("renders children directly with no gate when slotId is null", async () => {
      const { RewardGate } = await import("@/components/RewardGate");
      render(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(RewardGate, { slotId: null }, React.createElement("p", null, "결과 3만 원")),
        ),
      );

      expect(screen.getByText("결과 3만 원")).toBeInTheDocument();
      expect(screen.queryByTestId("toss-reward-ad")).not.toBeInTheDocument();
    });

    it("wraps children in TossRewardAd with the given slotId when present", async () => {
      const { RewardGate } = await import("@/components/RewardGate");
      render(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(
            RewardGate,
            { slotId: "reward-slot-999" },
            React.createElement("p", null, "결과 3만 원"),
          ),
        ),
      );

      const gate = screen.getByTestId("toss-reward-ad");
      expect(gate).toHaveAttribute("data-slot-id", "reward-slot-999");
      expect(screen.getByText("결과 3만 원")).toBeInTheDocument();
    });
  });

  // ── AC-4[P0]: reward unlock timestamp comparison ──
  describe("AC-4[P0]: isRewardUnlocked compares lastUnlockedAt against now", () => {
    it("is locked (false) when lastUnlockedAt is null or NaN", async () => {
      const { isRewardUnlocked } = await import("@/components/RewardGate");
      const now = 1_700_000_000_000;

      expect(isRewardUnlocked(null, now)).toBe(false);
      expect(isRewardUnlocked(NaN, now)).toBe(false);
    });

    it("is locked (false) when lastUnlockedAt is in the future, unlocked (true) when in the past", async () => {
      const { isRewardUnlocked } = await import("@/components/RewardGate");
      const now = 1_700_000_000_000;

      expect(isRewardUnlocked(now + 1000, now)).toBe(false);
      expect(isRewardUnlocked(now - 1000, now)).toBe(true);
    });
  });

  // ── AC-5[P0]: identifiers never cross-wired ──
  describe("AC-5[P0]: adGroupId and slotId are never cross-passed between AdSlot and TossRewardAd", () => {
    it("ResultBanner.tsx source never passes slotId to AdSlot nor imports TossRewardAd", () => {
      const filePath = path.resolve(__dirname, "../components/ResultBanner.tsx");
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).not.toMatch(/TossRewardAd/);
      expect(source).not.toMatch(/slotId/);
    });

    it("RewardGate.tsx source never passes adGroupId to TossRewardAd nor imports AdSlot", () => {
      const filePath = path.resolve(__dirname, "../components/RewardGate.tsx");
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).not.toMatch(/from\s+["']@\/components\/AdSlot["']/);
      expect(source).not.toMatch(/adGroupId/);
    });
  });
});
