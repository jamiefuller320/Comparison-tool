# Qualitative quality loop — 2026-10-23T14:51:46.770842+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7381`
- Suspects before → after: `36` → `30`
- QA reviewed / changed: `36` / `6`
- Findings applied: `6`
- Learned phrases added: `0`
- Merged to index: `True`
- Apply trigger: `eventCount +39 (>= 15)`

## Top flag counts (before)

- `admissions`: 13
- `cms_chrome`: 12
- `chrome`: 6
- `high_score_thin_signals`: 4
- `implausible_offerings`: 1

## Notes

- Hydrated working sidecar from 7381 published URN shards (prior=0 → 7381).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '579f6615ad17529c7c26', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 11010, 'updatedAt': '2026-10-23'}
- Apply decision: eventCount +39 (>= 15)
- Before: 36 suspects across 7381 records.
- Applied QA fixes to 6 school(s) (6 area finding(s)).
- Learned 0 new junk phrase(s) (store size 900).
- Reviewed top 36 suspect(s); provider=none.
- Merged cleaned sidecar into 55 schools-index file(s).
- After: 30 suspects across 7381 records.
- Updated output/learned-qa-apply-state.json
