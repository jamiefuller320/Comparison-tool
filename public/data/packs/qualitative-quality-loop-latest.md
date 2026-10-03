# Qualitative quality loop — 2026-10-03T14:43:04.682110+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `5933`
- Suspects before → after: `113` → `31`
- QA reviewed / changed: `113` / `83`
- Findings applied: `108`
- Learned phrases added: `32`
- Merged to index: `True`
- Apply trigger: `eventCount +77 (>= 15)`

## Top flag counts (before)

- `chrome`: 81
- `admissions`: 13
- `cms_chrome`: 13
- `implausible_offerings`: 8
- `policy_toc`: 7
- `high_score_thin_signals`: 4
- `boilerplate`: 1

## Notes

- Hydrated working sidecar from 5933 published URN shards (prior=0 → 5933).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '98f239c4ea84c6909a0a', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 9103, 'updatedAt': '2026-10-03'}
- Apply decision: eventCount +77 (>= 15)
- Before: 113 suspects across 5933 records.
- Applied QA fixes to 83 school(s) (108 area finding(s)).
- Learned 32 new junk phrase(s) (store size 900).
- Reviewed top 113 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 31 suspects across 5933 records.
- Updated output/learned-qa-apply-state.json
