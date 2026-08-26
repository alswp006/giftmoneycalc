import { useState } from "react";
import { Top, Paragraph, Spacing, Button } from "@toss/tds-mobile";
import { Navigate } from "react-router-dom";
import { ScreenScaffold } from "../components/ScreenScaffold";
import { EmptyState } from "../components/StateView";

/**
 * 미정의 경로(*) 화면. 막다른 길을 만들지 않도록 홈으로 돌아가는 길을 항상 둔다.
 *
 * @AI:NOTE 이동은 useNavigate 대신 <Navigate>(선언형)로 한다 — 라우터가 렌더 트리에서
 * 직접 이동을 처리하므로 훅 주입 여부와 무관하게 동작이 같다.
 */
export default function NotFound() {
  const [goHome, setGoHome] = useState(false);

  if (goHome) return <Navigate to="/" replace />;

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>안내</Top.TitleParagraph>} />}>
      <Spacing size={40} />
      <EmptyState
        title="요청한 화면을 찾을 수 없어요"
        description="홈에서 다시 시작해보세요"
        testId="not-found"
      />
      <Spacing size={16} />
      <Button variant="fill" size="large" display="block" onClick={() => setGoHome(true)}>
        홈으로 가기
      </Button>
      <Spacing size={12} />
      <Paragraph.Text typography="st12">주소가 바뀌었거나 사라진 화면이에요</Paragraph.Text>
    </ScreenScaffold>
  );
}
