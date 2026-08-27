import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button, Paragraph, Spacing } from "@toss/tds-mobile";

type AppErrorBoundaryProps = { children: ReactNode };
type AppErrorBoundaryState = { hasError: boolean };

/**
 * 렌더 예외를 잡아 복구 UI를 보여주는 클래스형 에러 바운더리.
 * 훅으로는 만들 수 없다(React가 getDerivedStateFromError/componentDidCatch를 클래스에서만 지원).
 *
 * @AI:NOTE '다시 시도'는 에러 상태만 초기화한다 — children이 새로 마운트되며 다시 렌더를 시도하므로
 *   일시적 실패(느린 스토리지·순간적 데이터 깨짐)는 화면 이동 없이 복구된다.
 *   흰 화면 대신 항상 빠져나갈 경로를 남기는 것이 목적이다.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 검수 기준상 console.error는 0개여야 하므로 warn으로 남긴다(디버깅 실마리는 유지).
    console.warn("[AppErrorBoundary]", error.message, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          padding: "0 24px",
          backgroundColor: "var(--adaptiveBackground)",
        }}
      >
        <Paragraph.Text typography="t4">화면을 불러오지 못했어요</Paragraph.Text>
        <Paragraph.Text typography="st13" color="var(--adaptiveGrey600)">
          잠시 후 다시 시도해 주세요
        </Paragraph.Text>
        <Spacing size={16} />
        <div style={{ width: "100%", maxWidth: 320 }}>
          <Button variant="fill" size="large" display="block" onClick={this.handleRetry}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
