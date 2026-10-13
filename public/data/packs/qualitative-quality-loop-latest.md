# Qualitative quality loop — 2026-10-13T17:33:36.865119+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7074`
- Suspects before → after: `44` → `30`
- QA reviewed / changed: `44` / `14`
- Findings applied: `14`
- Learned phrases added: `3`
- Merged to index: `True`
- Apply trigger: `eventCount +25 (>= 15)`

## Top flag counts (before)

- `admissions`: 13
- `chrome`: 12
- `cms_chrome`: 12
- `high_score_thin_signals`: 4
- `implausible_offerings`: 2
- `boilerplate`: 1
- `policy_toc`: 1

## Notes

- Hydrated working sidecar from 7074 published URN shards (prior=0 → 7074).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': 'd184a02a3f47246957c5', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 10549, 'updatedAt': '2026-10-13'}
- Apply decision: eventCount +25 (>= 15)
- Before: 44 suspects across 7074 records.
- Applied QA fixes to 14 school(s) (14 area finding(s)).
- Learned 3 new junk phrase(s) (store size 900).
- Reviewed top 44 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 30 suspects across 7074 records.
- Updated output/learned-qa-apply-state.json
