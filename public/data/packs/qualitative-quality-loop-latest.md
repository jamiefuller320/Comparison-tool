# Qualitative quality loop — 2026-09-16T14:36:56.023774+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `3668`
- Suspects before → after: `71` → `22`
- QA reviewed / changed: `71` / `50`
- Findings applied: `68`
- Learned phrases added: `18`
- Merged to index: `True`
- Apply trigger: `eventCount +67 (>= 15)`

## Top flag counts (before)

- `chrome`: 40
- `implausible_offerings`: 24
- `policy_toc`: 10
- `admissions`: 7
- `boilerplate`: 5

## Notes

- Hydrated working sidecar from 3668 published URN shards (prior=0 → 3668).
- Rebalanced learned QA phrases: active=900 candidates=1319.
- Learning fingerprint: {'phraseHash': 'a95cf0f88e941ab1e32f', 'phraseCount': 900, 'candidateCount': 1319, 'eventCount': 6223, 'updatedAt': '2026-09-16'}
- Apply decision: eventCount +67 (>= 15)
- Before: 71 suspects across 3668 records.
- Applied QA fixes to 50 school(s) (68 area finding(s)).
- Learned 18 new junk phrase(s) (store size 900).
- Reviewed top 71 suspect(s); provider=none.
- Merged cleaned sidecar into 21 schools-index file(s).
- After: 22 suspects across 3668 records.
- Updated output/learned-qa-apply-state.json
