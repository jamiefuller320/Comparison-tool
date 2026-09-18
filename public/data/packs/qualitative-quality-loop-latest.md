# Qualitative quality loop — 2026-09-18T14:07:34.827444+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `3948`
- Suspects before → after: `70` → `24`
- QA reviewed / changed: `70` / `46`
- Findings applied: `54`
- Learned phrases added: `8`
- Merged to index: `True`
- Apply trigger: `eventCount +63 (>= 15)`

## Top flag counts (before)

- `chrome`: 44
- `implausible_offerings`: 19
- `admissions`: 7
- `policy_toc`: 2

## Notes

- Hydrated working sidecar from 3948 published URN shards (prior=0 → 3948).
- Rebalanced learned QA phrases: active=900 candidates=1396.
- Learning fingerprint: {'phraseHash': '3077990c33d1b0de7e96', 'phraseCount': 900, 'candidateCount': 1396, 'eventCount': 6520, 'updatedAt': '2026-09-18'}
- Apply decision: eventCount +63 (>= 15)
- Before: 70 suspects across 3948 records.
- Applied QA fixes to 46 school(s) (54 area finding(s)).
- Learned 8 new junk phrase(s) (store size 900).
- Reviewed top 70 suspect(s); provider=none.
- Merged cleaned sidecar into 21 schools-index file(s).
- After: 24 suspects across 3948 records.
- Updated output/learned-qa-apply-state.json
