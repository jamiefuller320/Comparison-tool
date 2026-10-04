# Qualitative quality loop — 2026-10-04T15:18:53.073674+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `6113`
- Suspects before → after: `102` → `30`
- QA reviewed / changed: `102` / `72`
- Findings applied: `97`
- Learned phrases added: `30`
- Merged to index: `True`
- Apply trigger: `eventCount +81 (>= 15)`

## Top flag counts (before)

- `chrome`: 64
- `admissions`: 13
- `implausible_offerings`: 13
- `cms_chrome`: 12
- `policy_toc`: 12
- `high_score_thin_signals`: 4
- `boilerplate`: 2

## Notes

- Hydrated working sidecar from 6113 published URN shards (prior=0 → 6113).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '2b43b20198093a43d1cc', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 9342, 'updatedAt': '2026-10-04'}
- Apply decision: eventCount +81 (>= 15)
- Before: 102 suspects across 6113 records.
- Applied QA fixes to 72 school(s) (97 area finding(s)).
- Learned 30 new junk phrase(s) (store size 900).
- Reviewed top 102 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 30 suspects across 6113 records.
- Updated output/learned-qa-apply-state.json
