import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockRouter } from "@/__tests__/__helpers__/mocks";
import { STORAGE_KEYS } from "@/storage/keys";

// ── Contract (for the Coder implementing src/components/OnboardingDialog.tsx & AppErrorBoundary.tsx) ──
//
// - OnboardingDialog: 온보딩 여부는 `isOnboarded()`(from "@/storage/prefs")로 판단. 미노출
//   상태면 마운트 시 TDS AlertDialog를 open=true로 렌더. 왼쪽/확인 버튼(AlertDialog.AlertButton,
//   라벨 "닫기")을 누르면 `setOnboarded()`(from "@/storage/prefs")를 호출해 플래그를 저장하고
//   다이얼로그를 닫는다. isOnboarded/setOnboarded는 내부적으로 이미 try/catch를 갖고 있으므로
//   컴포넌트는 이 함수들을 통해서만 localStorage에 접근해야 한다(직접 접근 금지) — 이렇게 하면
//   localStorage.getItem이 throw하는 환경에서도 컴포넌트가 예외 없이 렌더된다.
// - 설명 문구(description)는 해요체이며 "국내 통념 기준의 참고용 금액이에요" 문구를 포함해야 한다.
// - AppErrorBoundary: 클래스형 컴포넌트. 하위 트리 렌더 예외를 componentDidCatch/
//   getDerivedStateFromError로 잡아 "화면을 불러오지 못했어요" 문구 + TDS Button("다시 시도")을
//   보여준다. 버튼 탭 시 내부 에러 상태를 초기화(reset)해 children을 다시 렌더 시도한다.
// - 두 컴포넌트 모두 App.tsx 배선은 이 패킷 범위 밖(다음 통합 패킷)이다 — 여기서는 단위 렌더만 검증.

mockTds();
mockRouter();

import { OnboardingDialog } from "@/components/OnboardingDialog";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

function renderOnboarding() {
  return render(React.createElement(MemoryRouter, null, React.createElement(OnboardingDialog)));
}

describe("온보딩 다이얼로그 + 에러 바운더리 컴포넌트", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-1[P0]: 온보딩 플래그가 없으면 다이얼로그가 노출된다", async () => {
    renderOnboarding();

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.onboard)).not.toBe("1");
  });

  it("AC-1[P0]: 확인 버튼 클릭 시 플래그가 저장되고, 재마운트 시 다시 노출되지 않는다", async () => {
    const first = renderOnboarding();
    await screen.findByRole("alertdialog");

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEYS.onboard)).toBe("1");
    });

    first.unmount();

    renderOnboarding();
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("AC-2: 다이얼로그 문구가 참고용 금액 안내를 포함하고, 왼쪽 버튼 라벨은 '닫기'다(취소 금지)", async () => {
    renderOnboarding();

    await screen.findByRole("alertdialog");
    expect(screen.getByText(/국내 통념 기준의 참고용 금액이에요/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "취소" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();
  });

  it("AC-4: localStorage 접근이 실패해도 예외를 던지지 않고 렌더된다", async () => {
    const getItemSpy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("storage blocked");
      });

    expect(() => renderOnboarding()).not.toThrow();
    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    getItemSpy.mockRestore();
  });

  it("AC-3[P0]: 하위 렌더 예외를 잡아 '화면을 불러오지 못했어요'와 '다시 시도' 버튼을 보여준다", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let shouldThrow = true;
    function ProblemChild() {
      if (shouldThrow) throw new Error("boom");
      return React.createElement("div", null, "정상 콘텐츠");
    }

    render(
      React.createElement(AppErrorBoundary, null, React.createElement(ProblemChild)),
    );

    expect(screen.getByText("화면을 불러오지 못했어요")).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: "다시 시도" });
    expect(retryButton).toBeInTheDocument();
    expect(screen.queryByText("정상 콘텐츠")).not.toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(retryButton);

    expect(screen.getByText("정상 콘텐츠")).toBeInTheDocument();
    expect(screen.queryByText("화면을 불러오지 못했어요")).not.toBeInTheDocument();

    errorSpy.mockRestore();
  });

  it("AC-3: 정상 렌더 시에는 children을 그대로 보여주고 에러 UI를 노출하지 않는다", () => {
    render(
      React.createElement(
        AppErrorBoundary,
        null,
        React.createElement("div", null, "정상 화면"),
      ),
    );

    expect(screen.getByText("정상 화면")).toBeInTheDocument();
    expect(screen.queryByText("화면을 불러오지 못했어요")).not.toBeInTheDocument();
  });
});
