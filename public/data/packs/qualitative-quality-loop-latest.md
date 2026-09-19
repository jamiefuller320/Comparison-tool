# Qualitative quality loop — 2026-09-19T13:44:25.015741+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `4035`
- Suspects before → after: `46` → `24`
- QA reviewed / changed: `46` / `22`
- Findings applied: `26`
- Learned phrases added: `5`
- Merged to index: `True`
- Apply trigger: `eventCount +50 (>= 15)`

## Top flag counts (before)

- `chrome`: 21
- `implausible_offerings`: 18
- `admissions`: 7
- `boilerplate`: 1
- `policy_toc`: 1

## Notes

- Hydrated working sidecar from 4035 published URN shards (prior=0 → 4035).
- Rebalanced learned QA phrases: active=900 candidates=1410.
- Learning fingerprint: {'phraseHash': 'e91b4d6515f0752a046c', 'phraseCount': 900, 'candidateCount': 1410, 'eventCount': 6642, 'updatedAt': '2026-09-19'}
- Apply decision: eventCount +50 (>= 15)
- Before: 46 suspects across 4035 records.
- Applied QA fixes to 22 school(s) (26 area finding(s)).
- Learned 5 new junk phrase(s) (store size 900).
- Reviewed top 46 suspect(s); provider=none.
- Merged cleaned sidecar into 21 schools-index file(s).
- After: 24 suspects across 4035 records.
- Updated output/learned-qa-apply-state.json
