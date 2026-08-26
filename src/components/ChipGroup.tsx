import type { ReactNode } from "react";
import { Chip, Paragraph, Spacing } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";

function fireTickHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export interface ChipOption {
  value: string;
  label: string;
}

/**
 * 단일 선택 Chip 그룹 — 유형/관계/친밀도/참석/지역 선택에 공통 사용.
 *
 * Pre-built (재구현 금지): 선택 항목은 filled, 비선택은 outlined로 표시하고 탭 시 tickWeak 햅틱.
 */
export function ChipGroup({
  label,
  options,
  value,
  onChange,
  testId,
}: {
  label?: ReactNode;
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
  testId?: string;
}) {
  return (
    <div>
      {label ? (
        <>
          <Paragraph.Text typography="t4">{label}</Paragraph.Text>
          <Spacing size={12} />
        </>
      ) : null}
      <div
        data-testid={testId}
        style={{ display: "flex", gap: 8, flexWrap: "wrap", minHeight: 44 }}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Chip
              key={option.value}
              variant={selected ? "fill" : "weak"}
              data-variant={selected ? "filled" : "outlined"}
              aria-pressed={selected}
              onClick={() => {
                fireTickHaptic();
                onChange(option.value);
              }}
            >
              {option.label}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}
