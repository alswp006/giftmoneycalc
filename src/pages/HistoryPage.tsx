import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Paragraph, Spacing, Top } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import ScreenScaffold from "../components/ScreenScaffold";
import Card from "../components/Card";
import { SubmitFooter } from "../components/BottomCTA";
import { getHistoryList } from "../lib/storage";
import { eventLabel, formatWon, relationLabel } from "../lib/labels";

function formatDate(createdAt: number): string {
  if (!Number.isFinite(createdAt) || createdAt <= 0) return "날짜 미상";
  return new Date(createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function HistoryPage() {
  const navigate = useNavigate();
  // @AI:NOTE 손상된 저장값이어도 getHistoryList가 빈 배열을 주므로 목록은 항상 렌더된다.
  const items = useMemo(() => {
    return [...getHistoryList()].sort((a, b) => b.createdAt - a.createdAt);
  }, []);

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>지난 계산 기록</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="새로 계산하기" onClick={() => navigate("/")} />}
    >
      <Spacing size={8} />
      {items.length === 0 ? (
        <Card testId="history-empty">
          <Paragraph.Text typography="t4" fontWeight="bold">
            아직 계산한 기록이 없어요
          </Paragraph.Text>
          <Spacing size={8} />
          <Paragraph.Text typography="t6" color={adaptive.grey700}>
            결과 화면에서 기록을 저장하면 여기에 쌓여요.
          </Paragraph.Text>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item, index) => (
            <Card key={`${item.createdAt}-${index}`} testId="history-item">
              <Paragraph.Text typography="st10" color={adaptive.grey600}>
                {`${formatDate(item.createdAt)} · ${eventLabel(item.eventType)} · ${relationLabel(
                  item.relation
                )}`}
              </Paragraph.Text>
              <Spacing size={4} />
              <Paragraph.Text
                typography="t3"
                fontWeight="bold"
                style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
              >
                {formatWon(item.recommended)}
              </Paragraph.Text>
              <Spacing size={4} />
              <Paragraph.Text typography="t7" color={adaptive.grey600}>
                {`${formatWon(item.rangeMin)} ~ ${formatWon(item.rangeMax)}`}
              </Paragraph.Text>
            </Card>
          ))}
        </div>
      )}
      <Spacing size={16} />
    </ScreenScaffold>
  );
}
