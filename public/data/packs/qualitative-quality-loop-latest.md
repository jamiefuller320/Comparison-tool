# Qualitative quality loop — 2026-09-17T14:41:16.233560+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `3819`
- Suspects before → after: `82` → `24`
- QA reviewed / changed: `82` / `59`
- Findings applied: `77`
- Learned phrases added: `26`
- Merged to index: `True`
- Apply trigger: `eventCount +50 (>= 15)`

## Top flag counts (before)

- `chrome`: 53
- `implausible_offerings`: 25
- `policy_toc`: 8
- `admissions`: 7
- `boilerplate`: 1

## Notes

- Hydrated working sidecar from 3819 published URN shards (prior=0 → 3819).
- Rebalanced learned QA phrases: active=900 candidates=1351.
- Learning fingerprint: {'phraseHash': 'c2e833e3747587051932', 'phraseCount': 900, 'candidateCount': 1351, 'eventCount': 6356, 'updatedAt': '2026-09-17'}
- Apply decision: eventCount +50 (>= 15)
- Before: 82 suspects across 3819 records.
- Applied QA fixes to 59 school(s) (77 area finding(s)).
- Learned 26 new junk phrase(s) (store size 900).
- Reviewed top 82 suspect(s); provider=none.
- Merged cleaned sidecar into 21 schools-index file(s).
- After: 24 suspects across 3819 records.
- Updated output/learned-qa-apply-state.json
