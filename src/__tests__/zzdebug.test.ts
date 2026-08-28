import { describe, it, expect, vi } from "vitest";
import React from "react";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { debugMockRouter } from "@/__tests__/__helpers__/__debugMocks";

mockTds();
mockAppsInToss();
mockTossRewardAd();
debugMockRouter();

vi.mock("@/lib/settings", () => ({
  getSettings: () => ({ defaultRegion: "seoul", inflationAdjustDefault: false, rewardUnlockedUntil: null }),
  saveSettings: vi.fn(),
}));

import ProbeTest from "../pages/__ProbeTest";
import ProbeSameDir from "./__ProbeSameDir";

describe("debug5", () => {
  it("z - same dir separate file", () => {
    renderWithRouter(React.createElement(ProbeSameDir), {
      initialEntries: [{ pathname: "/calc", state: { prefill: { eventType: "funeral" } } }],
    });
    console.log("DEBUG7", screen.getByTestId("state").textContent);
  });

  it("y - separate file import", () => {
    renderWithRouter(React.createElement(ProbeTest), {
      initialEntries: [{ pathname: "/calc", state: { prefill: { eventType: "funeral" } } }],
    });
    console.log("DEBUG6", screen.getByTestId("state").textContent);
  });
});
