# Qualitative quality loop — 2026-10-18T13:59:24.542265+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7186`
- Suspects before → after: `53` → `30`
- QA reviewed / changed: `53` / `23`
- Findings applied: `26`
- Learned phrases added: `9`
- Merged to index: `True`
- Apply trigger: `eventCount +68 (>= 15)`

## Top flag counts (before)

- `chrome`: 22
- `admissions`: 13
- `cms_chrome`: 13
- `high_score_thin_signals`: 4
- `implausible_offerings`: 1

## Notes

- Hydrated working sidecar from 7186 published URN shards (prior=0 → 7186).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '500a83c51e7a4c5967fb', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 10710, 'updatedAt': '2026-10-18'}
- Apply decision: eventCount +68 (>= 15)
- Before: 53 suspects across 7186 records.
- Applied QA fixes to 23 school(s) (26 area finding(s)).
- Learned 9 new junk phrase(s) (store size 900).
- Reviewed top 53 suspect(s); provider=none.
- Merged cleaned sidecar into 55 schools-index file(s).
- After: 30 suspects across 7186 records.
- Updated output/learned-qa-apply-state.json
