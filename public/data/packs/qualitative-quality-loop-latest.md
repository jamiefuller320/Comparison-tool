# Qualitative quality loop — 2026-10-06T16:40:54.929858+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `6458`
- Suspects before → after: `90` → `30`
- QA reviewed / changed: `90` / `60`
- Findings applied: `91`
- Learned phrases added: `37`
- Merged to index: `True`
- Apply trigger: `eventCount +80 (>= 15)`

## Top flag counts (before)

- `chrome`: 57
- `admissions`: 13
- `cms_chrome`: 13
- `implausible_offerings`: 12
- `policy_toc`: 11
- `high_score_thin_signals`: 4
- `boilerplate`: 2

## Notes

- Hydrated working sidecar from 6458 published URN shards (prior=0 → 6458).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '6c25d3da6645f4383d03', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 9825, 'updatedAt': '2026-10-06'}
- Apply decision: eventCount +80 (>= 15)
- Before: 90 suspects across 6458 records.
- Applied QA fixes to 60 school(s) (91 area finding(s)).
- Learned 37 new junk phrase(s) (store size 900).
- Reviewed top 90 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 30 suspects across 6458 records.
- Updated output/learned-qa-apply-state.json
