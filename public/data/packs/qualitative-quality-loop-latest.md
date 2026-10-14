# Qualitative quality loop — 2026-10-14T15:05:26.765405+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7097`
- Suspects before → after: `40` → `30`
- QA reviewed / changed: `40` / `10`
- Findings applied: `10`
- Learned phrases added: `7`
- Merged to index: `True`
- Apply trigger: `eventCount +23 (>= 15)`

## Top flag counts (before)

- `admissions`: 13
- `cms_chrome`: 12
- `chrome`: 9
- `high_score_thin_signals`: 4
- `implausible_offerings`: 2
- `policy_toc`: 1

## Notes

- Hydrated working sidecar from 7097 published URN shards (prior=0 → 7097).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': 'e0c75563f14c6312c361', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 10592, 'updatedAt': '2026-10-14'}
- Apply decision: eventCount +23 (>= 15)
- Before: 40 suspects across 7097 records.
- Applied QA fixes to 10 school(s) (10 area finding(s)).
- Learned 7 new junk phrase(s) (store size 900).
- Reviewed top 40 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 30 suspects across 7097 records.
- Updated output/learned-qa-apply-state.json
