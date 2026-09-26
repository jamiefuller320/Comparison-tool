# Qualitative quality loop — 2026-09-26T14:10:55.951032+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `4673`
- Suspects before → after: `133` → `29`
- QA reviewed / changed: `133` / `106`
- Findings applied: `121`
- Learned phrases added: `27`
- Merged to index: `True`
- Apply trigger: `eventCount +76 (>= 15)`

## Top flag counts (before)

- `chrome`: 93
- `cms_chrome`: 17
- `admissions`: 12
- `implausible_offerings`: 7
- `policy_toc`: 6
- `boilerplate`: 4
- `high_score_thin_signals`: 4

## Notes

- Hydrated working sidecar from 4673 published URN shards (prior=0 → 4673).
- Rebalanced learned QA phrases: active=900 candidates=1839.
- Learning fingerprint: {'phraseHash': '49a28bbd7c6dbcab26e6', 'phraseCount': 900, 'candidateCount': 1839, 'eventCount': 7699, 'updatedAt': '2026-09-26'}
- Apply decision: eventCount +76 (>= 15)
- Before: 133 suspects across 4673 records.
- Applied QA fixes to 106 school(s) (121 area finding(s)).
- Learned 27 new junk phrase(s) (store size 900).
- Reviewed top 133 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 29 suspects across 4673 records.
- Updated output/learned-qa-apply-state.json
