import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockRouter } from "@/__tests__/__helpers__/mocks";

// AdSection wraps the real AdSlot component. AdSlot itself imports
// @apps-in-toss/web-framework (TossAds) — stub it out so it renders a plain
// stand-in we can assert against without touching the real SDK.
mockTds();
mockRouter();

vi.mock("@/components/AdSlot", () => ({
  AdSlot: ({ adGroupId }: { adGroupId: string }) =>
    React.createElement("div", { "data-testid": "ad-slot-mock", "data-ad-group-id": adGroupId }),
}));

import { AdSection } from "@/components/AdSection";
import { RewardGate } from "@/components/RewardGate";

const ROOT = process.cwd();
const SCRIPT_PATH = path.resolve(ROOT, "scripts/check-compliance.mjs");

function runCompliance(targetDir?: string) {
  const args = [SCRIPT_PATH];
  if (targetDir) args.push(targetDir);
  return spawnSync(process.execPath, args, { encoding: "utf-8" });
}

function writeFixture(dir: string, name: string, content: string) {
  fs.writeFileSync(path.join(dir, name), content, "utf-8");
}

describe("광고 비침범 래퍼 + 리워드 게이트 컴포넌트 + 컴플라이언스 스캔", () => {
  describe("AC-1: AdSection — 비침범 배너 래퍼", () => {
    it("AC-1[P0]: renders AdSlot flanked by top/bottom Spacing, without position:fixed or z-index", () => {
      render(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(AdSection, { adGroupId: "reward-result-banner" }),
        ),
      );

      const adSlot = screen.getByTestId("ad-slot-mock");
      expect(adSlot.getAttribute("data-ad-group-id")).toBe("reward-result-banner");

      const wrapper = screen.getByTestId("ad-section");
      expect(wrapper.style.position).not.toBe("fixed");
      expect(wrapper.style.zIndex).toBe("");

      // Spacing (mocked as <div data-spacing>) must appear both before and after the slot
      const spacings = wrapper.querySelectorAll("[data-spacing]");
      expect(spacings.length).toBeGreaterThanOrEqual(2);
      expect(wrapper.contains(adSlot)).toBe(true);
    });

    it("AC-1[P0]: does not obscure a full-width primary CTA rendered after it in the flow", () => {
      render(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(
            "div",
            null,
            React.createElement(AdSection, { adGroupId: "reward-result-banner" }),
            React.createElement("button", { "data-slot": "fixed-bottom-cta" }, "계산하기"),
          ),
        ),
      );

      const wrapper = screen.getByTestId("ad-section");
      expect(wrapper.style.position).not.toBe("fixed");
      const cta = screen.getByRole("button", { name: "계산하기" });
      expect(cta).toBeInTheDocument();
      expect(cta.getAttribute("data-slot")).toBe("fixed-bottom-cta");
    });
  });

  describe("AC-2: RewardGate — 리워드 광고 게이트", () => {
    it("AC-2[P0]: unlocked=true renders children immediately without an ad gate", () => {
      const onUnlocked = vi.fn();
      render(
        React.createElement(
          RewardGate,
          { slotId: "result-unlock", unlocked: true, onUnlocked },
          React.createElement("p", null, "월 320만 원 저축 가능"),
        ),
      );

      expect(screen.getByText("월 320만 원 저축 가능")).toBeInTheDocument();
      expect(onUnlocked).not.toHaveBeenCalled();
    });

    it("AC-2[P0]: unlocked=false hides children until the reward ad reports completion, then calls onUnlocked exactly once", () => {
      let capturedOnRewarded: (() => void) | undefined;
      vi.doMock("@/components/TossRewardAd", () => ({
        TossRewardAd: ({ onRewarded }: { onRewarded?: () => void }) => {
          capturedOnRewarded = onRewarded;
          return React.createElement("button", { "aria-label": "광고 보고 확인하기" }, "광고 보고 확인하기");
        },
      }));

      const onUnlocked = vi.fn();
      render(
        React.createElement(
          RewardGate,
          { slotId: "result-unlock", unlocked: false, onUnlocked },
          React.createElement("p", null, "월 320만 원 저축 가능"),
        ),
      );

      expect(screen.queryByText("월 320만 원 저축 가능")).toBeNull();
      expect(screen.getByRole("button", { name: "광고 보고 확인하기" })).toBeInTheDocument();

      // Simulate the underlying ad SDK firing its completion event twice
      // (real SDKs can double-fire on event + timeout races) — onUnlocked
      // must still fire exactly once.
      capturedOnRewarded?.();
      capturedOnRewarded?.();

      expect(onUnlocked).toHaveBeenCalledTimes(1);
    });
  });

  describe("AC-3 & AC-5: check-compliance.mjs — 정적 위반 스캔", () => {
    let tmpDir: string;

    afterEach(() => {
      if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("AC-3[P0]: exits 0 with no violations reported on a clean fixture file", () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "compliance-clean-"));
      writeFixture(
        tmpDir,
        "Clean.tsx",
        `export function Clean() {\n  return <div style={{ color: "var(--tds-color-grey700)" }}>정상 화면</div>;\n}\n`,
      );

      const result = runCompliance(tmpDir);

      expect(result.status).toBe(0);
      expect(result.stdout + result.stderr).not.toMatch(/hex/i);
    });

    it("AC-3[P0]: detects hardcoded HEX color, external navigation, install-inducing copy, and forbidden compat APIs — exits non-zero", () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "compliance-violations-"));
      writeFixture(
        tmpDir,
        "Violations.tsx",
        [
          `export function Violations() {`,
          `  window.location.href = "https://example.com"; // gate-allow: intentional fixture for compliance scan test`,
          `  const arr = [1, 2, 3].findLast((n) => n > 1);`,
          `  const cloned = structuredClone({ a: 1 });`,
          `  return (`,
          `    <div style={{ color: "#3182F6" }}>`,
          `      앱을 설치하면 더 편해요`,
          `    </div>`,
          `  );`,
          `}`,
        ].join("\n"),
      );

      const result = runCompliance(tmpDir);
      const output = result.stdout + result.stderr;

      expect(result.status).not.toBe(0);
      expect(output).toMatch(/#3182F6/);
      expect(output).toMatch(/location\.href|window\.open/);
      expect(output).toMatch(/설치/);
      expect(output).toMatch(/findLast|structuredClone/);
    });

    it("AC-5[P0]: `npm run compliance` exists in package.json and passes with exit code 0 against the real src/", () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));
      expect(typeof pkg.scripts.compliance).toBe("string");
      expect(pkg.scripts.compliance).toContain("check-compliance.mjs");

      const result = spawnSync("npm", ["run", "compliance", "--silent"], {
        cwd: ROOT,
        encoding: "utf-8",
      });

      expect(result.status).toBe(0);
    });
  });

  describe("AC-4: 외부 라이브러리/SDK import 검출", () => {
    let tmpDir: string;

    afterEach(() => {
      if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("AC-4[P0]: detects imports from disallowed UI libraries (shadcn/ui, @mui, antd, @chakra-ui) — exits non-zero", () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "compliance-ui-libs-"));
      writeFixture(
        tmpDir,
        "BadUi.tsx",
        [
          `import { Button } from "@/components/ui/button";`,
          `import { TextField } from "@mui/material";`,
          `import { Button as AntButton } from "antd";`,
          `import { Box } from "@chakra-ui/react";`,
          `export function BadUi() { return null; }`,
        ].join("\n"),
      );

      const result = runCompliance(tmpDir);
      const output = result.stdout + result.stderr;

      expect(result.status).not.toBe(0);
      expect(output).toMatch(/@mui/);
      expect(output).toMatch(/antd/);
      expect(output).toMatch(/@chakra-ui/);
    });

    it("AC-4[P0]: detects imports of external login/payment/ad SDKs (e.g. firebase, stripe) — exits non-zero", () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "compliance-external-sdk-"));
      writeFixture(
        tmpDir,
        "BadSdk.ts",
        [
          `import { initializeApp } from "firebase/app";`,
          `import Stripe from "stripe";`,
          `export const noop = 1;`,
        ].join("\n"),
      );

      const result = runCompliance(tmpDir);
      const output = result.stdout + result.stderr;

      expect(result.status).not.toBe(0);
      expect(output).toMatch(/firebase/);
      expect(output).toMatch(/stripe/);
    });
  });
});
