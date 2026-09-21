# Qualitative quality loop — 2026-09-21T16:14:43.375325+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `4151`
- Suspects before → after: `34` → `24`
- QA reviewed / changed: `34` / `10`
- Findings applied: `10`
- Learned phrases added: `4`
- Merged to index: `True`
- Apply trigger: `eventCount +35 (>= 15)`

## Top flag counts (before)

- `implausible_offerings`: 17
- `chrome`: 9
- `admissions`: 7
- `boilerplate`: 1

## Notes

- Hydrated working sidecar from 4151 published URN shards (prior=0 → 4151).
- Rebalanced learned QA phrases: active=900 candidates=1440.
- Learning fingerprint: {'phraseHash': '832485780b205be6d7bd', 'phraseCount': 900, 'candidateCount': 1440, 'eventCount': 6793, 'updatedAt': '2026-09-21'}
- Apply decision: eventCount +35 (>= 15)
- Before: 34 suspects across 4151 records.
- Applied QA fixes to 10 school(s) (10 area finding(s)).
- Learned 4 new junk phrase(s) (store size 900).
- Reviewed top 34 suspect(s); provider=none.
- Merged cleaned sidecar into 21 schools-index file(s).
- After: 24 suspects across 4151 records.
- Updated output/learned-qa-apply-state.json
