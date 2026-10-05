# Qualitative quality loop — 2026-10-05T19:09:56.765837+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `6293`
- Suspects before → after: `123` → `30`
- QA reviewed / changed: `123` / `94`
- Findings applied: `149`
- Learned phrases added: `19`
- Merged to index: `True`
- Apply trigger: `eventCount +70 (>= 15)`

## Top flag counts (before)

- `chrome`: 80
- `implausible_offerings`: 20
- `policy_toc`: 19
- `admissions`: 13
- `cms_chrome`: 13
- `high_score_thin_signals`: 4
- `boilerplate`: 1

## Notes

- Hydrated working sidecar from 6293 published URN shards (prior=0 → 6293).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': 'eec412c24e871eea26b5', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 9557, 'updatedAt': '2026-10-05'}
- Apply decision: eventCount +70 (>= 15)
- Before: 123 suspects across 6293 records.
- Applied QA fixes to 94 school(s) (149 area finding(s)).
- Learned 19 new junk phrase(s) (store size 900).
- Reviewed top 123 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 30 suspects across 6293 records.
- Updated output/learned-qa-apply-state.json
