# Qualitative quality loop — 2026-09-27T15:08:09.458816+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `4853`
- Suspects before → after: `90` → `29`
- QA reviewed / changed: `90` / `61`
- Findings applied: `79`
- Learned phrases added: `11`
- Merged to index: `True`
- Apply trigger: `eventCount +64 (>= 15)`

## Top flag counts (before)

- `chrome`: 59
- `cms_chrome`: 13
- `admissions`: 12
- `high_score_thin_signals`: 4
- `implausible_offerings`: 4
- `policy_toc`: 3
- `boilerplate`: 1

## Notes

- Hydrated working sidecar from 4853 published URN shards (prior=0 → 4853).
- Rebalanced learned QA phrases: active=900 candidates=1882.
- Learning fingerprint: {'phraseHash': 'd258d4e5cde6bc8cd067', 'phraseCount': 900, 'candidateCount': 1882, 'eventCount': 7921, 'updatedAt': '2026-09-27'}
- Apply decision: eventCount +64 (>= 15)
- Before: 90 suspects across 4853 records.
- Applied QA fixes to 61 school(s) (79 area finding(s)).
- Learned 11 new junk phrase(s) (store size 900).
- Reviewed top 90 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 29 suspects across 4853 records.
- Updated output/learned-qa-apply-state.json
