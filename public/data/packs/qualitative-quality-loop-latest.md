# Qualitative quality loop — 2026-10-21T15:03:10.744404+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7366`
- Suspects before → after: `50` → `30`
- QA reviewed / changed: `50` / `20`
- Findings applied: `23`
- Learned phrases added: `2`
- Merged to index: `True`
- Apply trigger: `eventCount +46 (>= 15)`

## Top flag counts (before)

- `chrome`: 17
- `admissions`: 13
- `cms_chrome`: 12
- `high_score_thin_signals`: 4
- `implausible_offerings`: 3
- `policy_toc`: 2
- `boilerplate`: 1

## Notes

- Hydrated working sidecar from 7366 published URN shards (prior=0 → 7366).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': 'd8a4e7eb2a29acb76dfd', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 10941, 'updatedAt': '2026-10-21'}
- Apply decision: eventCount +46 (>= 15)
- Before: 50 suspects across 7366 records.
- Applied QA fixes to 20 school(s) (23 area finding(s)).
- Learned 2 new junk phrase(s) (store size 900).
- Reviewed top 50 suspect(s); provider=none.
- Merged cleaned sidecar into 55 schools-index file(s).
- After: 30 suspects across 7366 records.
- Updated output/learned-qa-apply-state.json
