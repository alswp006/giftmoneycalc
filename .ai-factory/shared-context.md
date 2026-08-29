# Shared Context (auto-generated — do NOT modify)


## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  lib/
    calc.ts
    constants.ts
  types/
    calc.ts

### Exports (src/lib/)
- calc.ts: export function normalizeCalcInput(partial: Partial<CalcInput> | null | undefined): CalcInput; export function snapToLadder(raw: number): number; export function safeCalculate(partial: Partial<CalcInput>): CalcResult | null
- constants.ts: export const BASE_TABLE: Record<string, Record<string, number>> =; export const LADDER: number[] = [ 10000, 20000, 30000, 40000, 50000, 70000, 80000, 100000, 120000, 150000, 200000, 25000; export const HOTEL_VENUE_BONUS = 30000; export const DEFAULT_INTIMACY = 3; export const DEFAULT_REGION = "metro"; export const DEFAULT_ATTENDANCE = "attend"; export const MIN_INTIMACY = 1; export const MAX_INTIMACY = 5
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- heal-1-01: 계산 코어 입력 정규화 및 안전 가드 (files: src/lib/calc.ts, src/lib/constants.ts, src/types/calc.ts)