import { useEffect, useState } from "react";
import { AlertDialog } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { isOnboarded, setOnboarded } from "@/storage/prefs";

const TITLE = "참고용 추천 금액이에요";
const DESCRIPTION =
  "국내 통념 기준의 참고용 금액이에요. 관계와 상황에 맞게 조절해도 좋아요.";

function fireConfirmHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "success" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

/**
 * 첫 실행 1회 온보딩 안내. 노출 여부는 'gyeongjo:v1:onboarded' 플래그로 판단한다.
 *
 * @AI:NOTE localStorage 접근은 반드시 storage/prefs의 isOnboarded/setOnboarded를 통해서만 한다 —
 *   두 함수가 이미 try/catch를 갖고 있어, 스토리지가 차단된 환경(사파리 프라이빗 등)에서도
 *   컴포넌트가 예외 없이 렌더된다. 직접 localStorage를 만지면 그 보호가 깨진다.
 *
 * 확인/닫힘 경로는 하나로 모은다(버튼·딤 클릭·뒤로가기 모두 handleConfirm) — 어떤 방식으로 닫아도
 * 플래그가 저장돼 두 번 뜨지 않는다.
 */
export function OnboardingDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void isOnboarded().then((done) => {
      if (!cancelled && !done) setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConfirm = () => {
    fireConfirmHaptic();
    setOpen(false);
    void setOnboarded();
  };

  if (!open) return null;

  return (
    <AlertDialog
      open={open}
      title={TITLE}
      description={DESCRIPTION}
      onClose={handleConfirm}
    />
  );
}

export default OnboardingDialog;
