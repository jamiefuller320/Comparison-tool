# Qualitative quality loop — 2026-10-25T14:16:34.792659+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7381`
- Suspects before → after: `38` → `30`
- QA reviewed / changed: `38` / `8`
- Findings applied: `8`
- Learned phrases added: `4`
- Merged to index: `True`
- Apply trigger: `eventCount +23 (>= 15)`

## Top flag counts (before)

- `admissions`: 13
- `cms_chrome`: 12
- `chrome`: 8
- `high_score_thin_signals`: 4
- `implausible_offerings`: 1

## Notes

- Hydrated working sidecar from 7381 published URN shards (prior=0 → 7381).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '8a477c3799f517206871', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 11040, 'updatedAt': '2026-10-25'}
- Apply decision: eventCount +23 (>= 15)
- Before: 38 suspects across 7381 records.
- Applied QA fixes to 8 school(s) (8 area finding(s)).
- Learned 4 new junk phrase(s) (store size 900).
- Reviewed top 38 suspect(s); provider=none.
- Merged cleaned sidecar into 55 schools-index file(s).
- After: 30 suspects across 7381 records.
- Updated output/learned-qa-apply-state.json
