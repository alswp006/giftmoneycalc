# GiftMoneyCalc

앱인토스 (Vite + React + TDS) 관계·지역·물가를 반영해 축의금·부의금 적정 금액을 알려주는 계산기 결혼식·장례식 축의금·부의금 액수를 정할 때마다 검색하고 지인에게 물어봐야 하는 불편함이 반복된다. 명확한 기준이 없어 매번 고민하고 커뮤니티에 물어본다.

## Tech Stack

- React 18.0.0
- TypeScript
- Vitest

## Routes

| Path | Description |
|------|-------------|
| `/Calc` | Calc |
| `/History` | History |
| `/HistoryDetail` | HistoryDetail |
| `/Home` | Home |
| `/Result` | Result |
| `/Settings` | Settings |
| `/Share` | Share |
| `/Stats` | Stats |

## Getting Started

```bash
pnpm install
pnpm dev
```

## Development

```bash
pnpm typecheck    # Type checking
pnpm test         # Run tests
pnpm build        # Production build
```

## Design Documents

See `.ai-factory/` directory for full design artifacts:
- `prd.md` — Product Requirements Document
- `spec.md` — Technical Specification
- `task.md` — Epic/Task Breakdown

---
Built with [AI Factory](https://github.com/alswp006/ai-factory) · Last synced: 2026-08-28
