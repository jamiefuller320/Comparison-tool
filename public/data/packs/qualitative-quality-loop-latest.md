# Qualitative quality loop — 2026-10-19T16:58:04.961816+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7246`
- Suspects before → after: `46` → `30`
- QA reviewed / changed: `46` / `16`
- Findings applied: `21`
- Learned phrases added: `2`
- Merged to index: `True`
- Apply trigger: `eventCount +47 (>= 15)`

## Top flag counts (before)

- `chrome`: 16
- `admissions`: 13
- `cms_chrome`: 12
- `high_score_thin_signals`: 4
- `boilerplate`: 1
- `implausible_offerings`: 1

## Notes

- Hydrated working sidecar from 7246 published URN shards (prior=0 → 7246).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': 'bcccb638602eafb957a4', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 10792, 'updatedAt': '2026-10-19'}
- Apply decision: eventCount +47 (>= 15)
- Before: 46 suspects across 7246 records.
- Applied QA fixes to 16 school(s) (21 area finding(s)).
- Learned 2 new junk phrase(s) (store size 900).
- Reviewed top 46 suspect(s); provider=none.
- Merged cleaned sidecar into 55 schools-index file(s).
- After: 30 suspects across 7246 records.
- Updated output/learned-qa-apply-state.json
