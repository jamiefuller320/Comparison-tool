# Qualitative quality loop — 2026-09-11T14:02:07.675058+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `2771`
- Suspects before → after: `60` → `17`
- QA reviewed / changed: `60` / `44`
- Findings applied: `48`
- Learned phrases added: `21`
- Merged to index: `True`
- Apply trigger: `eventCount +45 (>= 15)`

## Top flag counts (before)

- `chrome`: 37
- `implausible_offerings`: 16
- `admissions`: 6
- `policy_toc`: 6
- `boilerplate`: 1

## Notes

- Hydrated working sidecar from 2771 published URN shards (prior=0 → 2771).
- Rebalanced learned QA phrases: active=864 candidates=1039.
- Learning fingerprint: {'phraseHash': 'e302fba09c795a6c919a', 'phraseCount': 864, 'candidateCount': 1039, 'eventCount': 4706, 'updatedAt': '2026-09-11'}
- Apply decision: eventCount +45 (>= 15)
- Before: 60 suspects across 2771 records.
- Applied QA fixes to 44 school(s) (48 area finding(s)).
- Learned 21 new junk phrase(s) (store size 885).
- Reviewed top 60 suspect(s); provider=none.
- Merged cleaned sidecar into 21 schools-index file(s).
- After: 17 suspects across 2771 records.
- Updated output/learned-qa-apply-state.json
