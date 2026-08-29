import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Paragraph, Spacing, Top } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import ScreenScaffold from "./ScreenScaffold";
import { SubmitFooter } from "./BottomCTA";

interface FallbackProps {
  onReset: () => void;
}

/**
 * 복구 화면. 클래스 컴포넌트에서는 훅을 쓸 수 없어 함수 컴포넌트로 분리했다.
 */
function ErrorFallback({ onReset }: FallbackProps) {
  const navigate = useNavigate();

  const goHome = () => {
    onReset();
    navigate("/");
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>잠시 문제가 생겼어요</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="홈으로 가기" onClick={goHome} />}
    >
      <Spacing size={8} />
      <Paragraph.Text typography="t4" fontWeight="bold">
        화면을 여는 중 오류가 났어요
      </Paragraph.Text>
      <Spacing size={8} />
      <Paragraph.Text typography="t6" color={adaptive.grey700}>
        홈에서 다시 시작하면 계산을 이어갈 수 있어요.
      </Paragraph.Text>
    </ScreenScaffold>
  );
}

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

/**
 * 전역 에러 바운더리. 하위 렌더 예외를 잡아 복구 화면을 보여준다.
 * @AI:NOTE 예외가 WebView 전체를 화이트아웃시키지 않게 하는 마지막 방어선이다.
 * 토스 검수 기준상 console.error를 남기면 반려되므로 로깅 대신 상태로만 처리한다.
 */
export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // 콘솔 로깅 없이 복구 화면으로만 전환한다.
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}
