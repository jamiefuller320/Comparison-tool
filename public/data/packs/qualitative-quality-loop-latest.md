# Qualitative quality loop — 2026-10-26T16:41:53.873908+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7381`
- Suspects before → after: `33` → `30`
- QA reviewed / changed: `33` / `3`
- Findings applied: `3`
- Learned phrases added: `0`
- Merged to index: `True`
- Apply trigger: `eventCount +17 (>= 15)`

## Top flag counts (before)

- `admissions`: 13
- `cms_chrome`: 12
- `high_score_thin_signals`: 4
- `chrome`: 3
- `implausible_offerings`: 1

## Notes

- Hydrated working sidecar from 7381 published URN shards (prior=0 → 7381).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': 'b1dce7392047d47466c4', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 11068, 'updatedAt': '2026-10-26'}
- Apply decision: eventCount +17 (>= 15)
- Before: 33 suspects across 7381 records.
- Applied QA fixes to 3 school(s) (3 area finding(s)).
- Learned 0 new junk phrase(s) (store size 900).
- Reviewed top 33 suspect(s); provider=none.
- Merged cleaned sidecar into 55 schools-index file(s).
- After: 30 suspects across 7381 records.
- Updated output/learned-qa-apply-state.json
