# Qualitative quality loop — 2026-09-30T16:22:56.286998+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `5393`
- Suspects before → after: `98` → `29`
- QA reviewed / changed: `98` / `69`
- Findings applied: `94`
- Learned phrases added: `30`
- Merged to index: `True`
- Apply trigger: `eventCount +85 (>= 15)`

## Top flag counts (before)

- `chrome`: 64
- `cms_chrome`: 15
- `admissions`: 12
- `implausible_offerings`: 9
- `policy_toc`: 8
- `high_score_thin_signals`: 4
- `boilerplate`: 2

## Notes

- Hydrated working sidecar from 5393 published URN shards (prior=0 → 5393).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '63768e4985d163eaa46e', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 8451, 'updatedAt': '2026-09-30'}
- Apply decision: eventCount +85 (>= 15)
- Before: 98 suspects across 5393 records.
- Applied QA fixes to 69 school(s) (94 area finding(s)).
- Learned 30 new junk phrase(s) (store size 900).
- Reviewed top 98 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 29 suspects across 5393 records.
- Updated output/learned-qa-apply-state.json
