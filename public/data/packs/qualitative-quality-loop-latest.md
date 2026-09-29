# Qualitative quality loop — 2026-09-29T16:29:40.296225+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `5213`
- Suspects before → after: `95` → `29`
- QA reviewed / changed: `95` / `66`
- Findings applied: `83`
- Learned phrases added: `34`
- Merged to index: `True`
- Apply trigger: `eventCount +56 (>= 15)`

## Top flag counts (before)

- `chrome`: 59
- `admissions`: 12
- `cms_chrome`: 12
- `implausible_offerings`: 10
- `policy_toc`: 9
- `high_score_thin_signals`: 4
- `boilerplate`: 3

## Notes

- Hydrated working sidecar from 5213 published URN shards (prior=0 → 5213).
- Rebalanced learned QA phrases: active=900 candidates=1939.
- Learning fingerprint: {'phraseHash': '68c081138d3fc2721a2b', 'phraseCount': 900, 'candidateCount': 1939, 'eventCount': 8245, 'updatedAt': '2026-09-29'}
- Apply decision: eventCount +56 (>= 15)
- Before: 95 suspects across 5213 records.
- Applied QA fixes to 66 school(s) (83 area finding(s)).
- Learned 34 new junk phrase(s) (store size 900).
- Reviewed top 95 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 29 suspects across 5213 records.
- Updated output/learned-qa-apply-state.json
