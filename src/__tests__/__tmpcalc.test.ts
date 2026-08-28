import { describe, it, expect } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";

mockAll();

import Calc from "@/pages/Calc";

describe("tmp probe — helper-based router mock", () => {
  it("navigates via the helper mockNavigate", () => {
    renderWithRouter(React.createElement(Calc));
    fireEvent.click(screen.getByRole("button", { name: "결혼식" }));
    fireEvent.click(screen.getByRole("button", { name: "친구" }));
    fireEvent.click(screen.getByRole("button", { name: /계산하기|결과 보기/ }));
    console.log("HELPER NAVIGATE CALLS:", JSON.stringify(mockNavigate.mock.calls));
    expect(true).toBe(true);
  });
});
