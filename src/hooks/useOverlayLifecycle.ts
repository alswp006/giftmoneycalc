import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * 오버레이(BottomSheet/AlertDialog) 수명주기 — 라우트가 바뀌면 전부 닫고 body 스크롤 잠금을 푼다.
 *
 * @AI:NOTE 열린 오버레이를 모듈 전역에 모아두는 이유: 라우트 이동은 오버레이를 연 컴포넌트가
 * 아니라 어디서든 일어난다(하드웨어 뒤로가기 포함). 인스턴스별 state만으로는 "다른 화면에서
 * 열어둔 시트"를 닫을 수 없어, 이동 후에도 body가 overflow:hidden으로 남아 스크롤이 죽는다.
 */
type Closer = () => void;

const openOverlays = new Map<string, Closer>();

/** 잠금 직전의 body overflow 값. null이면 이 모듈이 건 잠금이 없다는 뜻. */
let lockedOverflow: string | null = null;

function lockBodyScroll() {
  if (lockedOverflow !== null) return;
  lockedOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
}

function releaseBodyScroll() {
  if (lockedOverflow !== null) {
    document.body.style.overflow = lockedOverflow;
    lockedOverflow = null;
    return;
  }
  // TDS BottomSheet 등 이 훅 밖에서 걸린 잠금도 라우트 이동 시엔 반드시 푼다 —
  // 남아 있으면 다음 화면이 스크롤되지 않는 채로 굳는다.
  if (document.body.style.overflow === 'hidden') {
    document.body.style.overflow = '';
  }
}

/** 열려 있는 모든 오버레이를 닫고 스크롤 잠금을 해제한다. */
export function closeAllOverlays() {
  const closers = Array.from(openOverlays.values());
  openOverlays.clear();
  releaseBodyScroll();
  closers.forEach((close) => close());
}

function routeSignature(location: ReturnType<typeof useLocation>) {
  return `${location.key}|${location.pathname}${location.search}`;
}

/**
 * 라우트 변경·하드웨어 뒤로가기(popstate)를 감시해 열린 오버레이를 모두 닫는다.
 * App.tsx가 한 번 호출해 전역 안전망 역할을 하고, useOverlayLifecycle도 내부에서 쓴다.
 */
export function useCloseOverlaysOnRouteChange() {
  const location = useLocation();
  const signature = routeSignature(location);
  const lastSignature = useRef(signature);

  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    closeAllOverlays();
  }, [signature]);

  useEffect(() => {
    // MemoryRouter/일부 WebView는 popstate로 location이 갱신되지 않는 경우가 있어
    // 라우트 시그니처 감시와 별개로 직접 듣는다.
    const onPopState = () => closeAllOverlays();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
}

/**
 * 오버레이 하나의 열림 상태 + 라우트 수명주기 연동.
 *
 * const { isOpen, open, close } = useOverlayLifecycle('record-sheet');
 *
 * close()는 열려 있던 입력값을 버리는 신호이기도 하다 — 소비자는 close 시 초안 state를
 * 초기화하라(라우트가 바뀌면 자동으로 close된다).
 */
export function useOverlayLifecycle(key: string) {
  const [isOpen, setIsOpen] = useState(false);
  const openedRef = useRef(false);

  useCloseOverlaysOnRouteChange();

  const close = useCallback(() => {
    openedRef.current = false;
    if (openOverlays.delete(key) && openOverlays.size === 0) {
      releaseBodyScroll();
    }
    setIsOpen(false);
  }, [key]);

  const open = useCallback(() => {
    openedRef.current = true;
    openOverlays.set(key, () => setIsOpen(false));
    lockBodyScroll();
    setIsOpen(true);
  }, [key]);

  useEffect(
    () => () => {
      if (!openedRef.current) return;
      openedRef.current = false;
      openOverlays.delete(key);
      if (openOverlays.size === 0) releaseBodyScroll();
    },
    [key],
  );

  return { isOpen, open, close };
}
