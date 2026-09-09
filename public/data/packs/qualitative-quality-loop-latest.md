# Qualitative quality loop — 2026-09-09T14:09:22.550937+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `2411`
- Suspects before → after: `54` → `15`
- QA reviewed / changed: `54` / `40`
- Findings applied: `44`
- Learned phrases added: `16`
- Merged to index: `True`
- Apply trigger: `eventCount +41 (>= 15)`

## Top flag counts (before)

- `chrome`: 30
- `implausible_offerings`: 15
- `admissions`: 8
- `policy_toc`: 6
- `admissions_in_enrichment`: 2
- `boilerplate`: 2

## Notes

- Hydrated working sidecar from 2411 published URN shards (prior=0 → 2411).
- Rebalanced learned QA phrases: active=825 candidates=997.
- Learning fingerprint: {'phraseHash': '285925cd36d9177e5a85', 'phraseCount': 825, 'candidateCount': 997, 'eventCount': 4461, 'updatedAt': '2026-09-09'}
- Apply decision: eventCount +41 (>= 15)
- Before: 54 suspects across 2411 records.
- Applied QA fixes to 40 school(s) (44 area finding(s)).
- Learned 16 new junk phrase(s) (store size 841).
- Reviewed top 54 suspect(s); provider=none.
- Merged cleaned sidecar into 21 schools-index file(s).
- After: 15 suspects across 2411 records.
- Updated output/learned-qa-apply-state.json
