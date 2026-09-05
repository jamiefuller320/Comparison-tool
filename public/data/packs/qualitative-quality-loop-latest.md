# Qualitative quality loop — 2026-09-05T13:14:12.830541+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `1691`
- Suspects before → after: `63` → `11`
- QA reviewed / changed: `63` / `52`
- Findings applied: `59`
- Learned phrases added: `10`
- Merged to index: `True`
- Apply trigger: `eventCount +72 (>= 15)`

## Top flag counts (before)

- `chrome`: 42
- `implausible_offerings`: 17
- `policy_toc`: 10
- `admissions`: 4
- `boilerplate`: 2

## Notes

- Hydrated working sidecar from 1691 published URN shards (prior=0 → 1691).
- Rebalanced learned QA phrases: active=751 candidates=920.
- Learning fingerprint: {'phraseHash': '4258a03c02ab27b26494', 'phraseCount': 751, 'candidateCount': 920, 'eventCount': 3998, 'updatedAt': '2026-09-05'}
- Apply decision: eventCount +72 (>= 15)
- Before: 63 suspects across 1691 records.
- Applied QA fixes to 52 school(s) (59 area finding(s)).
- Learned 10 new junk phrase(s) (store size 761).
- Reviewed top 63 suspect(s); provider=none.
- Merged cleaned sidecar into 21 schools-index file(s).
- After: 11 suspects across 1691 records.
- Updated output/learned-qa-apply-state.json
