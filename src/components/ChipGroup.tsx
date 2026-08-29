import { Button, Paragraph, Spacing } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";

interface ChipOption {
  value: string;
  label: string;
}

interface ChipGroupProps {
  title: string;
  options: ChipOption[];
  selected: string;
  onSelect: (value: string) => void;
}

/**
 * 단일 선택 칩 묶음. 선택된 항목만 fill, 나머지는 weak.
 */
export default function ChipGroup({ title, options, selected, onSelect }: ChipGroupProps) {
  return (
    <div>
      <Paragraph.Text typography="st10" color={adaptive.grey700}>
        {title}
      </Paragraph.Text>
      <Spacing size={8} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((option) => (
          <Button
            key={option.value}
            size="medium"
            variant={selected === option.value ? "fill" : "weak"}
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
