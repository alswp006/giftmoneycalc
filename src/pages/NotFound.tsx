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
          /* @AI:NOTE 아이콘 이름은 CDN 파일명 그대로다. TDS는 'icn-'/'icon-'으로 시작하지 않는
             이름 앞에 'icn-'을 붙여 https://static.toss.im/icons/svg/<name>.svg 를 fetch하는데,
             없는 파일이면 403 → "Wrong URL" throw → 에러 바운더리(화면 통째로 폴백)까지 간다.
             그래서 'iconSearchRegular' 같은 카멜케이스 추측이 아니라 실제 200이 확인된
             'icon-search-mono'를 쓴다. 새 아이콘을 쓸 땐 URL부터 확인할 것. */
          <Asset.ContentIcon
            name="icon-search-mono"
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
