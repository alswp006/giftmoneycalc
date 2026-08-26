import type { Attendance, EventType, Intimacy, RegionType, RelationType } from "@/lib/types";
import {
  ATTENDANCE_LABEL,
  EVENT_LABEL,
  INTIMACY_LABEL,
  REGION_LABEL,
  RELATION_LABEL,
} from "@/lib/constants";

export interface SelectOption<T> {
  value: T;
  label: string;
}

export const eventTypeOptions: SelectOption<EventType>[] = (
  Object.keys(EVENT_LABEL) as EventType[]
).map((value) => ({ value, label: EVENT_LABEL[value] }));

export const relationOptions: SelectOption<RelationType>[] = (
  Object.keys(RELATION_LABEL) as RelationType[]
).map((value) => ({ value, label: RELATION_LABEL[value] }));

export const intimacyOptions: SelectOption<Intimacy>[] = (
  Object.keys(INTIMACY_LABEL).map(Number) as Intimacy[]
).map((value) => ({ value, label: INTIMACY_LABEL[value] }));

export const attendanceOptions: SelectOption<Attendance>[] = (
  Object.keys(ATTENDANCE_LABEL) as Attendance[]
).map((value) => ({ value, label: ATTENDANCE_LABEL[value] }));

export const regionOptions: SelectOption<RegionType>[] = (
  Object.keys(REGION_LABEL) as RegionType[]
).map((value) => ({ value, label: REGION_LABEL[value] }));
