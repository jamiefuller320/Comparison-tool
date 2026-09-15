# Qualitative quality loop — 2026-09-15T14:39:13.600358+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `417` / `1.5`
- Records: `3491`
- Suspects before → after: `417` → `20`
- QA reviewed / changed: `417` / `400`
- Findings applied: `489`
- Learned phrases added: `37`
- Merged to index: `True`
- Apply trigger: `eventCount +62 (>= 15)`

## Top flag counts (before)

- `chrome`: 395
- `implausible_offerings`: 20
- `admissions`: 7
- `policy_toc`: 7
- `boilerplate`: 2

## Notes

- Hydrated working sidecar from 3491 published URN shards (prior=0 → 3491).
- Rebalanced learned QA phrases: active=900 candidates=1255.
- Learning fingerprint: {'phraseHash': '0669ec11714bc198e1c4', 'phraseCount': 900, 'candidateCount': 1255, 'eventCount': 5567, 'updatedAt': '2026-09-15'}
- Apply decision: eventCount +62 (>= 15)
- Before: 417 suspects across 3491 records.
- Raised review limit 250 → 417 to cover all suspects for full learning apply.
- Applied QA fixes to 400 school(s) (489 area finding(s)).
- Learned 37 new junk phrase(s) (store size 900).
- Reviewed top 417 suspect(s); provider=none.
- Merged cleaned sidecar into 21 schools-index file(s).
- After: 20 suspects across 3491 records.
- Updated output/learned-qa-apply-state.json
