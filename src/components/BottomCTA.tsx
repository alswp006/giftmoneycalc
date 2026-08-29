import { Button, FixedBottomCTA } from "@toss/tds-mobile";

interface SubmitFooterProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * 단일 1차 CTA. FixedBottomCTA 자체가 button이라 안에 Button을 넣지 않는다.
 */
export function SubmitFooter({ label, onClick, disabled = false }: SubmitFooterProps) {
  return (
    <FixedBottomCTA onClick={onClick} disabled={disabled}>
      {label}
    </FixedBottomCTA>
  );
}

interface ButtonStackProps {
  primaryLabel: string;
  onPrimaryClick: () => void;
  secondaryLabel: string;
  onSecondaryClick: () => void;
}

/**
 * 1차 + 2차 액션을 세로로 쌓는다. 두 버튼 모두 전체폭.
 */
export function ButtonStack({
  primaryLabel,
  onPrimaryClick,
  secondaryLabel,
  onSecondaryClick,
}: ButtonStackProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 24px 24px" }}>
      <Button display="block" onClick={onPrimaryClick}>
        {primaryLabel}
      </Button>
      <Button display="block" variant="weak" onClick={onSecondaryClick}>
        {secondaryLabel}
      </Button>
    </div>
  );
}
