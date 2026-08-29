import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Paragraph, Spacing, Top } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import ScreenScaffold from "../components/ScreenScaffold";
import Card from "../components/Card";
import { SubmitFooter } from "../components/BottomCTA";
import { safeCalculate } from "../lib/calc";
import { addHistoryItem } from "../lib/storage";
import { ATTENDANCE_OPTIONS, eventLabel, formatWon, relationLabel } from "../lib/labels";
import type { CalcInput } from "../types/calc";

function attendanceLabel(value?: string): string {
  return ATTENDANCE_OPTIONS.find((option) => option.value === value)?.label ?? "참석";
}

export default function ResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [saved, setSaved] = useState(false);

  const input = (location.state ?? null) as Partial<CalcInput> | null;
  const result = useMemo(() => (input == null ? null : safeCalculate(input)), [input]);

  // @AI:NOTE 결과 화면 직접 진입(state 없음)·미지의 입력 조합에서도 흰 화면 대신 안내를 보여준다.
  if (result == null) {
    return (
      <ScreenScaffold
        top={<Top title={<Top.TitleParagraph>계산 결과</Top.TitleParagraph>} />}
        bottom={<SubmitFooter label="다시 계산하기" onClick={() => navigate("/")} />}
      >
        <Spacing size={8} />
        <Paragraph.Text typography="t4" fontWeight="bold">
          계산 결과를 찾을 수 없어요
        </Paragraph.Text>
        <Spacing size={8} />
        <Paragraph.Text typography="t6" color={adaptive.grey700}>
          자리와 관계를 다시 고르면 바로 금액을 알려드려요.
        </Paragraph.Text>
      </ScreenScaffold>
    );
  }

  const handleSave = () => {
    addHistoryItem({
      recommended: result.recommended,
      rangeMin: result.rangeMin,
      rangeMax: result.rangeMax,
      createdAt: Date.now(),
      eventType: input?.eventType,
      relation: input?.relation,
    });
    setSaved(true);
    navigate("/history");
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>이만큼이 무난해요</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="이 금액으로 기록 저장" onClick={handleSave} disabled={saved} />}
    >
      <Spacing size={8} />
      <Card testId="result-card">
        <Paragraph.Text typography="st10" color={adaptive.grey600}>
          {`${eventLabel(input?.eventType)} · ${relationLabel(input?.relation)} · ${attendanceLabel(
            input?.attendance
          )}`}
        </Paragraph.Text>
        <Spacing size={8} />
        <Paragraph.Text
          typography="t1"
          fontWeight="bold"
          style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
        >
          {formatWon(result.recommended)}
        </Paragraph.Text>
        <Spacing size={8} />
        <Paragraph.Text typography="t6" color={adaptive.grey700}>
          {`보통 ${formatWon(result.rangeMin)}에서 ${formatWon(result.rangeMax)} 사이를 내요.`}
        </Paragraph.Text>
      </Card>
      <Spacing size={16} />
      <Card testId="result-guide-card">
        <Paragraph.Text typography="t6" color={adaptive.grey700}>
          홀수 단위로 맞추는 게 관례라 5만 원, 7만 원처럼 떨어지는 금액을 추천해요. 부부가 함께
          간다면 한 단계 위 금액이 무난해요.
        </Paragraph.Text>
      </Card>
      <Spacing size={16} />
      <Button display="block" variant="weak" onClick={() => navigate("/")}>
        조건 바꿔서 다시 계산
      </Button>
      <Spacing size={16} />
    </ScreenScaffold>
  );
}
