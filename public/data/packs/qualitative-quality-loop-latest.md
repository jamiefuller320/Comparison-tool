# Qualitative quality loop — 2026-09-03T14:05:12.635427+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `1331`
- Suspects before → after: `117` → `14`
- QA reviewed / changed: `117` / `105`
- Findings applied: `184`
- Learned phrases added: `53`
- Merged to index: `True`
- Apply trigger: `eventCount +102 (>= 15)`

## Top flag counts (before)

- `chrome`: 102
- `implausible_offerings`: 20
- `policy_toc`: 12
- `boilerplate`: 5
- `admissions`: 4

## Notes

- Hydrated working sidecar from 1331 published URN shards (prior=0 → 1331).
- Rebalanced learned QA phrases: active=600 candidates=792.
- Learning fingerprint: {'phraseHash': 'c43ee828a4ac31661fb1', 'phraseCount': 600, 'candidateCount': 792, 'eventCount': 3414, 'updatedAt': '2026-09-03'}
- Apply decision: eventCount +102 (>= 15)
- Before: 117 suspects across 1331 records.
- Applied QA fixes to 105 school(s) (184 area finding(s)).
- Learned 53 new junk phrase(s) (store size 600).
- Reviewed top 117 suspect(s); provider=none.
- Merged cleaned sidecar into 21 schools-index file(s).
- After: 14 suspects across 1331 records.
- Updated output/learned-qa-apply-state.json
