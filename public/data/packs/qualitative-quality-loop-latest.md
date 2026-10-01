# Qualitative quality loop — 2026-10-01T17:02:09.082898+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `5573`
- Suspects before → after: `99` → `29`
- QA reviewed / changed: `99` / `70`
- Findings applied: `93`
- Learned phrases added: `39`
- Merged to index: `True`
- Apply trigger: `eventCount +69 (>= 15)`

## Top flag counts (before)

- `chrome`: 67
- `admissions`: 12
- `cms_chrome`: 12
- `implausible_offerings`: 8
- `policy_toc`: 7
- `high_score_thin_signals`: 4
- `boilerplate`: 1

## Notes

- Hydrated working sidecar from 5573 published URN shards (prior=0 → 5573).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': 'aa2fe44c1e30782b4948', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 8649, 'updatedAt': '2026-10-01'}
- Apply decision: eventCount +69 (>= 15)
- Before: 99 suspects across 5573 records.
- Applied QA fixes to 70 school(s) (93 area finding(s)).
- Learned 39 new junk phrase(s) (store size 900).
- Reviewed top 99 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 29 suspects across 5573 records.
- Updated output/learned-qa-apply-state.json
