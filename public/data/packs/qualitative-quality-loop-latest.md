# Qualitative quality loop — 2026-09-12T13:21:54.062603+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `2951`
- Suspects before → after: `67` → `18`
- QA reviewed / changed: `67` / `49`
- Findings applied: `50`
- Learned phrases added: `18`
- Merged to index: `True`
- Apply trigger: `eventCount +41 (>= 15)`

## Top flag counts (before)

- `chrome`: 41
- `implausible_offerings`: 17
- `admissions`: 6
- `policy_toc`: 6
- `boilerplate`: 2

## Notes

- Hydrated working sidecar from 2951 published URN shards (prior=0 → 2951).
- Rebalanced learned QA phrases: active=891 candidates=1066.
- Learning fingerprint: {'phraseHash': '82e80991a793de749743', 'phraseCount': 891, 'candidateCount': 1066, 'eventCount': 4817, 'updatedAt': '2026-09-12'}
- Apply decision: eventCount +41 (>= 15)
- Before: 67 suspects across 2951 records.
- Applied QA fixes to 49 school(s) (50 area finding(s)).
- Learned 18 new junk phrase(s) (store size 900).
- Reviewed top 67 suspect(s); provider=none.
- Merged cleaned sidecar into 21 schools-index file(s).
- After: 18 suspects across 2951 records.
- Updated output/learned-qa-apply-state.json
