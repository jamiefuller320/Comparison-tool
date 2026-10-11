# Qualitative quality loop — 2026-10-11T16:21:11.765000+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `6973`
- Suspects before → after: `57` → `30`
- QA reviewed / changed: `57` / `27`
- Findings applied: `27`
- Learned phrases added: `2`
- Merged to index: `True`
- Apply trigger: `eventCount +36 (>= 15)`

## Top flag counts (before)

- `chrome`: 23
- `cms_chrome`: 14
- `admissions`: 13
- `high_score_thin_signals`: 4
- `implausible_offerings`: 2
- `boilerplate`: 1
- `policy_toc`: 1

## Notes

- Hydrated working sidecar from 6973 published URN shards (prior=0 → 6973).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '2f3ccf4648af3a84d59e', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 10429, 'updatedAt': '2026-10-11'}
- Apply decision: eventCount +36 (>= 15)
- Before: 57 suspects across 6973 records.
- Applied QA fixes to 27 school(s) (27 area finding(s)).
- Learned 2 new junk phrase(s) (store size 900).
- Reviewed top 57 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 30 suspects across 6973 records.
- Updated output/learned-qa-apply-state.json
