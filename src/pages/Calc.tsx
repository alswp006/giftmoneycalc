import { useEffect, useState } from "react";
import { Top, Paragraph, Spacing } from "@toss/tds-mobile";
import { useLocation, useNavigate } from "react-router-dom";
import { ScreenScaffold } from "../components/ScreenScaffold";
import { SubmitFooter } from "../components/BottomCTA";
import { ChipGroup } from "../components/ChipGroup";
import { useStorage } from "../store/StorageProvider";
import { calcGiftAmount } from "../lib/calc";
import {
  attendanceOptions,
  eventTypeOptions,
  intimacyOptions,
  regionOptions,
  relationOptions,
} from "../lib/options";
import type {
  Attendance,
  CalcInput,
  EventType,
  Intimacy,
  RegionType,
  RelationType,
} from "../lib/types";

const INTIMACY_CHIPS = intimacyOptions.map((option) => ({
  value: String(option.value),
  label: option.label,
}));

export default function Calc() {
  const navigate = useNavigate();
  const location = useLocation();
  const { ready, settings, setLastCalc } = useStorage();

  const incoming = (location.state ?? null) as { eventType?: EventType } | null;

  const [eventType, setEventType] = useState<string>(incoming?.eventType ?? "");
  const [relation, setRelation] = useState<string>("");
  const [intimacy, setIntimacy] = useState<string>("");
  const [attendance, setAttendance] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // 설정의 기본 지역은 저장소를 읽은 뒤에 도착한다 → 도착 시 한 번만 프리필한다.
  useEffect(() => {
    if (!ready) return;
    setRegion((prev) => (prev === "" ? settings.defaultRegion : prev));
  }, [ready, settings.defaultRegion]);

  const isComplete =
    eventType !== "" &&
    relation !== "" &&
    intimacy !== "" &&
    attendance !== "" &&
    region !== "";

  function submit() {
    if (!isComplete || submitting) return;
    setSubmitting(true);

    const input: CalcInput = {
      eventType: eventType as EventType,
      relation: relation as RelationType,
      intimacy: Number(intimacy) as Intimacy,
      attendance: attendance as Attendance,
      region: region as RegionType,
    };

    setLastCalc({ input, result: calcGiftAmount(input), at: Date.now() });
    navigate("/result", { state: { input } });
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>적정 금액 계산</Top.TitleParagraph>} />}
      bottom={
        <SubmitFooter
          label="적정 금액 계산하기"
          onClick={submit}
          disabled={!isComplete || submitting}
        />
      }
    >
      <Spacing size={8} />
      <ChipGroup
        label="어떤 경조사인가요?"
        options={eventTypeOptions}
        value={eventType}
        onChange={setEventType}
        testId="group-eventType"
      />
      <Spacing size={24} />
      <ChipGroup
        label="어떤 사이인가요?"
        options={relationOptions}
        value={relation}
        onChange={setRelation}
        testId="group-relation"
      />
      <Spacing size={24} />
      <ChipGroup
        label="얼마나 가까운가요?"
        options={INTIMACY_CHIPS}
        value={intimacy}
        onChange={setIntimacy}
        testId="group-intimacy"
      />
      <Spacing size={24} />
      <ChipGroup
        label="식사 자리에 가나요?"
        options={attendanceOptions}
        value={attendance}
        onChange={setAttendance}
        testId="group-attendance"
      />
      <Spacing size={24} />
      <ChipGroup
        label="어느 지역인가요?"
        options={regionOptions}
        value={region}
        onChange={setRegion}
        testId="group-region"
      />
      <Spacing size={16} />
      <Paragraph.Text typography="st12">
        다섯 가지를 고르면 관례 기준 금액을 알려드려요
      </Paragraph.Text>
      <Spacing size={120} />
    </ScreenScaffold>
  );
}
