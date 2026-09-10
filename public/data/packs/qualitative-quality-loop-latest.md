# Qualitative quality loop — 2026-09-10T14:03:45.933130+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `2591`
- Suspects before → after: `67` → `15`
- QA reviewed / changed: `67` / `52`
- Findings applied: `63`
- Learned phrases added: `4`
- Merged to index: `True`
- Apply trigger: `eventCount +56 (>= 15)`

## Top flag counts (before)

- `chrome`: 45
- `implausible_offerings`: 13
- `admissions`: 6
- `policy_toc`: 4
- `boilerplate`: 3

## Notes

- Hydrated working sidecar from 2591 published URN shards (prior=0 → 2591).
- Rebalanced learned QA phrases: active=855 candidates=1027.
- Learning fingerprint: {'phraseHash': 'a03ea93f22147a35e795', 'phraseCount': 855, 'candidateCount': 1027, 'eventCount': 4586, 'updatedAt': '2026-09-10'}
- Apply decision: eventCount +56 (>= 15)
- Before: 67 suspects across 2591 records.
- Applied QA fixes to 52 school(s) (63 area finding(s)).
- Learned 4 new junk phrase(s) (store size 859).
- Reviewed top 67 suspect(s); provider=none.
- Merged cleaned sidecar into 21 schools-index file(s).
- After: 15 suspects across 2591 records.
- Updated output/learned-qa-apply-state.json
