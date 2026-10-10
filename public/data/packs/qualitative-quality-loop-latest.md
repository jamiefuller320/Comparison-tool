# Qualitative quality loop — 2026-10-10T15:52:56.603928+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `6898`
- Suspects before → after: `51` → `30`
- QA reviewed / changed: `51` / `21`
- Findings applied: `24`
- Learned phrases added: `3`
- Merged to index: `True`
- Apply trigger: `eventCount +50 (>= 15)`

## Top flag counts (before)

- `chrome`: 19
- `admissions`: 13
- `cms_chrome`: 12
- `high_score_thin_signals`: 4
- `implausible_offerings`: 3
- `policy_toc`: 2

## Notes

- Hydrated working sidecar from 6898 published URN shards (prior=0 → 6898).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '1da16f332de403180ee4', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 10362, 'updatedAt': '2026-10-10'}
- Apply decision: eventCount +50 (>= 15)
- Before: 51 suspects across 6898 records.
- Applied QA fixes to 21 school(s) (24 area finding(s)).
- Learned 3 new junk phrase(s) (store size 900).
- Reviewed top 51 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 30 suspects across 6898 records.
- Updated output/learned-qa-apply-state.json
