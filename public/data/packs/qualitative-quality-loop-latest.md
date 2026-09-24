# Qualitative quality loop — 2026-09-24T14:44:28.958819+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `4394`
- Suspects before → after: `156` → `32`
- QA reviewed / changed: `156` / `133`
- Findings applied: `157`
- Learned phrases added: `51`
- Merged to index: `True`
- Apply trigger: `eventCount +145 (>= 15)`

## Top flag counts (before)

- `chrome`: 69
- `cms_chrome`: 64
- `admissions`: 11
- `implausible_offerings`: 9
- `policy_toc`: 8
- `boilerplate`: 5
- `high_score_thin_signals`: 4

## Notes

- Hydrated working sidecar from 4394 published URN shards (prior=0 → 4394).
- Rebalanced learned QA phrases: active=900 candidates=1489.
- Learning fingerprint: {'phraseHash': '1c3926e68b799031e250', 'phraseCount': 900, 'candidateCount': 1489, 'eventCount': 6953, 'updatedAt': '2026-09-24'}
- Apply decision: eventCount +145 (>= 15)
- Before: 156 suspects across 4394 records.
- Applied QA fixes to 133 school(s) (157 area finding(s)).
- Learned 51 new junk phrase(s) (store size 900).
- Reviewed top 156 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 32 suspects across 4394 records.
- Updated output/learned-qa-apply-state.json
