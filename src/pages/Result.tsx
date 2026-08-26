import { useEffect, useMemo } from "react";
import { Top } from "@toss/tds-mobile";
import { useLocation, useNavigate } from "react-router-dom";
import { ScreenScaffold } from "../components/ScreenScaffold";
import { ButtonStack } from "../components/BottomCTA";
import { ResultContent } from "../components/ResultContent";
import { LoadingState } from "../components/StateView";
import { useStorage } from "../store/StorageProvider";
import { calcGiftAmount } from "../lib/calc";
import type { CalcInput } from "../lib/types";

export default function Result() {
  const navigate = useNavigate();
  const location = useLocation();
  const { ready, lastCalc } = useStorage();

  const incoming = (location.state ?? null) as { input?: CalcInput } | null;
  const input = incoming?.input ?? lastCalc?.input ?? null;

  // 새로고침·딥링크로 들어와 조건이 없으면 계산 화면으로 되돌린다(막다른 길 방지).
  useEffect(() => {
    if (ready && input == null) navigate("/calc", { replace: true });
  }, [ready, input, navigate]);

  const result = useMemo(() => (input ? calcGiftAmount(input) : null), [input]);

  if (!input || !result) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>계산 결과</Top.TitleParagraph>} />}>
        <LoadingState rows={3} />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>계산 결과</Top.TitleParagraph>} />}
      bottom={
        <ButtonStack
          primary={{
            label: "이 금액으로 기록하기",
            onClick: () =>
              navigate("/record/new", {
                state: {
                  prefill: {
                    eventType: input.eventType,
                    relation: input.relation,
                    amount: result.recommended,
                  },
                },
              }),
          }}
          secondary={{
            label: "공유 카드 만들기",
            onClick: () => navigate("/share", { state: { result } }),
          }}
        />
      }
    >
      <ResultContent result={result} />
    </ScreenScaffold>
  );
}
