import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Paragraph, Spacing, Top } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import ScreenScaffold from "../components/ScreenScaffold";
import ChipGroup from "../components/ChipGroup";
import { SubmitFooter } from "../components/BottomCTA";
import { BASE_TABLE, DEFAULT_ATTENDANCE, DEFAULT_INTIMACY, DEFAULT_REGION } from "../lib/constants";
import {
  ATTENDANCE_OPTIONS,
  EVENT_LABELS,
  INTIMACY_LABELS,
  REGION_OPTIONS,
  RELATION_LABELS,
  VENUE_OPTIONS,
} from "../lib/labels";
import { getItem, setItem } from "../lib/storage";
import type { CalcInput } from "../types/calc";

const DRAFT_STORAGE_KEY = "giftmoney.draft";

// @AI:NOTE 라우트를 오가도 입력이 사라지지 않게 초안을 localStorage에 남긴다.
function readDraft(): Partial<CalcInput> {
  const raw = getItem(DRAFT_STORAGE_KEY);
  if (raw == null) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Partial<CalcInput>) : {};
  } catch {
    return {};
  }
}

const EVENT_OPTIONS = Object.keys(BASE_TABLE).map((value) => ({
  value,
  label: EVENT_LABELS[value] ?? value,
}));

const INTIMACY_OPTIONS = [1, 2, 3, 4, 5].map((level) => ({
  value: String(level),
  label: `${level} · ${INTIMACY_LABELS[level]}`,
}));

export default function Home() {
  const navigate = useNavigate();
  const draft = useMemo(readDraft, []);

  const [eventType, setEventType] = useState(draft.eventType ?? "");
  const [relation, setRelation] = useState(draft.relation ?? "");
  const [intimacy, setIntimacy] = useState(draft.intimacy ?? DEFAULT_INTIMACY);
  const [region, setRegion] = useState(draft.region ?? DEFAULT_REGION);
  const [attendance, setAttendance] = useState(draft.attendance ?? DEFAULT_ATTENDANCE);
  const [venue, setVenue] = useState(draft.venue ?? "");

  const relationOptions = useMemo(() => {
    const row = BASE_TABLE[eventType];
    if (!row) return [];
    return Object.keys(row).map((value) => ({ value, label: RELATION_LABELS[value] ?? value }));
  }, [eventType]);

  const showVenue = eventType === "wedding" && attendance === "attend";
  const canSubmit = eventType !== "" && relation !== "";

  const handleEventType = (value: string) => {
    setEventType(value);
    if (!BASE_TABLE[value]?.[relation]) {
      setRelation("");
    }
  };

  const handleSubmit = () => {
    const input: CalcInput = {
      eventType,
      relation,
      intimacy,
      region,
      attendance,
      venue: showVenue && venue !== "" ? venue : null,
    };
    setItem(DRAFT_STORAGE_KEY, JSON.stringify(input));
    navigate("/result", { state: input });
  };

  return (
    <ScreenScaffold
      top={
        <Top
          title={<Top.TitleParagraph>축의금, 얼마가 적당할까</Top.TitleParagraph>}
          subtitleBottom={
            <Paragraph.Text typography="t6" color={adaptive.grey600}>
              자리와 관계를 고르면 요즘 시세에 맞는 금액대를 알려드려요.
            </Paragraph.Text>
          }
        />
      }
      bottom={<SubmitFooter label="적정 금액 보기" onClick={handleSubmit} disabled={!canSubmit} />}
    >
      <ChipGroup
        title="어떤 자리인가요"
        options={EVENT_OPTIONS}
        selected={eventType}
        onSelect={handleEventType}
      />
      <Spacing size={24} />

      {relationOptions.length > 0 ? (
        <>
          <ChipGroup
            title="상대와의 관계"
            options={relationOptions}
            selected={relation}
            onSelect={setRelation}
          />
          <Spacing size={24} />
        </>
      ) : null}

      <ChipGroup
        title="얼마나 가까운 사이인가요"
        options={INTIMACY_OPTIONS}
        selected={String(intimacy)}
        onSelect={(value) => setIntimacy(Number(value))}
      />
      <Spacing size={24} />

      <ChipGroup
        title="예식 지역"
        options={REGION_OPTIONS}
        selected={region}
        onSelect={setRegion}
      />
      <Spacing size={24} />

      <ChipGroup
        title="참석 여부"
        options={ATTENDANCE_OPTIONS}
        selected={attendance}
        onSelect={setAttendance}
      />

      {showVenue ? (
        <>
          <Spacing size={24} />
          <ChipGroup
            title="예식장 종류"
            options={VENUE_OPTIONS}
            selected={venue ?? ""}
            onSelect={setVenue}
          />
        </>
      ) : null}

      <Spacing size={24} />
      <Button display="block" variant="weak" onClick={() => navigate("/history")}>
        지난 계산 기록 보기
      </Button>
      <Spacing size={16} />
    </ScreenScaffold>
  );
}
