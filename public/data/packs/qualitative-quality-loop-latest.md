# Qualitative quality loop — 2026-10-09T17:00:33.007956+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `6817`
- Suspects before → after: `57` → `30`
- QA reviewed / changed: `57` / `27`
- Findings applied: `27`
- Learned phrases added: `9`
- Merged to index: `True`
- Apply trigger: `eventCount +62 (>= 15)`

## Top flag counts (before)

- `chrome`: 24
- `admissions`: 13
- `cms_chrome`: 12
- `high_score_thin_signals`: 4
- `implausible_offerings`: 4
- `policy_toc`: 3

## Notes

- Hydrated working sidecar from 6817 published URN shards (prior=0 → 6817).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '0ae9bb52ede7cb3daf56', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 10282, 'updatedAt': '2026-10-09'}
- Apply decision: eventCount +62 (>= 15)
- Before: 57 suspects across 6817 records.
- Applied QA fixes to 27 school(s) (27 area finding(s)).
- Learned 9 new junk phrase(s) (store size 900).
- Reviewed top 57 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 30 suspects across 6817 records.
- Updated output/learned-qa-apply-state.json
