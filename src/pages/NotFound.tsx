import { useNavigate } from 'react-router-dom';
import { Top, Button, Asset } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { EmptyState } from '@/components/StateView';

/**
 * 알 수 없는 경로에서 보여주는 화면. 막다른 길이 되지 않도록 홈으로 돌아가는
 * 단일 경로를 1차 CTA로 둔다(다른 CTA 없음 → weak가 아니라 fill).
 */
export default function NotFound() {
  const navigate = useNavigate();

  function goHome() {
    // WebView 밖(브라우저·jsdom)에서는 SDK가 throw한다 — 흰 화면 방지로 삼킨다.
    try {
      Promise.resolve(generateHapticFeedback({ type: 'success' })).catch(() => {});
    } catch {
      // 네이티브 브릿지 없음 — 무시
    }
    navigate('/', { replace: true });
  }

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>찾을 수 없는 화면</Top.TitleParagraph>} />}>
      <EmptyState
        testId="notfound-empty"
        icon={
          <Asset.ContentIcon
            name="iconSearchRegular"
            alt="찾을 수 없음"
            style={{ width: '3rem', height: '3rem' }}
          />
        }
        title="찾을 수 없는 화면이에요"
        description="주소가 바뀌었거나 지워진 화면이에요"
        action={
          <Button variant="fill" size="large" display="block" onClick={goHome}>
            홈으로 가기
          </Button>
        }
      />
    </ScreenScaffold>
  );
}
