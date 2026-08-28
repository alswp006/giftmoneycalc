import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { calculate } from "@/lib/calc";
import { EVENT_TYPE_LABEL, RELATIONSHIP_LABEL } from "@/lib/rules";
import { formatNumber } from "@/lib/utils";
import type { CalcInput, RouteState } from "@/lib/types";

mockAll();

import Share from "@/pages/Share";

const INPUT: CalcInput = {
  eventType: "wedding",
  relationship: "friends",
  region: "seoul",
  attend: true,
  inflationAdjust: false,
};
const RESULT = calculate(INPUT);
const SHARE_STATE: RouteState["/share"] = { input: INPUT, result: RESULT };

function renderShare(state: RouteState["/share"] | undefined = SHARE_STATE) {
  return renderWithRouter(React.createElement(Share), {
    initialEntries: [{ pathname: "/share", state: state ?? null }],
  });
}

beforeEach(() => {
  mockNavigate.mockClear();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
    writable: true,
  });
});

describe("공유 카드 `/share`", () => {
  it("AC-1[P0]: share-card는 3:4 비율이며 배지 → 권장 금액(t1/t2) → 권장 범위 → 캡션 순서로 렌더된다", () => {
    renderShare();

    const card = screen.getByTestId("share-card");
    expect(card.style.aspectRatio.replace(/\s/g, "")).toBe("3/4");

    const html = card.textContent ?? "";
    const badgeIdx = html.indexOf(EVENT_TYPE_LABEL[INPUT.eventType]);
    const relationshipIdx = html.indexOf(RELATIONSHIP_LABEL[INPUT.relationship]);
    const amountIdx = html.indexOf(formatNumber(RESULT.recommendedAmount));
    const rangeIdx = html.indexOf(formatNumber(RESULT.rangeMax));
    const captionIdx = html.indexOf("참고용 권장 금액이에요");

    expect(badgeIdx).toBeGreaterThanOrEqual(0);
    expect(relationshipIdx).toBeGreaterThan(badgeIdx);
    expect(amountIdx).toBeGreaterThan(relationshipIdx);
    expect(rangeIdx).toBeGreaterThan(amountIdx);
    expect(captionIdx).toBeGreaterThan(rangeIdx);

    const amountNode = Array.from(card.querySelectorAll("[data-typography]")).find((el) =>
      (el.textContent ?? "").includes(formatNumber(RESULT.recommendedAmount)),
    );
    expect(amountNode).toBeTruthy();
    expect(["t1", "t2"]).toContain(amountNode?.getAttribute("data-typography"));
  });

  it("AC-2[P0]: location.state가 없으면 카드를 렌더하지 않고 '/'로 replace 리다이렉트한다", () => {
    renderShare(undefined);

    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    expect(screen.queryByTestId("share-card")).not.toBeInTheDocument();
  });

  it("AC-3[P0]: '결과 복사하기' 탭 시 클립보드에 복사되고 완료 Toast가 뜬다", async () => {
    renderShare();

    const copyButton = screen.getByRole("button", { name: /결과 복사하기/ });
    copyButton.click();

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    });
    const copiedText = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(copiedText).toContain(formatNumber(RESULT.recommendedAmount));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/복사했어요|복사됐어요/);
    });
  });

  it("AC-4[P0]: 복사 실패 시 '복사에 실패했어요. 화면을 캡처해 공유해주세요' Toast가 뜬다", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
      writable: true,
    });
    renderShare();

    screen.getByRole("button", { name: /결과 복사하기/ }).click();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "복사에 실패했어요. 화면을 캡처해 공유해주세요",
      );
    });
  });

  it("AC-5[P1]: 복사 버튼은 52px 이상, 뒤로가기 버튼은 44px 이상의 터치 영역을 갖고 AdSlot이 없다", () => {
    const { container } = renderShare();

    const copyButton = screen.getByRole("button", { name: /결과 복사하기/ });
    const copyMinHeight = parseInt(copyButton.style.minHeight || "0", 10);
    expect(copyButton.style.minHeight.endsWith("px")).toBe(true);
    expect(copyMinHeight).toBeGreaterThanOrEqual(52);

    const backButton = screen.getByRole("button", { name: /뒤로/ });
    const backMinWidth = parseInt(backButton.style.minWidth || "0", 10);
    const backMinHeight = parseInt(backButton.style.minHeight || "0", 10);
    expect(backMinWidth).toBeGreaterThanOrEqual(44);
    expect(backMinHeight).toBeGreaterThanOrEqual(44);

    expect(container.querySelector("[data-ad-group-id]")).not.toBeInTheDocument();
  });
});
