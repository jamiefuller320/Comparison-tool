# Qualitative quality loop — 2026-10-20T14:54:55.670634+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7306`
- Suspects before → after: `46` → `30`
- QA reviewed / changed: `46` / `16`
- Findings applied: `16`
- Learned phrases added: `10`
- Merged to index: `True`
- Apply trigger: `eventCount +55 (>= 15)`

## Top flag counts (before)

- `chrome`: 16
- `admissions`: 13
- `cms_chrome`: 12
- `high_score_thin_signals`: 4
- `implausible_offerings`: 1

## Notes

- Hydrated working sidecar from 7306 published URN shards (prior=0 → 7306).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '0edaabdafff6ec0dc4ea', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 10871, 'updatedAt': '2026-10-20'}
- Apply decision: eventCount +55 (>= 15)
- Before: 46 suspects across 7306 records.
- Applied QA fixes to 16 school(s) (16 area finding(s)).
- Learned 10 new junk phrase(s) (store size 900).
- Reviewed top 46 suspect(s); provider=none.
- Merged cleaned sidecar into 55 schools-index file(s).
- After: 30 suspects across 7306 records.
- Updated output/learned-qa-apply-state.json
