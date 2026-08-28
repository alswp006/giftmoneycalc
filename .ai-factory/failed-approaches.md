
## 계산 엔진 (rules.ts 상수 격리 + calc.ts 결정론 함수) — fix loop 2026-08-28T17:06:16.044Z
- 시도 횟수: 1
- 트리아지: severe (33 errors (tsc:33, test:0))
- 에러 변화:
  Attempt 1: initial errors — tsc:33|lint:0|test:0
- 비용: $0.3336
- 수정된 파일:
 .ai-factory/shared-context.md     |   4 ++
 src/__tests__/packet-0001.test.ts |  17 ++---
 src/lib/calc.test.ts              | 139 ++++++++++++++++++++++++++++++++++++++
 src/lib/calc.ts                   |  61 +++++++++++++++++
 src/lib/rules.ts                  | 126 +++++++++++++++++++++++++++++
