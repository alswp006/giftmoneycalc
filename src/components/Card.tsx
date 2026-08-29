import type { ReactNode } from "react";
import { adaptive } from "@toss/tds-colors";

interface CardProps {
  children: ReactNode;
  testId?: string;
}

/**
 * 결과·비교·기록을 묶는 카드 컨테이너. raw div 대신 이걸로 위계를 만든다.
 */
export default function Card({ children, testId }: CardProps) {
  return (
    <div
      data-testid={testId}
      style={{
        backgroundColor: adaptive.background,
        border: `1px solid ${adaptive.greyOpacity100}`,
        borderRadius: 16,
        padding: 20,
      }}
    >
      {children}
    </div>
  );
}
