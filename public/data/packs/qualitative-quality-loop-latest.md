# Qualitative quality loop — 2026-09-08T14:06:58.106026+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `2231`
- Suspects before → after: `57` → `14`
- QA reviewed / changed: `57` / `43`
- Findings applied: `52`
- Learned phrases added: `13`
- Merged to index: `True`
- Apply trigger: `eventCount +45 (>= 15)`

## Top flag counts (before)

- `chrome`: 38
- `implausible_offerings`: 14
- `admissions`: 5
- `policy_toc`: 5
- `boilerplate`: 1

## Notes

- Hydrated working sidecar from 2231 published URN shards (prior=0 → 2231).
- Rebalanced learned QA phrases: active=803 candidates=973.
- Learning fingerprint: {'phraseHash': '19db6370971fd3a18d15', 'phraseCount': 803, 'candidateCount': 973, 'eventCount': 4345, 'updatedAt': '2026-09-08'}
- Apply decision: eventCount +45 (>= 15)
- Before: 57 suspects across 2231 records.
- Applied QA fixes to 43 school(s) (52 area finding(s)).
- Learned 13 new junk phrase(s) (store size 815).
- Reviewed top 57 suspect(s); provider=none.
- Merged cleaned sidecar into 21 schools-index file(s).
- After: 14 suspects across 2231 records.
- Updated output/learned-qa-apply-state.json
