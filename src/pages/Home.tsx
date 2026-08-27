import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Top, Button, Spacing } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { CalculateForm } from '@/components/CalculateForm';
import { getSettings } from '@/storage/prefs';
import { RELATIONS } from '@/lib/types';
import type { CalculationInput, Relation, RouteState } from '@/lib/types';

/**
 * 홈(계산 입력) 화면 — CalculateForm(입력 필드)만 조립하고, 입력 상태(5종)와
 * 프리필·복원·제출 네비게이션은 이 화면이 소유한다. 계산 자체는 결과 화면 몫.
 */

const DRAFT_KEY = 'gyeongjo:draft:home-input';

const TAB_ITEMS = [
  { label: '홈', path: '/' },
  { label: '기록', path: '/history' },
  { label: '통계', path: '/stats' },
];

function readDraft(): Partial<CalculationInput> | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeDraft(input: Partial<CalculationInput>) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(input));
  } catch {
    // 저장 실패(사용 불가 환경) — 입력은 그대로 유지되므로 무시
  }
}

/** WebView 밖(브라우저·jsdom)에서는 SDK가 throw한다 — 흰 화면 방지로 삼킨다. */
function fireSuccessHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'success' })).catch(() => {});
  } catch {
    // 네이티브 브릿지 없음 — 무시
  }
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillFromRoute = (location.state as RouteState['/'])?.prefill;

  // 이번 마운트에서 직접 쓴 draft(초기 입력 반영분)와, 뒤로가기 복원으로 "이미 있던" draft를
  // 구분해야 한다 — writeDraft 이펙트가 마운트 직후 즉시 실행되므로 비동기 설정 로드가 끝난
  // 시점에 readDraft()를 다시 부르면 항상 truthy라 설정 기본값 적용 분기가 죽는다.
  const hadDraftAtMountRef = useRef<Partial<CalculationInput> | null>(null);

  const [input, setInput] = useState<Partial<CalculationInput>>(() => {
    const draft = readDraft();
    hadDraftAtMountRef.current = draft;
    if (draft) return draft;
    return { attended: true, ...prefillFromRoute };
  });

  useEffect(() => {
    let cancelled = false;
    getSettings().then((settings) => {
      if (cancelled) return;
      // 뒤로가기 복원(draft) 또는 이전 화면의 prefill이 있으면 설정 기본값으로 덮지 않는다.
      if (hadDraftAtMountRef.current || prefillFromRoute) return;

      const defaults: Partial<CalculationInput> = {};
      if (typeof settings.defaultRelation === 'string' && RELATIONS.includes(settings.defaultRelation as Relation)) {
        defaults.relation = settings.defaultRelation as Relation;
      }
      if (typeof settings.defaultAttended === 'boolean') {
        defaults.attended = settings.defaultAttended;
      }
      if (Object.keys(defaults).length > 0) {
        setInput((prev) => ({ ...prev, ...defaults }));
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 1회만
  }, []);

  useEffect(() => {
    writeDraft(input);
  }, [input]);

  const canSubmit = Boolean(input.eventType && input.relation);

  function onSubmit() {
    if (!canSubmit) return;
    fireSuccessHaptic();
    const finalInput: CalculationInput = {
      eventType: input.eventType!,
      relation: input.relation!,
      attended: input.attended === true,
      companions: input.companions ?? 0,
      eventDate: input.eventDate ?? '',
    };
    navigate('/result', { state: { input: finalInput } });
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>경조사비 계산</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TAB_ITEMS} />}
    >
      <Spacing size={16} />
      <CalculateForm value={input} onChange={setInput} />
      <Spacing size={96} />

      <div
        data-testid="home-bottom-cta"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 64, // FloatingTabBar 높이만큼 띄워 겹침 방지
          padding: '12px 16px',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
          backgroundColor: 'var(--adaptiveBackground)',
        }}
      >
        <Button
          data-testid="home-submit-cta"
          variant="fill"
          size="large"
          display="block"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          추천 금액 보기
        </Button>
      </div>
    </ScreenScaffold>
  );
}
